import ExcelJS from 'exceljs'
import { error } from '@sveltejs/kit'
import { buildFlatRows, buildPointsWithMeasurements } from '$lib/server/helpers/exportData'
import { resolveCity, getCityData } from '$lib/server/services/cityService'

export async function GET({ params }) {
	const city = await resolveCity(params.city)
	if (!city) throw error(404, `Unknown city "${params.city}".`)

	const { points, measurements } = await getCityData(city.id, { includeMeasurements: true })
	const items = buildPointsWithMeasurements(points, measurements)
	const { rows, headers } = buildFlatRows(items)

	const workbook = new ExcelJS.Workbook()
	const worksheet = workbook.addWorksheet('Export')

	worksheet.columns = headers.map((header) => ({ header, key: header }))
	rows.forEach((row) => worksheet.addRow(row))

	const buffer = await workbook.xlsx.writeBuffer()

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="data.xlsx"'
		}
	})
}
