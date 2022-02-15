const express = require("express");
const router = express.Router();
const createStripe = require("stripe");
const formidableMiddleware = require("express-formidable");
router.use(formidableMiddleware());

const stripe = createStripe(process.env.STRIPE_API_SECRET);

router.post("/payment", async (req, res) => {
  try {
    let { status } = await stripe.charges.create({
      amount: (req.fields.amount * 100).toFixed(0),
      currency: "eur",
      description: `Paiement vinted pour : ${req.fields.title}`,
      source: req.fields.token,
    });

    // Payment done <=> update DB
    res.json({ status });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
