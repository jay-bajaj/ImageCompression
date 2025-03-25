const { Queue, Worker } = require("bullmq");
const Image = require("../models/imageModel");
const Request = require("../models/requestModel");
const sharp = require('sharp');
const path = require("path");
const Redis = require("ioredis");
const generateCSV = require("../utils/generateCSV");
const sendWebhookNotification = require("../webhookNotifier");
const getInputFilePath = require("../utils/getInputImage");
require("dotenv").config();

const redisURL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const connection = new Redis(redisURL, {
    tls: redisURL.startsWith("rediss://") ? {} : undefined, 
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

            if (!inputUrl) {
                throw new Error("ERROR: Missing inputUrl in job data!");
            }
    
            let inputFilePath;
            try {
                inputFilePath = await getInputFilePath(inputUrl, job.id);
            } catch (error) {
                console.error(`Skipping Job ID ${job.id}: ${error.message}`);
                return;
            }
            
            const outputPath = path.join(__dirname, "..", "..", "uploads","compressed", `compressed_${path.basename(job.id)}.jpeg`);
    
            await sharp(inputFilePath).jpeg({ quality: 50 }).toFile(outputPath); // reduce image quality by 50% and store in database
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
            await sendWebhookNotification(requestId, "completed"); // Trigger Webhook Notification
        }

    } catch (error) {
        console.log("Error fetching image:", error);

        throw error;
    }

},  {connection, concurrency: 10}
);


worker.on("failed", (job, err) => {
    console.error(`Worker Error - Job ID: ${job?.id}, Reason: ${err?.message}`);
});


module.exports = { imageQueue };