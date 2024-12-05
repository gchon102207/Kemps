var game;
var board;
document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Initialize socket.io connection

    socket.on('connect', () => {
        console.log('Connected to socket server');
    });

    const storedUsername = localStorage.getItem("username");
    const storedCode = localStorage.getItem("code");

    console.log("Stored Username:", storedUsername);
    console.log("Stored Code:", storedCode);

    if (storedUsername) {
        socket.emit('setUsername', storedUsername);
    } else {
        console.error("No username found in localStorage");
    }

    // Join the lobby after the connection is made
    socket.on('connect', () => {
        const lobbyCode = new URLSearchParams(window.location.search).get('code');
        if (lobbyCode) {
            socket.emit('joinLobby', { lobbyCode, username: storedUsername });
        }
    });

    // Display the lobby code if available
    if (storedCode) {
        const lobbyCodeDisplay = document.getElementById('lobby_code_display');
        if (lobbyCodeDisplay) {
            lobbyCodeDisplay.textContent = storedCode;
        }
    } else {
        console.error("No lobby code found in localStorage");
    }

    socket.on('lobbyCreated', (data) => {
        console.log("Lobby Created Event Received:", data);
        updateUsersList(data.users);
    });

    socket.on('userJoined', (data) => {
        console.log("User Joined Event Received:", data);
        updateUsersList(data.users);
    });

    // Track current number of players
    let currentPlayerCount = 0;
    const maxPlayers = 4;

    // Update the users list on the page
    function updateUsersList(users) {
        const usersList = document.getElementById('players_display');
        usersList.innerHTML = ''; // Clear the list

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.textContent = user;
            usersList.appendChild(userElement);
        });

        currentPlayerCount = users.length; // Update player count
        toggleStartButton(); // Enable/disable start button
    }

    // Toggle the "Start Game" button
    function toggleStartButton() {
        const startButton = document.getElementById('start_game_button');
        if (currentPlayerCount === maxPlayers) {
            startButton.disabled = false;
        } else {
            startButton.disabled = true;
        }
    }

    // Listen for the "Start Game" button click
    document.getElementById('start_game_button').addEventListener('click', () => {
        console.log("Start Game Button Clicked");
        if (currentPlayerCount === maxPlayers) {
            socket.emit('startGame', { lobbyCode: storedCode });
        }
    });

    // Listen for gameStartingBroadcast event
    socket.on('gameStartingBroadcast', (data) => {
        console.log("Game is starting...");
        console.log('Community Cards:', data.communityCards);
        console.log('Player Cards:', data.playerCards);

        // Store cards globally for the current user
        const currentPlayerCards = data.playerCards[storedUsername];
        window.communityCards = data.communityCards;
        window.playerCards = currentPlayerCards;

        // Call the function to start the game
        startGame();
        initPhaserGame();
    });

    function startGame() {
        console.log("Transitioning to game screen...");

        // Hide the lobby section
        const lobbyContainer = document.getElementById('lobby-container');
        if (lobbyContainer) {
            lobbyContainer.style.display = 'none';
        }

        // Show the game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
        }
    }

    function initPhaserGame() {
        console.log("Initializing Phaser game...");

        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: '#185B3A',
            parent: 'game-container',
            scene: {
                preload: preload,
                create: create,
                update: update
            }
        };

        game = new Phaser.Game(config);

        let selectedCard = null; // Store the selected card for swapping

        function preload() {
            // Load community cards
            window.communityCards.forEach(card => {
                this.load.image(card, `client/assets/${card}.png`);
                board=this;
            });

            // Load player cards
            window.playerCards.forEach(card => {
                this.load.image(card, `client/assets/${card}.png`);
            });

            // Load card back
            this.load.image('card_back', 'client/assets/card_back.png');
        }

        function create() {
            this.cardWidth = 150;
            const cardHeight = 200;
            this.scale = 1.5;
            this.communityStartX = (window.innerWidth / 1.85) - (this.cardWidth * 2);
            this.communityStartY = window.innerHeight / 1.5 - cardHeight / 2;
            this.communityCard = [];
            this.playerCard = [];

            // Display community cards
            window.communityCards.forEach((card, index) => {
                const gap = 10;
                this.communityCard.push(this.add.image(this.communityStartX + (index * (this.cardWidth + gap)), this.communityStartY, card).setScale(1.5));
                this.communityCard[index].setName(`communityCard${index}`);  // Give the card a unique name
                this.communityCard[index].setInteractive();
                this.communityCard[index].on('pointerdown', () => {
                    console.log("Community Card Clicked:", card);
                    if (selectedCard) {
                        // Swap the selected card with the clicked community card
                        socket.emit('swapCard', { 
                            playerCard: selectedCard.cardName,  // Send the name of the selected player card
                            communityCard: card,  // Send the community card that was clicked
                            swappingPlayer: storedUsername
                        });
                        selectedCard.setAlpha(1);  // Deselect the card (reset alpha)
                        selectedCard = null;  // Reset the selected card
                    }
                });
            });

            this.playerStartX = (window.innerWidth / 2.2)
            this.playerStartY = window.innerHeight / 1.25

            // Display player cards (face-up)
            window.playerCards.forEach((card, index) => {
                this.playerCard.push(this.add.image(this.playerStartX + (index * (40)), this.playerStartY, card).setScale(this.scale));
                this.playerCard[index].setName(`playerCard${index}`);  // Give the card a unique name
                this.playerCard[index].cardName = card;  // Store the card name as a property
                this.playerCard[index].setInteractive();
                this.playerCard[index].on('pointerdown', () => {
                    // Highlight the clicked card
                    if (selectedCard) {
                        selectedCard.setAlpha(1);  // Deselect the previous card
                    }
                    this.playerCard[index].setAlpha(0.5);  // Highlight the selected card
                    selectedCard = this.playerCard[index];  // Store the selected card
                });
            });

            // Display top player cards
            const topPlayerStartX = (window.innerWidth / 2.2);
            const topPlayerStartY = window.innerHeight / 4.75;

            for (let i = 0; i < 4; i++) {
                this.add.image(topPlayerStartX + (i * (40)), topPlayerStartY, 'card_back').setScale(this.scale);
            }

            // Left Player Cards (Stacked vertically)
            const leftPlayerStartX = window.innerWidth / 6.5;
            const leftPlayerStartY = window.innerHeight / 2.45;

            for (let i = 0; i < 4; i++) {
                const card = this.add.image(leftPlayerStartX, leftPlayerStartY + (i * 40), 'card_back').setScale(this.scale);
                card.setRotation(Math.PI / 2);  // Rotate 90 degrees (π/2 radians)
            }

            // Right Player Cards (Stacked vertically)
            const rightPlayerStartX = window.innerWidth / 1.2;
            const rightPlayerStartY = window.innerHeight / 2.45;

            for (let i = 0; i < 4; i++) {
                const card = this.add.image(rightPlayerStartX, rightPlayerStartY + (i * 40), 'card_back').setScale(this.scale);
                card.setRotation(Math.PI / 2);  // Rotate 90 degrees (π/2 radians)
            }
        }

        function update() {
        }
    }

    // Listen for card swap completion
    socket.on('gameUpdated', (data) => {
        console.log("Game Updated:", data);
        board.selectedCard = null; // Store the selected card for swapping
    
        // Update community cards
        window.communityCards = data.communityCards;
        window.playerCards = data.playerCards[storedUsername];
        
    
        // Update community card images
        window.communityCards.forEach((card, index) => {
            console.log(card, board.communityStartX, board.communityStartY);
            var gap = 10;
            board.communityCard[index].setTexture(card);
            board.communityCard[index].texture.refresh();
            /*var communityCard = board.add.image(board.communityStartX + (index * (board.cardWidth + gap)), board.communityStartY, card).setScale(1.5);
            communityCard.setName(`communityCard${index}`);  // Give the card a unique name
            communityCard.setInteractive();
            communityCard.on('pointerdown', () => {
                console.log("Community Card Clicked:", card);
                if (board.selectedCard) {
                    // Swap the selected card with the clicked community card
                    socket.emit('swapCard', { 
                        playerCard: board.selectedCard.cardName,  // Send the name of the selected player card
                        communityCard: card,  // Send the community card that was clicked
                        swappingPlayer: player
                    });
                    board.selectedCard.setAlpha(1);  // Deselect the card (reset alpha)
                    board.selectedCard = null;  // Reset the selected card
                }
            });*/
        });
    
        // Update player card images
        if (data.swappingPlayer === storedUsername){
            window.playerCards.forEach((card, index) => {
                console.log(card);
                board.playerCard[index].setTexture(card);
                /* const playerCard = board.add.image(board.playerStartX + (index * (40)), board.playerStartY, card).setScale(board.scale);
                playerCard.setName(`playerCard${index}`);  // Give the card a unique name
                playerCard.cardName = card;  // Store the card name as a property
                playerCard.setInteractive();
                playerCard.on('pointerdown', () => {
                    // Highlight the clicked card
                    if (board.selectedCard) {
                        board.selectedCard.setAlpha(1);  // Deselect the previous card
                    }
                    playerCard.setAlpha(0.5);  // Highlight the selected card
                    board.selectedCard = playerCard;  // Store the selected card
                }); */
            });
        }
    });

});
