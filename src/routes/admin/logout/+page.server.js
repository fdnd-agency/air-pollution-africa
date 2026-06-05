import { redirect } from '@sveltejs/kit'
import { AuthService } from '$lib/server/services/authService'

export async function load({ cookies }) {
	await AuthService.logout(cookies)

	throw redirect(303, '/admin/login')
}
