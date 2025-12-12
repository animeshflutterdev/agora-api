const { getIo } = require("../controllers/socket.init");

exports.socket_chat = async (req, res) => {
    const io = getIo();
    io.emit("server_message", "Hello from API");

    res.send({ msg: "Message sent via websocket" });
};
