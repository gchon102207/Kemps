const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission
    loginError.style.display = 'none'; // Clear any previous error

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        if (response.ok) {
            // Redirect to dashboard or target page on successful login
            window.location.href = result.redirectUrl;
        } else {
            // Show error if login fails
            loginError.style.display = 'block';
            loginError.innerText = result.msg;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});