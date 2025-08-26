const express = require("express");
const createError = require('http-errors');
const logger = require('./logger');
const pinoHttp = require('pino-http')({ logger });
const http = require("http");
const path = require("path");
const cors = require("cors");
const { randomUUID } = require('crypto');
const {
  makeMessage,
  addGlobal,
  getGlobal,
  addRoom,
  getRoom,
  clearAllMessages,
  clearAllGlobalMessages,
  clearAllRoomMessages,
} = require("./store");

// Import auth routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const auth = require('./middleware/auth');

require("dotenv").config();

const app = express();
const server = http.createServer(app);

// request-id cho mỗi request (trả lại header để trace)
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

// log mọi request
app.use(pinoHttp);

// CORS cho Express (trình duyệt/Live Server)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

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
function emitToAll(event, payload) {
  io.emit(event, payload);
}
function getUserProfile(socket) {
  return {
    userId: socket.data.profile.userId,
    username: socket.data.profile.username || "Anonymous",
    avatar: socket.data.profile.avatar || "",
  };
}

// ===== Presence (online users) =====
const onlineUsers = new Map(); // socketId -> { userId, username, avatar }
const getOnline = () => Array.from(onlineUsers.values());
const broadcastOnline = () => io.emit("online_users", getOnline());

function addOnline(socket) {
  const p = socket.data.profile || {};
  onlineUsers.set(socket.id, {
    userId: p.userId,
    username: p.username,
    avatar: p.avatar
  });
}

function updateOnlineFromSocket(socket) {
  const p = socket.data.profile || {};
  onlineUsers.set(socket.id, {
    userId: p.userId,
    username: p.username,
    avatar: p.avatar
  });
  broadcastOnline();
}

function removeOnline(socket) {
  onlineUsers.delete(socket.id);
  broadcastOnline();
}




io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  registerSocketEvents(socket);

  // LOG MỌI EVENT TỪ SOCKET NÀY
  socket.onAny((event, ...args) => {
    console.log("[onAny]", socket.id, event, args);
  });

  socket.data.profile = {
    userId: socket.id,
    username: "Anonymous",
    avatar: null, // FE có thể gán link avatar sau
  };
  addOnline(socket);
  socket.emit("online_users", getOnline()); // gửi cho chính client
  broadcastOnline();                        // phát cho mọi người

  // Gửi history global khi connect (giữ như hiện tại)
  socket.emit("history", getGlobal(50));
});

function safeOn(socket, event, handler) {
  socket.on(event, async (...args) => {
    try {
      await handler(...args);
    } catch (err) {
      logger.error({ err, sid: socket.id, event }, 'socket handler error');
      socket.emit('error', { message: 'Internal error', event });
    }
  });
}

