import rateLimit from 'express-rate-limit'

export default rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: 'Too many verification attempts from this IP, please try again later.'
})
