
document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("loginMessage");
    const resendLink = document.getElementById("resendConfirmation");

    if (!loginForm || !emailInput || !passwordInput || !message) {
        console.error("Login form elements not found.");
        return;
    }

    // LOGIN FUNCTION
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
            message.textContent =
                "Login successful! Opening dashboard...";

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


    // RESEND CONFIRMATION EMAIL FUNCTION
    if (resendLink) {

        resendLink.addEventListener("click", async function (event) {
            event.preventDefault();

            const email = emailInput.value.trim().toLowerCase();

            if (!email) {
                message.style.color = "#dc2626";
                message.textContent =
                    "Please enter your registered email first.";
                emailInput.focus();
                return;
            }

            if (
                typeof supabaseClient === "undefined" ||
                !supabaseClient.auth
            ) {
                message.style.color = "#dc2626";
                message.textContent =
                    "Supabase setup error. Check supabase.js.";
                return;
            }

            resendLink.style.pointerEvents = "none";
            message.style.color = "#333";
            message.textContent = "Sending confirmation email...";

            try {
                const { error } =
                    await supabaseClient.auth.resend({
                        type: "signup",
                        email: email,
                        options: {
                            emailRedirectTo:
                                "https://my-ai-interview-coach.netlify.app/login.html"
                        }
                    });

                if (error) {
                    throw error;
                }

                message.style.color = "#15803d";
                message.textContent =
                    "Confirmation email sent. Please check your inbox.";

            } catch (error) {
                console.error("Resend confirmation error:", error);

                message.style.color = "#dc2626";
                message.textContent =
                    error.message ||
                    "Could not resend confirmation email.";

            } finally {
                resendLink.style.pointerEvents = "auto";
            }
        });
    }

});
