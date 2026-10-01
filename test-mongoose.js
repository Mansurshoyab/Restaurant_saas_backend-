import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const childSchema = new Schema({ name: String });
childSchema.pre('find', function() {
  console.log('is populate?', !!this.options?.populate);
  console.log('_mongooseOptions:', Object.keys(this._mongooseOptions || {}));
  console.log('mongooseOptions:', Object.keys(this.mongooseOptions ? this.mongooseOptions() : {}));
});
const Child = model('Child', childSchema);
const parentSchema = new Schema({ child: { type: Schema.Types.ObjectId, ref: 'Child' } });
const Parent = model('Parent', parentSchema);

Parent.find().populate('child').exec().catch(()=>null);
