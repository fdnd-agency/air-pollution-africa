import crypto from 'node:crypto'
import { DirectusService } from '$lib/server/services/directusService'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000

const COLLECTION = 'apa_sessions'

// Session row + related apa_user fetched in a single request via field expansion.
const USER_FIELDS = ['id', 'email', 'email_lower', 'role', 'active', 'last_login_at', 'city']
const FIELDS = ['id', 'token', 'expires_at', 'last_seen_at', ...USER_FIELDS.map((f) => `user.${f}`)].join(',')

export class SessionManager {
	/**
	 * Creates a session row and returns the secret token to store in the cookie.
	 * @param {string} userId - apa_users id
	 * @returns {Promise<{ token: string, expiresAt: string }>}
	 */
	static async createSession(userId) {
		const id = String(userId || '').trim()
		if (!id) throw new Error('A user id is required to create a session.')

		const token = crypto.randomBytes(32).toString('hex')
		const now = Date.now()
		const expiresAt = new Date(now + SESSION_TTL_MS).toISOString()

		await DirectusService.postContent(
			COLLECTION,
			{
				token,
				user: id,
				last_seen_at: new Date(now).toISOString(),
				expires_at: expiresAt
			},
			{ token: DirectusService.getServerToken() }
		)

		return { token, expiresAt }
	}

	/**
	 * Looks up a session by token, returning a normalized session (with user) or null.
	 * Expired sessions are deleted. When `touch` is set, expiry slides forward.
	 * @param {string} sessionToken
	 * @param {{ touch?: boolean }} [options]
	 * @returns {Promise<{ token: string, user: object|null } | null>}
	 */
	static async getSession(sessionToken, { touch = true } = {}) {
		const value = String(sessionToken || '').trim()
		if (!value) return null

		const dToken = DirectusService.getServerToken()
		const query = [`filter[token][_eq]=${encodeURIComponent(value)}`, `fields=${encodeURIComponent(FIELDS)}`, 'limit=1'].join('&')

		const [row] = await DirectusService.getContent(COLLECTION, query, { token: dToken })
		if (!row) return null

		if (!row.expires_at || new Date(row.expires_at).getTime() <= Date.now()) {
			await this.deleteSession(value)
			return null
		}

		// Block immediately if the account was deactivated while logged in.
		// Revoke the token outright — a reactivated user just logs in again.
		if (row.user?.active === false) {
			await DirectusService.deleteContent(COLLECTION, row.id, { token: dToken })
			return null
		}

		if (touch) {
			const now = Date.now()
			await DirectusService.updateContent(
				COLLECTION,
				row.id,
				{
					last_seen_at: new Date(now).toISOString(),
					expires_at: new Date(now + SESSION_TTL_MS).toISOString()
				},
				{ token: dToken }
			)
		}

		return { token: value, user: normalizeUser(row.user) }
	}

	/**
	 * Deletes the session row for a token (best effort).
	 * @param {string} sessionToken
	 */
	static async deleteSession(sessionToken) {
		const value = String(sessionToken || '').trim()
		if (!value) return

		const dToken = DirectusService.getServerToken()
		const [row] = await DirectusService.getContent(COLLECTION, `filter[token][_eq]=${encodeURIComponent(value)}&fields=id&limit=1`, { token: dToken })
		if (row?.id) await DirectusService.deleteContent(COLLECTION, row.id, { token: dToken })
	}

	static get ttlMs() {
		return SESSION_TTL_MS
	}
}

/**
 * Maps an expanded apa_users row to the shape exposed on `locals.user`.
 * @param {object|null|undefined} user
 */
function normalizeUser(user) {
	if (!user) return null
	return {
		id: user.id,
		email: user.email,
		emailLower: user.email_lower,
		role: user.role,
		active: user.active,
		lastLoginAt: user.last_login_at,
		city: user.city
	}
}
