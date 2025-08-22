import mongoose from "mongoose";

const account50kSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    cookies: { type: String, required: false }, // lưu dạng string JSON
    phone: { type: String, default: "" },
    orderCode: { type: String, default: "" },
    purchaseDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    lastUsed: { type: Date, default: null },
    status: { 
      type: String, 
      enum: ["available", "in_use", "dead"], 
      default: "available" 
    }
  },
  { timestamps: true }
);

const Account50k = mongoose.model("Account50k", account50kSchema);

export default Account50k;
