# 🚀 Hướng dẫn cài đặt dự án - Chat App Nhóm 8

## 📋 Yêu cầu hệ thống

### Phần mềm cần thiết
- **Node.js**: Phiên bản 18.0 trở lên
- **npm**: Đi kèm với Node.js
- **Git**: Để clone và quản lý code
- **VS Code**: Editor được khuyến nghị
- **Browser**: Chrome/Firefox/Edge (phiên bản mới)

### Kiến thức cần có
- JavaScript cơ bản
- HTML/CSS
- Node.js basics
- Socket.IO concepts

## 🔧 Cài đặt ban đầu

### 1. Clone repository
```bash
git clone https://github.com/tqd0105/Nhom8-ChatApp.git
cd Nhom8-ChatApp
```

### 2. Checkout branch development
```bash
git checkout dev
```

### 3. Cài đặt dependencies
```bash
# Cài đặt packages cho backend
cd backend
npm init -y
npm install express socket.io cors dotenv
npm install -D nodemon

# Quay về root directory
cd ..
```

### 4. Cấu hình environment
```bash
# Copy file environment template
copy .env.example .env

# Chỉnh sửa file .env với editor
code .env
```

### 5. Cấu hình .env file
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Socket.IO Configuration
SOCKET_PORT=3001
SOCKET_CORS_ORIGIN=*
```

## 🏃‍♂️ Chạy dự án

### Development Mode
```bash
# Chạy server development
cd backend
node server.js

# Hoặc sử dụng nodemon (nếu đã cài)
npx nodemon server.js
```

### Truy cập ứng dụng
- **Frontend**: http://localhost:3000

### Workflow
1. Pull latest từ `dev` branch
2. Tạo feature branch: `git checkout -b feature/ten-tinh-nang`
3. Develop & commit changes
4. Push và tạo Pull Request về `dev`
5. Code review và merge

### Commit Message Convention
```bash
# Format: <type>(<scope>): <description>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation
style:    # Formatting, no code change
refactor: # Code refactor
test:     # Adding tests
chore:    # Build process or auxiliary tools

# Examples:
git commit -m "feat(chat): add real-time messaging"
git commit -m "fix(ui): resolve mobile responsive issues"
git commit -m "docs: update API documentation"
```

### Package.json scripts (Thêm vào backend/package.json)
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

### Lỗi thường gặp

#### 1. Port already in use
```bash
# Kiểm tra process đang sử dụng port
netstat -ano | findstr :3000

# Kill process (thay <PID> bằng số thực tế)
taskkill /PID <PID> /F
```

#### 2. Module not found
```bash
# Cài đặt lại dependencies
rm -rf node_modules
npm install
```

