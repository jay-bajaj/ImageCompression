const fs = require("fs");
const csvParser = require("csv-parser");

// Expected CSV Headers
const REQUIRED_HEADERS = ["Serial Number", "Product Name", "Input Image Urls"];

// Function to Validate Image URL or Local Path
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Function to Validate CSV File
async function validateCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        const errors = [];
        let headersValidated = false;
        let headersError = null;

        filePath
            .pipe(csvParser())
            .on("headers", (headers) => {
                const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    headersError = `Missing or incorrect headers: ${missingHeaders.join(", ")}. Expected headers: "Serial Number", "Product Name", "Input Image Urls"`;
                }
                headersValidated = true;
            })
            .on("data", (row) => {
                if (headersError) return; // Stop processing if headers are invalid

                if (!row["Product Name"] || !row["Input Image Urls"]) {
                    errors.push(`Invalid row: ${JSON.stringify(row)}`);
                    return;
                }

                const inputUrls = row["Input Image Urls"].split(",").map(url => url.trim());
                inputUrls.forEach(url => {
                    if (!isValidUrl(url) && !fs.existsSync(url)) {
                        errors.push(`Invalid URL or file path: ${url}`);
                    }
                });

                results.push(row);
            })
            .on("end", () => {
                if (headersError) return reject({ error: headersError });
                if (errors.length > 0) return reject({ errors });
                resolve(results);
            })
            .on("error", (error) => {
                console.error("CSV Parsing Error:", error);
                reject({ error: "CSV parsing failed" });
            });
    });
}

module.exports = { validateCSV };
