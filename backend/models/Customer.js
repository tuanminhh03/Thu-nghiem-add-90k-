import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  amount: { type: Number, default: 0 },
  pin: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
