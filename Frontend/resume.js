
document.addEventListener("DOMContentLoaded", function () {
  const resumeForm = document.getElementById("resumeForm");
  const resumeFile = document.getElementById("resumeFile");
  const resumeMessage = document.getElementById("resumeMessage");
  const submitButton = resumeForm.querySelector(
    'button[type="submit"]'
  );

  resumeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = resumeFile.files[0];

    if (!file) {
      resumeMessage.textContent = "Please select your resume PDF.";
      return;
    }

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      resumeMessage.textContent = "Please upload a valid PDF file.";
      resumeFile.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    submitButton.disabled = true;
    submitButton.textContent = "Uploading resume...";
    resumeMessage.textContent = "Uploading and reading your resume...";

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/resume/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Resume upload failed."
        );
      }

      if (!data.resume_text || data.resume_text.trim().length < 20) {
        throw new Error(
          "Not enough readable text found in your resume."
        );
      }

      sessionStorage.setItem("resumeText", data.resume_text);
      sessionStorage.setItem("resumeFilename", data.filename);

      
resumeMessage.textContent =
  "Resume uploaded successfully! Preparing your interview...";

const nextParams = new URLSearchParams({
  type: "resume",
  file: data.filename
});

window.location.href = "mode.html?" + nextParams.toString();

    } catch (error) {
      resumeMessage.textContent =
        error.message ||
        "Unable to upload resume. Check whether the backend is running.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Continue";
    }
  });
});
