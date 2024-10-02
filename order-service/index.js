const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/Order");
const amqp = require("amqplib");

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect("mongodb://0.0.0.0:27017/scan-order-service")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

let channel, connection;

async function connectToRabbitMQ() {
  const amqpServer = "amqp://user:password@localhost:5673";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue("order-service-queue");
}

createOrder = async (products) => {
  let total = 0;
  products.forEach((product) => {
    total += product.price * product.quantity;
  });

  const order = await new Order({
    products,
    totalPrice: total,
  });

  await order.save();
  return order;
};

connectToRabbitMQ().then(() => {
  channel.consume("order-service-queue", (data) => {
    console.log("Consumed from order-service-queue", data.content.toString());
    const { products } = JSON.parse(data.content.toString());
    const newOrder = createOrder(products);
    channel.ack(data);
    channel.sendToQueue(
      "product-service-queue",
      Buffer.from(JSON.stringify(newOrder))
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
