export const ADMIN_ROLES = ['admin', 'superadmin']

export function isSuperadmin(user) {
	return user?.role === 'superadmin'
}

export function hasAdminAccess(user) {
	return ADMIN_ROLES.includes(user?.role)
}

export function getRelatedId(value) {
	return value && typeof value === 'object' ? value.id : value
}

export function canAccessCity(user, city) {
	if (!user || !city) return false
	if (isSuperadmin(user)) return true
	return String(getRelatedId(user.city) || '') === String(city.id)
}

export function canManageUser(actor, targetUser) {
	return isSuperadmin(actor) || String(getRelatedId(actor?.city) || '') === String(getRelatedId(targetUser?.city) || '')
}

export function accessFailure(user, city, { adminOnly = false } = {}) {
	if (!user) return { status: 401, error: 'Unauthorized' }
	if (adminOnly && !hasAdminAccess(user)) return { status: 403, error: 'Forbidden: admin role required.' }
	if (!canAccessCity(user, city)) return { status: 403, error: 'Forbidden: this account is not assigned to this city.' }
	return null
}