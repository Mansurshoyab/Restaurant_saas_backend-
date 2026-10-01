import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as recipeService from './recipe.service.js';

export const getActiveRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getActiveRecipe(req.tenant, req.params.productId);
  return success(res, { message: 'Active recipe', data: recipe });
});

export const upsertRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.upsertRecipe(req.tenant, req.body);
  return created(res, recipe, 'Recipe saved as a new version');
});

export const listVersions = asyncHandler(async (req, res) => {
  const versions = await recipeService.listRecipeVersions(req.tenant, req.params.productId);
  return success(res, { message: 'Recipe versions', data: versions });
});

export const getCost = asyncHandler(async (req, res) => {
  const cost = await recipeService.calculateRecipeCost(req.tenant, req.params.productId);
  return success(res, { message: 'Recipe cost', data: cost });
});


