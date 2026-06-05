/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	const { city, citySlug } = await parent()
	return { cityName: city.name, citySlug }
}
