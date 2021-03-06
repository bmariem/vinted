const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

// import du model Offer
const Offer = require("../models/Offer");

// import du middleware isAuthenticated
const isAuthenticated = require("../middleware/isAuthenticated");

// Route that allows us to retrieve a list of announcements, based on filters
// If no filter is sent, this route will return all announcements
router.get("/offers", async (req, res) => {
  try {
    const filters = {
      limit: 3,
      title: req.query.title ? req.query.title : "",
      priceMin: req.query.priceMin ? Number(req.query.priceMin) : 0,
      priceMax: req.query.priceMax ? Number(req.query.priceMax) : 100000,
      sort: req.query.sort ? req.query.sort : "",
      page: req.query.page ? Number(req.query.page) : 0,
    };

    const offers = await Offer.find({
      product_price: { $gte: filters.priceMin, $lte: filters.priceMax },
      product_name: new RegExp(filters.title, "i"),
    }) // select in the DB all the documents whose price will be between min and max entered and whose name is the title entered

      .populate({
        path: "owner",
        select: "account",
      }) // link an offer to its owner
      .sort({ product_price: filters.sort.replace("price-", "") }) // sort the result in asc or desc price order
      .limit(filters.limit) // limit the result to 3 documents per page
      .skip(filters.limit * filters.page) // skip on each page the number of documents already displayed in the previous page(s)
      .select("product_name product_price"); // show result by name and price

    const allExistingOffers = await Offer.countDocuments(filters);
    res.status(200).json({ count: allExistingOffers, offers: offers });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// get the information of an offer according to its id
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone account.avatar",
    });

    if (offer == null) {
      res.status(400).json({ message: "Offer does not exists" });
    } else {
      res.status(200).json(offer);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// publish an offer
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, description, price, brand, size, condition, color, city } =
      req.fields;
    if (title && price && req.files.picture.path) {
      // create a new offer
      const newOffer = await new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ??TAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.user,
      });

      // Upload image from cloudinary
      const imageToUpload = req.files.picture.path;
      const imageCloud = await cloudinary.uploader.upload(imageToUpload, {
        folder: `vinted/offers/${newOffer._id}`,
      });

      newOffer["product_image"] = imageCloud;
      await newOffer.save();

      res.status(200).json(newOffer);
    } else {
      res
        .status(400)
        .json({ message: "title, price and picture are required" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json(error.message);
  }
});

// update an offer
router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  try {
    // verify if offer exists
    const offer = await Offer.findById(req.params.id);

    if (offer === null) {
      res.status(400).json({ message: " Offer not found" });
    } else {
      // Offer exists :
      // Update product_name : max 50 caract??res
      if (req.fields.product_name) {
        if (req.fields.product_name.length >= 50) {
          res.status(400).json({ message: "50 caract??res max pour le titre" });
        } else {
          offer.product_name = req.fields.product_name;
        }
      }

      // Update product_description : 500 caract??res
      if (req.fields.product_description) {
        if (req.fields.product_description.length >= 500) {
          res
            .status(400)
            .json({ message: "500 caract??res max pour la description" });
        } else {
          offer.product_description = req.fields.product_description;
        }
      }

      // Update product_price : 100000
      if (req.fields.product_price) {
        if (req.fields.product_price.length >= 100000) {
          res.status(400).json({ message: "Maximum de Prix est 100000 euros" });
        } else {
          offer.product_price = req.fields.product_price;
        }
      }

      // update image
      if (req.files.picture.path) {
        const imageCloud = await cloudinary.uploader.upload(
          req.files.picture.path,
          "vinted_upload",
          {
            folder: `vinted/offers/${newOffer._id}`,
            public_id: "preview",
          }
        );
        offer["product_image"] = imageCloud;
      }

      // update product_details
      const details = offer.product_details;
      for (i = 0; i < details.length; i++) {
        if (details[i].MARQUE) {
          if (req.fields.brand) {
            details[i].MARQUE = req.fields.brand;
          }
        }
        if (details[i].TAILLE) {
          if (req.fields.size) {
            details[i].TAILLE = req.fields.size;
          }
        }
        if (details[i].??TAT) {
          if (req.fields.condition) {
            details[i].??TAT = req.fields.condition;
          }
        }
        if (details[i].COULEUR) {
          if (req.fields.color) {
            details[i].COULEUR = req.fields.color;
          }
        }
        if (details[i].EMPLACEMENT) {
          if (req.fields.location) {
            details[i].EMPLACEMENT = req.fields.location;
          }
        }
      }

      // Notifie Mongoose que l'on a modifi?? le tableau product_details
      offer.markModified("product_details");
    }

    await offer.save();
    res.status(200).json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

// delete an offer
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const offer = await Offer.findOneAndDelete({ id: req.params.id });
    if (offer === null) {
      // delete all images in cloudinary folder
      await cloudinary.api.delete_resources_by_prefix(
        `vinted/offers/${req.params.id}`
      );
      // empty folder => delete it
      await cloudinary.api.delete_folder(`vinted/offers/${req.params.id}`);

      res.status(200).json({ message: "Offer successfully deleted !" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
