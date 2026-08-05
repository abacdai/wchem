const mongoose = require('mongoose');

const membershipLeadSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    plan: { type: String, default: 'ar', enum: ['ar'], maxlength: 20 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MembershipLead', membershipLeadSchema);
