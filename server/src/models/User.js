const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'moderator', 'admin'], default: 'student', index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', index: true },
    majorId: { type: Schema.Types.ObjectId, ref: 'Major' },
    isVerified: { type: Boolean, default: false },
    failedLogins: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    // Incrementing this invalidates every refresh token (password change, logout everywhere).
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    universityId: this.universityId,
    majorId: this.majorId,
    isVerified: this.isVerified,
  };
};

module.exports = model('User', userSchema);
