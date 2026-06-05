import { DIRECTUS_URL } from '$lib/server/directus.js'
import { env } from '$env/dynamic/private'

export class DirectusService {
	static async #request(path, { method = 'GET', body, token } = {}) {
		const headers = {}
		const trimmedToken = String(token || '').trim()
		if (trimmedToken) headers.Authorization = `Bearer ${trimmedToken}`
		let payload
		if (body !== undefined) {
			headers['Content-Type'] = 'application/json'
			payload = JSON.stringify(body)
		}

		const res = await fetch(`${DIRECTUS_URL}${path}`, {
			method,
			headers,
			body: payload
		})

		if (!res.ok) {
			const text = await res.text()
			throw new Error(`Directus request failed (${res.status}): ${text}`)
		}

		return res.json()
	}

	static getServerToken() {
		const token = String(env.DIRECTUS_ADMIN_TOKEN || '').trim()
		if (!token) throw new Error('DIRECTUS_ADMIN_TOKEN missing in environment.')
		return token
	}

	static async getContent(collection, queryOrOptions = '', options = {}) {
		let query = ''
		let resolvedOptions = options
		if (typeof queryOrOptions === 'string') {
			query = queryOrOptions
		} else if (queryOrOptions && typeof queryOrOptions === 'object') {
			resolvedOptions = queryOrOptions
		}

		const qs = query ? `?${query}` : ''
		const json = await this.#request(`/items/${collection}${qs}`, { token: resolvedOptions.token })
		return Array.isArray(json?.data) ? json.data : []
	}

	static async getContentWithMeta(collection, queryOrOptions = '', options = {}) {
		let query = ''
		let resolvedOptions = options
		if (typeof queryOrOptions === 'string') {
			query = queryOrOptions
		} else if (queryOrOptions && typeof queryOrOptions === 'object') {
			resolvedOptions = queryOrOptions
		}

		const qs = query ? `?${query}` : ''
		const json = await this.#request(`/items/${collection}${qs}`, { token: resolvedOptions.token })
		return {
			data: Array.isArray(json?.data) ? json.data : [],
			meta: json?.meta || null
		}
	}

	static async postContent(collection, body, options = {}) {
		return this.#request(`/items/${collection}`, {
			method: 'POST',
			body,
			token: options.token
		})
	}

	static async updateContent(collection, id, body, options = {}) {
		return this.#request(`/items/${collection}/${id}`, {
			method: 'PATCH',
			body,
			token: options.token
		})
	}

	static async deleteContent(collection, id, options = {}) {
		return this.#request(`/items/${collection}/${id}`, {
			method: 'DELETE',
			token: options.token
		})
	}

	static async getUsers(queryOrOptions = '', options = {}) {
		let query = ''
		let roleName

		if (typeof queryOrOptions === 'string') {
			query = queryOrOptions
		} else if (queryOrOptions && typeof queryOrOptions === 'object') {
			const { query: queryValue = '', roleName: roleNameValue } = queryOrOptions
			query = String(queryValue)
			roleName = roleNameValue
		}

		if (roleName) {
			const prefix = query ? `${query}&` : ''
			query = `${prefix}filter[role][_eq]=${encodeURIComponent(roleName)}`
		}

		return this.getContent('apa_users', query, options)
	}

	static async createUser({ email, role = 'researcher', active = true }, options = {}) {
		const trimmedEmail = String(email || '').trim()
		if (!trimmedEmail) throw new Error('Email is required.')

		// Passwordless: creating a user just authorizes an email for login-code sign-in.
		return this.postContent(
			'apa_users',
			{
				email: trimmedEmail,
				email_lower: trimmedEmail.toLowerCase(),
				role,
				active
			},
			options
		)
	}

	static async deleteUser(id, options = {}) {
		const userId = String(id || '').trim()
		if (!userId) throw new Error('User id is required.')
		return this.deleteContent('apa_users', userId, options)
	}

	static async getApiKeyByEmailLower(emailLower, options = {}) {
		const items = await this.getContent('api_keys', `filter[email_lower][_eq]=${encodeURIComponent(emailLower)}&limit=1`, options)
		return items[0] || null
	}

	static async getApaUserByEmailLower(emailLower, options = {}) {
		const items = await this.getContent('apa_users', `filter[email_lower][_eq]=${encodeURIComponent(emailLower)}&limit=1`, options)
		return items[0] || null
	}

	static async upsertApiKeyRequest({ email, emailLower, verifyCodeHash, verifyExpiresAt }, options = {}) {
		const existing = await this.getApiKeyByEmailLower(emailLower, options)
		const payload = {
			email,
			email_lower: emailLower,
			verify_code_hash: verifyCodeHash,
			verify_expires_at: verifyExpiresAt
		}

		if (existing?.id) {
			await this.updateContent('api_keys', existing.id, payload, options)
			return existing
		}

		const created = await this.postContent(
			'api_keys',
			{
				...payload,
				verified: false
			},
			options
		)

		return created?.data || null
	}

	static async issueApiKey({ id, apiKey }, options = {}) {
		return this.updateContent(
			'api_keys',
			id,
			{
				api_key: apiKey,
				verified: true,
				verify_code_hash: null,
				verify_expires_at: null
			},
			options
		)
	}
}
