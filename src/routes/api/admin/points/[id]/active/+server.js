import { DirectusService } from '$lib/server/services/directusService'

export async function PATCH({ request, cookies, params }) {
	const token = cookies.get('access_token')
	if (!token) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const { id } = params
	if (!id) {
		return new Response(JSON.stringify({ error: 'Invalid point id.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const body = await request.json().catch(() => ({}))
	const isActive = !!body.active

	await DirectusService.updateContent('apa_sampling_points', id, { active: isActive }, { token })

	return new Response(JSON.stringify({ success: true, active: isActive }), {
		headers: { 'Content-Type': 'application/json' }
	})
}
