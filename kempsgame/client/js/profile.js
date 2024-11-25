const socket = io();
const storedUsername = localStorage.getItem("username");

if (storedUsername) {
    socket.emit('setUsername', storedUsername);
    document.getElementById("username").innerHTML = `Welcome, ${storedUsername}!`;
} else {
    console.error("No username found in localStorage");
}

const addFriendButton = document.getElementById("addFriendButton");
addFriendButton.addEventListener("click", async () => {
    const friendEmail = prompt("Enter the email of the friend you want to add:");
    if (friendEmail) {
        try {
            const response = await fetch('/addFriend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: localStorage.getItem("email"), friendEmail }),
            });

            const result = await response.json();
            if (response.ok) {
                alert("Friend added successfully!");
            } else {
                alert(result.msg);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
});

const createGameButton = document.getElementById("createGameButton");
createGameButton.addEventListener("click", () => {
    socket.emit('createLobby', { username: storedUsername });
});

socket.on('lobbyCreated', (data) => {
    alert('Lobby created with code: ' + data.code);
    localStorage.setItem("code", data.code);
    window.location.href = `lobby?code=${data.code}`;
});

const joinGameButton = document.getElementById("joinGameButton");
joinGameButton.addEventListener("click", () => {
    const lobbyCode = prompt("Enter the lobby code:");
    if (lobbyCode) {
        socket.emit('joinLobby', { lobbyCode, username: storedUsername });
    }
});

socket.on('joinedLobby', (data) => {
    window.location.href = `/lobby?code=${data.code}`;
});

socket.on('error', (data) => {
    alert(data.message);
});

async function fetchFriendsList() {
    try {
        const response = await fetch('/getFriends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: localStorage.getItem("email") }),
        });
        const result = await response.json();
        if (response.ok) {
            displayFriendsList(result.friends);
        } else {
            console.error(result.msg);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayFriendsList(friends) {
    const friendsList = document.getElementById("friendsList");
    friendsList.innerHTML = ''; // Clear the current list
    friends.forEach(friend => {
        const friendElement = document.createElement("li");
        friendElement.textContent = friend.username;
        friendsList.appendChild(friendElement);
    });
}

// Fetch and display friends list on page load
window.onload = fetchFriendsList;