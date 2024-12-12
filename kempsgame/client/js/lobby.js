var game;
var board;
let isRestartGameListenerAdded = false;
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
        console.log('Teams:', data.teams);
        console.log('Players:', data.players);

        // Store the team data globally
        window.teams = data.teams;


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
    
        // Hide the result screen
        const resultScreenContainer = document.getElementById('result-screen-container');
        if (resultScreenContainer) {
            resultScreenContainer.style.display = 'none';
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
            resolution: window.devicePixelRatio,
            scene: {
                preload: preload,
                create: create,
                update: update
            }
        };

        game = new Phaser.Game(config);

        function preload() {
            const allCards = [
                'card_clubs_02', 'card_clubs_03', 'card_clubs_04', 'card_clubs_05', 'card_clubs_06', 'card_clubs_07', 'card_clubs_08', 'card_clubs_09', 'card_clubs_10', 'card_clubs_J', 'card_clubs_Q', 'card_clubs_K', 'card_clubs_A',
                'card_hearts_02', 'card_hearts_03', 'card_hearts_04', 'card_hearts_05', 'card_hearts_06', 'card_hearts_07', 'card_hearts_08', 'card_hearts_09', 'card_hearts_10', 'card_hearts_J', 'card_hearts_Q', 'card_hearts_K', 'card_hearts_A',
                'card_spades_02', 'card_spades_03', 'card_spades_04', 'card_spades_05', 'card_spades_06', 'card_spades_07', 'card_spades_08', 'card_spades_09', 'card_spades_10', 'card_spades_J', 'card_spades_Q', 'card_spades_K', 'card_spades_A',
                'card_diamonds_02', 'card_diamonds_03', 'card_diamonds_04', 'card_diamonds_05', 'card_diamonds_06', 'card_diamonds_07', 'card_diamonds_08', 'card_diamonds_09', 'card_diamonds_10', 'card_diamonds_J', 'card_diamonds_Q', 'card_diamonds_K', 'card_diamonds_A'
            ];
        
            allCards.forEach(card => {
                this.load.image(card, `client/assets/${card}.png`);
                board = this;
            });

            // Load card back
            this.load.image('card_back', 'client/assets/card_back.png');

            this.load.audio('card_flip', 'client/assets/card.mp3');
        }

        function create() {
            this.cardWidth = 150;
            const cardHeight = 200;
            this.scale = 1.5;
            this.communityStartX = (window.innerWidth / 1.85) - (this.cardWidth * 2);
            this.communityStartY = window.innerHeight / 1.5 - cardHeight / 2;
            this.communityCard = [];
            this.playerCard = [];
            this.selectedCard = null;
        
            // Display community cards
            window.communityCards.forEach((card, index) => {
                const gap = 10;
                this.communityCard.push(this.add.image(this.communityStartX + (index * (this.cardWidth + gap)), this.communityStartY, card).setScale(1.5));
                console.log(this.communityCard[index])
                this.communityCard[index].setName(`communityCard${index}`);  // Give the card a unique name
                this.communityCard[index].setInteractive();
                let arrayNum = index;
                this.communityCard[index].on('pointerdown', () => {
                    console.log("Community Card Clicked:", card);
                    if (this.selectedCard) {
                        // Swap the selected card with the clicked community card
                        socket.emit('swapCard', { 
                            playerCard: this.selectedCard.cardName,  // Send the name of the selected player card
                            communityCard: window.communityCards[index],  // Send the community card that was clicked
                            swappingPlayer: storedUsername
                        });
        
                        this.selectedCard.setAlpha(1);  // Deselect the card (reset alpha)
                        this.selectedCard = null;  // Reset the selected card
                    }
                });
            });
        
            this.playerStartX = (window.innerWidth / 2.2);
            this.playerStartY = window.innerHeight / 1.25;
        
            // Display player cards (face-up)
            window.playerCards.forEach((card, index) => {
                this.playerCard.push(this.add.image(this.playerStartX + (index * (40)), this.playerStartY, card).setScale(this.scale));
                this.playerCard[index].setName(`playerCard${index}`);  // Give the card a unique name
                this.playerCard[index].cardName = card;  // Store the card name as a property
                this.playerCard[index].setInteractive();
                this.playerCard[index].on('pointerdown', () => {
                    // Highlight the clicked card
                    if (this.selectedCard) {
                        this.selectedCard.setAlpha(1);  // Deselect the previous card
                    }
                    this.playerCard[index].setAlpha(0.5);  // Highlight the selected card
                    this.selectedCard = this.playerCard[index];  // Store the selected card
                });
            });
        
            // Display the storedUsername at the bottom of the screen
            const usernameText = this.add.text(window.innerWidth / 2, window.innerHeight - 30, storedUsername, {
                font: '20px Arial',
                fill: '#fff'
            }).setOrigin(0.5);
        
            // Find and display the teammate's username at the top of the screen
            const teams = window.teams;
            let teammateUsername = '';
            let opponents = [];
        
            if (teams && teams.team1 && teams.team2) {
                if (teams.team1.includes(storedUsername)) {
                    teammateUsername = teams.team1.find(player => player !== storedUsername);
                    opponents = teams.team2;
                } else if (teams.team2.includes(storedUsername)) {
                    teammateUsername = teams.team2.find(player => player !== storedUsername);
                    opponents = teams.team1;
                }
            } else {
                console.error("Teams data is not available or malformed:", teams);
            }
        
            const teammateText = this.add.text(window.innerWidth / 2, 30, teammateUsername, {
                font: '20px Arial',
                fill: '#fff'
            }).setOrigin(0.5);
        
            // Display opponents' usernames
            if (opponents.length === 2) {
                const opponentLeftText = this.add.text(60, window.innerHeight / 2, opponents[0], {
                    font: '20px Arial',
                    fill: '#fff'
                }).setOrigin(0.5).setRotation(-Math.PI / 2); // Rotate -90 degrees
        
                const opponentRightText = this.add.text(window.innerWidth - 60, window.innerHeight / 2, opponents[1], {
                    font: '20px Arial',
                    fill: '#fff'
                }).setOrigin(0.5).setRotation(Math.PI / 2); // Rotate 90 degrees
            }
        
            // Create the chatbox directly
            createChatbox();
        
            // Create the "Flush" button
            const buttonWidth = 125;
            const buttonHeight = 62.5;
            const buttonX = window.innerWidth / 2 - buttonWidth / 2; 
            const buttonY = window.innerHeight / 1.53 - buttonHeight / 2; 
            const buttonRadius = 15;
        
            const flushButton = this.add.graphics();
            flushButton.fillStyle(0x09360E, 1); // Button color
            flushButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, buttonRadius); // Position and size
            flushButton.setInteractive(new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
            const flushButtonText = this.add.text(buttonX + buttonWidth / 2, buttonY + buttonHeight / 2, 'Flush (0/4)', { 
                fontFamily: 'Noto Sans Lao, sans-serif',
                fontSize: '16px', 
                fill: '#fff',
                resolution: window.devicePixelRatio 
            }).setOrigin(0.5, 0.5); // Center the text
        
            flushButton.on('pointerdown', () => {
                socket.emit('flushRequest', { username: storedUsername });
            });
        
            // Create the "Counterkemps" button
            const counterkempsButtonY = window.innerHeight / 1.3;
            const counterkempsButtonX = window.innerWidth / 1.5;
            const counterkempsButton = this.add.graphics();
            counterkempsButton.fillStyle(0x000000, 1); // Button color
            counterkempsButton.fillRoundedRect(counterkempsButtonX, counterkempsButtonY, buttonWidth, buttonHeight, buttonRadius); // Position and size
            counterkempsButton.setInteractive(new Phaser.Geom.Rectangle(counterkempsButtonX, counterkempsButtonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
            const counterkempsButtonText = this.add.text(counterkempsButtonX + buttonWidth / 2, counterkempsButtonY + buttonHeight / 2, 'Counterkemps', { 
                fontFamily: 'Noto Sans Lao, sans-serif',
                fontSize: '16px', 
                fill: '#fff',
                resolution: window.devicePixelRatio 
            }).setOrigin(0.5, 0.5); // Center the text
        
            counterkempsButton.on('pointerdown', () => {
                socket.emit('counterkempsRequest', { username: storedUsername });
            });
        
            // Create the "Kemps" button
            const kempsButtonY = counterkempsButtonY;
            const kempsButtonX = window.innerWidth - counterkempsButtonX - buttonWidth;
            const kempsButton = this.add.graphics();
            kempsButton.fillStyle(0xff0000, 1); // Red button color
            kempsButton.fillRoundedRect(kempsButtonX, kempsButtonY, buttonWidth, buttonHeight, buttonRadius); // Position and size
            kempsButton.setInteractive(new Phaser.Geom.Rectangle(kempsButtonX, kempsButtonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
            const kempsButtonText = this.add.text(kempsButtonX + buttonWidth / 2, kempsButtonY + buttonHeight / 2, 'Kemps', { 
                fontFamily: 'Noto Sans Lao, sans-serif',
                fontSize: '16px', 
                fill: '#fff',
                resolution: window.devicePixelRatio 
            }).setOrigin(0.5, 0.5); // Center the text
        
            kempsButton.on('pointerdown', () => {
                socket.emit('kempsRequest', { username: storedUsername });
            });
        
            // Listen for the kemps result event
            socket.on('kempsResult', (result) => {
                flushButtonText.setText('Flush (0/4)');
                displayResultScreen(result.message);
            });
        
            // Listen for the flush completion event
            socket.on('flushCompleted', (newCommunityCards) => {
                // Update the community cards with the new cards
                window.communityCards = newCommunityCards;
        
                // Update community card images
                window.communityCards.forEach((card, index) => {
                    if (this.communityCard[index]) {
                        this.communityCard[index].setTexture(card);
                    } else {
                        console.error('Community Card not found at index: ', index);
                    }
                });

                flushButtonText.setText('Flush (0/4)'); // Reset the button text
            });
        
            // Listen for the flush progress event
            socket.on('flushProgress', (count) => {
                flushButtonText.setText(`Flush (${count}/4)`);
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
        
            // Listen for the counterkemps result event
            socket.on('counterkempsResult', (result) => {
                flushButtonText.setText('Flush (0/4)');
                displayResultScreen(result.message);
            });

            // Create the scoreboard
            this.scoreboard = this.add.text(window.innerWidth - 20, 20, 'Team 1 Wins: 0\nTeam 2 Wins: 0', {
                font: '24px Arial',
                fill: '#fff'
            }).setOrigin(1, 0);

            // Add card_back image at the bottom right for the deck of yet-to-be-used cards
            const deckX = window.innerWidth - this.cardWidth / 2 - 20;
            const deckY = window.innerHeight - cardHeight / 2 - 20;
            const deckCard = this.add.image(deckX, deckY, 'card_back').setScale(this.scale);
        }
        
        function createChatbox() {
            // Create chatbox container
            const chatboxContainer = document.createElement('div');
            chatboxContainer.id = 'chatbox-container';
            chatboxContainer.style.position = 'absolute';
            chatboxContainer.style.top = '10px';
            chatboxContainer.style.left = '10px';
            chatboxContainer.style.width = '300px';
            chatboxContainer.style.height = '175px';
            chatboxContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            chatboxContainer.style.border = '1px solid #fff';
            chatboxContainer.style.padding = '10px';
            chatboxContainer.style.overflowY = 'scroll';
            chatboxContainer.style.zIndex = '1000';
        
            // Create chat messages container
            const chatMessages = document.createElement('div');
            chatMessages.id = 'chat-messages';
            chatMessages.style.height = '150px';
            chatMessages.style.overflowY = 'scroll';
            chatboxContainer.appendChild(chatMessages);
        
            // Create chat input
            const chatInput = document.createElement('input');
            chatInput.type = 'text';
            chatInput.id = 'chat-input';
            chatInput.style.width = 'calc(100% - 20px)';
            chatInput.style.marginTop = '10px';
            chatInput.style.padding = '5px';
            chatboxContainer.appendChild(chatInput);
        
            // Append chatbox to the game container
            document.getElementById('game-container').appendChild(chatboxContainer);
        
            // Handle chat input
            chatInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const message = chatInput.value;
                    if (message.trim() !== '') {
                        socket.emit('chatMessage', { username: storedUsername, message });
                        chatInput.value = '';
                    }
                }
            });
        
            // Listen for chat messages
            socket.on('chatMessage', (data) => {
                const messageElement = document.createElement('div');
                messageElement.textContent = `${data.username}: ${data.message}`;
                messageElement.style.color = '#fff';
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
            });
        }
        
        function update() {
        }

        // Function to display the result screen
        function displayResultScreen(message) {
            // Create result screen container
            const resultScreenContainer = document.createElement('div');
            resultScreenContainer.id = 'result-screen-container';
            resultScreenContainer.style.position = 'fixed';
            resultScreenContainer.style.top = '0';
            resultScreenContainer.style.left = '0';
            resultScreenContainer.style.width = '100%';
            resultScreenContainer.style.height = '100%';
            resultScreenContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            resultScreenContainer.style.display = 'flex';
            resultScreenContainer.style.flexDirection = 'column';
            resultScreenContainer.style.justifyContent = 'center';
            resultScreenContainer.style.alignItems = 'center';
            resultScreenContainer.style.zIndex = '1000';
        
            // Create result message element
            const resultMessage = document.createElement('div');
            resultMessage.textContent = message;
            resultMessage.style.color = '#fff';
            resultMessage.style.fontFamily = 'Noto Sans Lao, sans-serif';
            resultMessage.style.fontSize = '48px';
            resultMessage.style.fontWeight = 'bold';
            resultMessage.style.textAlign = 'center';
            resultMessage.style.marginBottom = '20px';
        
            // Create "Play Again" button
            const playAgainButton = document.createElement('button');
            playAgainButton.textContent = 'Play Again';
            playAgainButton.style.padding = '10px 20px';
            playAgainButton.style.fontSize = '24px';
            playAgainButton.style.cursor = 'pointer';
        
            // Add event listener to the "Play Again" button
            playAgainButton.addEventListener('click', () => {
                // Emit the resetGame event to the server
                socket.emit('resetGame', { lobbyCode: storedCode });
            });
        
            // Append result message and button to result screen container
            resultScreenContainer.appendChild(resultMessage);
            resultScreenContainer.appendChild(playAgainButton);
        
            // Append result screen container to the body
            document.body.appendChild(resultScreenContainer);
        }
    };

    if (!isRestartGameListenerAdded) {
        socket.on('restartGame', (data) => {
            console.log("Game is restarting...");
            console.log('Community Cards:', data.communityCards);
            console.log('Player Cards:', data.playerCards);
            console.log('Teams:', data.teams);
            console.log('Players:', data.players);
    
            // Store the team data globally
            window.teams = data.teams;
    
            // Store cards globally for the current user
            const currentPlayerCards = data.playerCards[storedUsername];
            window.communityCards = data.communityCards;
            window.playerCards = currentPlayerCards;
    
            // Remove the result screen
            const resultScreenContainer = document.getElementById('result-screen-container');
            if (resultScreenContainer) {
                document.body.removeChild(resultScreenContainer);
            }
            
            //Repopulate the game screen
            window.communityCards.forEach((card, index) => {
                if (board.communityCard[index]) {
                    board.communityCard[index].setTexture(card); // Update the texture
                    board.communityCard[index].cardName = card;  // Update the cardName property
                } else {
                    console.error('Community Card not found at index: ', index);
                }
            });

            window.playerCards.forEach((card, index) => {
                if (board.playerCard[index]) {
                    board.playerCard[index].setTexture(card); // Update the texture
                    board.playerCard[index].cardName = card;  // Update the cardName property
                } else {
                    console.error('Player Card not found at index: ', index);
                }
            });
            
            // Update the scoreboard
            updateScoreboard(data.winCounts); 
        });

        isRestartGameListenerAdded = true;
    }

        socket.on('updateWinCounts', (winCounts) => {
            updateScoreboard(winCounts);
        });


        // Listen for card swap completion
        socket.on('gameUpdated', (data) => {
            console.log("Game Updated:", data);
            board.selectedCard = null; // Reset the selected card for swapping
        
            // Update the global community cards array
            window.communityCards = data.communityCards;
        
            // Update community card images and properties
            window.communityCards.forEach((card, index) => {
                if (board.communityCard[index]) {
                    board.communityCard[index].setTexture(card); // Update the texture
                    board.communityCard[index].cardName = card;  // Update the cardName property
                } else {
                    console.error('Community Card not found at index: ', index);
                }
            });
    
        // Update the global player cards array
        window.playerCards = data.playerCards[storedUsername];
    
        // Update player card images and properties
        window.playerCards.forEach((card, index) => {
            if (board.playerCard[index]) {
                board.playerCard[index].setTexture(card); // Update the texture
                board.playerCard[index].cardName = card;  // Update the cardName property
            } else {
                console.error('Player Card not found at index: ', index);
            }
        });
    });
    
    function updateScoreboard(winCounts) {
        const scoreboard = game.scene.scenes[0].scoreboard;
        if (scoreboard) {
            scoreboard.setText(`Team 1 Wins: ${winCounts.team1}\nTeam 2 Wins: ${winCounts.team2}`);
        }
    }
});
