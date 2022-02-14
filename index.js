// activer les var d'ENV <=> avoir acces à process.env
require("dotenv").config();

const express = require("express");
const formidable = require("express-formidable");

const mongoose = require("mongoose");
const cors = require("cors");

// configuation de Cloudinary
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

// Création du seveur
const app = express();
app.use(formidable());

// Autoriser les requetes entre mon API et autres sites externes
app.use(cors());

// Création de la BDD
mongoose.connect(process.env.MONGODB_URI);

app.get("/", async (req, res) => {
  res.status(200).json("Welcome on Vinted API !");
});

//import des routes
const usersRoutes = require("./routes/users");
app.use(usersRoutes);

const offersRoutes = require("./routes/offers");
app.use(offersRoutes);

app.all("*", (req, res) => {
  res.status(404).json("Page not found !");
});

app.listen(process.env.PORT, () => {
  console.log("Server has started 🚀");
});
