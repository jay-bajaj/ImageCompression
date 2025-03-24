const { Queue, Worker } = require("bullmq");
const Image = require("../models/imageModel");
const Request = require("../models/requestModel");
const sharp = require('sharp');
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const Redis = require("ioredis");
require("dotenv").config();
const WEBHOOK_URL = process.env.WEBHOOK_URL;   

const connection = new Redis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null
});

const imageQueue = new Queue("imageQueue", {connection});



new Worker("imageQueue", async (job) => {
    // console.log(`Processing Job ID: ${job.id}, Data:`, job.data);
    const { requestId, productName, inputUrl } = job.data;

    try 
    {
        if (!job.data.inputUrl) {
            throw new Error("ERROR: Missing inputUrl in job data!");
        }
        const response = await axios({
            url: job.data.inputUrl,
            responseType: "arraybuffer",
            validateStatus: (status) => status >= 200 && status < 300 // Accept only valid responses
        });
        const downloadedImagePath = path.join(__dirname,"..", "..", "uploads","/inputImages", `downloaded_${job.id}.jpeg`);
        fs.writeFileSync(downloadedImagePath, response.data);
        
        const metadata = await sharp(downloadedImagePath).metadata();

        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
            throw new Error(`Unsupported image format: ${metadata.format}`);
        }
        const outputPath = path.join(__dirname, "..", "..", "uploads","compressed", `compressed_${path.basename(job.id)}.jpeg`);

        await sharp(downloadedImagePath).jpeg({ quality: 50 }).toFile(outputPath); // reduce image quality by 50%

        const outputUrl = `http://localhost:3000/${outputPath}`;

        await Image.findOneAndUpdate({ requestId, productName, inputUrl }, { outputUrl, status: "processed" });

        const pendingImages = await Image.find({ requestId, status: "pending" }).countDocuments();

        if (pendingImages === 0) {
            await Request.findOneAndUpdate({ requestId }, { status: "completed" });
            
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


// worker.on("failed", (job, err) => {
//     console.error(`❌ Worker Error - Job ID: ${job?.id}, Reason: ${err?.message}`);
// });


module.exports = { imageQueue };