// Move the function definition outside of io.on("connection")
function registerSocketEvents(socket) {
  safeOn(socket, "set_profile", async (data = {}) => {
    socket.data.profile = { ...socket.data.profile, ...data };
    console.log("set_profile", data);
    updateOnlineFromSocket(socket);
  });

  safeOn(socket, "send_message", async (data = {}) => {
    const text = String(data.message || "").trim();
    const file = data.file || null;
    
    // Cần có ít nhất text hoặc file
    if (!text && !file) return;

    const profile = {
      userId: socket.data.profile.userId,
      username: socket.data.profile.username || "Anonymous",
      avatar: socket.data.profile.avatar || ""
    };

    const msg = makeMessage({ 
      ...profile, 
      message: text,
      file: file,
      tempId: data.tempId 
    });
    addGlobal(msg);
    io.emit("receive_message", msg);
    console.log("send_message ->", msg);
  });

  // Optional: lưu tạm username vào socket.data
  safeOn(socket, "set_username", (name) => {
    socket.data.profile.username = String(name || "Anonymous").trim().slice(0, 40);
  });

  // JOIN ROOM
  safeOn(socket, "join_room", ({ roomId, username, avatar } = {}) => {
    roomId = String(roomId || "").trim();
    if (!roomId) return;

    if (username) socket.data.profile.username = String(username).trim().slice(0, 40);
    if (avatar)   socket.data.profile.avatar   = String(avatar).trim();

    // Kiểm tra xem socket đã ở trong phòng chưa
    const currentMembers = roomMembers.get(roomId) || new Set();
    const alreadyInRoom = currentMembers.has(socket.id);

    socket.join(roomId);
    addMember(roomId, socket.id);

    // gửi lịch sử phòng cho chính người mới
    socket.emit("history_room", { roomId, messages: getRoom(roomId, 50) });

    // Chỉ gửi system message nếu user chưa ở trong phòng
    if (!alreadyInRoom) {
      const sysMsg = makeMessage({
        userId: "system",
        username: "[system]",
        message: `${socket.data.profile.username} joined`,
        roomId
      });
      addRoom(roomId, sysMsg);
      io.to(roomId).emit("receive_message", sysMsg);
    }

    // cập nhật danh sách thành viên
    io.to(roomId).emit("room_users", { roomId, members: getMembers(roomId) });
  });

  // GỬI TIN TRONG PHÒNG (bạn đã có — giữ nguyên, thêm username từ socket.data)
  safeOn(socket, "send_room_message", ({ roomId, username, avatar, message, file, tempId } = {}) => {
    roomId = String(roomId || "").trim();
    const name = String(username || socket.data.profile.username || "Anonymous").trim().slice(0, 40);
    const text = String(message || "").trim();
    
    // Cần có ít nhất roomId và (text hoặc file)
    if (!roomId || (!text && !file)) return;

    if (username) socket.data.profile.username = String(username).trim().slice(0, 40);
    if (avatar)   socket.data.profile.avatar   = String(avatar).trim();

    const msg = makeMessage({
      userId: socket.data.profile.userId,
      username: socket.data.profile.username,
      avatar: socket.data.profile.avatar,
      message: text,
      file: file,
      tempId: tempId,
      roomId
    });
    addRoom(roomId, msg);
    io.to(roomId).emit("receive_message", msg);
  });

  // LEAVE ROOM
  safeOn(socket, "leave_room", ({ roomId } = {}) => {
    roomId = String(roomId || "").trim();
    if (!roomId) return;

    socket.leave(roomId);
    removeMember(roomId, socket.id);

    const sysMsg = makeMessage({
      userId: "system",
      username: "[system]",
      message: `${socket.data.profile.username || "Someone"} left`,
      roomId
    });
    addRoom(roomId, sysMsg);
    io.to(roomId).emit("receive_message", sysMsg);

    io.to(roomId).emit("room_users", { roomId, members: getMembers(roomId) });
  });

  // CLEAR ALL GLOBAL MESSAGES
  safeOn(socket, "clear_global_messages", () => {
    console.log(`${socket.data.profile.username} clearing all global messages`);
    clearAllGlobalMessages();
    io.emit("all_messages_cleared", { roomId: "global" });
  });

  // CLEAR ALL ROOM MESSAGES  
  safeOn(socket, "clear_room_messages", ({ roomId } = {}) => {
    roomId = String(roomId || "").trim();
    if (!roomId) return;
    
    console.log(`${socket.data.profile.username} clearing all messages in ${roomId}`);
    clearAllRoomMessages(roomId);
    io.to(roomId).emit("all_messages_cleared", { roomId });
  });

  // Lấy danh sách thành viên phòng
  safeOn(socket, "get_room_members", ({ roomId } = {}) => {
    roomId = String(roomId || "").trim();
    if (!roomId) return;
    
    const members = [];
    const roomSocketIds = roomMembers.get(roomId);
    
    if (roomSocketIds) {
      for (const socketId of roomSocketIds) {
        const memberSocket = io.sockets.sockets.get(socketId);
        if (memberSocket && memberSocket.data.profile) {
          members.push({
            username: memberSocket.data.profile.username || "Anonymous",
            userId: memberSocket.data.profile.userId,
            online: true,
            avatar: memberSocket.data.profile.avatar || ""
          });
        }
      }
    }
    
    console.log(`${socket.data.profile.username} requested members for ${roomId}:`, members.length);
    socket.emit("room_members_list", { roomId, members });
  });

  // KHI NGẮT KẾT NỐI → rời tất cả phòng
  socket.on("disconnect", () => {
    for (const [roomId, set] of roomMembers.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        if (set.size === 0) roomMembers.delete(roomId);

        const sysMsg = makeMessage({
          username: "[system]",
          message: `${socket.data.profile.username || "Someone"} disconnected`,
          roomId
        });
        addRoom(roomId, sysMsg);
        io.to(roomId).emit("receive_message", sysMsg);
        io.to(roomId).emit("room_users", { roomId, members: getMembers(roomId) });
      }
    }
    removeOnline(socket);
    console.log("User disconnected:", socket.id);
  });
}


