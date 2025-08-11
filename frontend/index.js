// --- Chat realtime bằng socket.io ---
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Kết nối thành công:", socket.id);
});

// Nhận lịch sử tin nhắn khi mới kết nối
socket.on("history", (messages) => {
  const ul = document.getElementById("messages");
  if (!ul) return;
  ul.innerHTML = "";
  messages.forEach((m) => {
    const li = document.createElement("li");
    li.innerText = `${m.username}: ${m.message}`;
    ul.appendChild(li);
  });
  ul.scrollTop = ul.scrollHeight;
});

// Nhận tin nhắn mới
socket.on("receive_message", (data) => {
  const ul = document.getElementById("messages");
  if (!ul) return;
  const li = document.createElement("li");
  li.innerText = `${data.username}: ${data.message}`;
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
});

// Gửi tin nhắn cho phòng chat All
function sendMessage() {
  const username =
    document.getElementById("usernameInput").value || "Anonymous";
  const message = document.getElementById("messageInput").value.trim();
  if (!message) return;
  socket.emit("send_message", { username, message });
  document.getElementById("messageInput").value = "";
}
