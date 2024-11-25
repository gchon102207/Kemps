const socket = io();
const storedUsername = localStorage.getItem("username");
const storedCode = localStorage.getItem("code");

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

if (storedCode) {
    document.getElementById('lobby_code_display').textContent = storedCode;
} else {
    console.error("No lobby code found in localStorage");
}

socket.on('lobbyCreated', (data) => {
    updateUsersList(data.users);
});

socket.on('userJoined', (data) => {
    updateUsersList(data.users);
});

function updateUsersList(users) {
    const usersList = document.getElementById('players_display');
    usersList.innerHTML = ''; // Clear the current list
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.textContent = user;
        usersList.appendChild(userElement);
    });
}