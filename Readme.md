# Asynchronous Image Processing System

## Overview
This project is an asynchronous image processing system built using **Node.js**. It efficiently processes images from a CSV file, compresses them, and stores the results. The system provides REST APIs for uploading CSVs, checking processing statuses, and downloading results. Additionally, it supports webhook notifications for completed processing.

## Key Components

- **API Gateway**: Exposes endpoints for CSV uploads, status checks, and result downloads.
- **CSV Validator**: Ensures the correctness of the uploaded CSV structure.
- **Job Queue (BullMQ)**: Manages image processing tasks asynchronously using Redis.
- **Worker Service**: Handles image downloading, compression (using Sharp), database updates, and CSV generation.
- **Database (MongoDB)**: Stores request details, image statuses, and processed image paths.
- **Webhook Service**: Sends a notification when all images in a request are processed.
- **CSV Generator**: Generates an output CSV with processed image details.

## Workflow

### Step 1: Upload CSV (`/upload`)
- Users upload a CSV file (local file or via GitHub URL).
- The **CSV Validator** extracts the product name and image URLs.
- A `requestId` is created, and the request status is set to **pending** in MongoDB.
- Validates the CSV structure before processing.
- Adds image processing jobs to **BullMQ**.
- Returns `requestId` to the user.

### Step 2: Process Images (Worker Service)
- Worker service picks up jobs from **BullMQ**.
- Downloads images from the provided URL or local path.
- Compresses images using **Sharp**.
- Saves the processed image path (`outputUrl`).
- Updates MongoDB, marking images as **processed**.
- If all images are processed:
  - The request status is updated.
  - A CSV file is generated.
  - A webhook is triggered (`https://webhook.site/4acb3b90-2bc6-445b-bcf2-2c1ca4c29042`).

### Step 3: Check Status (`/status/{requestId}`)
- Queries MongoDB for the given `requestId`.
- Returns JSON containing:
  - **Status**
  - **Processed Images Count**
  - **Total Images Count**

### Step 4: Generate Output CSV
- Fetches processed images from MongoDB.
- Groups images by **product name** (same row for multiple URLs).
- Writes the output CSV (`output_{requestId}.csv`).

## API Endpoints

### Upload CSV
- **Local:** `http://localhost:3000/upload`
- **Deployed:** `https://imagecompression-qwac.onrender.com/upload`
- **Request Body (JSON):**
  ```json
  {
    "csvUrl": "https://raw.githubusercontent.com/jay-bajaj/ImageCompression/refs/heads/master/sample_data.csv"
  }
  ```
- **Alternative:** Upload via `form-data` with the key **file**.

### Check Status
- **Local:** `http://localhost:3000/status/{requestId}`

## Testing via Postman
- The Postman collection is available [here](https://raw.githubusercontent.com/jay-bajaj/ImageCompression/refs/heads/master/New%20Collection.postman_collection.json).

## Local Development
- Run the service on `http://localhost:3000`.
- Ensure **MongoDB** and **Redis** are running.
- Start the application using:
  ```sh
  npm install
  npm start
  ```

