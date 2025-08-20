

# Chat Backend – API Endpoints

**Base URL:** `http://localhost:3000`

> Tất cả response API đều đính kèm header `x-request-id`.  
> Khi lỗi, format mặc định:
> ```json
> { "error": "message...", "reqId": "..." }
> ```

---

## 0) Health Check
**GET** `/api/health`

- 200 OK
```json
{ "status": "ok", "ts": 1734420000000 }
```
## 1) Global Messages
1.1 GET /api/messages?limit=50

- Trả về limit tin nhắn gần nhất (mặc định 50, tối đa 500).

- 200 OK
```json
[
  {
    "id": 123,
    "userId": "socket-abc",
    "username": "Lam",
    "avatar": "https://i.pravatar.cc/100?u=Lam",
    "message": "Hello",
    "roomId": null,
    "ts": 1734420000000
  }
]
1.2 POST /api/messages
- Body:
```json
{
  "username": "Lam",           // optional, default: "Anonymous"
  "avatar": "https://...",     // optional
  "message": "Hello world!"    // required
}

- 201 Created
```json
{
  "id": 124,
  "userId": "api",
  "username": "Lam",
  "avatar": "https://...",
  "message": "Hello world!",
  "roomId": null,
  "ts": 1734420000100
}
- 400 Bad Request: {"error":"message is required","reqId":"..."}
```
## 2) Rooms

2.1 GET /api/rooms
- Danh sách phòng đang có thành viên (theo RAM).
- 200 OK
```json
[
  { "roomId": "room-1", "memberCount": 2 },
  { "roomId": "dev",    "memberCount": 1 }
]

2.2 GET /api/rooms/{roomId}/messages?limit=50
- Lịch sử tin nhắn của phòng.
- 200 OK
```json
[
  {
    "id": 200,
    "userId": "socket-xyz",
    "username": "Huy",
    "avatar": "",
    "message": "Hi room",
    "roomId": "room-1",
    "ts": 1734420000200
  }
]

2.3 POST /api/rooms/{roomId}/messages
- Body:
```json
{
  "username": "Lam",        // optional, default: "Anonymous"
  "avatar": "https://...",  // optional
  "message": "Hi room"      // required
}

- 201 Created ⇒ đồng thời emit receive_message chỉ tới room đó.
- 400 Bad Request: thiếu roomId hoặc message.

2.4 GET /api/rooms/{roomId}/members
- Thành viên (socket id) hiện đang online trong phòng.
- 200 OK
```json
{ "roomId": "room-1", "members": ["u1","u2"] }

## 3) Online Users (Presence)
3.1 GET /api/online (nếu bạn đã thêm endpoint này)
- 200 OK
```json
[
  { "userId": "socketA", "username": "Lam", "avatar": "..." },
  { "userId": "socketB", "username": "Huy", "avatar": ""   }
]

3.2 Socket Event: online_users
- Server emit khi user connect/disconnect hoặc đổi profile.
```json
[
  { "userId": "socketA", "username": "Lam", "avatar": "..." }
]
```

## 4) Socket.IO Events
4.1 Gửi/nhận global
- Client → Server: send_message
```json
{ "message": "Hello" }

- Server → Client: receive_message
```json
{
  "id": 321,
  "userId": "socket-abc",
  "username": "Lam",
  "avatar": "https://...",
  "message": "Hello",
  "roomId": null,
  "ts": 1734420000300
}

4.2 Hồ sơ người dùng
- Client → Server: set_profile
```json
{ "username": "Lam", "avatar": "https://..." }

4.3 Phòng
- join_room
```json
{ "roomId": "room-1", "username": "Lam", "avatar": "https://..." } // optional username/avatar
- send_room_message
```json
{ "roomId": "room-1", "message": "Hi room" }
- leave_room
```json
{ "roomId": "room-1" }

4.4 Lịch sử khi connect
- history: mảng tin nhắn global gần nhất.

4.5 Lỗi socket (tuỳ cấu hình)
- error hoặc error_message
```json
{ "event": "send_message", "message": "Server error. Please try again." }
```

## 5) Message Schema
```json
{
  "id": 1,
  "userId": "socket-abc" | "api",
  "username": "Lam",
  "avatar": "https://...",
  "message": "text",
  "roomId": null | "room-1",
  "ts": 1734420000000
}
```

## 6) curl Examples
```bash

# Health
curl -i http://localhost:3000/api/health

# Lấy 10 global messages
curl -s "http://localhost:3000/api/messages?limit=10" | jq .

# Gửi 1 global message
curl -s -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"username":"Lam","message":"Hello from REST"}' | jq .

# Danh sách phòng
curl -s http://localhost:3000/api/rooms | jq .

# Lịch sử room
curl -s "http://localhost:3000/api/rooms/room-1/messages?limit=10" | jq .

# Gửi 1 room message
curl -s -X POST http://localhost:3000/api/rooms/room-1/messages \
  -H "Content-Type: application/json" \
  -d '{"username":"Lam","message":"Hi room"}' | jq .

# Thành viên phòng
curl -s http://localhost:3000/api/rooms/room-1/members | jq .
