// ===== Auth System =====
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Kiểm tra token khi tải trang
async function checkAuth() {
  if (!authToken) {
    showLoginModal();
    return false;
  }

  try {
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      updateUIWithUser(currentUser);
      hideAuthModals();
      return true;
    } else {
      localStorage.removeItem('authToken');
      authToken = null;
      showLoginModal();
      return false;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showLoginModal();
    return false;
  }
}

// Cập nhật UI với thông tin user
function updateUIWithUser(user) {
  const usernameEl = document.getElementById('sidebar-username');
  if (usernameEl) {
    usernameEl.textContent = user.username;
  }
  
  // Lưu user info để sử dụng sau
  window.currentUserProfile = user;
  
  // Load dữ liệu của user này từ localStorage
  loadUserData(user.username);
  
  // Khởi tạo socket connection sau khi đăng nhập thành công
  initSocket();
}

// Hiển thị modal đăng nhập
function showLoginModal() {
  document.getElementById('login-modal').style.display = 'flex';
  document.getElementById('register-modal').style.display = 'none';
  // Ẩn giao diện chat khi chưa đăng nhập
  hideChatInterface();
}

// Hiển thị modal đăng ký
function showRegisterModal() {
  document.getElementById('register-modal').style.display = 'flex';
  document.getElementById('login-modal').style.display = 'none';
  // Ẩn giao diện chat khi chưa đăng nhập
  hideChatInterface();
}

// Ẩn tất cả modal auth
function hideAuthModals() {
  document.getElementById('login-modal').style.display = 'none';
  document.getElementById('register-modal').style.display = 'none';
  // Hiện giao diện chat khi đã đăng nhập
  showChatInterface();
}

// Ẩn giao diện chat
function hideChatInterface() {
  const chatContainer = document.querySelector('.flex.h-screen');
  if (chatContainer) {
    chatContainer.style.display = 'none';
  }
}

// Hiện giao diện chat
function showChatInterface() {
  const chatContainer = document.querySelector('.flex.h-screen');
  if (chatContainer) {
    chatContainer.style.display = 'flex';
  }
}

// Xử lý đăng nhập
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    alert('Vui lòng nhập đầy đủ thông tin');
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // KHÔNG clear dữ liệu cũ để giữ lại các phòng đã tham gia
      // clearAllUserData(); // <-- Bỏ dòng này
      
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      currentUser = data.user;
      updateUIWithUser(currentUser);
      hideAuthModals();
      
      // Reset form
      document.getElementById('login-form').reset();
      
      alert('Đăng nhập thành công!');
    } else {
      alert(data.error || 'Đăng nhập thất bại');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Lỗi kết nối. Vui lòng thử lại.');
  }
}

// Xử lý đăng ký
async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;

  if (!username || !password) {
    alert('Vui lòng nhập đầy đủ thông tin');
    return;
  }

  if (password.length < 6) {
    alert('Mật khẩu phải có ít nhất 6 ký tự');
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Reset form
      document.getElementById('register-form').reset();
      
      // Chuyển sang màn hình đăng nhập sau khi đăng ký thành công
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      showLoginModal();
      
      // Tự động điền username vào form đăng nhập
      const loginUsernameInput = document.getElementById('login-username');
      if (loginUsernameInput) {
        loginUsernameInput.value = username;
        loginUsernameInput.focus();
      }
    } else {
      alert(data.error || 'Đăng ký thất bại');
    }
  } catch (error) {
    console.error('Register error:', error);
    alert('Lỗi kết nối. Vui lòng thử lại.');
  }
}

// Đăng xuất
function logout() {
  const username = currentUser?.username;
  
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  window.currentUserProfile = null; // Clear user profile
  
  // Chỉ xóa profile, KHÔNG xóa joined rooms và messages để giữ lại khi đăng nhập lại
  localStorage.removeItem(PERSIST_KEY_PROFILE);
  
  // Clear in-memory data
  clearAllUserData();
  
  // Disconnect socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Clear chat UI
  // document.getElementById('chat-messages').innerHTML = '';
  const sidebarUsername = document.getElementById('sidebar-username');
  if (sidebarUsername) {
    sidebarUsername.textContent = '';
  }
  
  // Show login modal and hide chat interface
  showLoginModal();
  location.reload();
}

// Setup auth event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Ẩn giao diện chat ban đầu
  hideChatInterface();
  
  // Check auth khi tải trang
  checkAuth();
  
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Switch between login/register
  const showRegisterBtn = document.getElementById('show-register-btn');
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', showRegisterModal);
  }
  
  const showLoginBtn = document.getElementById('show-login-btn');
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', showLoginModal);
  }
});

// ===== File Upload System =====
let selectedFile = null;

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon based on type
function getFileIcon(filename, type) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return 'fas fa-image text-green-500';
  } else if (type === 'pdf' || ext === 'pdf') {
    return 'fas fa-file-pdf text-red-500';
  } else if (type === 'document' || ['doc', 'docx'].includes(ext)) {
    return 'fas fa-file-word text-blue-500';
  } else if (type === 'spreadsheet' || ['xls', 'xlsx'].includes(ext)) {
    return 'fas fa-file-excel text-green-600';
  } else if (type === 'presentation' || ['ppt', 'pptx'].includes(ext)) {
    return 'fas fa-file-powerpoint text-orange-500';
  } else if (type === 'archive' || ['zip', 'rar', '7z'].includes(ext)) {
    return 'fas fa-file-archive text-yellow-600';
  } else if (type === 'audio' || ['mp3', 'wav', 'ogg'].includes(ext)) {
    return 'fas fa-file-audio text-purple-500';
  } else if (type === 'video' || ['mp4', 'webm', 'ogv'].includes(ext)) {
    return 'fas fa-file-video text-indigo-500';
  } else {
    return 'fas fa-file text-gray-500';
  }
}

// Upload file to server
async function uploadFile(file) {
  if (!authToken) {
    alert('Bạn cần đăng nhập để gửi file');
    return null;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      return result.file;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
  } catch (error) {
    console.error('File upload error:', error);
    alert('Lỗi khi tải file: ' + error.message);
    return null;
  }
}

// Show file preview
function showFilePreview(file) {
  const preview = document.getElementById('file-preview');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const fileIcon = document.getElementById('file-icon');

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileIcon.className = getFileIcon(file.name, file.type);

  preview.classList.remove('hidden');
  selectedFile = file;
}

// Hide file preview
function hideFilePreview() {
  const preview = document.getElementById('file-preview');
  preview.classList.add('hidden');
  selectedFile = null;
}

// Setup file upload event listeners
document.addEventListener('DOMContentLoaded', function() {
  const fileBtn = document.getElementById('file-btn');
  const fileInput = document.getElementById('file-input');
  const removeFileBtn = document.getElementById('remove-file');

  if (fileBtn && fileInput) {
    fileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          alert('File quá lớn. Kích thước tối đa là 10MB.');
          return;
        }
        showFilePreview(file);
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      hideFilePreview();
      if (fileInput) fileInput.value = '';
    });
  }
});

