import mongoose from 'mongoose';

const { Schema } = mongoose;

// Read-mostly catalog used to populate permission pickers in the admin UI.
// Not joined against at request time — actual enforcement reads the
// resolved permissions array embedded in the JWT (see auth.service.js).
const permissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // 'order:create'
    module: { type: String, required: true }, // 'order'
    description: { type: String },
  },
  { timestamps: true }
);

export const Permission = mongoose.model('Permission', permissionSchema);

