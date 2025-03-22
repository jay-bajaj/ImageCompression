const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  status: { type: String, enum: ["pending", "processing", "completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Request", RequestSchema);
