import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const childSchema = new Schema({ name: String });
childSchema.pre('find', function() {
  console.log('child find options:', this.getOptions());
  console.log('is populate?', !!this._mongooseOptions?.populate, !!this.options?.populate);
  // Log all keys of this to find a populate hint
  console.log('keys:', Object.keys(this));
});
const Child = model('ChildTest', childSchema);

const parentSchema = new Schema({ child: { type: Schema.Types.ObjectId, ref: 'ChildTest' } });
const Parent = model('ParentTest', parentSchema);

const query = Parent.find().populate('child');
query.exec().catch(e => console.log('caught'));
