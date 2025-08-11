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
  messages.forEach((m) => {
    const li = document.createElement("li");
    li.innerText = `${m.username}: ${m.message}`;
    ul.appendChild(li);
  });
  ul.scrollTop = ul.scrollHeight;
});

socket.on("receive_message", (data) => {
  const ul = document.getElementById("messages");
  if (!ul) return;
  const li = document.createElement("li");
  li.innerText = `${data.username}: ${data.message}`;
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
});

function sendMessage() {
  const username = document.getElementById("usernameInput").value || "Anonymous";
  const message  = document.getElementById("messageInput").value.trim();
  if (!message) return;
  socket.emit("send_message", { username, message });
  document.getElementById("messageInput").value = "";
}
window.sendMessage = sendMessage; // <- đảm bảo gọi được từ onsubmit
