const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const fs = require("fs");
const csvParser = require("csv-parser");
const Request = require("../models/requestModel");
const Image = require("../models/imageModel");
const { imageQueue } = require("../workers/imageProcessor");
const router = express.Router();

// ✅ Expected CSV Headers
const REQUIRED_HEADERS = ["Serial Number", "Product Name", "URLs"];

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        
        return cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({ storage });

// Function to Validate Image URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

router.post("/", upload.single("file"), async (req,res)=>{
    
    // console.log("Received request:", req.body); 
    // console.log("Received file:", req.file);
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    const requestId = uuidv4();
    const results = [];
    const errors = [];
    let headersValidated = false;

    fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on("headers", (headers) => {
        // Validate CSV Headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return res.status(400).json({ error: `Missing headers: ${missingHeaders.join(", ")}` });
        }
        headersValidated = true;
    })
    .on("data", (row) => {
        if (!headersValidated) return; // Prevent further execution if headers were invalid

        // Validate Row Data
        if (!row["Product Name"] || !row["URLs"]) {
            errors.push(`Invalid row: ${JSON.stringify(row)}`);
            return;
        }

        const inputUrls = row["URLs"].split(",").map(url => url.trim());
        inputUrls.forEach(url => {
            if (!isValidUrl(url) && !fs.existsSync(url)) {
                errors.push(`Invalid URL or file path: ${url}`);
            }
        });
        results.push(row)
    })
    .on("end", async () => {
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        await Request.create({ requestId, status: "pending" });
        for (const row of results) {
            const inputUrls = row["URLs"].split(",");
            for (const inputUrl of inputUrls) {
                await Image.create({
                    requestId,
                    serialNumber: row["Serial Number"],
                    productName: row["Product Name"],
                    inputUrl,
                });
                imageQueue.add("processImage", { requestId, productName: row["Product Name"], inputUrl: inputUrl });
            }
        }
    });
    
    res.json({ message: "File uploaded", filename: req.file.filename, requestId: requestId });
})

module.exports = router;