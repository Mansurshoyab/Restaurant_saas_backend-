import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const childSchema = new Schema({ name: String });
childSchema.pre('find', function() {
  console.log('is populate?', !!this._mongooseOptions.populate);
  console.log('mongoose options:', this.mongooseOptions());
  console.log('options:', this.getOptions());
});
const Child = model('Child2', childSchema);
const parentSchema = new Schema({ child: { type: Schema.Types.ObjectId, ref: 'Child2' } });
const Parent = model('Parent2', parentSchema);

Parent.find().populate('child').exec().catch(() => {});
