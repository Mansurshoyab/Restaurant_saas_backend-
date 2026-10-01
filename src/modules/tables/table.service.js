import { Table } from './table.model.js';
import { DiningArea } from './diningArea.model.js';
import { ApiError } from '../../common/utils/apiError.js';

export async function listDiningAreas(tenant) {
  return DiningArea.find({ isActive: true }).sort({ name: 1 }).setOptions({ tenant });
}

export async function createDiningArea(tenant, input) {
  return DiningArea.create({ ...input, organizationId: tenant.organizationId, branchId: tenant.branchId });
}

export async function listTables(tenant, { diningAreaId } = {}) {
  const query = { isActive: true };
  if (diningAreaId) query.diningAreaId = diningAreaId;
  return Table.find(query).populate('diningAreaId', 'name').sort({ label: 1 }).setOptions({ tenant });
}

export async function getTableById(tenant, tableId) {
  const table = await Table.findById(tableId).setOptions({ tenant });
  if (!table) throw ApiError.notFound('Table not found');
  return table;
}

export async function createTable(tenant, input) {
  return Table.create({ ...input, organizationId: tenant.organizationId, branchId: tenant.branchId });
}

export async function updateTable(tenant, tableId, updates) {
  const table = await Table.findOneAndUpdate({ _id: tableId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });
  if (!table) throw ApiError.notFound('Table not found');
  return table;
}

// Internal helpers used by order.service.js — not exposed as routes directly
export async function markTableOccupied(tenant, tableId, orderId, session) {
  return Table.findOneAndUpdate(
    { _id: tableId },
    { status: 'OCCUPIED', currentOrderId: orderId }
  ).setOptions({ tenant, session });
}

export async function markTableAvailable(tenant, tableId, session) {
  return Table.findOneAndUpdate(
    { _id: tableId },
    { status: 'AVAILABLE', currentOrderId: null }
  ).setOptions({ tenant, session });
}


