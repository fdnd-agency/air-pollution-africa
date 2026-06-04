import { DirectusService } from '$lib/server/services/directusService'

export async function PATCH({ request, locals, params }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	if (locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden: admin role required.' }), {
			status: 403,
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

	if (id === locals.user.id) {
		return new Response(JSON.stringify({ error: 'You cannot deactivate your own account.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const body = await request.json().catch(() => ({}))
	if (typeof body.active !== 'boolean') {
		return new Response(JSON.stringify({ error: 'active (boolean) is required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const token = DirectusService.getServerToken()
	await DirectusService.updateContent('apa_users', id, { active: body.active }, { token })

	return new Response(JSON.stringify({ success: true, active: body.active }), {
		headers: { 'Content-Type': 'application/json' }
	})
}

export async function DELETE({ locals, params }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	if (locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden: admin role required.' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const token = DirectusService.getServerToken()

	const { id } = params
	if (!id) {
		return new Response(JSON.stringify({ error: 'Invalid user id.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	if (id === locals.user.id) {
		return new Response(JSON.stringify({ error: 'You cannot delete your own account.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	await DirectusService.deleteUser(id, { token })

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	})
}
