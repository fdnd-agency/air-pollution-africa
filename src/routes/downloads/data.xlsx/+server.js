import ExcelJS from 'exceljs'
import { DirectusService } from '$lib/server/services/directusService'
import { buildFlatRows, buildPointsWithMeasurements } from '$lib/server/helpers/exportData'

export async function GET() {
	const [points, measurements] = await Promise.all([DirectusService.getContent('apa_sampling_points', 'limit=-1'), DirectusService.getContent('apa_measurements', 'limit=-1')])

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
