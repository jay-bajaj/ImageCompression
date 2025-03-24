const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require('uuid');
const fs = require("fs");
const csvParser = require("csv-parser");
const Request = require("../models/requestModel");
const Image = require("../models/imageModel");
const { imageQueue } = require("../workers/imageProcessor");
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

router.post("/", upload.single("file"), async (req,res)=>{
    
    // console.log("Received request:", req.body); 
    // console.log("Received file:", req.file);
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    const requestId = uuidv4();
    const results = [];
    fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on("data", (data) => {
        results.push(data)
    })
    .on("end", async () => {
        await Request.create({ requestId, status: "pending" });
        for (const row of results) {
            const inputUrls = row["URLs"].split(",");
            for (const inputUrl of inputUrls) {
                await Image.create({
                    requestId,
                    productName: row["Name"],
                    inputUrl,
                });
                imageQueue.add("processImage", { requestId, productName: row["Name"], inputUrl: inputUrl });
            }
        }
    });
    
    res.json({ message: "File uploaded", filename: req.file.filename, requestId: requestId });
})

module.exports = router;