// Render file message
function renderFileMessage(fileInfo, isOutgoing = false) {
  const isImage = fileInfo.type === 'image';
  
  if (isImage) {
    return `
      <div class="file-message flex flex-col justify-center items-center">
        <img src="${fileInfo.url}" 
             alt="${fileInfo.originalName}" 
             class="image-preview"
             onclick="window.open('${fileInfo.url}', '_blank')"
             loading="lazy">
        <div class="file-details flex justify-center items-center gap-4 h-fit" >
            <div class="file-name h-fit" >${fileInfo.originalName}</div>
            <div class="file-size h-fit">${formatFileSize(fileInfo.size)}</div>
          </div>
      </div>`;
  } else {
    return `
      <div class="file-message downloadable flex  " onclick="window.open('${fileInfo.url}', '_blank')">
        <div class="file-info flex flex-col justify-center items-center  gap-4 h-fit">
          <i class="${getFileIcon(fileInfo.originalName, fileInfo.type)} file-icon"></i>
          <div class="file-details flex justify-center items-center gap-4 h-fit" >
            <div class="file-name h-fit" >${fileInfo.originalName}</div>
            <div class="file-size h-fit">${formatFileSize(fileInfo.size)}</div>
          </div>
        </div>
      </div>`;
  }
}

// ===== Tìm kiếm tin nhắn trong phòng =====
function filterMessagesByKeyword(list, keyword) {
  if (!keyword) return list;
  const lower = keyword.toLowerCase();
  return list.filter(
    (msg) =>
      !isSystemMessage(msg) &&
      ((msg.username && msg.username.toLowerCase().includes(lower)) ||
        (msg.message && msg.message.toLowerCase().includes(lower)))
  );
}

function setupMessageSearch() {
  const input = document.getElementById("search-message-input");
  const clearBtn = document.getElementById("clear-search-btn");
  if (!input) return;
  let lastKeyword = "";
  function doSearch() {
    const kw = input.value.trim();
    lastKeyword = kw;
    if (clearBtn) clearBtn.style.display = kw ? "inline-block" : "none";
    const list = roomMessages[currentRoom] || [];
    const filtered = filterMessagesByKeyword(list, kw);
    renderMessages(filtered);
    // Nếu có kết quả, highlight keyword
    if (kw && filtered.length) {
      setTimeout(() => {
        const container = document.getElementById("messages-container");
        if (!container) return;
        container.querySelectorAll(".message-outgoing, .message-incoming").forEach((el) => {
          el.innerHTML = el.innerHTML.replace(
            new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
            (m) => `<mark class='bg-yellow-200 text-black rounded px-1'>${m}</mark>`
          );
        });
      }, 10);
    }
  }
  input.addEventListener("input", doSearch);
  if (clearBtn) clearBtn.addEventListener("click", () => {
    input.value = "";
    doSearch();
    input.focus();
  });
  // Khi chuyển phòng, reset tìm kiếm
  const origSwitchRoom = window.switchRoom;
  window.switchRoom = function(roomName) {
    if (input.value) {
      input.value = "";
      if (clearBtn) clearBtn.style.display = "none";
    }
    if (typeof origSwitchRoom === 'function') origSwitchRoom(roomName);
  };
}

document.addEventListener("DOMContentLoaded", setupMessageSearch);
// ===== Desktop Notification (Thông báo tin nhắn mới) =====
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showMessageNotification({ title, body, icon }) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon });
  }
}

// Gọi xin quyền khi load trang
document.addEventListener("DOMContentLoaded", function () {
  requestNotificationPermission();
});
// Trạng thái toàn cục phòng & tin nhắn (client cache)
const roomMessages = {};
const GLOBAL_ROOM = "Phòng chat chung"; // tên hiển thị phòng global
let currentRoom = GLOBAL_ROOM; // phòng hiện tại
const joinedRooms = new Set(); // các phòng đã join trên server
// Các phòng đang chờ nhận lịch sử (chưa có history_room) – dùng cho fallback fetch
const pendingHistory = new Set();
// Lưu trạng thái người online & số thành viên phòng (chỉ xử lý FE theo luật AI_RULES)
const onlineUsersState = { list: [] }; // toàn bộ user online (global scope)
const roomMemberCounts = {}; // roomId -> count (từ event room_users)

// Kiểm tra tin nhắn hệ thống
function isSystemMessage(m) {
  return m.userId === "system" || m.username === "[system]";
}

// ==== Persistence (localStorage) ====
const PERSIST_KEY_MESSAGES = "chatMessagesV1"; // { roomName: [messages] }
const PERSIST_KEY_PROFILE = "chatUserProfileV1"; // { username, avatar }
const PERSIST_KEY_JOINED_ROOMS = "chatJoinedRoomsV1"; // Array of room names

// Get user-specific localStorage keys
function getUserStorageKey(baseKey, username) {
  return `${baseKey}_${username || 'anonymous'}`;
}

// Debounce timers per room
const persistTimers = {};

