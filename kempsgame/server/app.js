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
const flushRequests = new Map(); // Map to track flush requests per lobby

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('setUsername', (username) => {
        users[socket.id] = username;
    });

    socket.on('createLobby', ({ username }) => {
        users[socket.id] = username;
        const lobbyCode = generateLobbyCode();
        const deck = generateDeck();
        shuffleDeck(deck); // Shuffle the deck when the lobby is created
        lobbies.set(lobbyCode, { communityCards: [], playerCards: {}, deck }); // Initialize lobby with empty cards and a shuffled deck
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

        const lobbyData = lobbies.get(lobbyCode);
        const deck = lobbyData.deck;

        // Draw the first 4 community cards
        const communityCards = drawCards(deck, 4);

        // Assign 4 cards to each player
        const players = getUsersInLobby(lobbyCode);
        const playerCards = {};
        players.forEach((player, index) => {
            playerCards[player] = drawCards(deck, 4); // Take 4 cards for each player
        });

        // Shuffle the players and divide them into two teams
        shuffleArray(players);
        const team1 = players.slice(0, 2);
        const team2 = players.slice(2, 4);

        // Store the community and player cards at the lobby level in the Map
        lobbies.set(lobbyCode, { communityCards, playerCards, deck, teams: { team1, team2 } });

        // Emit 'gameStartingBroadcast' to all clients with their cards, community cards, and teams
        io.to(lobbyCode).emit('gameStartingBroadcast', { communityCards, playerCards, players, teams: { team1, team2 } });
    });

    socket.on('resetGame', ({ lobbyCode }) => {
        const lobbyData = lobbies.get(lobbyCode);
        if (!lobbyData) return;
    
        // Reset the game state for the lobby
        lobbyData.playerCards = {}; // Reset player cards
        lobbyData.communityCards = []; // Reset community cards
        lobbyData.deck = generateDeck(); // Generate a new deck
        shuffleDeck(lobbyData.deck); // Shuffle the new deck
    
        // Draw the first 4 community cards
        const communityCards = drawCards(lobbyData.deck, 4);
    
        // Assign 4 cards to each player
        const players = getUsersInLobby(lobbyCode);
        const playerCards = {};
        players.forEach((player, index) => {
            playerCards[player] = drawCards(lobbyData.deck, 4); // Take 4 cards for each player
        });
    
        // Retain the existing teams
        const teams = lobbyData.teams;
    
        // Store the community and player cards at the lobby level in the Map
        lobbies.set(lobbyCode, { communityCards, playerCards, deck: lobbyData.deck, teams });
    
        // Notify all players in the lobby that the game is restarting
        io.to(lobbyCode).emit('restartGame', {
            communityCards,
            playerCards,
            teams,
            players,
            winCounts
        });
    });

    socket.on('swapCard', ({ playerCard, communityCard, swappingPlayer }) => {
        console.log('Attempting to swap card');
        console.log('player card: ', playerCard, 'community card: ', communityCard);
        const lobbyCode = getLobbyCode(socket.id);
        const playerName = users[socket.id];
    
        if (lobbyCode && playerName) {
            console.log('this is working');
            const lobbyData = lobbies.get(lobbyCode);
            const communityCards = lobbyData.communityCards;
            const playerCards = lobbyData.playerCards;
    
            // Find the index of the selected community and player card
            console.log('Player deck: ', JSON.stringify(playerCards[playerName]), 'Community deck: ', JSON.stringify(communityCards));
            const communityIndex = communityCards.indexOf(communityCard);
            const playerIndex = playerCards[playerName].indexOf(playerCard);
            console.log('community index: ', communityIndex, 'player index: ', playerIndex)
    
            if (communityIndex !== -1 && playerIndex !== -1) {
                // Swap the cards in the community and player's deck
                console.log('Swapping cards');
                communityCards[communityIndex] = playerCard;
                playerCards[playerName][playerIndex] = communityCard;
    
                // Update the lobby data with the new community and player cards
                lobbyData.communityCards = communityCards;
                lobbyData.playerCards = playerCards;
                lobbies.set(lobbyCode, lobbyData);
    
                // Emit updated game state
                io.to(lobbyCode).emit('gameUpdated', { communityCards, playerCards, swappingPlayer });
            } else {
                console.log('Invalid card swap attempt');
                socket.emit('error', { message: 'Invalid card swap attempt' });
            }
        }
    });

    socket.on('flushRequest', ({ username }) => {
        const lobbyCode = getLobbyCode(socket.id);
        if (!lobbyCode) return;

        if (!flushRequests.has(lobbyCode)) {
            flushRequests.set(lobbyCode, new Set());
        }

        const lobbyFlushRequests = flushRequests.get(lobbyCode);
        lobbyFlushRequests.add(username);

        // Emit flush progress to all clients in the lobby
        io.to(lobbyCode).emit('flushProgress', lobbyFlushRequests.size);

        if (lobbyFlushRequests.size === 4) {
            // All 4 users have clicked the "Flush" button
            const lobbyData = lobbies.get(lobbyCode);
            const newCommunityCards = drawCards(lobbyData.deck, 4); // Draw 4 new community cards from the deck
            lobbyData.communityCards = newCommunityCards;

            // Notify all clients in the lobby
            io.to(lobbyCode).emit('flushCompleted', newCommunityCards);

            // Reset the flush requests for the lobby
            flushRequests.set(lobbyCode, new Set());
        }
    });

    socket.on('kempsRequest', ({ username }) => {
        const lobbyCode = getLobbyCode(socket.id);
        if (!lobbyCode) return;
    
        const lobbyData = lobbies.get(lobbyCode);
        const teams = lobbyData.teams;
        const playerCards = lobbyData.playerCards;
    
        const team = teams.team1.includes(username) ? teams.team1 : teams.team2;
        const teammate = team.find(player => player !== username);
        const opposingTeam = teams.team1.includes(username) ? teams.team2 : teams.team1;
    
        let success = false;
        if (hasFourOfAKind(playerCards[teammate])) {
            success = true;
        }
    
        if (success) {
            // The teammate has four of a kind
            team.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('kempsResult', { message: 'You win!' });
            });
            opposingTeam.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('kempsResult', { message: 'You lose!' });
            });
    
            // Update win count
            if (teams.team1.includes(username)) {
                winCounts.team1++;
            } else {
                winCounts.team2++;
            }
        } else {
            // The teammate does not have four of a kind
            team.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('kempsResult', { message: 'You lose!' });
            });
            opposingTeam.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('kempsResult', { message: 'You win!' });
            });
    
            // Update win count
            if (teams.team1.includes(username)) {
                winCounts.team2++;
            } else {
                winCounts.team1++;
            }
        }
    
        // Emit updated win counts
        io.to(lobbyCode).emit('updateWinCounts', winCounts);
    });
    
    socket.on('counterkempsRequest', ({ username }) => {
        const lobbyCode = getLobbyCode(socket.id);
        if (!lobbyCode) return;
    
        const lobbyData = lobbies.get(lobbyCode);
        const teams = lobbyData.teams;
        const playerCards = lobbyData.playerCards;
    
        const team = teams.team1.includes(username) ? teams.team1 : teams.team2;
        const opposingTeam = teams.team1.includes(username) ? teams.team2 : teams.team1;
    
        let success = false;
        for (const player of opposingTeam) {
            if (hasFourOfAKind(playerCards[player])) {
                success = true;
                break;
            }
        }
    
        if (success) {
            // The opposing team has four of a kind
            team.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('counterkempsResult', { message: 'You win!' });
            });
            opposingTeam.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('counterkempsResult', { message: 'You lose!' });
            });
    
            // Update win count
            if (teams.team1.includes(username)) {
                winCounts.team1++;
            } else {
                winCounts.team2++;
            }
        } else {
            // The opposing team does not have four of a kind
            team.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('counterkempsResult', { message: 'You lose!' });
            });
            opposingTeam.forEach(player => {
                const socketId = Object.keys(users).find(key => users[key] === player);
                io.to(socketId).emit('counterkempsResult', { message: 'You win!' });
            });
    
            // Update win count
            if (teams.team1.includes(username)) {
                winCounts.team2++;
            } else {
                winCounts.team1++;
            }
        }
    
        // Emit updated win counts
        io.to(lobbyCode).emit('updateWinCounts', winCounts);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        console.log('User disconnected:', socket.id);
    });

    socket.on('chatMessage', ({ username, message }) => {
        const lobbyCode = getLobbyCode(socket.id);
        if (lobbyCode) {
            io.to(lobbyCode).emit('chatMessage', { username, message });
        }
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

function generateDeck() {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    const ranks = ['02', '03', '04', '05', '06', '07', '08', '09', '10', 'J', 'Q', 'K', 'A'];

    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(`card_${suit}_${rank}`);
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCards(deck, count) {
    const drawnCards = [];
    for (let i = 0; i < count; i++) {
        const card = deck.pop();
        drawnCards.push(card);
    }
    return drawnCards;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function hasFourOfAKind(cards) {
    const rankCount = {};
    for (const card of cards) {
        const rank = card.split('_')[2];
        if (!rankCount[rank]) {
            rankCount[rank] = 0;
        }
        rankCount[rank]++;
        if (rankCount[rank] === 4) {
            return true;
        }
    }
    return false;
}

const winCounts = {
    team1: 0,
    team2: 0
};

const port = 5000;
server.listen(port, (err) => {
    if (err) throw err;
    console.log("Listening on port: " + port);
});