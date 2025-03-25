const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const Request = require("../models/requestModel");
const Image = require("../models/imageModel");
const { imageQueue } = require("../workers/imageProcessor");
const {validateCSV} = require("../utils/csvValidator");
const router = express.Router();

// ✅ Expected CSV Headers
const REQUIRED_HEADERS = ["Serial Number", "Product Name", "Input Image Urls"];

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
    // const results = [];
    // const errors = [];
    // let headersValidated = false;
    // let headersError = null; // Store header validation error

    // fs.createReadStream(req.file.path)
    //     .pipe(csvParser())
    //     .on("headers", (headers) => {
    //         const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    //         if (missingHeaders.length > 0) {
    //             headersError = `Missing or incorrect headers: ${missingHeaders.join(", ")}. Expected headers: "Serial Number", "Product Name", "Input Image Urls"`;
    //         }
    //         headersValidated = true;
    //     })
        // .on("data", (row) => {
        //     if (headersError) return; // Stop processing if headers are invalid

        //     if (!row["Product Name"] || !row["Input Image Urls"]) {
        //         errors.push(`Invalid row: ${JSON.stringify(row)}`);
        //         return;
        //     }

        //     const inputUrls = row["Input Image Urls"].split(",").map(url => url.trim());
        //     inputUrls.forEach(url => {
        //         if (!isValidUrl(url) && !fs.existsSync(url)) {
        //             errors.push(`Invalid URL or file path: ${url}`);
        //         }
        //     });

        //     results.push(row);
        // })
        // .on("end", async () => {
        //     if (headersError) {
        //         return res.status(400).json({ error: headersError });
        //     }

        //     if (errors.length > 0) {
        //         return res.status(400).json({ errors });
        //     }

        //     await Request.create({ requestId, status: "pending" });

        //     for (const row of results) {
        //         const inputUrls = row["Input Image Urls"].split(",");
        //         for (const inputUrl of inputUrls) {
        //             await Image.create({
        //                 requestId,
        //                 serialNumber: row["Serial Number"],
        //                 productName: row["Product Name"],
        //                 inputUrl,
        //             });
        //             imageQueue.add("processImage", { requestId, productName: row["Product Name"], inputUrl });
        //         }
        //     }

        //     return res.json({ message: "File uploaded", filename: req.file.filename, requestId });
        // })
        // .on("error", (error) => {
        //     console.error("CSV Parsing Error:", error);
        //     if (!res.headersSent) {
        //         return res.status(500).json({ error: "CSV parsing failed" });
        //     }
        // });
    })

module.exports = router;