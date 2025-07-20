const io = require("socket.io")(3000, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
    },
});

const rooms = {};

io.on("connection", (socket) => {
    console.log("user connected", socket.id);

    socket.on("join-room", (roomId, cb) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {} };
        }

        if (Object.keys(rooms[roomId].players).length >= 2) {
            return cb("Room is full");
        }

        socket.join(roomId);
        rooms[roomId].players[socket.id] = { id: socket.id };
        socket.data.roomId = roomId;

        if (Object.keys(rooms[roomId].players).length === 2) {
            const opponentId = Object.keys(rooms[roomId].players).find(id => id !== socket.id);
            const opponent = rooms[roomId].players[opponentId];
            io.to(socket.id).emit("player-joined", opponent);
            io.to(opponentId).emit("player-joined", { id: socket.id });
        }

        cb(null);
    });

    socket.on("disconnect", () => {
        const roomId = socket.data.roomId;
        if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
            delete rooms[roomId].players[socket.id];
            const remainingPlayers = Object.keys(rooms[roomId].players);
            if (remainingPlayers.length > 0) {
                io.to(roomId).emit("opponent-disconnected");
            } else {
                delete rooms[roomId];
            }
        }
        console.log("user disconnected", socket.id);
    });
});

server.listen(3001, () => {
    console.log("Server is running on port 3001");
});