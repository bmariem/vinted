const express = require("express");
const router = express.Router();

const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const cloudinary = require("cloudinary").v2;

// configuation de Cloudinary
cloudinary.config({
  cloud_name: "ddlxp2yuy",
  api_key: "374294462748147",
  api_secret: "OfRmgvA7kdhq22ZqjNA2tG1NioM",
});

//import des modèles
const User = require("../models/User");

// Sign Up
router.post("/user/signup", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.fields.email,
    });

    if (user !== null) {
      res.status(400).json({
        message: "the email entered during registration already exists",
      });
    } else {
      if (!req.fields.username) {
        res.status(400).json({
          message: "You must fill in the username",
        });
      } else {
        const password = req.fields.password;

        const salt = uid2(16); // Générer un Salt

        const hash = SHA256(password + salt).toString(encBase64); //générer un HASH

        const token = uid2(16); //générer un token

        const newUser = new User({
          email: req.fields.email,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
          },

          token: token,
          hash: hash,
          salt: salt,
        });

        cloudAvatar = await cloudinary.uploader.upload(req.files.avatar.path, {
          folder: `vinted/avatarUsers/${newUser._id}`,
        });

        newUser.account.avatar = cloudAvatar;
        await newUser.save();
        res.json(newUser);
      }
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Log in
router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.fields.email,
    });

    if (user === null) {
      // email exist <=> no user
      res.status(400).json({
        message: "No account registered with this email !",
      });
    } else {
      // email exist <=> user exists in BDD

      const newHash = SHA256(req.fields.password + user.salt).toString(
        encBase64
      );
      // check password
      if (user.hash === newHash) {
        // Authorized access <=> we can connect

        res.status(200).json({
          id: user.id,
          token: user.token,
          account: {
            username: user.account.username,
            phone: user.account.phone,
          },
        });
      } else {
        //Unauthorized
        res.status(400).json({
          message: "Unauthorized : the password entered is incorrect",
        });
      }
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

module.exports = router;
