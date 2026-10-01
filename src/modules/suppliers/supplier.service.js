import { Supplier } from './supplier.model.js';
import { ApiError } from '../../common/utils/apiError.js';

export async function listSuppliers(tenant, { includeInactive = false, search } = {}) {
  const query = {};
  if (!includeInactive) query.isActive = true;
  if (search) query.name = { $regex: search, $options: 'i' };

  return Supplier.find(query).sort({ name: 1 }).setOptions({ tenant });
}

export async function getSupplierById(tenant, supplierId) {
  const supplier = await Supplier.findById(supplierId).setOptions({ tenant });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
}

export async function createSupplier(tenant, input) {
  return Supplier.create({ ...input, organizationId: tenant.organizationId });
}

export async function updateSupplier(tenant, supplierId, updates) {
  const supplier = await Supplier.findOneAndUpdate({ _id: supplierId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
}

export async function deactivateSupplier(tenant, supplierId) {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: supplierId },
    { isActive: false }
  ).setOptions({ tenant });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return true;
}


