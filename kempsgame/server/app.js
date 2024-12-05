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
const lobbies = new Map(); // Change from Set to Map

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('setUsername', (username) => {
        users[socket.id] = username;
    });

    socket.on('createLobby', ({ username }) => {
        users[socket.id] = username;
        const lobbyCode = generateLobbyCode();
        lobbies.set(lobbyCode, { communityCards: [], playerCards: {} }); // Initialize lobby with empty cards
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
                socket.emit('joinedLobby', { code: lobbyCode });
                io.to(lobbyCode).emit('userJoined', { users: getUsersInLobby(lobbyCode) });
            }
        } else {
            socket.emit('error', { message: 'Lobby code does not exist' });
        }
    });

    socket.on('startGame', ({ lobbyCode }) => {
        console.log(`Starting game in lobby: ${lobbyCode}`);

        const deck = [
            'card_clubs_02', 'card_clubs_03', 'card_clubs_04', 'card_clubs_05', 'card_clubs_06', 'card_clubs_07', 'card_clubs_08', 'card_clubs_09', 'card_clubs_10', 'card_clubs_J', 'card_clubs_Q', 'card_clubs_K', 'card_clubs_A',
            'card_hearts_02', 'card_hearts_03', 'card_hearts_04', 'card_hearts_05', 'card_hearts_06', 'card_hearts_07', 'card_hearts_08', 'card_hearts_09', 'card_hearts_10', 'card_hearts_J', 'card_hearts_Q', 'card_hearts_K', 'card_hearts_A',
            'card_spades_02', 'card_spades_03', 'card_spades_04', 'card_spades_05', 'card_spades_06', 'card_spades_07', 'card_spades_08', 'card_spades_09', 'card_spades_10', 'card_spades_J', 'card_spades_Q', 'card_spades_K', 'card_spades_A',
            'card_diamonds_02', 'card_diamonds_03', 'card_diamonds_04', 'card_diamonds_05', 'card_diamonds_06', 'card_diamonds_07', 'card_diamonds_08', 'card_diamonds_09', 'card_diamonds_10', 'card_diamonds_J', 'card_diamonds_Q', 'card_diamonds_K', 'card_diamonds_A',
        ];

        function shuffleDeck(deck) {
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]]; 
            }
        }

        shuffleDeck(deck);

        // Draw the first 4 community cards
        const communityCards = deck.splice(0, 4);

        // Assign 4 cards to each player
        const players = getUsersInLobby(lobbyCode);
        const playerCards = {};
        players.forEach((player, index) => {
            playerCards[player] = deck.splice(0, 4); // Take 4 cards for each player
        });

        // Store the community and player cards at the lobby level in the Map
        lobbies.set(lobbyCode, { communityCards, playerCards });

        // Emit 'gameStartingBroadcast' to all clients with their cards and community cards
        io.to(lobbyCode).emit('gameStartingBroadcast', { communityCards, playerCards });
    });

    socket.on('swapCard', ({ playerCard, communityCard, swappingPlayer }) => {
        console.log('Attempting to swap card')
        console.log('player card: ', playerCard, 'community card: ',communityCard)
        const lobbyCode = getLobbyCode(socket.id);
        const playerName = users[socket.id];
    
        if (lobbyCode && playerName) {
            console.log('this is working') 
            const lobbyData = lobbies.get(lobbyCode);
            const communityCards = lobbyData.communityCards;
            const playerCards = lobbyData.playerCards;
    
            // Find the index of the selected community and player card
            console.log('Player deck: ', JSON.stringify(playerCards[playerName]), 'Community deck: ', JSON.stringify(communityCards))
            const communityIndex = communityCards.indexOf(communityCard);
            const playerIndex = playerCards[playerName].indexOf(playerCard);
    
            if (communityIndex !== -1 && playerIndex !== -1) {
                // Swap the cards in the community and player's deck
                communityCards[communityIndex] = playerCard;
                playerCards[playerName][playerIndex] = communityCard;
    
                // Emit updated game state
                io.to(lobbyCode).emit('gameUpdated', { communityCards, playerCards, swappingPlayer });
            } else {
                console.log('Invalid card swap attempt');
                socket.emit('error', { message: 'Invalid card swap attempt' });
            }
        }
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

function getLobbyCode(socketId) {
    for (let [lobbyCode, lobbyData] of lobbies) {
        if (io.sockets.adapter.rooms.get(lobbyCode).has(socketId)) {
            return lobbyCode;
        }
    }
    return null;
}



// Generate random community cards
function generateCommunityCards() {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    const ranks = ['02', '03', '04', '05', '06', '07', '08', '09', '10', 'J', 'Q', 'K', 'A'];

    const communityCards = [];
    for (let i = 0; i < 4; i++) {
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
        communityCards.push(`card_${randomSuit}_${randomRank}`);
    }
    return communityCards;
}

const port = 5000;
server.listen(port, (err) => {
    if (err) throw err;
    console.log("Listening on port: " + port);
});