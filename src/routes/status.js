const express = require("express");
const Request = require("../models/requestModel");
const Image = require("../models/imageModel");

const router = express.Router();

router.get("/:requestId", async (req, res) => {
  const { requestId } = req.params;
  const request = await Request.findOne({ requestId });
  if (!request) return res.status(404).json({ message: "Request not found" });

  const images = await Image.find({ requestId });
  res.json({ requestId, status: request.status, images });
});

module.exports = router;
