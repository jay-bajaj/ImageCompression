const { Queue, Worker } = require("bullmq");
const Image = require("../models/imageModel");
const Request = require("../models/requestModel");
const sharp = require('sharp');
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const Redis = require("ioredis");
const generateCSV = require("../utils/generateCSV");
require("dotenv").config();

const WEBHOOK_URL = process.env.WEBHOOK_URL;   

const connection = new Redis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null
});

const imageQueue = new Queue("imageQueue", {connection});


const worker = new Worker("imageQueue", async (job) => {
    // console.log(`Processing Job ID: ${job.id}, Data:`, job.data);
    const { requestId, serialNumber, productName, inputUrl } = job.data;

    try 
    {
        if (!job.data.inputUrl) {
            throw new Error("ERROR: Missing inputUrl in job data!");
        }
        try{

            let inputFilePath;
        
            if (inputUrl.startsWith("http")) {
                // Remote Image: Download it
                console.log(`Downloading image from: ${inputUrl}`);

                const response = await axios({
                    url: job.data.inputUrl,
                    responseType: "arraybuffer",
                    validateStatus: (status) => status >= 200 && status < 300
                });

                const inputImagesDir = path.join(__dirname, "..", "..", "uploads", "inputImages");
                if (!fs.existsSync(inputImagesDir)) fs.mkdirSync(inputImagesDir, { recursive: true });

                inputFilePath = path.join(inputImagesDir, `downloaded_${path.basename(job.id)}.jpeg`);
                fs.writeFileSync(inputFilePath, response.data);
            } else {
                // Local Image: Use the existing file path
                console.log(`Using local image: ${inputUrl}`);
                inputFilePath = path.resolve(inputUrl);

                if (!fs.existsSync(inputFilePath)) {
                    throw new Error(`Local file not found: ${inputFilePath}`);
                }
            }
            
            const outputPath = path.join(__dirname, "..", "..", "uploads","compressed", `compressed_${path.basename(job.id)}.jpeg`);
    
            await sharp(inputFilePath).jpeg({ quality: 50 }).toFile(outputPath); // reduce image quality by 50%
            const outputUrl = `http://localhost:3000/${outputPath}`;
    
            await Image.findOneAndUpdate({ requestId, productName, inputUrl }, { outputUrl, status: "processed" });
        }
        catch (error) {
            console.log(`Invalid Image (404 or Unreachable): ${inputUrl}`);
        }
        

        const pendingImages = await Image.find({ requestId, status: "pending" }).countDocuments();

        if (pendingImages === 0) {
            await Request.findOneAndUpdate({ requestId }, { status: "completed" });
            await generateCSV(requestId);

            if (WEBHOOK_URL) {
            
                const response = await axios.post(WEBHOOK_URL, {
                    requestId,
                    status: "completed",
                });

                console.log(`✅ Webhook sent! Response: ${response.status}`);
        }
        }

    } catch (error) {
        console.log("Error fetching image:", error);

        throw error;
    }

},  {connection, concurrency: 10}
);


worker.on("failed", (job, err) => {
    console.error(`❌ Worker Error - Job ID: ${job?.id}, Reason: ${err?.message}`);
});


module.exports = { imageQueue };