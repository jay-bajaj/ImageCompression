const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const uploadRoutes = require("./routes/upload");
const statusRoutes = require("./routes/status");

dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(()=>{
    console.log("Database connected");
}).catch((error)=> {
    console.log(error);
});

app.use("/upload", uploadRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
