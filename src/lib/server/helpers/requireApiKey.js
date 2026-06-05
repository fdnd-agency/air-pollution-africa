import { DirectusService } from '$lib/server/services/directusService'
import { hashApiKey } from '$lib/server/helpers/apiKeyHash'

const COLLECTION = 'apa_api_clients'

function extractKey(request, url) {
	const header = (request.headers.get('x-api-key') || '').trim()
	if (header) return header
	return (url?.searchParams.get('apiKey') || '').trim()
}

/**
 * Looks up the verified API client for the request's key.
 * @returns {Promise<object|null>} the apa_api_clients record, or null if missing/invalid
 */
export async function verifyApiKey({ request, url }) {
	const key = extractKey(request, url)
	if (!key) return null

	const token = DirectusService.getServerToken()
	const hash = hashApiKey(key)
	const query = `filter[api_key_hash][_eq]=${encodeURIComponent(hash)}&filter[verified][_eq]=true&limit=1`
	const [client] = await DirectusService.getContent(COLLECTION, query, { token })

	return client || null
}
