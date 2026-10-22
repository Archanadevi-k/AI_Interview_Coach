
document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);

  const type = params.get("type");
  const role = params.get("role");
  const mode = params.get("mode");
  const file = params.get("file");

  document.getElementById("sessionType").textContent =
    type === "resume" ? "Resume-Based" :
    type === "role" ? "Role-Based" : "Not selected";

  document.getElementById("sessionRole").textContent =
    role || (type === "resume" ? "To be identified from resume" : "Not selected");

  document.getElementById("sessionMode").textContent =
    mode || "Not selected";

  document.getElementById("sessionResume").textContent =
    file || (type === "resume" ? "PDF selected" : "Not provided");

  const message = document.getElementById("sessionMessage");

  if (type === "resume") {
    message.textContent =
      "Resume selected successfully. Connect a backend to analyse the PDF and generate personalised questions.";
  } else if (type === "role") {
    message.textContent =
      mode + " interview mode selected for " + role +
      ". Connect the interview engine to begin the actual practice session.";
  } else {
    message.textContent =
      "Choose an interview type from the interview options page to begin.";
  }
});
