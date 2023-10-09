require("dotenv").config(); // Load environment variables from .env file

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const app = express();
const stripeApiKey = process.env.STRIPE_SECRET_KEY; // Use the environment variable

const corsOptions = {
  origin: "http://localhost:4200",
};

app.use(cors(corsOptions));

app.use(express.json());

app.get("/api/products", async (req, res) => {
  const stripe = new Stripe(stripeApiKey);
  const prices = await stripe.prices.list({
    limit: 10,
  });

  const productsWithImages = prices.data.map(async (price) => {
    const product = await stripe.products.retrieve(price.product);
    return {
      price: price,
      product: product,
      imageUrl: product.images[0],
      quantity: 0,
    };
  });

  const products = await Promise.all(productsWithImages);

  res.json(products);
});

app.post("/api/paymentshipping", async (req, res) => {
  const stripe = new Stripe(stripeApiKey);

  const { shippingAddress, products } = req.body;

  try {
    const lineItems = products.map((product) => ({
      price: product.priceId,
      quantity: product.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      // Include shipping address information
      shipping_address_collection: {
        allowed_countries: ["BE"], // List of allowed countries
      },
      success_url: "http://localhost:4200/success-payment",
      cancel_url: "http://localhost:4200/cancel-payment",
    });

    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, (err) => {
  if (!err) {
    console.log("Server is running on port 3000");
  } else {
    console.error(err);
  }
});
