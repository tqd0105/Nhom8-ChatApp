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

// ===== In-memory room members (RAM) =====
const roomMembers = new Map();          // roomId -> Set<socket.id>
function getMembers(roomId) {
  return Array.from(roomMembers.get(roomId) || []);
}
function addMember(roomId, sid) {
  const set = roomMembers.get(roomId) || new Set();
  set.add(sid);
  roomMembers.set(roomId, set);
}
function removeMember(roomId, sid) {
  const set = roomMembers.get(roomId);
  if (!set) return;
  set.delete(sid);
  if (set.size === 0) roomMembers.delete(roomId); // dọn phòng rỗng
}


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Gửi history global khi connect (giữ như hiện tại)
  socket.emit("history", getGlobal(50));

   socket.on("send_message", (data = {}) => {
    const username = String(data.username || "Anonymous").trim().slice(0, 40);
    const message  = String(data.message  || "").trim();
    if (!message) return;

    const msg = makeMessage({ username, message });
    addGlobal(msg);                 // lưu RAM (global)
    io.emit("receive_message", msg); // phát cho tất cả client
  });

  // Optional: lưu tạm username vào socket.data
  socket.on("set_username", (name) => {
    socket.data.username = String(name || "Anonymous").trim().slice(0, 40);
  });

  // JOIN ROOM
  socket.on("join_room", ({ roomId, username } = {}) => {
    roomId = String(roomId || "").trim();
    if (!roomId) return;

    // cập nhật username
    socket.data.username = String(username || socket.data.username || "Anonymous")
                             .trim().slice(0, 40);

    socket.join(roomId);
    addMember(roomId, socket.id);

    // gửi lịch sử phòng cho chính người mới
    socket.emit("history_room", { roomId, messages: getRoom(roomId, 50) });

    // system message + broadcast
    const sysMsg = makeMessage({
      username: "[system]",
      message: `${socket.data.username} joined`,
      roomId
    });
    addRoom(roomId, sysMsg);
    io.to(roomId).emit("receive_message", sysMsg);

    // cập nhật danh sách thành viên
    io.to(roomId).emit("room_users", { roomId, members: getMembers(roomId) });
  });

  // GỬI TIN TRONG PHÒNG (bạn đã có — giữ nguyên, thêm username từ socket.data)
  socket.on("send_room_message", ({ roomId, username, message } = {}) => {
    roomId = String(roomId || "").trim();
    const name = String(username || socket.data.username || "Anonymous").trim().slice(0, 40);
    const text = String(message || "").trim();
    if (!roomId || !text) return;

    socket.data.username = name;

    const msg = makeMessage({ username: name, message: text, roomId });
    addRoom(roomId, msg);
    io.to(roomId).emit("receive_message", msg);
  });

  // LEAVE ROOM
  socket.on("leave_room", ({ roomId } = {}) => {
    roomId = String(roomId || "").trim();
    if (!roomId) return;

    socket.leave(roomId);
    removeMember(roomId, socket.id);

    const sysMsg = makeMessage({
      username: "[system]",
      message: `${socket.data.username || "Someone"} left`,
      roomId
    });
    addRoom(roomId, sysMsg);
    io.to(roomId).emit("receive_message", sysMsg);

    io.to(roomId).emit("room_users", { roomId, members: getMembers(roomId) });
  });

  // KHI NGẮT KẾT NỐI → rời tất cả phòng
  socket.on("disconnect", () => {
    for (const [roomId, set] of roomMembers.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        if (set.size === 0) roomMembers.delete(roomId);

        const sysMsg = makeMessage({
          username: "[system]",
          message: `${socket.data.username || "Someone"} disconnected`,
          roomId
        });
        addRoom(roomId, sysMsg);
        io.to(roomId).emit("receive_message", sysMsg);
        io.to(roomId).emit("room_users", { roomId, members: getMembers(roomId) });
      }
    }
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

// ==== REST API ====

// 0) Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

// 1) Global messages (đọc / gửi)
app.get("/api/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  res.json(getGlobal(limit));
});

app.post("/api/messages", (req, res) => {
  const username = String(req.body.username || "Anonymous").trim().slice(0, 40);
  const message  = String(req.body.message  || "").trim();
  if (!message) return res.status(400).json({ error: "message is required" });

  const msg = makeMessage({ username, message });
  addGlobal(msg);
  io.emit("receive_message", msg);       // phát realtime cho mọi client
  res.status(201).json(msg);
});

// 2) Rooms listing + stats (dựa vào roomMembers RAM)
app.get("/api/rooms", (_req, res) => {
  // roomMembers: Map<roomId, Set<socketId>>
  const rooms = Array.from(roomMembers.entries()).map(([roomId, set]) => ({
    roomId,
    memberCount: set.size
  }));
  res.json(rooms);
});

// 3) Room messages (đọc / gửi)
app.get("/api/rooms/:roomId/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  res.json(getRoom(req.params.roomId, limit));
});

app.post("/api/rooms/:roomId/messages", (req, res) => {
  const roomId   = String(req.params.roomId || "").trim();
  const username = String(req.body.username || "Anonymous").trim().slice(0, 40);
  const message  = String(req.body.message  || "").trim();
  if (!roomId)  return res.status(400).json({ error: "roomId is required" });
  if (!message) return res.status(400).json({ error: "message is required" });

  const msg = makeMessage({ username, message, roomId });
  addRoom(roomId, msg);
  io.to(roomId).emit("receive_message", msg); // phát cho room
  res.status(201).json(msg);
});

// 4) Room members
app.get("/api/rooms/:roomId/members", (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  const ids = Array.from(roomMembers.get(roomId) || []);
  res.json({ roomId, members: ids });
});


server.listen(PORT, () => {
  console.log(`🚀 Chat Server is running at http://localhost:${PORT}`);
});