function loadPersistedProfile() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[persist] load profile failed", e);
    return null;
  }
}
function saveProfile(profile) {
  try {
    localStorage.setItem(PERSIST_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.warn("[persist] save profile failed", e);
  }
}

function loadJoinedRooms(username) {
  if (!username) return;
  try {
    const key = getUserStorageKey(PERSIST_KEY_JOINED_ROOMS, username);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const rooms = JSON.parse(raw);
    if (Array.isArray(rooms)) {
      joinedRooms.clear(); // Clear existing first
      rooms.forEach(room => joinedRooms.add(room));
      console.log(`[persist] loaded joined rooms for ${username}: ${Array.from(joinedRooms).join(", ")}`);
    }
  } catch (e) {
    console.warn("[persist] load joined rooms failed", e);
  }
}

function saveJoinedRooms(username) {
  if (!username) return;
  try {
    const rooms = Array.from(joinedRooms);
    const key = getUserStorageKey(PERSIST_KEY_JOINED_ROOMS, username);
    localStorage.setItem(key, JSON.stringify(rooms));
  } catch (e) {
    console.warn("[persist] save joined rooms failed", e);
  }
}
function loadPersistedMessages(username) {
  if (!username) return;
  try {
    const key = getUserStorageKey(PERSIST_KEY_MESSAGES, username);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      // Clear existing messages first
      Object.keys(roomMessages).forEach(key => delete roomMessages[key]);
      
      for (const [room, list] of Object.entries(data)) {
        if (!Array.isArray(list)) continue;
        roomMessages[room] = list
          .filter((m) => m && typeof m === "object")
          .map((m) => ({
            ...m,
            room,
            // ensure timestamp number
            timestamp: m.timestamp || m.ts || Date.now(),
          }));
      }
    }
    console.log(
      `[persist] loaded rooms for ${username}: ${Object.keys(roomMessages).join(", ")}`
    );
  } catch (e) {
    console.warn("[persist] load messages failed", e);
  }
}
function persistRoom(room, username) {
  if (!username) return;
  // Limit messages per room to last 100 non-system
  try {
    const snapshot = {};
    for (const [r, list] of Object.entries(roomMessages)) {
      snapshot[r] = (list || []).filter((m) => !isSystemMessage(m)).slice(-100);
    }
    const key = getUserStorageKey(PERSIST_KEY_MESSAGES, username);
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (e) {
    console.warn("[persist] save messages failed", e);
  }
}
function schedulePersist(room) {
  const username = currentUser?.username;
  if (!username) return;
  clearTimeout(persistTimers[room]);
  persistTimers[room] = setTimeout(() => persistRoom(room, username), 400);
}

// Function to save user data to localStorage  
function saveUserData() {
  const username = currentUser?.username;
  if (!username) return;
  
  try {
    // Save joined rooms
    saveJoinedRooms(username);
    
    // Save messages for all rooms
    Object.keys(roomMessages).forEach(room => {
      persistRoom(room, username);
    });
    
    console.log(`[persist] saved all data for user: ${username}`);
  } catch (e) {
    console.warn("[persist] failed to save user data", e);
  }
}

// Function to load user-specific data after login
function loadUserData(username) {
  if (!username) return;
  try {
    loadPersistedMessages(username);
    loadJoinedRooms(username);
    console.log(`[persist] loaded data for user: ${username}`);
  } catch (e) {
    console.warn("[persist] failed to load user data", e);
  }
}

// Function to clear all user data
function clearAllUserData() {
  // Clear in-memory data chỉ khi logout, không ảnh hưởng localStorage
  joinedRooms.clear();
  Object.keys(roomMessages).forEach(key => delete roomMessages[key]);
  console.log("[persist] cleared in-memory user data");
}

// Định dạng thời gian HH:MM
function formatTime(ts) {
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Apply persisted profile to UI & emit to server if needed
  const persistedProfile = loadPersistedProfile();
  if (persistedProfile) {
    const { username, avatar } = persistedProfile;
    if (username) {
      const sidebarName = document.getElementById("sidebar-username");
      if (sidebarName) sidebarName.textContent = username;
      const displayNameInput = document.getElementById("display-name-input");
      if (displayNameInput) displayNameInput.value = username;
      // Gửi lên server sau khi socket ready (defer a tick)
      setTimeout(() => {
        if (socket) {
          socket.emit("set_username", username);
        }
      }, 0);
    }
    if (avatar) {
      const avatarImg = document.getElementById("avatar-img");
      if (avatarImg) avatarImg.src = avatar;
      const sidebarAvatar = document.getElementById("sidebar-avatar");
      if (sidebarAvatar) sidebarAvatar.src = avatar;
      setTimeout(() => {
        if (socket) {
          socket.emit("set_profile", { avatar });
        }
      }, 0);
    }
  }
  // Tạo sẵn 50 phòng ẩn (chỉ xuất hiện khi người dùng join)
  const hiddenRooms = Array.from({ length: 50 }, (_, i) => `Phòng ${i + 1}`);

  // Hiển thị phòng khi tìm đúng tên phòng
  function showRoomIfExists(roomName) {
    const roomList = document.getElementById("conversation-list");
    // Kiểm tra phòng đã tồn tại trong danh sách chưa
    const exists = Array.from(roomList.children).some((item) => {
      const h3 = item.querySelector("h3");
      return h3 && h3.textContent === roomName;
    });
    if (!exists && hiddenRooms.includes(roomName)) {
      addRoomToList(roomName);
    }
  }
  // Xử lý nút Lưu tên
  const displayNameInput = document.getElementById("display-name-input");
  const saveDisplayNameBtn = document.getElementById("save-display-name-btn");
  if (displayNameInput && saveDisplayNameBtn) {
    // Hàm xử lý lưu tên
    function saveDisplayName() {
      const newName = displayNameInput.value.trim();
      if (newName) {
        if (socket) {
          socket.emit("set_username", newName);
        }
        saveProfile({
          username: newName,
          avatar: (document.getElementById("avatar-img") || {}).src || "",
        });
        // Cập nhật tên ở sidebar (vùng đỏ)
        const sidebarName = document.getElementById("sidebar-username");
        if (sidebarName) sidebarName.textContent = newName;
        
        // Xóa class cảnh báo nếu có
        displayNameInput.classList.remove("border-red-500", "focus:border-red-500");
        displayNameInput.placeholder = "Nhập tên hiển thị của bạn";
        
        // Cập nhật tên ở modal
        const modalName = document.querySelector(
          "#settings-modal .font-medium"
        );
        if (modalName) modalName.textContent = newName;
        
        // Đóng modal
        document.getElementById("settings-modal").classList.add("hidden");
      } else {
        alert("Vui lòng nhập tên!");
      }
    }
    
    // Event listener cho nút Save
    saveDisplayNameBtn.addEventListener("click", saveDisplayName);
    
    // Event listener cho phím Enter
    displayNameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        saveDisplayName();
      }
    });
  }

  // Xử lý nút cập nhật avatar
  const updateAvatarBtn = document.getElementById("update-avatar-btn");
  if (updateAvatarBtn) {
    updateAvatarBtn.addEventListener("click", function () {
      let fileInput = document.getElementById("avatar-file-input");
      if (!fileInput) {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.id = "avatar-file-input";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);
      }
      fileInput.click();
      fileInput.onchange = function () {
        const file = fileInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (ev) {
            const dataUrl = ev.target.result;
            if (socket) {
              socket.emit("set_profile", { avatar: dataUrl });
            }
            // Persist avatar with existing username
            const username = document.getElementById("sidebar-username")
              ? document.getElementById("sidebar-username").textContent
              : "";
            saveProfile({ username, avatar: dataUrl });
            // Hiển thị avatar mới ở modal
            const avatarImg = document.getElementById("avatar-img");
            if (avatarImg) avatarImg.src = dataUrl;
            // Hiển thị avatar mới ở sidebar góc trái
            const sidebarAvatar = document.getElementById("sidebar-avatar");
            if (sidebarAvatar) sidebarAvatar.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }
      };
    });
  }
  // Nếu muốn hiển thị phòng mặc định khi load lần đầu có thể thêm:
  if (!document.querySelector(`[data-room="${currentRoom}"]`)) {
    addRoomToList(currentRoom, { lastMessage: "", lastTime: Date.now() });
  }

  // === Emoji Picker đơn giản (FE only) ===
  const messageForm = document.getElementById("message-form");
  const emojiBtn = document.getElementById("emoji-btn");
  let emojiPicker;
  const EMOJI_SETS = [
    {
      label: "Smileys",
      chars: "😀😁😂🤣😅😊😇🙂🙃😉😍🤩😘😗😜🤪🤨😎🥳😏😭😡😤",
    },
    { label: "Hands", chars: "👍👎👏🙌👋🤙🤝🙏✌️🤘👌👊" },
    { label: "Hearts", chars: "❤️🧡💛💚💙💜🖤🤍🤎💔💕💖💗💘" },
    { label: "Misc", chars: "🔥⭐⚡🌟🎉✅❌✨🚀🍀🍕🍺☕🥤🎁" },
  ];
  function buildEmojiPicker() {
    if (emojiPicker) return emojiPicker;
    emojiPicker = document.createElement("div");
    emojiPicker.className =
      "emoji-picker grid grid-cols-7 gap-1 text-center select-none";
    // Position relative to input wrapper
    const wrapper = emojiBtn?.closest(".relative");
    if (wrapper) {
      wrapper.style.position = wrapper.style.position || "relative";
      // override inline style to anchor above input
      Object.assign(emojiPicker.style, {
        right: "0",
        bottom: "54px",
      });
    }
    EMOJI_SETS.forEach((set) => {
      const label = document.createElement("div");
      label.textContent = set.label;
      label.className = "emoji-section-label";
      emojiPicker.appendChild(label);
      [...set.chars].forEach((c) => {
        if (/\s/.test(c)) return; // skip spaces
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = c;
        b.addEventListener("click", () => insertEmoji(c));
        emojiPicker.appendChild(b);
      });
    });
    // Click outside & ESC to close
    document.addEventListener("click", (e) => {
      if (!emojiPicker) return;
      if (
        emojiPicker.contains(e.target) ||
        e.target === emojiBtn ||
        (emojiBtn && emojiBtn.contains(e.target))
      )
        return;
      emojiPicker.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") emojiPicker.classList.remove("open");
    });
    // Append to wrapper or chat-area fallback
    (
      wrapper ||
      document.getElementById("chat-area") ||
      document.body
    ).appendChild(emojiPicker);
    return emojiPicker;
  }
  function insertEmoji(char) {
    const input = messageForm?.querySelector("input");
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const prev = input.value;
    input.value = prev.slice(0, start) + char + prev.slice(end);
    const cursor = start + char.length;
    input.focus();
    input.setSelectionRange(cursor, cursor);
    // Optional: immediate re-render of messages not needed.
  }
  if (emojiBtn) {
    emojiBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const picker = buildEmojiPicker();
      picker.classList.toggle("open");
    });
  }

  // Điều chỉnh padding messages khi composer cố định (mobile)
  function adjustMessagesPadding() {
    const mc = document.getElementById("message-composer");
    const msgs = document.getElementById("messages-container");
    if (!mc || !msgs) return;
    if (window.innerWidth <= 768) {
      const h = mc.getBoundingClientRect().height;
      msgs.style.paddingBottom = h + 16 + "px"; // thêm khoảng trống
    } else {
      msgs.style.paddingBottom = ""; // dùng mặc định
    }
  }
  window.addEventListener("resize", adjustMessagesPadding);
  const ro = new ResizeObserver(adjustMessagesPadding);
  const composerEl = document.getElementById("message-composer");
  if (composerEl) ro.observe(composerEl);
  adjustMessagesPadding();

  // Mở modal tham gia phòng
  document
    .getElementById("join-room-btn")
    .addEventListener("click", function () {
      document.getElementById("join-room-modal").classList.remove("hidden");
    });

  // Đóng modal tham gia phòng
  document
    .getElementById("close-modal-btn")
    .addEventListener("click", function () {
      document.getElementById("join-room-modal").classList.add("hidden");
    });

  // Xác nhận tham gia phòng
  document
    .getElementById("confirm-join-btn")
    .addEventListener("click", function () {
      const roomNumberInput = document.getElementById("room-number");
      const roomNumber = parseInt(roomNumberInput.value, 10);
      if (!isNaN(roomNumber) && roomNumber >= 1 && roomNumber <= 50) {
        const roomName = `Phòng ${roomNumber}`;
        showRoomIfExists(roomName);
        // Đánh dấu đang chờ history và gửi join
        pendingHistory.add(roomName);
        if (socket) {
          socket.emit("join_room", { roomId: roomName });
        }
        document.getElementById("join-room-modal").classList.add("hidden");
        roomNumberInput.value = ""; // reset
        switchRoom(roomName);
      } else {
        alert("Vui lòng nhập số phòng từ 1 đến 50.");
      }
    });

  // Mở modal cài đặt
  document
    .getElementById("settings-btn")
    .addEventListener("click", function () {
      document.getElementById("settings-modal").classList.remove("hidden");
    });

  // Đóng modal cài đặt
  document
    .getElementById("close-settings-btn")
    .addEventListener("click", function () {
      document.getElementById("settings-modal").classList.add("hidden");
    });

  // Xóa tất cả tin nhắn trong phòng hiện tại
  document
    .getElementById("clear-room-messages-btn")
    .addEventListener("click", function () {
      if (!currentRoom) {
        alert("Không có phòng nào được chọn!");
        return;
      }
      
      const confirmMessage = currentRoom === GLOBAL_ROOM 
        ? "Bạn có chắc chắn muốn xóa tất cả tin nhắn trong phòng chat chung?"
        : `Bạn có chắc chắn muốn xóa tất cả tin nhắn trong ${currentRoom}?`;
      
      if (confirm(confirmMessage)) {
        clearRoomMessages(currentRoom);
      }
    });

  // Mở modal giới thiệu (info) khi click nút i trong header
  const infoBtn = document.getElementById("room-info-btn");
  if (infoBtn) {
    infoBtn.addEventListener("click", () => {
      const m = document.getElementById("info-modal");
      if (m) m.classList.remove("hidden");
    });
  }
  // Các nút đóng info modal
  ["close-info-btn", "info-close-btn2", "info-action-btn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        const m = document.getElementById("info-modal");
        if (m) m.classList.add("hidden");
      });
    }
  });
  // Đóng khi click nền tối
  const infoModal = document.getElementById("info-modal");
  if (infoModal) {
    infoModal.addEventListener("click", (e) => {
      if (e.target === infoModal) infoModal.classList.add("hidden");
    });
  }

  // Xử lý nút xem thành viên
  const membersBtn = document.getElementById("room-members-btn");
  if (membersBtn) {
    console.log("Members button found, adding event listener");
    membersBtn.addEventListener("click", () => {
      console.log("Members button clicked, currentRoom:", currentRoom);
      if (currentRoom && currentRoom !== GLOBAL_ROOM) {
        showRoomMembers(currentRoom);
      } else {
        console.log("Cannot show members: currentRoom is", currentRoom);
      }
    });
  } else {
    console.log("Members button NOT found!");
  }
  
  // Đóng modal thành viên
  const closeMembersBtn = document.getElementById("close-members-btn");
  if (closeMembersBtn) {
    closeMembersBtn.addEventListener("click", () => {
      const modal = document.getElementById("room-members-modal");
      if (modal) modal.classList.add("hidden");
    });
  }
  
  // Đóng modal thành viên khi click backdrop
  const membersModal = document.getElementById("room-members-modal");
  if (membersModal) {
    membersModal.addEventListener("click", (e) => {
      if (e.target === membersModal) membersModal.classList.add("hidden");
    });
  }

  // Thêm / cập nhật phòng trong danh sách với preview tin nhắn cuối
  function addRoomToList(roomName, opts = {}) {
    const { lastMessage = "", lastTime = null } = opts;
    const list = document.getElementById("conversation-list");
    let el = list.querySelector(`[data-room="${roomName}"]`);
    if (el) {
      // cập nhật preview nếu đã có
      if (lastMessage) {
        const msgEl = el.querySelector(".last-message");
        if (msgEl) msgEl.textContent = lastMessage;
      }
      if (lastTime) {
        const timeEl = el.querySelector(".last-time");
        if (timeEl) timeEl.textContent = formatTime(lastTime);
      }
      return;
    }
    el = document.createElement("div");
    el.className =
      "p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center conversation-item";
    el.setAttribute("data-room", roomName);
    el.innerHTML = `
      <div class="relative">
        <img src="./img/teamwork.png" alt="Avatar" class="rounded-full w-10 h-10 object-cover" />
        <span class="online-status online absolute bottom-0 right-0 border-2 border-white"></span>
      </div>
      <div class="ml-3 flex-1 min-w-0">
        <div class="flex justify-between gap-2">
          <h3 class="font-medium text-gray-900 truncate" title="${roomName}">${roomName}</h3>
          <span class="text-xs text-gray-500 last-time">${
            lastTime ? formatTime(lastTime) : ""
          }</span>
        </div>
        <p class="text-sm text-gray-500 truncate last-message">${lastMessage}</p>
      </div>`;
    el.addEventListener("click", () => switchRoom(roomName));
    // Right-click context menu binding
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showRoomContextMenu(e.clientX, e.clientY, roomName);
    });
    list.prepend(el);
  }

  // Hiển thị trạng thái loading khi đang đợi lịch sử phòng
  function showLoading(roomName) {
    if (currentRoom !== roomName) return;
    const container = document.getElementById("messages-container");
    container.innerHTML = `
      <div class='flex justify-center mt-6'>
        <div class='flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-full'>
          <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          Đang tải lịch sử...
        </div>
      </div>`;
  }

  // Đảm bảo đã join phòng trên server, nếu chưa thì join + đặt fallback REST
  function ensureJoined(roomName) {
    if (roomName === GLOBAL_ROOM) return; // global không cần join
    
    // Nếu đã join hoặc đang chờ join thì không làm gì
    if (joinedRooms.has(roomName)) {
      console.log(`[ensureJoined] Already joined room: ${roomName}`);
      return;
    }
    
    if (pendingHistory.has(roomName)) {
      console.log(`[ensureJoined] Already pending join for room: ${roomName}`);
      return;
    }
    
    console.log(`[ensureJoined] Joining room: ${roomName}`);
    pendingHistory.add(roomName);
    if (socket) {
      socket.emit("join_room", { roomId: roomName });
    }
    
    // Fallback: nếu sau 1.5s vẫn chưa có history_room thì gọi REST
    setTimeout(() => {
      if (
        pendingHistory.has(roomName) &&
        (!roomMessages[roomName] || roomMessages[roomName].length === 0)
      ) {
        fetchRoomHistory(roomName);
      }
    }, 1500);
  }

  // Fallback REST fetch lịch sử phòng
  function fetchRoomHistory(roomName) {
    fetch(`/api/rooms/${encodeURIComponent(roomName)}/messages?limit=50`)
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs) => {
        if (!Array.isArray(msgs)) return;
        // Chỉ áp dụng nếu vẫn chưa có dữ liệu
        if (!roomMessages[roomName] || roomMessages[roomName].length === 0) {
          roomMessages[roomName] = msgs
            .filter((m) => !isSystemMessage(m))
            .map((m) => ({
              ...m,
              room: roomName,
              timestamp: m.timestamp || m.ts || Date.now(),
            }));
          addRoomToList(roomName, {
            lastMessage: roomMessages[roomName].length
              ? `${
                  roomMessages[roomName][roomMessages[roomName].length - 1]
                    .username
                }: ${
                  roomMessages[roomName][roomMessages[roomName].length - 1]
                    .message
                }`
              : "",
            lastTime: roomMessages[roomName].length
              ? roomMessages[roomName][roomMessages[roomName].length - 1]
                  .timestamp
              : Date.now(),
          });
          if (currentRoom === roomName) renderMessages(roomMessages[roomName]);
        }
      })
      .finally(() => pendingHistory.delete(roomName));
  }

  // Xóa tất cả tin nhắn trong phòng
  function clearRoomMessages(roomName) {
    if (!roomName) return;
    
    // Emit event to server để xóa trên server
    if (roomName === GLOBAL_ROOM) {
      if (socket) {
        socket.emit("clear_global_messages");
      }
    } else {
      if (socket) {
        socket.emit("clear_room_messages", { roomId: roomName });
      }
    }
    
    // Xóa local cache
    if (roomMessages[roomName]) {
      roomMessages[roomName] = [];
      schedulePersist(roomName);
    }
    
    // Re-render nếu đang ở phòng này
    if (roomName === currentRoom) {
      renderMessages([]);
    }
    
    console.log(`[clearRoomMessages] Cleared all messages in ${roomName}`);
  }

  // Hiển thị danh sách thành viên phòng
  function showRoomMembers(roomName) {
    console.log("showRoomMembers called with roomName:", roomName);
    if (!roomName || roomName === GLOBAL_ROOM) {
      console.log("Invalid room name or global room, returning");
      return;
    }
    
    const modal = document.getElementById("room-members-modal");
    const membersList = document.getElementById("room-members-list");
    const title = document.getElementById("room-members-modal-title");
    
    console.log("Modal elements found:", { modal: !!modal, membersList: !!membersList, title: !!title });
    
    if (!modal || !membersList || !title) return;
    
    // Cập nhật tiêu đề
    title.textContent = `Thành viên - ${roomName}`;
    
    // Yêu cầu danh sách thành viên từ server
    if (socket) {
      console.log("Emitting get_room_members for room:", roomName);
      socket.emit("get_room_members", { roomId: roomName });
    }
    
    // Hiển thị modal
    modal.classList.remove("hidden");
    console.log("Modal shown");
    
    // Hiển thị loading
    membersList.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <div class="text-gray-500">Đang tải...</div>
      </div>
    `;
  }

  // Chuyển phòng chat
  function switchRoom(roomName) {
    console.log(`[switchRoom] From ${currentRoom} to ${roomName}`);
    if (currentRoom === roomName) {
      console.log(`[switchRoom] Same room, skipping`);
      return;
    }
    const prev = currentRoom;
    currentRoom = roomName;
    
    // Chỉ rời phòng cũ nếu thực sự cần (không phải global và không quay lại phòng đã rời)
    if (prev !== GLOBAL_ROOM && prev !== roomName && joinedRooms.has(prev)) {
      console.log(`[switchRoom] Leaving previous room: ${prev}`);
      if (socket) {
        socket.emit("leave_room", { roomId: prev });
      }
      // KHÔNG xóa khỏi joinedRooms để tránh join lại khi quay về
      // joinedRooms.delete(prev); // <-- Bỏ dòng này
    }
    
    document.getElementById("current-chat-name").textContent = roomName;
    document
      .querySelectorAll(".conversation-item")
      .forEach((i) => i.classList.remove("bg-blue-50"));
    const active = document.querySelector(`[data-room="${roomName}"]`);
    if (active) active.classList.add("bg-blue-50");
    if (!roomMessages[roomName]) roomMessages[roomName] = [];
    
    // Chỉ join nếu chưa từng join phòng này
    ensureJoined(roomName);
    
    if (
      roomName !== GLOBAL_ROOM &&
      (!roomMessages[roomName] || roomMessages[roomName].length === 0)
    ) {
      showLoading(roomName);
    } else {
      renderMessages(roomMessages[roomName]);
    }
    // Cập nhật số thành viên hiển thị: với phòng chung dùng tổng online, phòng khác dùng roomMemberCounts
    const countEl = document.getElementById("room-members-count");
    if (countEl) {
      if (roomName === GLOBAL_ROOM) {
        countEl.textContent = onlineUsersState.list.length || 0;
      } else if (roomMemberCounts[roomName] != null) {
        countEl.textContent = roomMemberCounts[roomName];
      } else {
        countEl.textContent = "..."; // chưa biết
      }
    }
    
    // Hiển thị/ẩn nút xem thành viên dựa trên loại phòng
    const membersBtn = document.getElementById("room-members-btn");
    if (membersBtn) {
      if (roomName === GLOBAL_ROOM) {
        membersBtn.style.display = "none";
      } else {
        membersBtn.style.display = "block";
      }
    }
    
    // Đóng sidebar trên mobile sau khi chọn phòng
    // Đóng sidebar trên tất cả thiết bị dưới md (<768px)
    if (window.innerWidth < 768) closeSidebar();
  }

  function renderMessages(list) {
    const container = document.getElementById("messages-container");
    container.innerHTML = "";
    if (!list || list.length === 0) {
      container.innerHTML = `<div class='mb-4 flex justify-center'><div class='text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full'>Chưa có tin nhắn</div></div>`;
      return;
    }
    list.forEach((msg) => {
      const wrap = document.createElement("div");
      const isSystem = isSystemMessage(msg);
      if (isSystem) {
        wrap.className = "my-3 flex justify-center";
        wrap.innerHTML = `<div class='text-xs md:text-sm px-3 py-1 rounded-full bg-gray-200 text-gray-600'>${msg.message}</div>`;
        container.appendChild(wrap);
        return;
      }
      // Xác định tin nhắn của mình dựa trên username thay vì socket.id để tránh lỗi sau khi reload
      const currentUsername = currentUser?.username || 
                              (document.getElementById("sidebar-username") ? 
                               document.getElementById("sidebar-username").textContent.trim() : '');
      const isMe = currentUsername && msg.username === currentUsername;
      
      wrap.className = `mb-4 flex ${isMe ? "justify-end" : "justify-start"}`;
      const time = msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      
      // Tạo nội dung tin nhắn
      let messageContent = '';
      
      // Nếu có file, hiển thị file
      if (msg.file) {
        messageContent += renderFileMessage(msg.file, isMe);
      }
      
      // Nếu có text message, hiển thị text
      if (msg.message && msg.message.trim()) {
        messageContent += `<div class="mt-2">${msg.message}</div>`;
      }
      
      wrap.innerHTML = `<div class='${
        isMe ? "message-outgoing from-me" : "message-incoming from-other"
      } message-appear px-4 py-2 max-w-xs md-max-w-md'><strong>${
        msg.username || 'Anonymous'
      }:</strong> ${messageContent}<span class="msg-time pl-2 block mt-1">${time}</span></div>`;
      container.appendChild(wrap);
    });
    container.scrollTop = container.scrollHeight;
    schedulePersist(currentRoom);
  }

  // Expose needed functions for socket handlers outside this DOMContentLoaded scope
  window.addRoomToList = addRoomToList;
  window.renderMessages = renderMessages;

  // Sau khi DOM sẵn sàng – tạo UI các phòng đã lưu (trừ phòng global đã xử lý)
  for (const roomName of Object.keys(roomMessages)) {
    if (!document.querySelector(`[data-room="${roomName}"]`)) {
      if (roomMessages[roomName] && roomMessages[roomName].length) {
        const lastNonSystem = [...roomMessages[roomName]]
          .slice()
          .reverse()
          .find((m) => !isSystemMessage(m));
        if (typeof window.addRoomToList === "function") {
          window.addRoomToList(roomName, {
            lastMessage: lastNonSystem
              ? `${lastNonSystem.username}: ${lastNonSystem.message}`
              : "",
            lastTime: lastNonSystem ? lastNonSystem.timestamp : Date.now(),
          });
        }
      }
    }
    if (roomName !== GLOBAL_ROOM) {
      joinedRooms.add(roomName);
      saveJoinedRooms(currentUser?.username); // Persist joined rooms
    }
  }

  // ===== Context Menu for Rooms (Join / Leave) =====
  const roomCtxMenu = document.getElementById("room-context-menu");
  function showRoomContextMenu(x, y, roomName) {
    if (!roomCtxMenu) return;
    // Build menu content each time (dynamic state)
    const isJoined =
      joinedRooms.has(roomName) ||
      roomName === GLOBAL_ROOM ||
      roomName === currentRoom; // nếu đang ở phòng này thì xem như đã tham gia
    roomCtxMenu.innerHTML = "";
    const title = document.createElement("div");
    title.textContent = roomName;
    title.className =
      "px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500";
    roomCtxMenu.appendChild(title);
    // Join button
    const joinBtn = document.createElement("button");
    joinBtn.type = "button";
    joinBtn.innerHTML =
      '<i class="fas fa-sign-in-alt text-blue-500 w-4"></i><span>Tham gia phòng</span>';
    joinBtn.disabled = isJoined;
    if (!isJoined) {
      joinBtn.addEventListener("click", () => {
        if (!joinedRooms.has(roomName) && roomName !== GLOBAL_ROOM) {
          pendingHistory.add(roomName);
          if (socket) {
            socket.emit("join_room", { roomId: roomName });
          }
        }
        switchRoom(roomName);
        hideRoomContextMenu();
      });
    }
    roomCtxMenu.appendChild(joinBtn);
    // Leave button (not allowed for global)
    const leaveBtn = document.createElement("button");
    leaveBtn.type = "button";
    leaveBtn.innerHTML =
      '<i class="fas fa-sign-out-alt text-rose-500 w-4"></i><span>Rời phòng</span>';
    leaveBtn.disabled = roomName === GLOBAL_ROOM || !joinedRooms.has(roomName);
    leaveBtn.addEventListener("click", () => {
      if (roomName !== GLOBAL_ROOM && joinedRooms.has(roomName)) {
        if (socket) {
          socket.emit("leave_room", { roomId: roomName });
        }
        joinedRooms.delete(roomName);
        saveJoinedRooms(currentUser?.username); // Persist joined rooms
        // If leaving current room, switch to global
        if (currentRoom === roomName) {
          switchRoom(GLOBAL_ROOM);
        }
        // Xóa phần tử phòng khỏi danh sách UI
        const list = document.getElementById("conversation-list");
        const item = list && list.querySelector(`[data-room="${roomName}"]`);
        if (item) item.remove();
        // Dọn cache để tránh hiển thị lại tự động (sẽ lấy lại khi user join lại)
        delete roomMessages[roomName];
        delete roomMemberCounts[roomName];
        
        // Xóa khỏi localStorage để tránh reload lại
        try {
          const existingData = JSON.parse(localStorage.getItem(PERSIST_KEY_MESSAGES) || '{}');
          delete existingData[roomName];
          localStorage.setItem(PERSIST_KEY_MESSAGES, JSON.stringify(existingData));
          console.log(`[persist] Removed room ${roomName} from localStorage`);
        } catch (e) {
          console.warn('[persist] Failed to remove room from localStorage', e);
        }
      }
      hideRoomContextMenu();
    });
    roomCtxMenu.appendChild(leaveBtn);
    // Positioning (prevent overflow)
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuWidth = 180;
    const menuHeight = 140; // approximate
    let left = x;
    let top = y;
    if (left + menuWidth > vw - 4) left = vw - menuWidth - 4;
    if (top + menuHeight > vh - 4) top = vh - menuHeight - 4;
    roomCtxMenu.style.left = left + "px";
    roomCtxMenu.style.top = top + "px";
    roomCtxMenu.classList.add("open");
    roomCtxMenu.setAttribute("aria-hidden", "false");
  }
  function hideRoomContextMenu() {
    if (!roomCtxMenu) return;
    roomCtxMenu.classList.remove("open");
    roomCtxMenu.setAttribute("aria-hidden", "true");
  }
  document.addEventListener("click", (e) => {
    if (!roomCtxMenu) return;
    if (
      roomCtxMenu.classList.contains("open") &&
      !roomCtxMenu.contains(e.target)
    ) {
      hideRoomContextMenu();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideRoomContextMenu();
  });

  // ===== Mobile Sidebar Toggle =====
  const sidebarPanel = document.getElementById("sidebar-panel");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const openSidebarBtn = document.getElementById("open-sidebar-btn");
  const mobileCloseBtn = document.getElementById("mobile-close-sidebar");
  function openSidebar() {
    if (!sidebarPanel) return;
    sidebarPanel.classList.remove("-translate-x-full");
    sidebarPanel.classList.add("translate-x-0");
    sidebarPanel.setAttribute("aria-hidden", "false");
    if (sidebarOverlay) {
      sidebarOverlay.classList.remove("hidden", "pointer-events-none");
      sidebarOverlay.classList.add("pointer-events-auto");
    }
    if (window.innerWidth < 768) document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (!sidebarPanel) return;
    sidebarPanel.classList.add("-translate-x-full");
    sidebarPanel.classList.remove("translate-x-0");
    sidebarPanel.setAttribute("aria-hidden", "true");
    if (sidebarOverlay) {
      sidebarOverlay.classList.add("hidden", "pointer-events-none");
      sidebarOverlay.classList.remove("pointer-events-auto");
    }
    document.body.style.overflow = "";
  }
  if (openSidebarBtn) {
    openSidebarBtn.addEventListener("click", () => {
      openSidebar();
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }
  if (mobileCloseBtn) mobileCloseBtn.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      // reset body scroll & ensure sidebar visible state controlled by Tailwind sm: classes
      document.body.style.overflow = "";
      if (sidebarOverlay)
        sidebarOverlay.classList.add("hidden", "pointer-events-none");
    } else if (
      sidebarPanel &&
      !sidebarPanel.classList.contains("translate-x-0")
    ) {
      // keep closed state
      sidebarPanel.classList.add("-translate-x-full");
    }
  });
  // Expose to switchRoom
  window.closeSidebar = closeSidebar;

  // Form gửi tin nhắn (sử dụng chung cho phòng hiện tại)
  const form = document.getElementById("message-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      const message = input.value.trim();
      
      // Kiểm tra có tin nhắn hoặc file
      if (!message && !selectedFile) return;
      
      // Kiểm tra username trước khi gửi tin nhắn
      const usernameElement = document.getElementById("sidebar-username");
      const username = usernameElement ? usernameElement.textContent.trim() : "";
      
      // Kiểm tra nếu username rỗng hoặc là "Tôi" (default), "Anonymous"
      if (!username || username === "Tôi" || username === "Anonymous" || username === "") {
        // Mở modal cài đặt để nhập tên
        const settingsModal = document.getElementById("settings-modal");
        const displayNameInput = document.getElementById("display-name-input");
        
        if (settingsModal && displayNameInput) {
          settingsModal.classList.remove("hidden");
          displayNameInput.focus();
          displayNameInput.placeholder = "Vui lòng nhập tên của bạn để gửi tin nhắn";
          
          // Thêm class cảnh báo
          displayNameInput.classList.add("border-red-500", "focus:border-red-500");
          
          // Hiển thị thông báo
          alert("Vui lòng nhập tên của bạn trước khi gửi tin nhắn!");
          return;
        }
      }
      
      let fileInfo = null;
      
      // Upload file nếu có
      if (selectedFile) {
        fileInfo = await uploadFile(selectedFile);
        if (!fileInfo) return; // Upload failed
      }
      
      // Gửi lên server: phân biệt global và phòng
      // Optimistic render (hiển thị ngay)
      const provisional = {
        id: null, // sẽ cập nhật khi server trả về
        tempId: `${socket.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        userId: socket.id,
        username,
        message: message || (fileInfo ? `đã gửi file: ${fileInfo.originalName}` : ''),
        room: currentRoom,
        timestamp: Date.now(),
        _local: true,
        file: fileInfo
      };
      
      if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
      roomMessages[currentRoom].push(provisional);
      renderMessages(roomMessages[currentRoom]);
      
      if (currentRoom === GLOBAL_ROOM) {
        if (socket) {
          socket.emit("send_message", { 
            message, 
            tempId: provisional.tempId,
            file: fileInfo 
          });
        }
      } else {
        if (!joinedRooms.has(currentRoom)) {
          if (socket) {
            socket.emit("join_room", { roomId: currentRoom });
          }
        }
        if (socket) {
          socket.emit("send_room_message", {
            roomId: currentRoom,
            message,
            tempId: provisional.tempId,
            file: fileInfo
          });
        }
      }
      
      // Reset form
      input.value = "";
      
      // Clear file selection
      if (selectedFile) {
        hideFilePreview();
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      }
      
      schedulePersist(currentRoom);
    });
  }

  // Khởi tạo số thành viên phòng nếu cần (giữ lại cập nhật thành viên phòng nếu server không gửi event)
  // Nếu muốn cập nhật số thành viên phòng từ server, hãy dùng event "room_users" bên dưới.
}); // end DOMContentLoaded

