const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const Request = require("../models/requestModel");
const Image = require("../models/imageModel");
const { imageQueue } = require("../workers/ImageProcessor");
const {validateCSV} = require("../utils/csvValidator");
const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        
        return cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({ storage });

router.post("/", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    try {
        
        const results = await validateCSV(req.file.path);
        const requestId = uuidv4();
        await Request.create({ requestId, status: "pending" });

        // Process each row and add to the job queue
        for (const row of results) {
            const inputUrls = row["Input Image Urls"].split(",");
            for (const inputUrl of inputUrls) {
                await Image.create({
                    requestId,
                    serialNumber: row["Serial Number"],
                    productName: row["Product Name"],
                    inputUrl,
                });
                imageQueue.add("processImage", { requestId, productName: row["Product Name"], inputUrl });
            }
        }

        return res.json({ message: "File uploaded successfully", filename: req.file.filename, requestId });
    } catch (error) {
        console.error("CSV Validation Error:", error);
        return res.status(400).json(error);
    }
   
})

module.exports = router;