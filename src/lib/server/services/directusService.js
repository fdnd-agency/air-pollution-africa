import { DIRECTUS_URL } from '$lib/server/directus.js'

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
		const token = String(process.env.DIRECTUS_ADMIN_TOKEN || '').trim()
		if (!token) throw new Error('DIRECTUS_ADMIN_TOKEN missing in environment.')
		return token
	}

	static async #getRoleIdByName(roleName, options = {}) {
		const name = String(roleName || '').trim()
		if (!name) return null
		const qs = `?filter[name][_eq]=${encodeURIComponent(name)}&limit=1`
		const json = await this.#request(`/roles${qs}`, { token: options.token })
		return json?.data?.[0]?.id || null
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
		let resolvedOptions = options
		let roleId
		let roleName

		if (typeof queryOrOptions === 'string') {
			query = queryOrOptions
		} else if (queryOrOptions && typeof queryOrOptions === 'object') {
			resolvedOptions = queryOrOptions
			const { query: queryValue = '', roleId: roleIdValue, roleName: roleNameValue } = queryOrOptions
			query = String(queryValue)
			roleId = roleIdValue
			roleName = roleNameValue
		}

		if (!roleId && roleName) {
			roleId = await this.#getRoleIdByName(roleName, resolvedOptions)
		}

		if (roleId) {
			const prefix = query ? `${query}&` : ''
			query = `${prefix}filter[role][_eq]=${encodeURIComponent(roleId)}`
		}

		const qs = query ? `?${query}` : ''
		const json = await this.#request(`/users${qs}`, { token: resolvedOptions.token })
		return Array.isArray(json?.data) ? json.data : []
	}

	static async createUser({ email, password, roleId, roleName, status = 'active' }, options = {}) {
		const trimmedEmail = String(email || '').trim()
		if (!trimmedEmail) throw new Error('Email is required.')
		const resolvedPassword = String(password || '')
		if (!resolvedPassword) throw new Error('Password is required.')

		let resolvedRoleId = roleId
		if (!resolvedRoleId && roleName) {
			resolvedRoleId = await this.#getRoleIdByName(roleName, options)
		}
		if (!resolvedRoleId) throw new Error('Role id or role name is required.')

		return this.#request('/users', {
			method: 'POST',
			body: {
				email: trimmedEmail,
				password: resolvedPassword,
				role: resolvedRoleId,
				status
			},
			token: options.token
		})
	}

	static async deleteUser(id, options = {}) {
		const userId = String(id || '').trim()
		if (!userId) throw new Error('User id is required.')
		return this.#request(`/users/${userId}`, { method: 'DELETE', token: options.token })
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
