const axios = require("axios");
const path = require("path");
const fs = require("fs");

async function getInputFilePath(inputUrl, jobId) {
    let inputFilePath;

    if (inputUrl.startsWith("http")) {
        // Remote Image: Download it
        try {
            console.log(`🌍 Downloading image from: ${inputUrl}`);
    
            const response = await axios({
                url: inputUrl,
                responseType: "arraybuffer",
                validateStatus: (status) => status >= 200 && status < 300,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });
    
            const inputImagesDir = path.join(__dirname, "..", "..", "uploads", "inputImages");
            if (!fs.existsSync(inputImagesDir)) fs.mkdirSync(inputImagesDir, { recursive: true });
    
            inputFilePath = path.join(inputImagesDir, `downloaded_${path.basename(jobId)}.jpeg`);
            fs.writeFileSync(inputFilePath, response.data);
            console.log(`✅ Image downloaded successfully: ${inputFilePath}`);
        } catch (error) {
            console.error(`❌ Invalid Image (404 or Unreachable): ${inputUrl}`);
            throw new Error(`Failed to download image: ${inputUrl} - ${error.message}`);
        }
    } else {
        // Local Image: Use the existing file path
        inputFilePath = path.resolve(inputUrl);
    
        if (!fs.existsSync(inputFilePath)) {
            throw new Error(`❌ Local file not found: ${inputFilePath}`);
        }
    }
    
    return inputFilePath;
}

module.exports = getInputFilePath;
