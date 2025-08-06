# 💻 Hướng dẫn phát triển - Chat App Nhóm 8

## 🎯 Quy tắc coding

### JavaScript Style Guide
```javascript
// ✅ Đúng - Sử dụng camelCase
const userName = 'john_doe';
const messageCount = 0;

// ❌ Sai - Không sử dụng snake_case
const user_name = 'john_doe';

// ✅ Đúng - Comments bằng tiếng Việt
// Hàm xử lý gửi tin nhắn
function sendMessage(content) {
    // Kiểm tra tin nhắn không rỗng
    if (!content.trim()) return false;
    
    // Gửi tin nhắn qua socket
    socket.emit('send-message', { message: content });
}

// ✅ Đúng - Meaningful naming
const isUserOnline = true;
const activeConnections = [];

// ❌ Sai - Tên không rõ nghĩa
const flag = true;
const arr = [];
```

### HTML/CSS Guidelines
```html
<!-- ✅ Đúng - Semantic HTML -->
<main class="chat-container">
    <section class="message-list">
        <article class="message">
            <header class="message-header">
                <span class="username">John</span>
                <time class="timestamp">10:30</time>
            </header>
            <p class="message-content">Hello everyone!</p>
        </article>
    </section>
</main>

<!-- ✅ Đúng - BEM CSS naming -->
<div class="chat-room">
    <div class="chat-room__header">
        <h2 class="chat-room__title">General</h2>
        <span class="chat-room__count">5 users</span>
    </div>
</div>
```

### CSS Best Practices
```css
/* ✅ Đúng - CSS Custom Properties */
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ✅ Đúng - Mobile-first approach */
.chat-container {
    padding: 1rem;
}

@media (min-width: 768px) {
    .chat-container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }
}
```

## 🏗️ Architecture Patterns

### Frontend Structure
```
frontend/
├── index.html              # Entry point
├── css/
│   ├── styles.css         # Main styles
│   ├── components/        # Component styles
│   └── utilities.css      # Utility classes
├── js/
│   ├── app.js            # Main application
│   ├── socket-client.js  # Socket.IO client
│   ├── ui-components.js  # UI components
│   └── utils.js          # Helper functions
└── assets/
    ├── images/
    └── icons/
```

### Backend Structure
```
backend/
├── server.js              # Main server file
├── controllers/
│   ├── authController.js  # Authentication logic
│   ├── chatController.js  # Chat functionality
│   └── userController.js  # User management
├── routes/
│   ├── api.js            # API routes
│   └── auth.js           # Auth routes
├── services/
│   ├── socketService.js  # Socket.IO service
│   └── messageService.js # Message handling
├── socket/
│   ├── index.js          # Socket setup
│   └── handlers/         # Socket event handlers
└── utils/
    ├── logger.js         # Logging utility
    └── validator.js      # Input validation
```

## 🔧 Development Workflow

### 1. Feature Development
```bash
# 1. Pull latest changes
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Develop feature
# ... code changes ...

# 4. Test locally
npm run dev

# 5. Commit changes
git add .
git commit -m "feat: add user authentication"

# 6. Push and create PR
git push origin feature/user-authentication
```

### 2. Commit Message Convention
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

## 🧪 Testing Guidelines

### Frontend Testing
```javascript
// Test Socket.IO connection
function testSocketConnection() {
    const socket = io();
    
    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });
}

// Test message sending
function testMessageSend() {
    const testMessage = 'Hello, this is a test message';
    socket.emit('send-message', { message: testMessage });
    console.log('📤 Test message sent');
}
```

### Backend Testing
```javascript
// Test API endpoints
const testAPI = async () => {
    try {
        const response = await fetch('/api/server-info');
        const data = await response.json();
        console.log('✅ API Response:', data);
    } catch (error) {
        console.error('❌ API Error:', error);
    }
};
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile first approach */
:root {
    --breakpoint-sm: 576px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 992px;
    --breakpoint-xl: 1200px;
}

/* Mobile (default) */
.chat-container {
    padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
    .chat-container {
        padding: 1.5rem;
        display: grid;
        grid-template-columns: 250px 1fr;
    }
}

/* Desktop */
@media (min-width: 992px) {
    .chat-container {
        padding: 2rem;
        grid-template-columns: 300px 1fr 200px;
    }
}
```

## 🔌 Socket.IO Event Patterns

### Client-side Events
```javascript
// Connection events
socket.on('connect', handleConnect);
socket.on('disconnect', handleDisconnect);

// Chat events
socket.on('receive-message', handleNewMessage);
socket.on('user-joined', handleUserJoined);
socket.on('user-left', handleUserLeft);

// Typing events
socket.on('user-typing', handleUserTyping);

// Error handling
socket.on('error', handleSocketError);
```

### Server-side Events
```javascript
io.on('connection', (socket) => {
    // User events
    socket.on('user-join', handleUserJoin);
    socket.on('send-message', handleSendMessage);
    socket.on('typing-start', handleTypingStart);
    socket.on('typing-stop', handleTypingStop);
    socket.on('disconnect', handleDisconnect);
});
```

## 🐛 Debugging Tips

### Frontend Debugging
```javascript
// Enable Socket.IO debug mode
localStorage.debug = 'socket.io-client:socket';

// Console logging helper
const debugLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${message}`, data);
    }
};

// Network monitoring
window.addEventListener('online', () => {
    console.log('🌐 Back online');
});

window.addEventListener('offline', () => {
    console.log('📵 Connection lost');
});
```

### Backend Debugging
```javascript
// Logger utility
const logger = {
    info: (message, data) => console.log(`ℹ️ [INFO] ${message}`, data),
    error: (message, error) => console.error(`❌ [ERROR] ${message}`, error),
    debug: (message, data) => console.log(`🐛 [DEBUG] ${message}`, data)
};

// Socket debugging
io.on('connection', (socket) => {
    logger.info('New connection', { socketId: socket.id });
    
    socket.onAny((eventName, ...args) => {
        logger.debug('Socket event', { eventName, args });
    });
});
```

## 📝 Code Review Checklist

### ✅ Code Quality
- [ ] Code theo đúng style guide
- [ ] Comments bằng tiếng Việt
- [ ] Meaningful variable/function names
- [ ] No console.log trong production code
- [ ] Error handling đầy đủ

### ✅ Functionality
- [ ] Feature hoạt động đúng requirements
- [ ] Edge cases được xử lý
- [ ] No memory leaks
- [ ] Performance optimized

### ✅ Security
- [ ] Input validation
- [ ] No sensitive data exposed
- [ ] CORS configured properly
- [ ] Rate limiting implemented

### ✅ Documentation
- [ ] README updated nếu cần
- [ ] API docs updated
- [ ] Comments explain complex logic
- [ ] Changelog updated

## 🚀 Performance Tips

### Frontend Optimization
```javascript
// Debounce typing events
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Optimize message rendering
const renderMessage = (message) => {
    const fragment = document.createDocumentFragment();
    // ... create elements
    messageContainer.appendChild(fragment);
};
```

### Backend Optimization
```javascript
// Memory management
const MAX_MESSAGES_PER_ROOM = 100;
const cleanupOldMessages = (roomMessages) => {
    if (roomMessages.length > MAX_MESSAGES_PER_ROOM) {
        return roomMessages.slice(-MAX_MESSAGES_PER_ROOM);
    }
    return roomMessages;
};

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // limit each IP to 100 requests per windowMs
});
```

---

💡 **Tip**: Luôn test trên nhiều browsers và devices khác nhau trước khi submit PR!
