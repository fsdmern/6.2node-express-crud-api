const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const app = express();
let corsOptions = {
  origin: process.env.CLIENT_ORIGIN,
};

dotenv.config();
app.use(cors(corsOptions));
app.use(cookieParser());

//Test Env Params
console.log("Port No: " + process.env.SERVER_PORT);

// Parse requests of content type: "application/json"
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Default route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to NodeJS Restful API Default Route" });
});

//api-routes
app.use("/accounts", require("./accounts/account.controller"));

const PORT = process.env.NODE_ENV === "production" ? process.env.SERVER_PORT || 80 : 5000;

app.listen(PORT, () => {
  console.log(`NodeJS Server is running on Port: ${PORT}`);
});
