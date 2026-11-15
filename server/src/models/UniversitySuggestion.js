const { Schema, model } = require('mongoose');

module.exports = model(
  'UniversitySuggestion',
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
  ),
);
