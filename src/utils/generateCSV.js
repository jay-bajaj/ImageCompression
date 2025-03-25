const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const Image = require("../models/imageModel");

async function generateCSV(requestId) {
    const images = await Image.find({ requestId });

    if (!images.length) {
        console.log(`No processed images found for requestId: ${requestId}`);
        return;
    }

    const csvFilePath = path.join(__dirname, "..", "..", "uploads", "output", `output_${requestId}.csv`);

    const csvFields = ["Serial Number", "Product Name", "Input Image Urls", "Output Image Urls"];
    const csvParser = new Parser({ fields: csvFields });

    //Group images by Serial Number
    const groupedData = {};
    
    images.forEach(image => {
        if (!groupedData[image.serialNumber]) {
            groupedData[image.serialNumber] = {
                "Serial Number": image.serialNumber,
                "Product Name": image.productName,
                "Input Image Urls": [],
                "Output Image Urls": []
            };
        }
        
        groupedData[image.serialNumber]["Input Image Urls"].push(image.inputUrl);
        groupedData[image.serialNumber]["Output Image Urls"].push(image.outputUrl || "Processing Failed");
    });

    // 🔹 Convert grouped data into an array for CSV
    const csvData = Object.values(groupedData).map(entry => ({
        "Serial Number": entry["Serial Number"],
        "Product Name": entry["Product Name"],
        "Input Image Urls": entry["Input Image Urls"].join(", "),  // Convert array to string
        "Output Image Urls": entry["Output Image Urls"].join(", ") // Convert array to string
    }));

    const csvContent = csvParser.parse(csvData);
    
    fs.writeFileSync(csvFilePath, csvContent);

    console.log(`✅ Output CSV generated: ${csvFilePath}`);
}

module.exports = generateCSV;