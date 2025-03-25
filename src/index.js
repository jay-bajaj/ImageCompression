const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const uploadRoutes = require("./routes/upload");
const statusRoutes = require("./routes/status");

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URL).then(()=>{
    console.log("Database connected");
}).catch((error)=> {
    console.log(error);
});

app.use("/upload", uploadRoutes);
app.use("/status", statusRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
