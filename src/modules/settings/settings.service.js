import { RestaurantSettings } from './restaurantSettings.model.js';

// getOrCreate pattern — every org gets sane defaults automatically the
// first time settings are read, no separate "initialize settings" step
// needed during onboarding (§6).
export async function getSettings(organizationId) {
  let settings = await RestaurantSettings.findOne({ organizationId });
  if (!settings) {
    settings = await RestaurantSettings.create({ organizationId });
  }
  return settings;
}

export async function updateSettings(organizationId, updates) {
  const settings = await RestaurantSettings.findOneAndUpdate(
    { organizationId },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
}

