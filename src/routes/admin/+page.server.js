import { redirect } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'
import keuzes from '../../../static/keuzes.json'

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/admin/login')
	}

	const token = DirectusService.getServerToken()
	const points = DirectusService.getContent('apa_sampling_points', { token })
	const measurements = DirectusService.getContent('apa_measurements', { token })
	const tubes = DirectusService.getContent('apa_tubes', { token })
	const users = DirectusService.getUsers({ roleName: 'apa_admin' }, { token })

	return { points, measurements, tubes, users, keuzes }
}
