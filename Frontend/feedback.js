
const reportText = sessionStorage.getItem("videoInterviewFeedback");
const message = document.getElementById("feedbackMessage");

function showList(elementId, items) {
  const list = document.getElementById(elementId);
  list.replaceChildren();

  (Array.isArray(items) ? items : []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string"
      ? item
      : JSON.stringify(item);
    list.appendChild(li);
  });

  if (!list.children.length) {
    const li = document.createElement("li");
    li.textContent = "No feedback available.";
    list.appendChild(li);
  }
}

if (reportText) {
  try {
    const report = JSON.parse(reportText);

    document.getElementById("overallScore").textContent =
      `${report.overall_score ?? 0}/100`;

    showList("strengths", report.strengths);
    showList("areasToImprove", report.areas_to_improve);

    const answers = document.getElementById("improvedAnswers");
    answers.replaceChildren();

    (report.improved_answers || []).forEach(item => {
      const card = document.createElement("div");
      card.className = "feedback-card";

      const question = document.createElement("h3");
      question.textContent = item.question || "Interview question";

      const answer = document.createElement("p");
      answer.textContent =
        item.improved_answer || "No suggested answer available.";

      card.append(question, answer);
      answers.appendChild(card);
    });
  } catch {
    message.textContent =
      "Feedback data could not be read. Please complete the interview again.";
  }
} else {
  message.textContent =
    "No interview feedback found. Complete a video interview to see your report.";
}

function getSetupUrl() {
  const type = sessionStorage.getItem("videoInterviewType") || "role";
  const role = sessionStorage.getItem("videoInterviewRole") || "Software Developer";
  const mode = sessionStorage.getItem("videoInterviewMode") || "video";

  const params = new URLSearchParams({ type, role, mode });
  return `session.html?${params.toString()}`;
}

document.getElementById("setupBtn").addEventListener("click", () => {
  window.location.href = getSetupUrl();
});

document.getElementById("restartBtn").addEventListener("click", () => {
  sessionStorage.removeItem("videoInterviewFeedback");

  const params = new URLSearchParams({
    type: sessionStorage.getItem("videoInterviewType") || "role",
    role: sessionStorage.getItem("videoInterviewRole") || "Software Developer",
    mode: "video",
    difficulty: sessionStorage.getItem("videoInterviewDifficulty") || "Medium"
  });

  window.location.href = `video-interview.html?${params.toString()}`;
});

