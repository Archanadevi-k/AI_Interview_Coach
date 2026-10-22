
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("loginMessage");

    if (!loginForm || !emailInput || !passwordInput || !message) {
        console.error("Login form elements not found.");
        return;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        message.style.color = "#dc2626";
        message.textContent = "";

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {
            message.textContent =
                "Supabase setup error. Check supabase.js.";
            return;
        }

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                throw error;
            }

            message.style.color = "#15803d";
            message.textContent = "Login successful! Opening dashboard...";

            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 700);

        } catch (error) {
            console.error("Login error:", error);

            if (
                error.message &&
                error.message.toLowerCase().includes("email not confirmed")
            ) {
                message.textContent =
                    "Please confirm your email before logging in.";
            } else {
                message.textContent =
                    "Invalid email or password. Please check your details.";
            }
        }
    });
});
