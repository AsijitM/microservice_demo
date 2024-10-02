const router = require("express").Router();
const Product = require("../models/product.js");
const amqp = require("amqplib");

let connection, channel, order;

async function connectToRabbitMQ() {
  try {
    const amqpServer = "amqp://user:password@localhost:5673";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("product-service-queue");

    // Set up the consumer once
    channel.consume("product-service-queue", (data) => {
      console.log(
        "Consumed from product-service-queue",
        data.content.toString()
      );

      order = JSON.parse(data.content.toString()); // Corrected JSON parsing
      // Process the order as needed...
      channel.ack(data);
    });

    return channel;
  } catch (err) {
    console.error("Failed to connect to RabbitMQ:", err);
  }
}

connectToRabbitMQ();

// Create a product
router.post("/", async (req, res) => {
  const { name, price, quantity } = req.body;
  if (!name || !price || !quantity) {
    return res
      .status(400)
      .json({ message: "Please provide all the required fields" });
  }

  try {
    const newProduct = new Product({ name, price, quantity });
    await newProduct.save();
    return res.status(201).json({ message: "Product created successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error saving product", error: err.message });
  }
});

router.post("/buy", async (req, res) => {
  try {
    const { productIds } = req.body;
    const products = await Product.find({ _id: { $in: productIds } });

    channel.sendToQueue(
      "order-service-queue",
      Buffer.from(JSON.stringify({ products }))
    );

    channel.consume("product-service-queue", (data) => {

      try {
        const messageContent = data.content.toString();
        const order = JSON.parse(messageContent);
        console.log("Processed order:", order);
      } catch (error) {
        console.error("Failed to parse message:", error.message);
      } finally {
        channel.ack(data);
      }
    });

    return res.status(201).json({ message: "Order created successfully" });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "Error processing order", error: error.message });
  }
});

module.exports = router;
