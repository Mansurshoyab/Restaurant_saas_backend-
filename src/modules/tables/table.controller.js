import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as tableService from './table.service.js';

export const listDiningAreas = asyncHandler(async (req, res) => {
  const areas = await tableService.listDiningAreas(req.tenant);
  return success(res, { message: 'Dining areas', data: areas });
});

export const createDiningArea = asyncHandler(async (req, res) => {
  const area = await tableService.createDiningArea(req.tenant, req.body);
  return created(res, area, 'Dining area created');
});

export const listTables = asyncHandler(async (req, res) => {
  const tables = await tableService.listTables(req.tenant, { diningAreaId: req.query.diningAreaId });
  return success(res, { message: 'Tables', data: tables });
});

export const getTable = asyncHandler(async (req, res) => {
  const table = await tableService.getTableById(req.tenant, req.params.id);
  return success(res, { message: 'Table', data: table });
});

export const createTable = asyncHandler(async (req, res) => {
  const table = await tableService.createTable(req.tenant, req.body);
  return created(res, table, 'Table created');
});

export const updateTable = asyncHandler(async (req, res) => {
  const table = await tableService.updateTable(req.tenant, req.params.id, req.body);
  return success(res, { message: 'Table updated', data: table });
});


