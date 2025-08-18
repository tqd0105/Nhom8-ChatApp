const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Kết nối thành công:", socket.id);
  // optional: báo username cho server nhớ
  const u = document.getElementById("usernameInput")?.value || "Anonymous";
  socket.emit("set_username", u);
});

socket.on("history", (messages) => {
  const ul = document.getElementById("messages");
  if (!ul) return;
  ul.innerHTML = "";
  const currentUser =
    document.getElementById("usernameInput").value || "Anonymous";
  messages.forEach((m) => {
    const li = document.createElement("li");
    let avatarHtml = m.avatar
      ? `<img src='${m.avatar}' style='width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle;' />`
      : "";
    li.innerHTML = `${avatarHtml}<span>${m.username}:</span> ${m.message}`;
    if (m.username === currentUser) {
      li.className = "message message-self";
    } else {
      li.className = "message message-other";
    }
    ul.appendChild(li);
  });
  ul.scrollTop = ul.scrollHeight;
});

socket.on("receive_message", (data) => {
  const ul = document.getElementById("messages");
  if (!ul) return;
  const currentUser =
    document.getElementById("usernameInput").value || "Anonymous";
  const li = document.createElement("li");
  let avatarHtml = data.avatar
    ? `<img src='${data.avatar}' style='width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle;' />`
    : "";
  li.innerHTML = `${avatarHtml}<span>${data.username}:</span> ${data.message}`;
  if (data.username === currentUser) {
    li.className = "message message-self";
  } else {
    li.className = "message message-other";
  }
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
});

function sendMessage() {
  const username =
    document.getElementById("usernameInput").value || "Anonymous";
  const message = document.getElementById("messageInput").value.trim();
  const avatar = localStorage.getItem("chat_avatar") || "";
  if (!message) return;
  socket.emit("send_message", { username, message, avatar });
  document.getElementById("messageInput").value = "";
}
window.sendMessage = sendMessage; // <- đảm bảo gọi được từ onsubmit
// Toggle theme sáng/tối
window.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const root = document.documentElement;
  function setTheme(mode) {
    if (mode === "dark") {
      root.classList.add("dark-theme");
      themeIcon.innerHTML =
        '<path d="M21.64 13.64A9 9 0 0 1 12 21a9 9 0 0 1 0-18c.34 0 .67.02 1 .05A7 7 0 0 0 21.64 13.64z"/>';
    } else {
      root.classList.remove("dark-theme");
      themeIcon.innerHTML =
        '<path d="M12 3a9 9 0 1 0 9 9c0-4.97-4.03-9-9-9zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/>';
    }
    localStorage.setItem("theme", mode);
  }
  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      const current = root.classList.contains("dark-theme") ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
    };
  }
  // Load theme từ localStorage
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) setTheme(savedTheme);
});
// Modal nhập tên
window.addEventListener("DOMContentLoaded", () => {
  const profileBtn = document.getElementById("profileBtn");
  const profileModal = document.getElementById("profileModal");
  const profileNameInput = document.getElementById("profileNameInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const closeProfileBtn = document.getElementById("closeProfileBtn");
  const usernameInput = document.getElementById("usernameInput");
  const avatarImg = document.getElementById("avatarImg");
  const avatarInput = document.getElementById("avatarInput");
  const modalAvatarImg = document.getElementById("modalAvatarImg");
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");

  // Hiển thị modal
  if (profileBtn) {
    profileBtn.onclick = () => {
      profileModal.style.display = "flex";
      profileNameInput.value = usernameInput.value;
      profileNameInput.focus();
      // Hiển thị avatar hiện tại trong modal
      if (modalAvatarImg && avatarImg) {
        modalAvatarImg.src = avatarImg.src;
      }
    };
  }
  // Đổi avatar
  if (changeAvatarBtn && avatarInput) {
    changeAvatarBtn.onclick = () => {
      avatarInput.click();
    };
    avatarInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          const dataUrl = ev.target.result;
          if (avatarImg) avatarImg.src = dataUrl;
          if (modalAvatarImg) modalAvatarImg.src = dataUrl;
          localStorage.setItem("chat_avatar", dataUrl);
          socket.emit("set_avatar", dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
  }
  // Đóng modal
  if (closeProfileBtn) {
    closeProfileBtn.onclick = () => {
      profileModal.style.display = "none";
    };
  }
  // Lưu tên
  if (saveProfileBtn) {
    saveProfileBtn.onclick = () => {
      const name = profileNameInput.value.trim();
      if (name) {
        usernameInput.value = name;
        localStorage.setItem("chat_username", name);
        profileModal.style.display = "none";
      }
    };
  }
  // Tự động lấy tên và avatar từ localStorage khi load lại
  const savedName = localStorage.getItem("chat_username");
  if (savedName) {
    usernameInput.value = savedName;
  }
  const savedAvatar = localStorage.getItem("chat_avatar");
  if (savedAvatar && avatarImg && modalAvatarImg) {
    avatarImg.src = savedAvatar;
    modalAvatarImg.src = savedAvatar;
  }
});
socket.on("online_users", (list) => {
  const onlineTabCount = document.getElementById("onlineTabCount");
  if (onlineTabCount) {
    onlineTabCount.textContent = `(${list.length})`;
  }
});
