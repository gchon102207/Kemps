const form = document.getElementById('registerForm');
const email = document.getElementById('email');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const passwordError = document.getElementById('password-error');
const emailError = document.getElementById('email-error');

form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission
    let isValid = true;

    // Clear previous error messages
    emailError.style.display = 'none';
    passwordError.style.display = 'none';

    // Check if the email is valid using checkValidity()
    console.log('Email validity:', email.checkValidity()); // Debug log
    if (!email.checkValidity()) {
        emailError.style.display = 'block'; // Show email error
        isValid = false;
    }

    // Check if passwords match
    if (password.value.trim() !== confirmPassword.value.trim()) {
        passwordError.style.display = 'block'; // Show password error
        isValid = false;
    }

    // If all inputs are valid, send data to the server
    if (isValid) {
        // Create an object with the input data
        const data = {
            email: email.value,
            username: document.getElementById('username').value, // Ensure this input is correct
            password: password.value,
        };

        try {
            const response = await fetch('/signup', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.msg); 
                form.reset(); // Clear the form fields
            } else {
                alert('Error: ' + result.msg); // Show error message
            }
        } catch (error) {
            console.error('Error:', error);
            alert('There was an error with the request. Please try again.'); 
        }
    }
});