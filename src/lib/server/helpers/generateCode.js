import { genSalt, hash as _hash } from 'bcryptjs'

async function generateCode() {
	const plain = String(Math.floor(100000 + Math.random() * 900000))
	const hash = await hashData(plain)
	return { plain, hash }
}

async function hashData(data) {
	const salt = await genSalt(10)
	return await _hash(data, salt)
}

export default generateCode
