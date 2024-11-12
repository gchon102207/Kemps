const storedUsername = localStorage.getItem("username");
console.log("Username retrieved from localStorage:", storedUsername);
if (storedUsername) {
    document.getElementById("username").innerHTML = `Welcome, ${storedUsername}!`;
} else {
    console.error("No username found in localStorage");
}
    
