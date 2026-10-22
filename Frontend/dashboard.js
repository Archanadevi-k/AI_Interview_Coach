
document.addEventListener("DOMContentLoaded", function () {
  const startButton = document.getElementById("startInterviewBtn");

  if (startButton) {
    startButton.addEventListener("click", function () {
      window.location.href = "interview.html";
    });
  }
});
