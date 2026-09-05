import { error, redirect } from '@sveltejs/kit'
import { accessFailure } from '$lib/server/services/authorizationService'

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals, url, params, parent }) {
	const loginPath = `/${params.city}/admin/login`
	if (!locals.user && !url.pathname.startsWith(loginPath)) {
		throw redirect(303, loginPath)
	}

	if (locals.user && !url.pathname.startsWith(loginPath)) {
		const { city } = await parent()
		const failure = accessFailure(locals.user, city)
		if (failure?.status === 401) throw redirect(303, loginPath)
		if (failure) throw error(failure.status, failure.error)
	}

	return {
		user: locals.user ?? null,
		citySlug: params.city
	}
}
