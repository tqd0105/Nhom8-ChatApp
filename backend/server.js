const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

// Khởi tạo Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "localhost:3000",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files từ frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Khởi động server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat Server is running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: Ready for connections`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

module.exports = { app, server };
