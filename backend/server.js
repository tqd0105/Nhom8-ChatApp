const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const {
  makeMessage,
  addGlobal,
  getGlobal,
  addRoom,
  getRoom,
} = require("./store");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

// CORS cho Express (trình duyệt/Live Server)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Socket.IO v4
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // cho phép Postman / mọi origin khi TEST
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // gửi lịch sử 50 tin gần nhất khi client mới kết nối
  socket.emit("history", getGlobal(50));

  // chat toàn cục
  socket.on("send_message", (data) => {
    // data: { username, message }
    const msg = makeMessage({ username: data.username, message: data.message });
    addGlobal(msg); // LƯU RAM
    io.emit("receive_message", msg); // PHÁT CHO TẤT CẢ
  });

  // (tùy chọn) phòng chat
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    socket.emit("history_room", { roomId, messages: getRoom(roomId, 50) });
  });

  socket.on("send_room_message", ({ roomId, username, message }) => {
    const msg = makeMessage({ username, message, roomId });
    addRoom(roomId, msg); // LƯU THEO PHÒNG
    io.to(roomId).emit("receive_message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Serve static (không ảnh hưởng Postman)
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = process.env.PORT || 3000;

// Lấy lịch sử global: GET /api/messages?limit=20
app.get("/api/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  res.json(getGlobal(limit));
});

// Lấy lịch sử 1 phòng: GET /api/rooms/:roomId/messages?limit=20
app.get("/api/rooms/:roomId/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  res.json(getRoom(req.params.roomId, limit));
});

server.listen(PORT, () => {
  console.log(`🚀 Chat Server is running at http://localhost:${PORT}`);
});
