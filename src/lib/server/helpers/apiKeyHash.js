import crypto from 'node:crypto'

// SHA-256 of an API key. A fast hash is appropriate here (unlike passwords or
// login codes): keys are long and random, so they can't be brute-forced from the
// hash. Issuance and enforcement MUST use this same function or keys won't match.
export function hashApiKey(key) {
	return crypto.createHash('sha256').update(String(key)).digest('hex')
}
