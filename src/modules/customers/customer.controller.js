import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success } from '../../common/utils/apiResponse.js';
import * as customerService from './customer.service.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.listCustomers(req.tenant, { search: req.query.search });
  return success(res, { message: 'Customers', data: customers });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.tenant, req.params.id);
  return success(res, { message: 'Customer', data: customer });
});


