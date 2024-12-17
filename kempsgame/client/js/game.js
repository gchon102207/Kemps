/* document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Initialize socket.io connection
    
    socket.on('connect', () => {
        console.log('Connected to socket server');
    });

    // Assuming communityCards is stored globally after receiving from the server
    let communityCards = [];

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
    // Function to transition to the game screen
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
    
        const game = new Phaser.Game(config);
    
        function preload() {
            // Load community cards
            window.communityCards.forEach(card => {
                this.load.image(card, `client/assets/${card}.png`);
            });
    
            // Load player cards
            window.playerCards.forEach(card => {
                this.load.image(card, `client/assets/${card}.png`);
            });
    
            // Load card back
            this.load.image('card_back', 'client/assets/card_back.png');
        }
    
        function create() {
            const cardWidth = 150;
            const cardHeight = 200;
            const communityStartX = (window.innerWidth / 1.8) - (cardWidth * 2);
            const communityStartY = window.innerHeight / 1.5 - cardHeight / 2;
    
            // Display community cards
            window.communityCards.forEach((card, index) => {
                const gap = 10;
                this.add.image(communityStartX + (index * (cardWidth + gap)), communityStartY, card).setScale(1.5);
            });
    
            const playerStartX = (window.innerWidth / 2) - (cardWidth * 2);
            const playerStartY = window.innerHeight - cardHeight - 50;
    
            // Display player cards (face-up)
            window.playerCards.forEach((card, index) => {
                const gap = 10;
                this.add.image(playerStartX + (index * (cardWidth + gap)), playerStartY, card).setScale(1.5);
            });
    
            // Display other players' cards (face-down)
            const otherPlayerStartX = 50;
            const otherPlayerStartY = 50;
            for (let i = 1; i < 4; i++) { // Assuming maxPlayers = 4
                for (let j = 0; j < 4; j++) {
                    const gap = 10;
                    this.add.image(
                        otherPlayerStartX + (j * (cardWidth + gap)),
                        otherPlayerStartY + (i * (cardHeight + 50)),
                        'card_back'
                    ).setScale(1.5);
                }
            }
        }
    
        function update() {
            // Any game updates can go here
        }
    }    
});
*/