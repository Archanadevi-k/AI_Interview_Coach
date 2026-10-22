
document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const message = document.getElementById("message");
    const submitButton = document.getElementById("createAccount");

    if (!registerForm || !password || !confirmPassword || !message) {
        console.error("Registration form elements not found.");
        return;
    }

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const enteredPassword = password.value;

        message.style.color = "#dc2626";
        message.textContent = "";

        if (fullName.length < 2) {
            message.textContent = "Please enter your full name.";
            return;
        }

        if (!email) {
            message.textContent = "Please enter your email address.";
            return;
        }

        if (enteredPassword.length < 8) {
            message.textContent = "Password must contain at least 8 characters.";
            return;
        }

        if (enteredPassword !== confirmPassword.value) {
            message.textContent = "Passwords do not match. Please try again.";
            confirmPassword.focus();
            return;
        }

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {
            message.textContent =
                "Authentication setup error. Check supabase.js and try again.";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: enteredPassword,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) {
                throw error;
            }

            message.style.color = "#15803d";

            if (data.user && !data.session) {
                message.textContent =
                    "Registration successful! Please check your email to confirm your account, then log in.";
            } else {
                message.textContent =
                    "Registration successful! Opening dashboard...";

                setTimeout(function () {
                    window.location.href = "dashboard.html";
                }, 1000);
            }

            registerForm.reset();

        } catch (error) {
            console.error("Registration error:", error);

            message.style.color = "#dc2626";

            if (error.message && error.message.toLowerCase().includes("already registered")) {
                message.textContent =
                    "This email may already be registered. Please try logging in.";
            } else {
                message.textContent =
                    error.message || "Registration failed. Please try again.";
            }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    });
});
