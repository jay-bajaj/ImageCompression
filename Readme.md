Conponents

API Gateway:
Exposes endpoints for uploading CSV, checking status, and downloading results.

CSV Validator:
Validates uploaded CSV files before processing.

Job Queue (BullMQ):
Manages image processing tasks asynchronously using Redis.

Worker Service:
Fetches images, compresses them, updates the database, and generates CSVs.

Database (MongoDB):
Stores request details, image status, and processed image paths.

Webhook Service:
Sends a notification when all images are processed.

CSV Generator:
Creates output CSVs with processed image details.


Workflow


Step 1: Upload CSV (/upload)
User uploads a CSV file (local or GitHub URL).
Parse CSV( done in csvValidator.js ) → Extract Product Name & Image URLs.
Create a requestId & store request status as pending in MongoDB.
Validate CSV structure before processing.
Add image processing jobs to BullMQ queue.
Return requestId to the user.


Step 2: Process Images (Worker Service)
Worker picks jobs from BullMQ.
Download image from inputUrl or use local file path.
Compress the image using sharp.
Save processed image path (outputUrl).
Update MongoDB (mark image as processed).
If all images are processed, update request status & generate CSV file.
Trigger Webhook (webhook url : https://webhook.site/4acb3b90-2bc6-445b-bcf2-2c1ca4c29042)


Step 3: Check Status (/status/{requestId})
Query MongoDB for the status of requestId.
Return JSON with status, processedImages, and totalImages.


Step 4: Generate CSV 
Fetch processed images from MongoDB.
Group images by product name (same row for multiple URLs).
Write to CSV file (output_{requestId}.csv).



Testing USing Postman


On local it will be available on :  localhost:3000

Postman APIs are present at this path: 

https://raw.githubusercontent.com/jay-bajaj/ImageCompression/refs/heads/master/New%20Collection.postman_collection.json

https://imagecompression-qwac.onrender.com/upload
Select raw in body and set JSON:
{
  "csvUrl": "https://raw.githubusercontent.com/jay-bajaj/ImageCompression/refs/heads/master/sample_data.csv"
}

On local 
http://localhost:3000/upload


Form-data in Body and select file type as file and key as “file”



Get Status

On local:   http://localhost:3000/status/431e3ff7-3450-4419-9510-9da691e174a4


