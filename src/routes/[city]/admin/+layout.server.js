import { redirect } from '@sveltejs/kit'

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals, url, params }) {
	const loginPath = `/${params.city}/admin/login`
	if (!locals.user && !url.pathname.startsWith(loginPath)) {
		throw redirect(303, loginPath)
	}

	return {
		user: locals.user ?? null,
		citySlug: params.city
	}
}
