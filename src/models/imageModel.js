const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  serialNumber: { type: Number, required: true },
  productName: { type: String, required: true },
  inputUrl: { type: String, required: true },
  outputUrl: { type: String },
  status: { type: String, enum: ["pending", "processed"], default: "pending" },
});

module.exports = mongoose.model("Image", ImageSchema);
