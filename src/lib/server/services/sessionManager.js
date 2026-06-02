import crypto from 'node:crypto'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const PRUNE_INTERVAL_MS = 10 * 60 * 1000

export class SessionManager {
	static #sessions = new Map()

	static createSession(user) {
		const now = Date.now()
		const session = {
			id: crypto.randomUUID(),
			user,
			createdAt: now,
			lastSeenAt: now,
			expiresAt: now + SESSION_TTL_MS
		}

		this.#sessions.set(session.id, session)
		return session
	}

	static getSession(sessionId, { touch = true } = {}) {
		const id = String(sessionId || '').trim()
		if (!id) return null

		const session = this.#sessions.get(id)
		if (!session) return null

		if (session.expiresAt <= Date.now()) {
			this.#sessions.delete(id)
			return null
		}

		if (touch) {
			const now = Date.now()
			session.lastSeenAt = now
			session.expiresAt = now + SESSION_TTL_MS
		}

		return session
	}

	static deleteSession(sessionId) {
		const id = String(sessionId || '').trim()
		if (!id) return
		this.#sessions.delete(id)
	}

	static pruneExpired() {
		const now = Date.now()
		for (const [id, session] of this.#sessions) {
			if (session.expiresAt <= now) this.#sessions.delete(id)
		}
	}

	static get ttlMs() {
		return SESSION_TTL_MS
	}
}

setInterval(() => SessionManager.pruneExpired(), PRUNE_INTERVAL_MS).unref()
