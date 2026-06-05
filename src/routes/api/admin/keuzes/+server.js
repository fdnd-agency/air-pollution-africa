import keuzes from '../../../../../static/keuzes.json'

export async function GET({ locals }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	return new Response(JSON.stringify(keuzes), {
		headers: { 'Content-Type': 'application/json' }
	})
}
