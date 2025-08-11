// socket/index.js
const { makeMessage, addGlobal, getGlobal } = require("../store");

module.exports = function(io) {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // Gửi lịch sử tin nhắn khi mới kết nối
        socket.emit("history", getGlobal(50));

        socket.on("send_message", (data) => {
            const msg = makeMessage({ username: data.username, message: data.message });
            addGlobal(msg);
            io.emit("receive_message", msg);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
};
