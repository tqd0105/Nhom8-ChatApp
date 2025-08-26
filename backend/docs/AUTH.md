# Hệ thống Auth JWT cho Chat App

## Tổng quan
Hệ thống xác thực JWT được tích hợp vào chat app mà không cần database. Tất cả thông tin user được lưu trong bộ nhớ (in-memory storage).

## Tính năng
- ✅ Đăng ký tài khoản mới
- ✅ Đăng nhập với username/password  
- ✅ JWT token authentication
- ✅ Password hashing với bcrypt
- ✅ Protected routes
- ✅ Token verification
- ✅ Logout functionality
- ✅ In-memory user storage (không cần DB)

## API Endpoints

### Public Routes (không cần token)
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/users` - Lấy danh sách users (debug)

### Protected Routes (cần Bearer token)
- `GET /api/auth/profile` - Lấy thông tin profile
- `PUT /api/auth/profile` - Cập nhật profile  
- `GET /api/auth/verify` - Verify token

## Cách sử dụng

### 1. Đăng ký tài khoản
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "123456",
    "email": "test@example.com"
  }'
```

### 2. Đăng nhập
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser", 
    "password": "123456"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "username": "testuser",
    "email": "test@example.com",
    "createdAt": "2025-01-26T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Sử dụng token cho protected routes
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Cấu hình môi trường

Tạo file `.env` trong thư mục `backend`:
```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

## Frontend Integration

### Auto-login khi tải trang
- Token được lưu trong localStorage
- Tự động verify khi tải trang
- Hiển thị modal login nếu token không hợp lệ

### UI Components
- Modal đăng nhập/đăng ký
- Nút đăng xuất trong settings
- Hiển thị username trong sidebar

### Socket.io Integration
- Username từ JWT được gửi tự động cho socket
- Không cần nhập username khi đã đăng nhập

## Bảo mật

### Password Security
- Mật khẩu được hash với bcrypt (salt rounds: 10)
- Validation: tối thiểu 6 ký tự

### JWT Security  
- Token có thời hạn (mặc định 24h)
- Secret key từ environment variable
- Verify signature trước khi cho phép truy cập

### Input Validation
- Username: 3-30 ký tự, chỉ chữ và số
- Password: tối thiểu 6 ký tự
- Email: validation format chuẩn

## Lưu ý quan trọng

### In-Memory Storage
- ⚠️ **Data sẽ mất khi restart server**
- ⚠️ **Không phù hợp cho production với nhiều user**
- ✅ **Phù hợp cho demo, development, testing**

### Để chuyển sang Database
1. Thay thế `auth.users` functions trong `middleware/auth.js`
2. Tích hợp với MongoDB/PostgreSQL/MySQL
3. Thêm user model và database operations

## Testing

### Kiểm tra với nhiều user
1. Đăng ký nhiều tài khoản khác nhau
2. Login từ nhiều tab/browser
3. Test chat với authenticated users
4. Verify logout functionality

### Debug endpoints
- `GET /api/auth/users` - Xem tất cả users đã đăng ký
- Check browser localStorage cho token
- Monitor network requests trong DevTools

## Lỗi thường gặp

### 401 Unauthorized
- Token không hợp lệ hoặc đã hết hạn
- Header Authorization sai format
- Chưa đăng nhập

### 409 Conflict  
- Username đã tồn tại khi đăng ký

### 400 Bad Request
- Thiếu thông tin bắt buộc
- Format dữ liệu không đúng
- Password quá ngắn
