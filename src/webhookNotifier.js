const axios = require("axios");
require("dotenv").config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || ""; 

async function sendWebhookNotification(requestId, status) {
    if (!WEBHOOK_URL) {
        console.warn("WEBHOOK_URL is not set. Skipping webhook notification.");
        return;
    }

    const payload = {
        requestId,
        status
    };

    try {
        console.log(`Sending webhook for Request ID: ${requestId} to ${WEBHOOK_URL}`);

        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 5000 // 5 seconds timeout
        });

        console.log(`Webhook sent successfully! Response: ${response.status}`);
    } catch (error) {
        console.error(`Webhook failed: ${error.message}`);
    }
}

module.exports = sendWebhookNotification;