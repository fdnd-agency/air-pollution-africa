import { redirect } from '@sveltejs/kit'
import { AuthService } from '$lib/server/services/authService'

export async function load({ cookies }) {
	const refreshToken = cookies.get('refresh_token')

	if (refreshToken) {
		await AuthService.logout(cookies)
	}

	throw redirect(303, '/admin/login')
}
