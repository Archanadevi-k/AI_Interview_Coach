
document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);

  const role = params.get("role");
  const type = (params.get("type") || "role").toLowerCase();
  const file = params.get("file");

  const selectedRole = document.getElementById("selectedRole");
  const backToRole = document.getElementById("backToRole");

  // Display the correct interview type.
  if (type === "resume") {
    selectedRole.textContent = "Resume-Based Interview";
    backToRole.href = "resume.html";
  } else {
    selectedRole.textContent = role || "Not selected";
    backToRole.href = "role.html";
  }

  document.querySelectorAll(".mode-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      const mode = button.dataset.mode.toLowerCase();

      // Role-based interview: preserve the existing flow.
      if (type !== "resume" && !role) {
        window.location.href = "role.html";
        return;
      }

      // Preserve interview type, mode, and uploaded resume filename.
      const nextParams = new URLSearchParams({
        type: type,
        mode: mode,
        role: role || "Resume-Based Interview"
      });

      if (file) {
        nextParams.set("file", file);
      }

      window.location.href =
        "session.html?" + nextParams.toString();
    });
  });
});
