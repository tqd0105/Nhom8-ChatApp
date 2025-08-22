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
function loadPersistedMessages() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY_MESSAGES);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
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
      `[persist] loaded rooms: ${Object.keys(roomMessages).join(", ")}`
    );
  } catch (e) {
    console.warn("[persist] load messages failed", e);
  }
}
function persistRoom(room) {
  // Limit messages per room to last 100 non-system
  try {
    const snapshot = {};
    for (const [r, list] of Object.entries(roomMessages)) {
      snapshot[r] = (list || []).filter((m) => !isSystemMessage(m)).slice(-100);
    }
    localStorage.setItem(PERSIST_KEY_MESSAGES, JSON.stringify(snapshot));
  } catch (e) {
    console.warn("[persist] save messages failed", e);
  }
}
function schedulePersist(room) {
  clearTimeout(persistTimers[room]);
  persistTimers[room] = setTimeout(() => persistRoom(room), 400);
}
// Load persisted messages & profile ASAP (before socket connect logic wants them)
try {
  loadPersistedMessages();
} catch (_) {}

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
      setTimeout(() => socket.emit("set_username", username), 0);
    }
    if (avatar) {
      const avatarImg = document.getElementById("avatar-img");
      if (avatarImg) avatarImg.src = avatar;
      const sidebarAvatar = document.getElementById("sidebar-avatar");
      if (sidebarAvatar) sidebarAvatar.src = avatar;
      setTimeout(() => socket.emit("set_profile", { avatar }), 0);
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
    saveDisplayNameBtn.addEventListener("click", function () {
      const newName = displayNameInput.value.trim();
      if (newName) {
        socket.emit("set_username", newName);
        saveProfile({
          username: newName,
          avatar: (document.getElementById("avatar-img") || {}).src || "",
        });
        // Cập nhật tên ở sidebar (vùng đỏ)
        const sidebarName = document.getElementById("sidebar-username");
        if (sidebarName) sidebarName.textContent = newName;
        // Cập nhật tên ở modal
        const modalName = document.querySelector(
          "#settings-modal .font-medium"
        );
        if (modalName) modalName.textContent = newName;
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
            socket.emit("set_profile", { avatar: dataUrl });
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
        socket.emit("join_room", { roomId: roomName });
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
        <img src="./avatar_huy_hunter1.jpg" alt="Avatar" class="rounded-full w-10 h-10 object-cover" />
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
    if (joinedRooms.has(roomName) || pendingHistory.has(roomName)) return;
    console.log(`[ensureJoined] Joining room: ${roomName}`);
    pendingHistory.add(roomName);
    socket.emit("join_room", { roomId: roomName });
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

  // Chuyển phòng chat
  function switchRoom(roomName) {
    console.log(`[switchRoom] From ${currentRoom} to ${roomName}`);
    if (currentRoom === roomName) {
      console.log(`[switchRoom] Same room, skipping`);
      return;
    }
    const prev = currentRoom;
    currentRoom = roomName;
    // optional: rời phòng cũ (trừ global)
    if (prev !== GLOBAL_ROOM && prev !== roomName && joinedRooms.has(prev)) {
      // Chỉ emit leave nếu client vẫn đánh dấu đã ở trong phòng để tránh double system message
      console.log(`[switchRoom] Leaving previous room: ${prev}`);
      socket.emit("leave_room", { roomId: prev });
      joinedRooms.delete(prev);
    }
    document.getElementById("current-chat-name").textContent = roomName;
    document
      .querySelectorAll(".conversation-item")
      .forEach((i) => i.classList.remove("bg-blue-50"));
    const active = document.querySelector(`[data-room="${roomName}"]`);
    if (active) active.classList.add("bg-blue-50");
    if (!roomMessages[roomName]) roomMessages[roomName] = [];
    // đảm bảo đã join nếu cần & hiển thị loading nếu chưa có dữ liệu
    // Trả lại việc tự động join phòng khi người dùng chuyển sang phòng mới
    ensureJoined(roomName);
    // Đánh dấu tạm thời là đã join phòng hiện tại để vô hiệu hoá nút "Tham gia phòng"
    // (sẽ được xác nhận chính thức khi nhận history_room từ server)
    if (roomName !== GLOBAL_ROOM) joinedRooms.add(roomName);
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
      const isMe = msg.userId === socket.id;
      wrap.className = `mb-4 flex ${isMe ? "justify-end" : "justify-start"}`;
      const time = msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      wrap.innerHTML = `<div class='${
        isMe ? "message-outgoing from-me" : "message-incoming from-other"
      } message-appear px-4 py-2 max-w-xs md-max-w-md'><strong>${
        msg.username
      }:</strong> ${msg.message}<span class="msg-time">${time}</span></div>`;
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
    if (roomName !== GLOBAL_ROOM) joinedRooms.add(roomName);
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
          socket.emit("join_room", { roomId: roomName });
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
        socket.emit("leave_room", { roomId: roomName });
        joinedRooms.delete(roomName);
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
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      const message = input.value.trim();
      if (!message) return;
      // Gửi lên server: phân biệt global và phòng
      // Optimistic render (hiển thị ngay)
      const username = document.getElementById("sidebar-username").textContent;
      const provisional = {
        id: null, // sẽ cập nhật khi server trả về
        tempId: `${socket.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        userId: socket.id,
        username,
        message,
        room: currentRoom,
        timestamp: Date.now(),
        _local: true,
      };
      if (!roomMessages[currentRoom]) roomMessages[currentRoom] = [];
      roomMessages[currentRoom].push(provisional);
      renderMessages(roomMessages[currentRoom]);
      if (currentRoom === GLOBAL_ROOM) {
        socket.emit("send_message", { message, tempId: provisional.tempId });
      } else {
        if (!joinedRooms.has(currentRoom)) {
          socket.emit("join_room", { roomId: currentRoom });
        }
        socket.emit("send_room_message", {
          roomId: currentRoom,
          message,
          tempId: provisional.tempId,
        });
      }
      input.value = "";
      schedulePersist(currentRoom);
    });
  }

  // Khởi tạo số thành viên phòng nếu cần (giữ lại cập nhật thành viên phòng nếu server không gửi event)
  // Nếu muốn cập nhật số thành viên phòng từ server, hãy dùng event "room_users" bên dưới.
}); // end DOMContentLoaded

// Kết nối socket (giữ ngoài để có thể dùng sớm nếu cần)
const socket = io();

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

// Khi kết nối lại -> rejoin tất cả các phòng đã có trong cache (trừ global)
socket.on("connect", () => {
  console.log("[socket] connected/reconnected");
  for (const roomName of Object.keys(roomMessages)) {
    if (roomName === GLOBAL_ROOM) continue;
    if (pendingHistory.has(roomName)) continue; // đã chờ sẵn
    pendingHistory.add(roomName);
    socket.emit("join_room", { roomId: roomName });
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
