import { createQueue, createWorker } from './queue.js';
import { logger } from '../../config/logger.js';
import { StockBalance } from '../../modules/stock/stockBalance.model.js';
import { publish } from '../events/eventBus.js';
import { EVENTS } from '../events/eventTypes.js';

export const lowStockQueue = createQueue('low-stock-check');

export function registerLowStockWorker() {
  createWorker('low-stock-check', async (job) => {
    // Periodic sweep — catches items that crossed reorderLevel due to
    // manual adjustments/waste rather than a sale (which already emits
    // STOCK_LOW inline via stock.service.applyStockChange).
    const lowItems = await StockBalance.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
      reorderLevel: { $gt: 0 },
    })
      .setOptions({ skipTenantScope: true })
      .populate('inventoryItemId', 'name')
      .lean();

    for (const balance of lowItems) {
      await publish(EVENTS.STOCK_LOW, {
        organizationId: balance.organizationId.toString(),
        branchId: balance.branchId.toString(),
        inventoryItemId: balance.inventoryItemId._id.toString(),
        itemName: balance.inventoryItemId.name,
        currentQuantity: balance.quantity,
        reorderLevel: balance.reorderLevel,
      });
    }

    logger.info({ jobId: job.id, lowItemCount: lowItems.length }, 'Low stock sweep complete');
  });
}

export async function scheduleLowStockCheck() {
  await lowStockQueue.add(
    'check',
    {},
    { repeat: { every: 15 * 60 * 1000 }, removeOnComplete: true, removeOnFail: 50 }
  );
}