// Serve static (không ảnh hưởng Postman)
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = process.env.PORT || 3000;

// Lấy lịch sử global: GET /api/messages?limit=20
app.get('/api/messages', asyncHandler((req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  res.json(getGlobal(limit));
}));

// Lấy lịch sử 1 phòng: GET /api/rooms/:roomId/messages?limit=20
app.get("/api/rooms/:roomId/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  res.json(getRoom(req.params.roomId, limit));
});

// ==== REST API ====

// Auth routes
app.use('/api/auth', authRoutes);

// File routes
app.use('/api/files', fileRoutes);

// Admin endpoint to clear all chat data
app.post('/api/admin/clear-messages', (req, res) => {
  try {
    clearAllMessages();
    res.json({ 
      success: true, 
      message: 'All chat messages cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear messages' 
    });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 0) Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// 1) Global messages (đọc / gửi)
app.get("/api/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  res.json(getGlobal(limit));
});

app.post('/api/messages', asyncHandler((req, res) => {
  const username = String(req.body.username || 'Anonymous').trim().slice(0, 40);
  const avatar   = String(req.body.avatar || '').trim();
  const message  = String(req.body.message || '').trim();
  const fileInfo = req.body.file || null;
  
  if (!message && !fileInfo) throw createError(400, 'message or file is required');

  const msg = makeMessage({ 
    userId: 'api', 
    username, 
    avatar, 
    file: fileInfo 
  });
  addGlobal(msg);
  io.emit('receive_message', msg);
  res.status(201).json(msg);
}));

// 2) Rooms listing + stats (dựa vào roomMembers RAM)
app.get('/api/rooms', asyncHandler((_req, res) => {
  const rooms = Array.from(roomMembers.entries()).map(([roomId, set]) => ({
    roomId, memberCount: set.size
  }));
  res.json(rooms);
}));

// 3) Room messages (đọc / gửi)
app.get('/api/rooms/:roomId/messages', asyncHandler((req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  res.json(getRoom(req.params.roomId, limit));
}));

app.post('/api/rooms/:roomId/messages', asyncHandler((req, res) => {
  const roomId   = String(req.params.roomId || '').trim();
  const username = String(req.body.username || 'Anonymous').trim().slice(0, 40);
  const avatar   = String(req.body.avatar   || '').trim();
  const message  = String(req.body.message  || '').trim();
  if (!roomId)  throw createError(400, 'roomId is required');
  if (!message) throw createError(400, 'message is required');

  const msg = makeMessage({ userId: 'api', username, avatar, message, roomId });
  addRoom(roomId, msg);
  io.to(roomId).emit('receive_message', msg);
  res.status(201).json(msg);
}));

// 4) Room members
app.get("/api/rooms/:roomId/members", (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  const ids = Array.from(roomMembers.get(roomId) || []);
  res.json({ roomId, members: ids });
});

app.use('/docs', express.static(path.join(__dirname, 'docs')));

app.use((req, res, next) => {
  next(createError(404, `Not Found: ${req.originalUrl}`));
});

// Centralized error handler
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  // log đủ ngữ cảnh
  logger.error({ err, status, reqId: req.id, path: req.originalUrl }, 'API error');
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    reqId: req.id
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Chat Server is running at http://localhost:${PORT}`);
});
