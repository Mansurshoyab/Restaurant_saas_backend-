import { ModifierGroup } from './modifierGroup.model.js';
import { Modifier } from './modifier.model.js';
import { ApiError } from '../../common/utils/apiError.js';

export async function listModifierGroupsWithOptions(tenant) {
  const groups = await ModifierGroup.find({ isActive: true }).setOptions({ tenant }).lean();
  const groupIds = groups.map((g) => g._id);

  const modifiers = await Modifier.find({
    modifierGroupId: { $in: groupIds },
    isActive: true,
  })
    .sort({ sortOrder: 1 })
    .setOptions({ tenant })
    .lean();

  return groups.map((group) => ({
    ...group,
    modifiers: modifiers.filter((m) => m.modifierGroupId.toString() === group._id.toString()),
  }));
}

export async function createModifierGroup(tenant, input) {
  return ModifierGroup.create({ ...input, organizationId: tenant.organizationId });
}

export async function updateModifierGroup(tenant, groupId, updates) {
  const group = await ModifierGroup.findOneAndUpdate({ _id: groupId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });
  if (!group) throw ApiError.notFound('Modifier group not found');
  return group;
}

export async function deleteModifierGroup(tenant, groupId) {
  const activeModifiers = await Modifier.countDocuments({
    modifierGroupId: groupId,
    isActive: true,
  }).setOptions({ tenant });

  if (activeModifiers > 0) {
    throw ApiError.conflict('Deactivate or move all modifiers out of this group first');
  }

  const group = await ModifierGroup.findOneAndUpdate(
    { _id: groupId },
    { isActive: false }
  ).setOptions({ tenant });
  if (!group) throw ApiError.notFound('Modifier group not found');
  return true;
}

async function assertGroupExists(tenant, groupId) {
  const group = await ModifierGroup.findById(groupId).setOptions({ tenant });
  if (!group) throw ApiError.notFound('Modifier group not found');
  return group;
}

export async function addModifierToGroup(tenant, groupId, input) {
  await assertGroupExists(tenant, groupId);
  return Modifier.create({
    ...input,
    modifierGroupId: groupId,
    organizationId: tenant.organizationId,
  });
}

export async function updateModifier(tenant, modifierId, updates) {
  const modifier = await Modifier.findOneAndUpdate({ _id: modifierId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });
  if (!modifier) throw ApiError.notFound('Modifier not found');
  return modifier;
}

export async function deleteModifier(tenant, modifierId) {
  const modifier = await Modifier.findOneAndUpdate(
    { _id: modifierId },
    { isActive: false }
  ).setOptions({ tenant });
  if (!modifier) throw ApiError.notFound('Modifier not found');
  return true;
}


