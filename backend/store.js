// backend/store.js
const MAX_GLOBAL = 500;     // tối đa 500 tin nhắn gần nhất (có thể chỉnh)
const MAX_ROOM   = 500;

const globalMessages = [];
const roomMessages = new Map(); // { roomId -> [msg] }
let nextId = 1;

function makeMessage({ username, message, roomId = null }) {
  return { id: nextId++, username, message, roomId, ts: Date.now() };
}

function pushWithLimit(arr, item, max) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max); // cắt bớt đầu
}

function addGlobal(msg) {
  pushWithLimit(globalMessages, msg, MAX_GLOBAL);
}
function getGlobal(limit = 50) {
  return globalMessages.slice(-limit);
}

function addRoom(roomId, msg) {
  const arr = roomMessages.get(roomId) || [];
  pushWithLimit(arr, msg, MAX_ROOM);
  roomMessages.set(roomId, arr);
}
function getRoom(roomId, limit = 50) {
  const arr = roomMessages.get(roomId) || [];
  return arr.slice(-limit);
}

module.exports = {
  makeMessage,
  addGlobal, getGlobal,
  addRoom,   getRoom
};
