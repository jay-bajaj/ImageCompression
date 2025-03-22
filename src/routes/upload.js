const express = require("express");
const multer = require("multer");
const router = express.Router();

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         return cb(null, '/uploads')
//     },
//     filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//     cb(null, file.fieldname + '-' + uniqueSuffix)
//     }
// })

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req,res)=>{
    
    console.log("Received request:", req.body); 
    console.log("Received file:", req.file);
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    // console.log("file uploading");

    res.json({ message: "File uploaded", filename: req.file.filename });
})

module.exports = router;