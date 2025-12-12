const socketIo = require("socket.io");

let io = null;

function initSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        // Register user
        socket.on("register", (userId) => {
            socket.join(userId);
            console.log(`User registered: ${userId}`);
        });

        // Send message
        socket.on("send_message", (data) => {
            const { from, to, message } = data;

            // Emit only to the receiver room
            io.to(to).emit("receive_message", {
                from,
                to,
                message,
                timestamp: Date.now()
            });
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });
}

module.exports = { initSocket, getIo: () => io };
