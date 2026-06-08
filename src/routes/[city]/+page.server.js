import { getCityData, getCityTubes } from '$lib/server/services/cityService'

/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	const { city, citySlug } = await parent()

	const [{ points, measurements }, tubes] = await Promise.all([getCityData(city.id, { includeMeasurements: true }), getCityTubes(city.id)])

    let sampling_points
	// Kept in the legacy `keuzes` shape so any boot-data map consumer still works,
	// but now derived from the resolved city instead of a hardcoded static file.
	const keuzes = {
		'Gekozen stad': city.name,
		Coordinaten: [Number(city.latitude), Number(city.longitude)]
	}

	    try {
        const response = await fetch(`https://fdnd-agency.directus.app/items/apa_sampling_points?fields=longitude,latitude,city`)
 
        if (!response.ok) {
            console.error('Failed to fetch sampling points:', response.status)
            return {
                sampling_points: []
            }
        }
        
 
        const jsonResponse = await response.json() 
        sampling_points = jsonResponse.data;
    } 
	catch (error) {
        console.error('Load error:', error)
    }
    // console.log(sampling_points)

	return { city, citySlug, points, measurements, tubes, keuzes, sampling_points }
}

 