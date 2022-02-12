const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

// import du model Offer
const Offer = require("../models/Offer");

// import du middleware isAuthenticated
const isAuthenticated = require("../middleware/isAuthenticated");

// publish an offer
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  // creer une nouvelle offre

  try {
    //product_name : max 50 caractères
    if (req.fields.product_name.length >= 50) {
      res.status(400).json({ message: "50 caractères max pour le titre" });
    }
    //product_description : 500 caractères
    if (req.fields.product_description.length >= 500) {
      res
        .status(400)
        .json({ message: "500 caractères max pour la description" });
    }
    // product_price : 100000
    if (req.fields.product_price.length >= 100000) {
      res.status(400).json({ message: "Maximum de Prix est 100000 euros" });
    }

    // creation d'une nouvelle Offre
    const newOffer = await new Offer({
      product_name: req.fields.product_name,
      product_description: req.fields.product_description,
      product_price: req.fields.product_price,
      product_details: [
        { ETAT: req.fields.condition },
        { TAILLE: req.fields.size },
        { EMPLACEMENT: req.fields.city },
        { COULEUR: req.fields.color },
        { MARQUE: req.fields.brand },
      ],
      owner: req.user,
    });

    // Upload image from cloudinary
    const imageToUpload = req.files.product_image.path;

    const imageCloud = await cloudinary.uploader.upload(imageToUpload, {
      public_id: `vinted/offers/${newOffer._id}`,
    });

    newOffer["product_image"] = imageCloud;
    newOffer.save();
    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// update an offer
router.put("/offer/update", isAuthenticated, async (req, res) => {
  try {
    // verifier l'existance de l'offre
    const offer = await Offer.findById(req.query.id);

    if (offer === null) {
      res.status(400).json({ message: " Offer not found" });
    } else {
      // Offer exists :
      //Update product_name : max 50 caractères
      if (req.fields.product_name) {
        if (req.fields.product_name.length >= 50) {
          res.status(400).json({ message: "50 caractères max pour le titre" });
        } else {
          offer.product_name = req.fields.product_name;
        }
      }

      //Update product_description : 500 caractères
      if (req.fields.product_description) {
        if (req.fields.product_description.length >= 500) {
          res
            .status(400)
            .json({ message: "500 caractères max pour la description" });
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
      if (req.files.product_image.path) {
        const imageCloud = await cloudinary.uploader.upload(
          req.files.product_image.path,
          {
            public_id: `vinted/offers/${offer._id}`,
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
        if (details[i].ÉTAT) {
          if (req.fields.condition) {
            details[i].ÉTAT = req.fields.condition;
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

      // Notifie Mongoose que l'on a modifié le tableau product_details
      offer.markModified("product_details");
    }

    await offer.save();
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// delete an offer
router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const offer = await Offer.findOneAndDelete({ id: req.query.id });
    if (offer === null) {
      res.status(200).json({ message: "Offer successfully deleted !" });
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

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
    }) // selectionner dans le BDD tous les documents dont le prix seront entre min et max renseigné et dont le nom est le titre rensigne
      .sort({ product_price: filters.sort.replace("price-", "") }) // trier le resulat par ordre de prix croissant ou decroissant
      .limit(filters.limit) // limiter le resulat a 3 document par page
      .skip(filters.limit * filters.page) // skip a chaque page le nombre de document deja affiché dans la/les page precedents
      .select("product_name product_price"); // afficher le resulat par le nom et le prix

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
    res.json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
