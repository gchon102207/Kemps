document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const storedUsername = localStorage.getItem("username");
    const storedCode = localStorage.getItem("code");

    console.log("Stored Username:", storedUsername);
    console.log("Stored Code:", storedCode);

    if (storedUsername) {
        socket.emit('setUsername', storedUsername);
    } else {
        console.error("No username found in localStorage");
    }

    socket.on('connect', () => {
        const lobbyCode = new URLSearchParams(window.location.search).get('code');
        if (lobbyCode) {
            socket.emit('joinLobby', { lobbyCode, username: storedUsername });
        }
    });

    // Display the lobby code if found
    if (storedCode) {
        const lobbyCodeDisplay = document.getElementById('lobby_code_display');
        if (lobbyCodeDisplay) {
            lobbyCodeDisplay.textContent = storedCode;
        } else {
            console.error("No element found with ID 'lobby_code_display'");
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

    socket.on('gameStarting', () => {
        // Redirect all users to the game screen
        startGame(); // Call the existing startGame function to switch to the game view
    });

    // Track the current number of players
    let currentPlayerCount = 0;
    const maxPlayers = 4;

    // Update the users list on the page
    function updateUsersList(users) {
        const usersList = document.getElementById('players_display');
        usersList.innerHTML = ''; // Clear the current list

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.textContent = user;
            usersList.appendChild(userElement);
        });

        currentPlayerCount = users.length; // Update the player count
        console.log("Current Player Count:", currentPlayerCount);
        toggleStartButton(); // Check if the button should be enabled
    }

    // Enable or disable the "Start Game" button based on player count
    function toggleStartButton() {
        const startButton = document.getElementById('start_game_button');
        if (currentPlayerCount === maxPlayers) {
            startButton.disabled = false; // Enable button if there are 4 players
        } else {
            startButton.disabled = true; // Disable button if there are less than 4 players
        }
    }

    // Listen for the "Start Game" button click event
    document.getElementById('start_game_button').addEventListener('click', () => {
        console.log("Start Game Button Clicked");
        if (currentPlayerCount === maxPlayers) {
            socket.emit('startGame', { lobbyCode: storedCode }); // Emit to server
        }
    });

    // Function to transition to the game screen using Phaser
    function startGame() {
        console.log("Starting Game...");
        // Hide the lobby interface
        document.querySelector('.lobby_info').style.display = 'none';
        
        // Show the game container
        document.getElementById('game-container').style.display = 'block';
    
        // Initialize Phaser game if not already initialized
        if (!window.game) {
            window.game = new Phaser.Game({
                type: Phaser.AUTO,
                width: 800,
                height: 600,
                parent: 'game-container', // Attach Phaser game to the #game-container div
                scene: [window.gameScene], // Reference the global 'gameScene'
            });
        }
    
        // Start the 'gameScene'
        window.game.scene.start('gameScene');
    }    
});