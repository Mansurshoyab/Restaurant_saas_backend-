import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as modifierService from './modifier.service.js';

export const listGroups = asyncHandler(async (req, res) => {
  const groups = await modifierService.listModifierGroupsWithOptions(req.tenant);
  return success(res, { message: 'Modifier groups', data: groups });
});

export const createGroup = asyncHandler(async (req, res) => {
  const group = await modifierService.createModifierGroup(req.tenant, req.body);
  return created(res, group, 'Modifier group created');
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await modifierService.updateModifierGroup(req.tenant, req.params.groupId, req.body);
  return success(res, { message: 'Modifier group updated', data: group });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  await modifierService.deleteModifierGroup(req.tenant, req.params.groupId);
  return success(res, { message: 'Modifier group deactivated' });
});

export const addModifier = asyncHandler(async (req, res) => {
  const modifier = await modifierService.addModifierToGroup(
    req.tenant,
    req.params.groupId,
    req.body
  );
  return created(res, modifier, 'Modifier added');
});

export const updateModifier = asyncHandler(async (req, res) => {
  const modifier = await modifierService.updateModifier(req.tenant, req.params.modifierId, req.body);
  return success(res, { message: 'Modifier updated', data: modifier });
});

export const deleteModifier = asyncHandler(async (req, res) => {
  await modifierService.deleteModifier(req.tenant, req.params.modifierId);
  return success(res, { message: 'Modifier deactivated' });
});



