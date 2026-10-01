import mongoose from 'mongoose';

// Mixin applied to every tenant-scoped schema.
// organizationId is always required; branchId is required only for
// branch-level documents (pass { branchScoped: false } to omit it).
export function applyBaseFields(schema, { branchScoped = true } = {}) {
  schema.add({
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    ...(branchScoped
      ? {
          branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: true,
            index: true,
          },
        }
      : {}),
  });

  schema.set('timestamps', true);
}

