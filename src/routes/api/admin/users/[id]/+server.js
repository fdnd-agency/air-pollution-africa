import { DirectusService } from '$lib/server/services/directusService'

export async function DELETE({ cookies, params }) {
	const token = cookies.get('access_token')
	if (!token) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const { id } = params
	if (!id) {
		return new Response(JSON.stringify({ error: 'Invalid user id.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	await DirectusService.deleteUser(id, { token })

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	})
}
