import mongoose from 'mongoose';
import { Recipe } from './recipe.model.js';
import { MenuProduct } from '../products/product.model.js';
import { InventoryItem } from '../inventory/inventoryItem.model.js';
import { ApiError } from '../../common/utils/apiError.js';

async function assertProductExists(tenant, productId) {
  const product = await MenuProduct.findById(productId).setOptions({ tenant });
  if (!product) throw ApiError.badRequest('Product not found');
  return product;
}

async function assertInventoryItemsExist(tenant, items) {
  const ids = items.map((i) => i.inventoryItemId);
  const found = await InventoryItem.find({ _id: { $in: ids } }).setOptions({ tenant });
  if (found.length !== new Set(ids.map(String)).size) {
    throw ApiError.badRequest('One or more inventory items in the recipe do not exist');
  }
}

export async function getActiveRecipe(tenant, productId) {
  return Recipe.findOne({ productId, active: true })
    .populate('items.inventoryItemId', 'name unit averageCost')
    .setOptions({ tenant });
}

/**
 * Creates the first recipe version for a product, or a new version
 * replacing the currently active one. Never mutates an existing recipe
 * document's items in place — see the versioning note in recipe.model.js.
 */
export async function upsertRecipe(tenant, input) {
  const { productId, items } = input;

  await assertProductExists(tenant, productId);
  await assertInventoryItemsExist(tenant, items);

  const session = await mongoose.startSession();
  try {
    let newRecipe;

    await session.withTransaction(async () => {
      const current = await Recipe.findOne({
        organizationId: tenant.organizationId,
        productId,
        active: true,
      }).session(session).setOptions({ tenant });

      const nextVersion = current ? current.version + 1 : 1;

      if (current) {
        current.active = false;
        await current.save({ session });
      }

      [newRecipe] = await Recipe.create(
        [
          {
            organizationId: tenant.organizationId,
            productId,
            items,
            version: nextVersion,
            active: true,
          },
        ],
        { session }
      );

      await MenuProduct.findByIdAndUpdate(
        productId,
        { recipeId: newRecipe._id },
        { session }
      ).setOptions({ tenant });
    });

    return newRecipe;
  } finally {
    await session.endSession();
  }
}

export async function listRecipeVersions(tenant, productId) {
  return Recipe.find({ productId }).sort({ version: -1 }).setOptions({ tenant });
}

/**
 * Computes current food cost for a product from its active recipe and
 * each ingredient's current averageCost. See §21 of the design doc.
 * NOTE: this is a live estimate for the admin UI, not what gets stored
 * on historical OrderItems — those pin the recipe version at sale time.
 */
export async function calculateRecipeCost(tenant, productId) {
  const recipe = await getActiveRecipe(tenant, productId);
  if (!recipe) throw ApiError.notFound('No active recipe for this product');

  let totalCost = 0;
  const breakdown = recipe.items.map((line) => {
    const item = line.inventoryItemId; // populated
    const lineCost = (item?.averageCost || 0) * line.quantity;
    totalCost += lineCost;
    return {
      inventoryItemId: item?._id,
      name: item?.name,
      quantity: line.quantity,
      unit: line.unit,
      cost: Math.round(lineCost * 100) / 100,
    };
  });

  const product = await MenuProduct.findById(productId).setOptions({ tenant });
  const foodCostPercent = product?.price ? (totalCost / product.price) * 100 : null;

  return {
    productId,
    recipeVersion: recipe.version,
    breakdown,
    totalFoodCost: Math.round(totalCost * 100) / 100,
    sellingPrice: product?.price || null,
    foodCostPercent: foodCostPercent !== null ? Math.round(foodCostPercent * 10) / 10 : null,
  };
}


