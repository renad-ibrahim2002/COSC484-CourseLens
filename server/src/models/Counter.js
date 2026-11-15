const { Schema, model } = require('mongoose');

const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

Counter.next = async (name) => {
  const c = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return c.seq;
};

module.exports = Counter;
