
document.addEventListener("DOMContentLoaded", function () {
  const roleForm = document.getElementById("roleForm");
  const jobRole = document.getElementById("jobRole");
  const roleMessage = document.getElementById("roleMessage");

  roleForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedRole = jobRole.value;

    if (!selectedRole) {
      roleMessage.textContent = "Please select your target job role.";
      return;
    }

    window.location.href =
      "mode.html?role=" + encodeURIComponent(selectedRole);
  });
});
