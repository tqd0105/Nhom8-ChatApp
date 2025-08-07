# 💬 Chat App - Nhóm 8 
> Ứng dụng chat real-time sử dụng Socket.IO cho môn Lập trình mạng

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 🎯 Giới thiệu dự án

Dự án xây dựng ứng dụng chat real-time sử dụng TCP client-server architecture với:
- **Frontend**: HTML5, CSS, JavaScript
- **Backend**: Node.js, Express.js, Socket.IO
- **Real-time Communication**: WebSockets thông qua Socket.IO

## ✨ Tính năng chính

- 💬 **Real-time messaging**: Gửi/nhận tin nhắn ngay lập tức
- 🏠 **Multiple rooms**: Tạo và tham gia nhiều phòng chat
- 👥 **Online users**: Hiển thị danh sách users đang online
- 📱 **Responsive design**: Hoạt động tốt trên mọi thiết bị
- 🔔 **Notifications**: Thông báo khi có user join/leave
- ⌨️ **Typing indicators**: Hiện thị khi user đang typing
- 💌 **Private messaging**: Tin nhắn riêng tư 1-1

## 🚀 Quick Start

### Yêu cầu
- Node.js 18+
- npm

### Cài đặt
```bash
# Clone repository
git clone https://github.com/tqd0105/Nhom8-ChatApp.git
cd Nhom8-ChatApp

# Cài đặt dependencies
cd backend
npm install express socket.io cors dotenv

# Cấu hình environment
cp ../.env.example .env

# Chạy server
node server.js
```

### Truy cập ứng dụng
- **Chat App**: http://localhost:3000

## 📁 Cấu trúc dự án

```
Nhom8-ChatApp/
├── 📁 backend/           # Server-side code
│   ├── server.js         # Main server file
│   ├── controllers/      # Business logic
│   ├── routes/          # API routes
│   ├── services/        # External services
│   ├── socket/          # Socket.IO handlers
│   └── utils/           # Utility functions
├── 📁 frontend/         # Client-side code
│   ├── index.html       # Main HTML file
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── assets/         # Images, fonts, etc.
├── 📁 docs/            # Documentation
│   ├── OVERVIEW.md     # Project overview
│   ├── SETUP.md        # Setup guide
│   ├── DEVELOPMENT.md  # Development guide
│   ├── API.md          # API documentation
│   ├── DEPLOYMENT.md   # Deployment guide
│   └── TASKS.md        # Task management
├── .env.example        # Environment template
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | Node.js + Express.js | Server framework |
| Real-time | Socket.IO | WebSocket communication |
| Frontend | HTML5/CSS3/JavaScript | User interface |
| Styling | CSS3 + Flexbox/Grid | Responsive design |
| Package Manager | npm | Dependency management |

## 📚 Documentation

- 📋 [**Tổng quan dự án**](docs/OVERVIEW.md) - Chi tiết về kiến trúc và tính năng
- 🚀 [**Hướng dẫn cài đặt**](docs/SETUP.md) - Setup môi trường development  
- 💻 [**Development guide**](docs/DEVELOPMENT.md) - Quy tắc coding và workflow
- 📡 [**API Documentation**](docs/API.md) - Chi tiết về REST API và Socket events
- 🌐 [**Deployment guide**](docs/DEPLOYMENT.md) - Hướng dẫn deploy production
- 📋 [**Task List**](docs/TASKS.md) - Phân công công việc team

## 👥 Team Members

| Role | Name | GitHub | 
|------|------|--------|
| **Team Lead** | Tran Quang Dung | [@username] 
| **Backend Lead** | Le Minh Huy | [@username] 
| **Frontend Lead** | Nguyen Truong Lam | [@username] 
| **Tester** | Nguyen Minh Khoi | [@username] 

## 🔄 Development Workflow

### Branch Strategy
- `main` - Production branch
- `dev` - Development branch (working branch)

### Getting Started
```bash
# Switch to development branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature...
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

Xem chi tiết trong [Deployment Guide](docs/DEPLOYMENT.md).

## 📄 License

Dự án cho mục đích học tập - Môn Lập trình mạng.

## 🎓 Learning Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)

---

<div align="center">

**🌟 Star this repo if you found it helpful! 🌟**

Made with ❤️ by **Nhóm 8** for **Lập trình mạng**

</div>