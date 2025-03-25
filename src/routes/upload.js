const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const Request = require("../models/requestModel");
const Image = require("../models/imageModel");
const streamifier = require("streamifier");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
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
    let csvStream;
    let filename = null;
    try {
        if (req.file) {
            // Handle Local CSV File Upload
            console.log(`Processing Local CSV: ${req.file.path}`);
            csvStream = fs.createReadStream(req.file.path);
            filename = req.file.filename;
        } else if (req.body.csvUrl) {
            // Handle GitHub CSV URL Upload
            const { csvUrl } = req.body;

            if (!csvUrl.startsWith("https://raw.githubusercontent.com/")) {
                return res.status(400).json({ error: "Invalid GitHub CSV URL" });
            }

            console.log(` Fetching CSV from GitHub: ${csvUrl}`);
            const response = await axios.get(csvUrl);
            csvStream = streamifier.createReadStream(response.data);
            filename = path.basename(csvUrl);
        } else {
            return res.status(400).json({ error: "No file uploaded or URL provided" });
        }
        const results = await validateCSV(csvStream);
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

        if (req.file) {
            return res.json({ message: "File uploaded successfully", filename: req.file.filename, requestId });
        }
        else {
            return res.json({ message: "File uploaded successfully in the form of URL", requestId });
        }
    } catch (error) {
        console.error("CSV Validation Error:", error);
        return res.status(400).json(error);
    }
   
})

module.exports = router;