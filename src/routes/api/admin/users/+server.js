import { DirectusService } from '$lib/server/services/directusService'

const ALLOWED_ROLES = ['researcher', 'admin']

export async function GET({ locals }) {
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

	const users = await DirectusService.getUsers('', { token })
	const cleaned = users.map((user) => ({
		id: user.id,
		email: user.email,
		role: user.role,
		active: user.active
	}))

	return new Response(JSON.stringify(cleaned), {
		headers: { 'Content-Type': 'application/json' }
	})
}

export async function POST({ request, locals }) {
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

	const body = await request.json().catch(() => ({}))
	const email = String(body.email || '').trim()
	const role = String(body.role || 'researcher').trim()

	if (!email) {
		return new Response(JSON.stringify({ error: 'Email is required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	if (!ALLOWED_ROLES.includes(role)) {
		return new Response(JSON.stringify({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}.` }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const created = await DirectusService.createUser({ email, role }, { token })

	return new Response(JSON.stringify(created?.data ?? created), {
		status: 201,
		headers: { 'Content-Type': 'application/json' }
	})
}
