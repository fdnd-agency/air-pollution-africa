import { compare } from 'bcryptjs'
import generateCode from '$lib/server/helpers/generateCode'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const PRUNE_INTERVAL_MS = 5 * 60 * 1000

export class LoginCodeManager {
	static #codes = new Map()

	static async createCode(emailLower) {
		const key = String(emailLower || '').trim().toLowerCase()
		if (!key) throw new Error('Email is required to create a login code.')

		const { plain, hash } = await generateCode()
		const now = Date.now()
		const entry = {
			emailLower: key,
			hash,
			attempts: 0,
			createdAt: now,
			expiresAt: now + CODE_TTL_MS
		}

		this.#codes.set(key, entry)
		return { code: plain, expiresAt: entry.expiresAt }
	}

	static async verifyCode(emailLower, code) {
		const key = String(emailLower || '').trim().toLowerCase()
		const value = String(code || '').trim()
		if (!key || !value) return { ok: false, error: 'Invalid code.' }

		const entry = this.#codes.get(key)
		if (!entry) return { ok: false, error: 'Invalid or expired code.' }

		if (entry.expiresAt <= Date.now()) {
			this.#codes.delete(key)
			return { ok: false, error: 'Invalid or expired code.' }
		}

		if (entry.attempts >= MAX_ATTEMPTS) {
			this.#codes.delete(key)
			return { ok: false, error: 'Too many attempts.' }
		}

		const ok = await compare(value, entry.hash)
		if (!ok) {
			entry.attempts += 1
			if (entry.attempts >= MAX_ATTEMPTS) this.#codes.delete(key)
			return { ok: false, error: 'Invalid or expired code.' }
		}

		this.#codes.delete(key)
		return { ok: true }
	}

	static pruneExpired() {
		const now = Date.now()
		for (const [key, entry] of this.#codes) {
			if (entry.expiresAt <= now) this.#codes.delete(key)
		}
	}

	static get ttlMs() {
		return CODE_TTL_MS
	}
}

setInterval(() => LoginCodeManager.pruneExpired(), PRUNE_INTERVAL_MS).unref()
