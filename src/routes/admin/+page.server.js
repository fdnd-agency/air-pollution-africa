import { DirectusService } from '$lib/server/services/directusService'
import keuzes from '../../static/keuzes.json'

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const token = cookies.get('access_token')
	const points = DirectusService.getContent('apa_sampling_points', { token })
	const measurements = DirectusService.getContent('apa_measurements', { token })
	const tubes = DirectusService.getContent('apa_tubes', { token })
	const users = DirectusService.getUsers({ roleName: 'apa_admin' }, { token })

	return { points, measurements, tubes, users, keuzes }
}
