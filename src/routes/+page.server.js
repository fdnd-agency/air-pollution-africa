import { DirectusService } from '$lib/server/services/directusService'
import keuzes from '../../static/keuzes.json'

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const points = DirectusService.getContent('apa_sampling_points')
	const measurements = DirectusService.getContent('apa_measurements')
	const tubes = DirectusService.getContent('apa_tubes')

	return { points, measurements, tubes, keuzes }
}
