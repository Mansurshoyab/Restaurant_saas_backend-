// Mongoose plugin: automatically scopes every find/update/delete query
// to the organizationId (and branchId, when present) carried on the
// query context. Services must call `.setOptions({ tenant })` — see
// common/utils below — rather than trusting handwritten filters.
//
// This does NOT replace the tenant.middleware.js check on the request;
// it's a second, model-level guard so a forgotten filter in a service
// still can't leak another tenant's data.

const SCOPED_QUERY_METHODS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'countDocuments',
  'updateMany',
  'updateOne',
  'deleteMany',
  'deleteOne',
];

export function tenantScopePlugin(schema) {
  SCOPED_QUERY_METHODS.forEach((method) => {
    schema.pre(method, function () {
      const tenant = this.getOptions().tenant;

      // Explicit opt-out for internal/system operations (seeders, migrations)
      if (this.getOptions().skipTenantScope) return;

      if (!tenant || !tenant.organizationId) {
        // Mongoose 'populate' executes a separate find() using {_id: {$in: [...]}}.
        // Since the parent document was already scoped, this inner query is safe to bypass.
        const query = this.getQuery();
        const isPopulateQuery = Object.keys(query).length === 1 && query._id && query._id.$in;
        if (isPopulateQuery) return;

        throw new Error(
          `Tenant scope missing on query "${method}" for model "${this.model.modelName}". ` +
            `Pass { tenant } via .setOptions() or explicitly { skipTenantScope: true } for system operations.`
        );
      }

      this.where({ organizationId: tenant.organizationId });
      if (tenant.branchId && schema.path('branchId')) {
        this.where({ branchId: tenant.branchId });
      }
    });
  });
}

