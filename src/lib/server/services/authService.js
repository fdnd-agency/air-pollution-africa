import { DirectusService } from '$lib/server/services/directusService'
import { LoginCodeManager } from '$lib/server/services/loginCodeManager'
import { SessionManager } from '$lib/server/services/sessionManager'
import getResendClient from '$lib/server/services/resendService'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

const SESSION_COOKIE = 'session_id'
const SESSION_MAX_AGE = Math.floor(SessionManager.ttlMs / 1000)

// DEV ONLY: when enabled, the login code is returned in the response so you can
// sign in without a working mail service. Hard-gated to non-production AND an
// explicit opt-in, so it can never leak in production even if the flag is left
// set by accident. Never set DEV_SHOW_LOGIN_CODE=true in a live environment.
function devExposeLoginCode() {
	return dev && env.DEV_SHOW_LOGIN_CODE === 'true'
}

export class AuthService {
	static async requestLoginCode(email) {
		const normalized = this.#normalizeEmail(email)
		if (!normalized) return { success: false, error: 'Email is required.' }

		const token = DirectusService.getServerToken()
		const user = await DirectusService.getApaUserByEmailLower(normalized.emailLower, { token })
		if (!user) return { success: false, error: 'No account found for this email.' }
		if (user.active === false) return { success: false, error: 'This account is inactive.' }

		const { code, expiresAt } = await LoginCodeManager.createCode(user.id)

		const exposeCode = devExposeLoginCode()
		try {
			await this.#sendLoginCodeEmail(normalized.emailLower, code)
		} catch (error) {
			// In dev with code exposure on, don't fail the request just because mail
			// isn't configured — the code is returned in the response instead.
			if (!exposeCode) throw error
			console.error('[dev] Login code email failed; returning code in response:', error?.message)
		}

		return {
			success: true,
			expiresAt,
			emailLower: normalized.emailLower,
			...(exposeCode ? { devCode: code } : {})
		}
	}

	static async verifyLoginCode(email, code, cookies) {
		const normalized = this.#normalizeEmail(email)
		if (!normalized || !String(code || '').trim()) {
			return { success: false, error: 'Email and code are required.' }
		}

		const token = DirectusService.getServerToken()
		const user = await DirectusService.getApaUserByEmailLower(normalized.emailLower, { token })
		if (!user) return { success: false, error: 'Invalid or expired code.' }
		if (user.active === false) return { success: false, error: 'This account is inactive.' }

		const result = await LoginCodeManager.verifyCode(user.id, code)
		if (!result.ok) return { success: false, error: result.error || 'Invalid or expired code.' }

		const session = await SessionManager.createSession(user.id)

		this.#setSessionCookie(cookies, session.token)

		this.#updateLoginTimestamp(user, token).catch((error) => {
			console.error('Failed to update login timestamp:', error)
		})

		return { success: true, session }
	}

	static async getSessionFromCookies(cookies) {
		const sessionToken = cookies.get(SESSION_COOKIE)
		if (!sessionToken) return null

		const session = await SessionManager.getSession(sessionToken, { touch: true })
		if (!session) {
			cookies.delete(SESSION_COOKIE, { path: '/' })
			return null
		}

		this.#setSessionCookie(cookies, sessionToken)
		return session
	}

	static async logout(cookies) {
		const sessionToken = cookies.get(SESSION_COOKIE)
		if (sessionToken) await SessionManager.deleteSession(sessionToken)
		cookies.delete(SESSION_COOKIE, { path: '/' })
	}

	static #normalizeEmail(email) {
		const emailRaw = String(email || '').trim()
		if (!emailRaw) return null
		return { email: emailRaw, emailLower: emailRaw.toLowerCase() }
	}

	static #setSessionCookie(cookies, sessionId) {
		cookies.set(SESSION_COOKIE, sessionId, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE
		})
	}

	static async #sendLoginCodeEmail(email, code) {
		const from = String(env.FROM_EMAIL || '').trim()
		if (!from) throw new Error('FROM_EMAIL missing in environment.')
		const resend = getResendClient()
		await resend.emails.send({
			from,
			to: email,
			subject: 'Your login code',
			html: `
				<p>Your one-time login code is: <strong>${code}</strong></p>
				<p>This code is valid for 10 minutes.</p>
			`
		})
	}

	static async #updateLoginTimestamp(user, token) {
		if (!user?.id) return
		await DirectusService.updateContent('apa_users', user.id, { last_login_at: new Date().toISOString() }, { token })
	}
}
