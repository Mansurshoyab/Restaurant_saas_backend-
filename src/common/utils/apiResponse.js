export function success(res, { statusCode = 200, message = 'OK', data = null, meta = null }) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function created(res, data, message = 'Created') {
  return success(res, { statusCode: 201, message, data });
}

