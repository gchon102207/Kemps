// Define the gameScene directly without using export
const gameScene = {
    preload: function () {
        // Load assets here
    },
    create: function () {
        // Create your game objects here
    },
    update: function () {
        // Update game logic here
    }
};

// No need to export, just make sure the gameScene is in the global scope
window.gameScene = gameScene;
