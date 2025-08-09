const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS cho Express (trình duyệt/Live Server)
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Socket.IO v4
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",                 // cho phép Postman / mọi origin khi TEST
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // gửi chào mừng để dễ kiểm tra client nhận được gì
  socket.emit("receive_message", { username: "server", message: "connected!" });

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

  });
});

// Serve static (không ảnh hưởng Postman)
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat Server is running on port ${PORT}`);
});
