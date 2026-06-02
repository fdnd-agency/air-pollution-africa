import { DirectusService } from '$lib/server/services/directusService'

const ROLE_NAME = 'apa_admin'

export async function GET({ locals }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const token = DirectusService.getServerToken()

	const users = await DirectusService.getUsers({ roleName: ROLE_NAME }, { token })
	const cleaned = users.map((user) => ({
		id: user.id,
		email: user.email,
		role: user.role,
		status: user.status
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

	const token = DirectusService.getServerToken()

	const body = await request.json().catch(() => ({}))
	const email = String(body.email || '').trim()
	const password = String(body.password || '')

	if (!email || !password) {
		return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const created = await DirectusService.createUser({ email, password, roleName: ROLE_NAME }, { token })

	return new Response(JSON.stringify(created?.data ?? created), {
		status: 201,
		headers: { 'Content-Type': 'application/json' }
	})
}
