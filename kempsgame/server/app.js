const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io'); 

const app = express();

app.use("/client", express.static(path.resolve(__dirname + "/../client/")));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/client", express.static(path.resolve(__dirname + "/../client/")));

// Page listeners (routers)
var router = require('./router.js');
router(app);

// Service listeners (database)
var services = require('./services.js');
services(app);

// Create an HTTP server for both Express and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Handle socket connections
const users = {}; // Store users with their socket IDs
const lobbies = new Set(); // Store active lobby codes

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('setUsername', (username) => {
        users[socket.id] = username;
    });

    socket.on('createLobby', ({ username }) => {
        users[socket.id] = username;
        const lobbyCode = generateLobbyCode();
        lobbies.add(lobbyCode); // Add the new lobby code to the set of active lobbies
        socket.join(lobbyCode);
        io.to(lobbyCode).emit('lobbyCreated', { code: lobbyCode, users: getUsersInLobby(lobbyCode) });
    });

    socket.on('joinLobby', ({ lobbyCode, username }) => {
        if (lobbies.has(lobbyCode)) {
            const clients = io.sockets.adapter.rooms.get(lobbyCode) || new Set();
            if (clients.size >= 4) {
                socket.emit('error', { message: 'Lobby is full' });
            } else {
                users[socket.id] = username;
                socket.join(lobbyCode);
                socket.emit('joinedLobby', { code: lobbyCode }); // Emit joinedLobby event to the user
                io.to(lobbyCode).emit('userJoined', { users: getUsersInLobby(lobbyCode) });
            }
        } else {
            socket.emit('error', { message: 'Lobby code does not exist' });
        }
    });
    
    socket.on('startGame', ({ lobbyCode }) => {
        console.log(`Starting game in lobby: ${lobbyCode}`);
        // Broadcast to all clients in the lobby
        io.to(lobbyCode).emit('gameStarting'); // Emit the 'gameStarting' event to all players in the lobby
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        console.log('User disconnected:', socket.id);
    });
});

function generateLobbyCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function getUsersInLobby(lobbyCode) {
    const clients = io.sockets.adapter.rooms.get(lobbyCode) || new Set();
    return Array.from(clients).map(clientId => users[clientId]);
}

const port = 5000;
server.listen(port, (err) => {
    if (err) throw err;
    console.log("Listening on port: " + port);
});