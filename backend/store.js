// backend/store.js
const MAX_GLOBAL = 500;
const MAX_ROOM   = 500;
const MAX_NAME   = 40;
const MAX_MSGLEN = 2000;

const globalMessages = [];
const roomMessages = new Map();
let nextId = 1;

function sanitizeUsername(u) {
  return String(u || 'Anonymous').trim().slice(0, MAX_NAME);
}
function sanitizeMessage(m) {
  const s = String(m || '').trim();
  return s.length > MAX_MSGLEN ? s.slice(0, MAX_MSGLEN) : s;
}
function sanitizeAvatar(a) {
  const s = String(a || '').trim();
  // có thể thêm regex kiểm tra URL, còn giờ cứ trả về chuỗi đã cắt
  return s.slice(0, 500);
}

function makeMessage({ userId=null, username, message, roomId=null, avatar=null }) {
  const uname = sanitizeUsername(username);
  const text  = sanitizeMessage(message);
  const av    = sanitizeAvatar(avatar);
  return { id: nextId++, userId, username: uname, avatar: avatar || null, message: text, roomId, ts: Date.now() };
}

function pushWithLimit(arr, item, max) { arr.push(item); if (arr.length > max) arr.splice(0, arr.length - max); }

function addGlobal(msg) { pushWithLimit(globalMessages, msg, MAX_GLOBAL); }
function getGlobal(limit=50) { return globalMessages.slice(-limit); }

function addRoom(roomId, msg) {
  const key = String(roomId || '').trim();
  if (!key) return;
  const arr = roomMessages.get(key) || [];
  pushWithLimit(arr, msg, MAX_ROOM);
  roomMessages.set(key, arr);
}
function getRoom(roomId, limit=50) {
  const key = String(roomId || '').trim();
  const arr = roomMessages.get(key) || [];
  return arr.slice(-limit);
}

module.exports = { makeMessage, addGlobal, getGlobal, addRoom, getRoom };
