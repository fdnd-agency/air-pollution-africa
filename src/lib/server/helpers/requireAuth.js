// nog naar kijken, moet event middleware worden.

function requireAuth(req, res, next) {
	if (!req.session?.userId) return res.redirect('/login')
	next()
}

export default requireAuth
