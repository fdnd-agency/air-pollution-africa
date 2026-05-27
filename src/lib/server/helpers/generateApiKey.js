import { randomBytes } from 'crypto'

function generateApiKey() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const bytes = randomBytes(30)
	let out = ''
	for (let i = 0; i < 30; i++) out += chars[bytes[i] % chars.length]
	return out
}

export default generateApiKey
