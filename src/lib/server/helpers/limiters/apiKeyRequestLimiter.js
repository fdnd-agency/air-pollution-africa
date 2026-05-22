import rateLimit from 'express-rate-limit'

export default rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 2,
	message: 'Too many API key requests from this IP, please try again later.'
})
