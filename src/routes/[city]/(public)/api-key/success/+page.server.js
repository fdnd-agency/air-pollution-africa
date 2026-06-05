import { redirect } from '@sveltejs/kit'

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies, params }) {
	const apiKey = cookies.get('api_key_to_show')
	if (!apiKey) {
		throw redirect(303, `/${params.city}/api-key/request`)
	}

	cookies.delete('api_key_to_show', { path: '/' })
	return { apiKey, citySlug: params.city }
}
