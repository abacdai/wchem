const mongoose = require('mongoose');

const compoundSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    formula: { type: String, trim: true, maxlength: 100, default: '' },
    smiles: { type: String, trim: true, maxlength: 500, default: '' },
    cid: { type: Number, default: null },
  },
  { timestamps: true }
);

compoundSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    notes: this.notes,
    formula: this.formula,
    smiles: this.smiles,
    cid: this.cid,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Compound', compoundSchema);
