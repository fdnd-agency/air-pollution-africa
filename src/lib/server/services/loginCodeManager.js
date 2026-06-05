import { compare } from 'bcryptjs'
import generateCode from '$lib/server/helpers/generateCode'
import { DirectusService } from '$lib/server/services/directusService'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

const COLLECTION = 'apa_login_codes'

export class LoginCodeManager {
	/**
	 * Creates a one-time login code for a user and stores its hash in Directus.
	 * @param {string} userId - apa_users id
	 * @returns {Promise<{ code: string, expiresAt: string }>} plaintext code (email only) + ISO expiry
	 */
	static async createCode(userId) {
		const id = String(userId || '').trim()
		if (!id) throw new Error('A user id is required to create a login code.')

		const { plain, hash } = await generateCode()
		const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()

		await DirectusService.postContent(COLLECTION, { user: id, code_hash: hash, expires_at: expiresAt }, { token: DirectusService.getServerToken() })

		return { code: plain, expiresAt }
	}

	/**
	 * Verifies a submitted code against the newest unused, unexpired code for the user.
	 * On success the code is marked used (single-use) so it can't be replayed.
	 * @param {string} userId - apa_users id
	 * @param {string} code
	 * @returns {Promise<{ ok: boolean, error?: string }>}
	 */
	static async verifyCode(userId, code) {
		const id = String(userId || '').trim()
		const value = String(code || '').trim()
		if (!id || !value) return { ok: false, error: 'Invalid code.' }

		const token = DirectusService.getServerToken()
		const nowIso = new Date().toISOString()

		const query = [`filter[user][_eq]=${encodeURIComponent(id)}`, 'filter[used_at][_null]=true', `filter[expires_at][_gt]=${encodeURIComponent(nowIso)}`, 'sort=-date_created', 'limit=1'].join('&')

		const [entry] = await DirectusService.getContent(COLLECTION, query, { token })
		if (!entry) return { ok: false, error: 'Invalid or expired code.' }

		const attempts = Number(entry.attempts) || 0

		// Already exhausted: burn the code so it can't be used any further.
		if (attempts >= MAX_ATTEMPTS) {
			await DirectusService.updateContent(COLLECTION, entry.id, { used_at: nowIso }, { token })
			return { ok: false, error: 'Too many attempts.' }
		}

		const ok = await compare(value, entry.code_hash)
		if (!ok) {
			const nextAttempts = attempts + 1
			const patch = { attempts: nextAttempts }
			// Burn the code once the cap is reached.
			if (nextAttempts >= MAX_ATTEMPTS) patch.used_at = nowIso
			await DirectusService.updateContent(COLLECTION, entry.id, patch, { token })
			return { ok: false, error: 'Invalid or expired code.' }
		}

		await DirectusService.updateContent(COLLECTION, entry.id, { used_at: nowIso }, { token })
		return { ok: true }
	}

	static get ttlMs() {
		return CODE_TTL_MS
	}
}