// Biến socket sẽ được khởi tạo sau khi đăng nhập thành công
let socket = null;

// Hàm khởi tạo socket connection
function initSocket() {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io();
  
  // Thiết lập các event listeners cho socket
  setupSocketEvents();
}

// Thiết lập các event listeners cho socket
function setupSocketEvents() {
  if (!socket) return;

// Người online (nếu có UI hiển thị)
socket.on("online_users", (users) => {
  const el = document.getElementById("online-count");
  if (el) el.textContent = users.length;
  onlineUsersState.list = users || [];
  // Nếu đang ở phòng chat chung ⇒ đồng bộ luôn số thành viên online hiển thị trong header
  if (currentRoom === GLOBAL_ROOM) {
    const c = document.getElementById("room-members-count");
    if (c) c.textContent = onlineUsersState.list.length || 0;
  }
});

// Nhận tin nhắn (giả định server gửi {username,userId,message,room?,timestamp?})
socket.on("receive_message", (msg) => {
  // Thông báo nếu tin nhắn đến từ phòng KHÔNG phải phòng đang xem, hoặc tab không active
  try {
    const isCurrentRoom = (msg.roomId || GLOBAL_ROOM) === currentRoom;
    const isFromMe = msg.userId === socket.id;
    const isSystem = isSystemMessage(msg);
    if (!isFromMe && !isSystem && (!isCurrentRoom || document.hidden)) {
      showMessageNotification({
        title: msg.roomId ? `Phòng ${msg.roomId}` : "Chat Nhanh",
        body: `${msg.username}: ${msg.message}`,
        icon: msg.avatar || "/img/logo.webp"
      });
    }
  } catch (e) {}
  // Chuẩn hoá tên trường thời gian
  const timestamp = msg.timestamp || msg.ts || Date.now();
  // Xác định phòng: nếu có roomId dùng, không thì xem như global
  const room = msg.roomId ? msg.roomId : GLOBAL_ROOM;
  if (!roomMessages[room]) roomMessages[room] = [];
  // Nếu là tin của chính mình đã optimistic -> cập nhật thay vì thêm mới
  if (msg.userId === socket.id) {
    // Ưu tiên đối chiếu bằng tempId nếu có
    let idx = -1;
    if (msg.tempId) {
      idx = roomMessages[room].findIndex((m) => m.tempId === msg.tempId);
    }
    if (idx === -1) {
      idx = roomMessages[room].findIndex(
        (m) => m._local && m.message === msg.message && !m.id
      );
    }
    if (idx !== -1) {
      roomMessages[room][idx] = { ...msg, room, timestamp };
    } else if (!roomMessages[room].some((m) => m.id === msg.id)) {
      roomMessages[room].push({ ...msg, room, timestamp });
    }
  } else {
    // Hiển thị cả tin hệ thống (join/leave). Ngăn trùng lặp do double leave/join.
    if (msg.id && roomMessages[room].some((m) => m.id === msg.id)) {
      return; // đã có
    }
    const last = roomMessages[room][roomMessages[room].length - 1];
    if (
      isSystemMessage(msg) &&
      last &&
      isSystemMessage(last) &&
      last.message === msg.message &&
      timestamp - (last.timestamp || 0) < 1500
    ) {
      // bỏ qua bản sao quá gần nhau
    } else {
      roomMessages[room].push({ ...msg, room, timestamp });
    }
  }
  // Tin nhắn từ server đã theo thứ tự -> chỉ sort nếu lệch
  roomMessages[room].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  if (typeof window.addRoomToList === "function" && !isSystemMessage(msg)) {
    window.addRoomToList(room, {
      lastMessage: `${msg.username}: ${msg.message}`,
      lastTime: timestamp,
    });
  }
  if (room === currentRoom && typeof window.renderMessages === "function")
    window.renderMessages(roomMessages[room]);
  schedulePersist(room);
});

// Lịch sử phòng khi join
socket.on("history_room", ({ roomId, messages }) => {
  // Nếu đã có dữ liệu (từ fallback) thì chỉ bổ sung những tin chưa có
  const existingIds = new Set(
    (roomMessages[roomId] || []).map((m) => m.id).filter(Boolean)
  );
  const incoming = messages
    .map((m) => ({
      ...m,
      room: roomId,
      timestamp: m.timestamp || m.ts || Date.now(),
    }))
    .filter((m) => (m.id ? !existingIds.has(m.id) : true));
  if (!roomMessages[roomId]) roomMessages[roomId] = [];
  roomMessages[roomId].push(...incoming);
  roomMessages[roomId].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  joinedRooms.add(roomId);
  saveJoinedRooms(currentUser?.username); // Persist joined rooms
  pendingHistory.delete(roomId);
  if (typeof window.addRoomToList === "function") {
    // Tìm tin cuối không phải system để dùng preview
    const lastNonSystem = [...roomMessages[roomId]]
      .slice()
      .reverse()
      .find((m) => !isSystemMessage(m));
    window.addRoomToList(roomId, {
      lastMessage: lastNonSystem
        ? `${lastNonSystem.username}: ${lastNonSystem.message}`
        : "",
      lastTime: lastNonSystem ? lastNonSystem.timestamp : Date.now(),
    });
  }
  if (currentRoom === roomId && typeof window.renderMessages === "function")
    window.renderMessages(roomMessages[roomId]);
  schedulePersist(roomId);
});

// Thành viên phòng
socket.on("room_users", ({ roomId, members }) => {
  roomMemberCounts[roomId] = members.length;
  if (roomId === currentRoom) {
    const el = document.getElementById("room-members-count");
    if (el) el.textContent = members.length;
  }
});

// Lịch sử chung (nếu server gửi) - có thể bỏ nếu không dùng global room
socket.on("history", (messages) => {
  roomMessages[GLOBAL_ROOM] = messages.map((m) => ({
    ...m,
    room: GLOBAL_ROOM,
    timestamp: m.timestamp || m.ts || Date.now(),
  }));
  if (
    currentRoom === GLOBAL_ROOM &&
    typeof window.renderMessages === "function"
  )
    window.renderMessages(roomMessages[GLOBAL_ROOM]);
  schedulePersist(GLOBAL_ROOM);
});

// Khi socket bị ngắt -> xoá trạng thái joined để ép join lại khi reconnect
socket.on("disconnect", () => {
  joinedRooms.clear();
  // Giữ lại roomMessages để còn cache lịch sử cũ
  console.log("[socket] disconnected - sẽ rejoin khi kết nối lại");
});

// Xử lý khi tất cả tin nhắn bị xóa
socket.on("all_messages_cleared", ({ roomId }) => {
  console.log("All messages cleared for room:", roomId);
  
  // Xóa tin nhắn khỏi cache - xử lý cả global room và các phòng khác
  if (roomId === GLOBAL_ROOM || roomId === "global" || roomId === null) {
    roomMessages[GLOBAL_ROOM] = [];
    // Nếu đang ở phòng global thì render lại
    if (currentRoom === GLOBAL_ROOM) {
      renderMessages([]);
    }
  } else if (roomId) {
    if (roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }
    // Nếu đang ở phòng bị xóa tin nhắn thì render lại
    if (currentRoom === roomId) {
      renderMessages([]);
    }
  }
  
  // QUAN TRỌNG: Lưu ngay vào localStorage để đảm bảo tin nhắn bị xóa vĩnh viễn
  saveUserData();
  
  // Đánh dấu room này đã được cleared để tránh restore từ server history
  const clearedRoomKey = roomId === GLOBAL_ROOM || roomId === "global" || roomId === null 
    ? GLOBAL_ROOM 
    : roomId;
  
  // Ghi log để debug
  console.log(`Messages cleared and saved to localStorage for room: ${clearedRoomKey}`);
});

// Nhận danh sách thành viên phòng từ server
socket.on("room_members_list", ({ roomId, members }) => {
  console.log("Received members for room:", roomId, members);
  
  const membersList = document.getElementById("room-members-list");
  if (!membersList) return;
  
  if (!members || members.length === 0) {
    membersList.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <div class="text-gray-500">Không có thành viên nào</div>
      </div>
    `;
    return;
  }
  
  // Render danh sách thành viên
  membersList.innerHTML = members.map(member => `
    <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
      <div class="relative">
        <img 
          src="${member.avatar || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/023f3a09-10e0-4be5-b674-dd9f20cff6ac.png'}" 
          alt="${member.username}" 
          class="w-8 h-8 rounded-full object-cover"
        />
        <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${member.online ? 'bg-green-500' : 'bg-gray-400'}"></span>
      </div>
      <div class="flex-1">
        <div class="font-medium text-sm">${member.username}</div>
        <div class="text-xs text-gray-500">${member.online ? 'Đang online' : 'Offline'}</div>
      </div>
    </div>
  `).join('');
});

// Khi kết nối lại -> rejoin tất cả các phòng đã có trong cache (trừ global)
socket.on("connect", () => {
  console.log("[socket] connected/reconnected");
  
  // Tự động set profile nếu user đã đăng nhập
  if (window.currentUserProfile) {
    console.log('Setting profile for user:', window.currentUserProfile.username);
    socket.emit('set_profile', {
      username: window.currentUserProfile.username,
      avatar: null
    });
  }
  
  for (const roomName of Object.keys(roomMessages)) {
    if (roomName === GLOBAL_ROOM) continue;
    if (pendingHistory.has(roomName)) continue; // đã chờ sẵn
    
    // Chỉ rejoin những phòng mà user thực sự đã join (không phải chỉ có trong cache)
    if (!joinedRooms.has(roomName)) {
      console.log(`[socket] Skipping rejoining room ${roomName} - not in joinedRooms`);
      continue;
    }
    
    pendingHistory.add(roomName);
    if (socket) {
      socket.emit("join_room", { roomId: roomName });
    }
    // fallback sau 1.5s nếu cần
    setTimeout(() => {
      if (
        pendingHistory.has(roomName) &&
        (!roomMessages[roomName] || roomMessages[roomName].length === 0)
      ) {
        fetch(`/api/rooms/${encodeURIComponent(roomName)}/messages?limit=50`)
          .then((r) => (r.ok ? r.json() : []))
          .then((msgs) => {
            if (!Array.isArray(msgs)) return;
            if (
              !roomMessages[roomName] ||
              roomMessages[roomName].length === 0
            ) {
              roomMessages[roomName] = msgs
                .filter((m) => !isSystemMessage(m))
                .map((m) => ({
                  ...m,
                  room: roomName,
                  timestamp: m.timestamp || m.ts || Date.now(),
                }));
              if (currentRoom === roomName)
                renderMessages(roomMessages[roomName]);
            }
          })
          .finally(() => pendingHistory.delete(roomName));
      }
    }, 1500);
  }
});

} // end setupSocketEvents

// Event listener cho nút đăng xuất và clear messages
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        logout();
        // Reload
        location.reload();
      }
    });
  }
});
