import { ApiError } from '../common/utils/apiError.js';

// Usage: validate({ body: schema, params: schema, query: schema })
// where each schema is a Zod schema.
export function validate(schemas) {
  return (req, res, next) => {
    for (const key of ['body', 'params', 'query']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(
          ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors)
        );
      }
      Object.defineProperty(req, key, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    next();
  };
}

