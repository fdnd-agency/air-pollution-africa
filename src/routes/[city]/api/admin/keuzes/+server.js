import { resolveCity } from '$lib/server/services/cityService'

export async function GET({ locals, params }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const city = await resolveCity(params.city)
	if (!city) {
		return new Response(JSON.stringify({ error: `Unknown city "${params.city}".` }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	// Legacy `keuzes` shape, now derived from the resolved city instead of a static file.
	const keuzes = {
		'Gekozen stad': city.name,
		Coordinaten: [Number(city.latitude), Number(city.longitude)]
	}

	return new Response(JSON.stringify(keuzes), {
		headers: { 'Content-Type': 'application/json' }
	})
}
