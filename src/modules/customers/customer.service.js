import { Customer } from './customer.model.js';
import { ApiError } from '../../common/utils/apiError.js';

export async function findOrCreateByPhone(tenant, { name, phone, address }) {
  if (!phone) return null;

  let customer = await Customer.findOne({ phone }).setOptions({ tenant });
  if (!customer) {
    customer = await Customer.create({
      organizationId: tenant.organizationId,
      name,
      phone,
      address,
    });
  } else if (name && customer.name !== name) {
    customer.name = name; // keep latest name on repeat orders
    await customer.save();
  }
  return customer;
}

export async function listCustomers(tenant, { search } = {}) {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  return Customer.find(query).sort({ createdAt: -1 }).setOptions({ tenant });
}

export async function getCustomerById(tenant, customerId) {
  const customer = await Customer.findById(customerId).setOptions({ tenant });
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}


