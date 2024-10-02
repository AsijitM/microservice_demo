const express = require("express");
const app = express();

const PORT = 3001;
const mongoose = require("mongoose");
const routes = require("./routes/route");

app.use(express.json());
app.use("/product", routes);

mongoose
  .connect("mongodb://0.0.0.0:27017/scan-product-service")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
