import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as supplierService from './supplier.service.js';

export const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await supplierService.listSuppliers(req.tenant, {
    includeInactive: req.query.includeInactive === 'true',
    search: req.query.search,
  });
  return success(res, { message: 'Suppliers', data: suppliers });
});

export const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplierById(req.tenant, req.params.id);
  return success(res, { message: 'Supplier', data: supplier });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.tenant, req.body);
  return created(res, supplier, 'Supplier created');
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.tenant, req.params.id, req.body);
  return success(res, { message: 'Supplier updated', data: supplier });
});

export const deactivateSupplier = asyncHandler(async (req, res) => {
  await supplierService.deactivateSupplier(req.tenant, req.params.id);
  return success(res, { message: 'Supplier deactivated' });
});


