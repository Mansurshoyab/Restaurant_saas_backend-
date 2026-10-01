import mongoose from 'mongoose';

const { Schema } = mongoose;

// Deliberately NOT tenantScope.plugin'd for writes (services write here
// directly with an explicit organizationId — see auditLog.service.js),
// but reads always filter by organizationId explicitly in the service too.
const auditLogSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    action: { type: String, required: true }, // e.g. "product.price_changed", "order.cancelled"
    entityType: { type: String, required: true }, // e.g. "MenuProduct", "Order"
    entityId: { type: Schema.Types.ObjectId, required: true },

    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);


