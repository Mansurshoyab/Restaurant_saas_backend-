import { Organization } from './organization.model.js';
import { ApiError } from '../../common/utils/apiError.js';

// Explicit organizationId filtering here rather than tenantScope.plugin.js —
// Organization is the tenant root itself, so "tenant-scoping" a query
// against it just means "match its own _id".
export async function getOrganizationById(organizationId) {
  const org = await Organization.findById(organizationId);
  if (!org) throw ApiError.notFound('Organization not found');
  return org;
}

export async function updateOrganization(organizationId, updates) {
  const org = await Organization.findByIdAndUpdate(organizationId, updates, {
    new: true,
    runValidators: true,
  });
  if (!org) throw ApiError.notFound('Organization not found');
  return org;
}

