const axios = require("axios");
const path = require("path");
const fs = require("fs");

async function getInputFilePath(inputUrl, jobId) {
    let inputFilePath;

    if (inputUrl.startsWith("http")) {
        //Remote Image: Download it
        try {
            console.log(`🌍 Downloading image from: ${inputUrl}`);

            const response = await axios({
                url: inputUrl,
                responseType: "arraybuffer",
                validateStatus: (status) => status >= 200 && status < 300
            });

            const inputImagesDir = path.join(__dirname, "..", "..", "uploads", "inputImages");
            if (!fs.existsSync(inputImagesDir)) fs.mkdirSync(inputImagesDir, { recursive: true });

            inputFilePath = path.join(inputImagesDir, `downloaded_${path.basename(jobId)}.jpeg`);
            fs.writeFileSync(inputFilePath, response.data);
        } catch (error) {
            console.error(`Invalid Image (404 or Unreachable): ${inputUrl}`);
            throw new Error(`Failed to download image: ${inputUrl}`);
        }
    } else {
        // Local Image: Use the existing file path
        // console.log(`📂Using local image: ${inputUrl}`);
        inputFilePath = path.resolve(inputUrl);

        if (!fs.existsSync(inputFilePath)) {
            throw new Error(`Local file not found: ${inputFilePath}`);
        }
    }

    return inputFilePath;
}

module.exports = getInputFilePath;
