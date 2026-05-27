import keuzes from '../../../../../static/keuzes.json'

export async function GET() {
	return new Response(JSON.stringify(keuzes), {
		headers: { 'Content-Type': 'application/json' }
	})
}
