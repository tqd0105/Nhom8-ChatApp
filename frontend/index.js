function selectContact(contactName) {
  const messages = document.getElementById("messages");
  messages.innerHTML = `<h3>Cuộc trò chuyện với ${contactName}</h3>`;
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const messageText = input.value.trim();
  if (messageText) {
    const messages = document.getElementById("messages");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", "sender");
    messageElement.textContent = messageText;
    messages.appendChild(messageElement);
    input.value = "";
    messages.scrollTop = messages.scrollHeight; // Cuộn xuống tin nhắn mới
  }
}
