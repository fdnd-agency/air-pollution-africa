import { getCityData, getCityTubes } from '$lib/server/services/cityService'

/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	const { city, citySlug } = await parent()

	const [{ points, measurements }, tubes] = await Promise.all([getCityData(city.id, { includeMeasurements: true }), getCityTubes(city.id)])

	// Kept in the legacy `keuzes` shape so any boot-data map consumer still works,
	// but now derived from the resolved city instead of a hardcoded static file.
	const keuzes = {
		'Gekozen stad': city.name,
		Coordinaten: [Number(city.latitude), Number(city.longitude)]
	}

	return { city, citySlug, points, measurements, tubes, keuzes }
}
