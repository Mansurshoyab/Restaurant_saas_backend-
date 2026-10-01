import { ApiError } from '../common/utils/apiError.js';

// authorize('order:create', 'order:cancel') -> user needs ANY of these permissions
export function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (req.user?.isSuperAdmin) return next();

    const perms = requiredPermissions.flat();
    const userPermissions = req.user?.permissions || [];
    const hasPermission = perms.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return next(
        ApiError.forbidden(
          `Missing required permission: ${perms.join(' or ')}`
        )
      );
    }

    next();
  };
}

export function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.user?.isSuperAdmin) return next();

    if (!allowedRoles.includes(req.user?.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }

    next();
  };
}

