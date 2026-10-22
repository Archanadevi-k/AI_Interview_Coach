"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const video = $("candidateVideo");
  const placeholder = $("cameraPlaceholder");
  const cameraStatus = $("cameraStatus");
  const timerDisplay = $("timer");
  const questionCount = $("questionCount");
  const questionText = $("questionText");
  const liveCaption = $("liveCaption");
  const aiState = $("aiState");
  const orb = $("orbWrap");
  const warningText = $("warningText");

  const startButton = $("startButton");
  const muteButton = $("muteButton");
  const cameraButton = $("cameraButton");
  const repeatButton = $("repeatButton");
  const continueButton = $("continueButton");
  const endButton = $("endButton");
  const fullscreenButton = $("fullscreenButton");
  const settingsButton = $("settingsButton");

  if (
    !video || !placeholder || !cameraStatus || !timerDisplay ||
    !questionCount || !questionText || !liveCaption || !aiState ||
    !orb || !warningText || !startButton || !muteButton ||
    !cameraButton || !repeatButton || !continueButton ||
    !endButton || !fullscreenButton || !settingsButton
  ) {
    console.error("Interview page is missing one or more required HTML elements.");
    return;
  }

  // ---------- QUESTIONS ----------

 const params = new URLSearchParams(window.location.search);

const role = params.get("role") || "Software Developer";
const difficulty = params.get("difficulty") || "Medium";

const roleTopics = {
  "AI/ML Engineer": [
    "supervised learning", "unsupervised learning", "deep learning",
    "neural networks", "feature engineering", "data preprocessing",
    "model evaluation", "overfitting", "underfitting", "classification",
    "regression", "clustering", "NLP", "computer vision", "deployment"
  ],

  "Data Scientist": [
    "data cleaning", "exploratory data analysis", "hypothesis testing",
    "statistical significance", "feature selection", "regression",
    "classification", "clustering", "outlier detection", "missing values",
    "data visualization", "A/B testing", "time series", "data leakage",
    "model validation"
  ],

  "Data Analyst": [
    "SQL joins", "Excel functions", "data cleaning", "missing values",
    "dashboard design", "KPI selection", "data visualization",
    "business reporting", "sales analysis", "trend analysis",
    "outliers", "pivot tables", "query optimization"
  ],

  "Software Developer": [
    "object-oriented programming", "data structures", "algorithms",
    "time complexity", "database design", "REST APIs",
    "unit testing", "debugging", "Git", "exception handling",
    "authentication", "software security", "design patterns",
    "concurrency", "code review"
  ],

  "Web Developer": [
    "HTML semantics", "CSS Flexbox", "CSS Grid", "JavaScript events",
    "DOM manipulation", "responsive design", "form validation",
    "REST APIs", "HTTP status codes", "accessibility",
    "web performance", "authentication", "XSS", "frontend state",
    "backend integration"
  ],

  "Python Developer": [
    "Python data types", "lists and tuples", "dictionaries and sets",
    "functions", "classes and objects", "exception handling",
    "file handling", "list comprehensions", "generators", "decorators",
    "virtual environments", "packages", "unit testing", "logging",
    "database connectivity"
  ],

  "Cybersecurity Analyst": [
    "phishing", "malware", "network monitoring", "intrusion detection",
    "firewalls", "multi-factor authentication", "least privilege",
    "vulnerability assessment", "incident response", "security logs",
    "suspicious traffic", "encryption", "password security",
    "social engineering", "false positives"
  ]
};

const generalQuestions = [
  "Tell me about yourself.",
  "Describe a project you completed and your contribution.",
  "What technical skill are you currently improving?",
  "Describe a difficult problem you solved.",
  "How do you handle feedback from a teammate?",
  "How do you prioritize tasks when facing a deadline?",
  "Describe a mistake you made and what you learned.",
  "Why are you interested in this job role?",
  "How do you explain a technical idea to a beginner?",
  "What would you like to achieve in your first year in this role?"
];

const templates = [
  topic => `Define ${topic} and explain its main purpose.`,
  topic => `Explain how ${topic} works, step by step.`,
  topic => `Give a practical example of ${topic} in a real project.`,
  topic => `What are the advantages and limitations of ${topic}?`,
  topic => `What common mistakes occur when working with ${topic}, and how would you avoid them?`,
  topic => `How would you apply ${topic} to solve a real-world problem?`,
  topic => `How would you test, evaluate, or improve a solution involving ${topic}?`
];

function createQuestionBank() {
  const topics = roleTopics[role] || roleTopics["Software Developer"];
  const generated = [];

  for (const topic of topics) {
    for (const template of templates) {
      generated.push(template(topic));
    }
  }

  return [...generalQuestions, ...generated];
}

function shuffleQuestions(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// Reuse the questions already selected for this role.
// If none exist, create and save a question set.
const storageKey = `interviewQuestions_${role}_${difficulty}`;

let questions;

try {
  const savedQuestions = sessionStorage.getItem(storageKey);

  if (savedQuestions) {
    questions = JSON.parse(savedQuestions);
  } else {
    const bank = createQuestionBank();

    questions = [
      "Tell me about yourself.",
      ...shuffleQuestions(
        bank.filter(q => q !== "Tell me about yourself.")
      ).slice(0, 9)
    ];

    sessionStorage.setItem(storageKey, JSON.stringify(questions));
  }
} catch (error) {
  const bank = createQuestionBank();

  questions = [
    "Tell me about yourself.",
    ...shuffleQuestions(
      bank.filter(q => q !== "Tell me about yourself.")
    ).slice(0, 9)
  ];
}

  // ---------- INTERVIEW STATE ----------

  let stream = null;
  let recorder = null;
  let recordedChunks = [];
  let recordingUrl = null;

  let recognition = null;
  let recognitionRunning = false;
  let recognitionSupported = false;

  let questionIndex = 0;
  let interviewActive = false;
  let waitingForAnswer = false;
  let isMuted = false;
  let cameraOff = false;
  let isFinishing = false;

  let seconds = 0;
  let timerInterval = null;
  let silenceTimeout = null;
  let questionToken = 0;
  let finalAnswerText = "";
  let answerHistory = [];

  // Microphone silence detection
  let micAudioContext = null;
  let micAnalyser = null;
  let micMonitorId = null;
  let micSilenceStart = null;
  let micWarning = null;

  // ---------- CAPTIONS ----------

  const MAX_CAPTION_WORDS = 14;

  function showRollingCaption(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    liveCaption.textContent = words.slice(-MAX_CAPTION_WORDS).join(" ");
  }

  // ---------- STATUS ----------

  function setStatus(message) {
    aiState.textContent = message;
  }

  function setSpeaking(speaking) {
    orb.classList.toggle("speaking", speaking);

    if (speaking) {
      setStatus("AI is speaking…");
    } else if (interviewActive && waitingForAnswer) {
      setStatus("Your turn to answer");
    } else if (interviewActive) {
      setStatus("Preparing next question…");
    } else {
      setStatus("AI is ready");
    }
  }

  function updateTimer() {
    seconds++;

    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");

    timerDisplay.textContent = `${h}:${m}:${s}`;
  }

  function updateQuestionCount() {
    questionCount.textContent =
      `Question ${Math.min(questionIndex + 1, questions.length)} of ${questions.length}`;
  }

  // ---------- FACE POSITION MONITORING ----------

  let faceDetector = null;
  let faceLibraryLoading = false;
  let faceProcessing = false;
  let faceMonitoringTimer = null;
  let faceIssueTimer = null;
  let faceIssueStartedAt = 0;
  let lastFaceWarningAt = 0;
  let currentFaceIssue = "";

  const FACE_CONFIRM_MS = 1500;
  const FACE_WARNING_COOLDOWN_MS = 5000;

  function setFaceBadge(state, message) {
    let badge = $("faceStatusBadge");

    if (!badge) {
      badge = document.createElement("div");
      badge.id = "faceStatusBadge";

      badge.style.cssText = [
        "margin:8px auto",
        "padding:10px 14px",
        "border-radius:8px",
        "text-align:center",
        "font-weight:600",
        "max-width:420px"
      ].join(";");

      if (warningText.parentNode) {
        warningText.parentNode.insertBefore(badge, warningText);
      } else {
        document.body.appendChild(badge);
      }
    }

    badge.textContent = message;

    if (state === "red") {
      badge.style.background = "#ffebee";
      badge.style.color = "#b71c1c";
    } else if (state === "amber") {
      badge.style.background = "#fff3e0";
      badge.style.color = "#e65100";
    } else {
      badge.style.background = "#e8f5e9";
      badge.style.color = "#1b5e20";
    }
  }

  function speakFaceWarning(message) {
    if (!("speechSynthesis" in window) || !message) return;
    if (window.speechSynthesis.speaking) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    utterance.rate = 1;

    window.speechSynthesis.speak(utterance);
  }

  function showFaceIssue(issue, message) {
    if (currentFaceIssue === issue) return;

    currentFaceIssue = issue;
    faceIssueStartedAt = Date.now();

    clearTimeout(faceIssueTimer);

    faceIssueTimer = setTimeout(() => {
      if (currentFaceIssue !== issue || cameraOff || !interviewActive) return;

      const state = issue === "multiple" ? "red" : "amber";
      setFaceBadge(state, message);

      const now = Date.now();

      if (now - lastFaceWarningAt >= FACE_WARNING_COOLDOWN_MS) {
        lastFaceWarningAt = now;
        speakFaceWarning(message);
      }
    }, FACE_CONFIRM_MS);
  }

  function clearFaceIssue() {
    currentFaceIssue = "";
    faceIssueStartedAt = 0;

    clearTimeout(faceIssueTimer);
    setFaceBadge("green", "Face detected — good position");
  }

  function loadFaceDetectionLibrary() {
    return new Promise((resolve, reject) => {
      if (window.FaceDetection) {
        resolve();
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js";

      script.async = true;

      script.onload = () => {
        if (window.FaceDetection) {
          resolve();
        } else {
          reject(new Error("MediaPipe Face Detection did not initialize."));
        }
      };

      script.onerror = () => {
        reject(new Error(
          "Could not load face detection. Check your internet connection."
        ));
      };

      document.head.appendChild(script);
    });
  }

  async function startFaceMonitoring() {
    if (faceMonitoringTimer || faceLibraryLoading || cameraOff) return;
    if (!video.srcObject || video.readyState < 2) return;

    faceLibraryLoading = true;

    try {
      await loadFaceDetectionLibrary();

      if (cameraOff || !video.srcObject || !interviewActive) return;

      faceDetector = new window.FaceDetection({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });

      faceDetector.setOptions({
        model: "short",
        minDetectionConfidence: 0.6
      });

      faceDetector.onResults((results) => {
        if (cameraOff || !stream || !interviewActive) return;

        const detections = results.detections || [];

        if (detections.length === 0) {
          showFaceIssue(
            "no-face",
            "Please keep your face visible in the camera."
          );
          return;
        }

        if (detections.length > 1) {
          showFaceIssue(
            "multiple",
            "Please ensure only you are visible."
          );
          return;
        }

        const box = detections[0].boundingBox;
        if (!box) return;

        const cx = box.xCenter;
        const cy = box.yCenter;
        const width = box.width;
        const height = box.height;

        if (width < 0.16 || height < 0.16) {
          showFaceIssue("too-small", "Move slightly closer to the camera.");
        } else if (width > 0.62 || height > 0.78) {
          showFaceIssue("too-large", "Move slightly away from the camera.");
        } else if (cx < 0.35 || cx > 0.65) {
          showFaceIssue("off-center", "Please move to the center.");
        } else if (cy < 0.28 || cy > 0.72) {
          showFaceIssue("vertical", "Adjust your camera position.");
        } else {
          clearFaceIssue();
        }
      });

      setFaceBadge("green", "Face monitoring is active");

      faceMonitoringTimer = setInterval(async () => {
        if (
          !faceDetector ||
          cameraOff ||
          !interviewActive ||
          faceProcessing ||
          video.readyState < 2
        ) {
          return;
        }

        faceProcessing = true;

        try {
          await faceDetector.send({ image: video });
        } catch (error) {
          console.warn("Face detection frame failed:", error);
        } finally {
          faceProcessing = false;
        }
      }, 300);

    } catch (error) {
      console.error("Face monitoring could not start:", error);

      setFaceBadge(
        "amber",
        "Face monitoring unavailable — check internet connection."
      );
    } finally {
      faceLibraryLoading = false;
    }
  }

  function stopFaceMonitoring() {
    if (faceMonitoringTimer) {
      clearInterval(faceMonitoringTimer);
    }

    faceMonitoringTimer = null;
    clearTimeout(faceIssueTimer);

    currentFaceIssue = "";
    faceProcessing = false;

    if (faceDetector && typeof faceDetector.close === "function") {
      try {
        faceDetector.close();
      } catch (_) {}
    }

    faceDetector = null;
    faceLibraryLoading = false;
  }

  // ---------- CAMERA AND MICROPHONE ----------

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Open this page through Live Server or HTTPS.");
      }

      if (stream && stream.active) {
        video.srcObject = stream;
        await video.play();

        placeholder.style.display = "none";
        cameraStatus.textContent = "Camera connected";
        return true;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      video.srcObject = stream;
      await video.play();

      placeholder.style.display = "none";
      cameraStatus.textContent = "Camera connected";
      cameraOff = false;
      isMuted = false;

      cameraButton.textContent = "▣ Camera Off";
      muteButton.textContent = "🎙 Mute";

      warningText.textContent =
        "Please keep your face inside the camera frame.";

      return true;

    } catch (error) {
      console.error("Camera access error:", error);

      placeholder.style.display = "flex";
      cameraStatus.textContent = "Camera permission required";

      warningText.textContent =
        "Allow camera and microphone access, then try again.";

      liveCaption.textContent =
        error.message || "Camera access was not available.";

      return false;
    }
  }

  // Release the camera only when the recording has actually stopped.
  function releaseCameraAndMicrophone() {
    stopMicSilenceMonitor();
    stopFaceMonitoring();

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });

      stream = null;
    }

    video.pause();
    video.srcObject = null;

    placeholder.style.display = "flex";
    cameraStatus.textContent = "Camera disconnected";
    cameraOff = false;
    isMuted = false;

    cameraButton.textContent = "▣ Camera Off";
    muteButton.textContent = "🎙 Mute";
  }

  // ---------- RECORD INTERVIEW ----------

  function startRecording() {
    if (!stream || !stream.active || !window.MediaRecorder) {
      console.warn("Recording unavailable.");
      return false;
    }

    try {
      recordedChunks = [];

      const options = {};

      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        options.mimeType = "video/webm;codecs=vp9,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
        options.mimeType = "video/webm;codecs=vp8,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        options.mimeType = "video/webm";
      }

      recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Recording error:", event.error);
        liveCaption.textContent = "Video recording encountered an error.";
      };

      recorder.onstop = () => {
        try {
          if (recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, {
              type: recorder?.mimeType || "video/webm"
            });

            if (recordingUrl) {
              URL.revokeObjectURL(recordingUrl);
            }

            recordingUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = recordingUrl;
            link.download = "AI_Interview_Coach_Recording.webm";
            link.textContent = "⬇ Download Interview Recording";
            link.className = "control-btn";
            link.style.display = "inline-block";
            link.style.margin = "12px auto";
            link.id = "downloadRecording";

            const oldLink = $("downloadRecording");
            if (oldLink) oldLink.remove();

            const controlBar = document.querySelector(".control-bar");

            if (controlBar) {
              controlBar.after(link);
            } else {
              document.body.appendChild(link);
            }

            liveCaption.textContent =
              "Recording ready. Use the download link below to save your video.";
          } else {
            liveCaption.textContent =
              "Interview ended. No recording data was available.";
          }
        } catch (error) {
          console.error("Could not prepare recording download:", error);
        } finally {
          // IMPORTANT: camera cleanup happens after recording stops.
          releaseCameraAndMicrophone();
        }
      };

      // Do NOT stop the camera stream here.
      // MediaRecorder needs the camera stream while the interview is running.
      recorder.start(1000);

      return true;

    } catch (error) {
      console.error("Could not start recording:", error);

      liveCaption.textContent =
        "Recording could not start. You can still continue the interview.";

      return false;
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (error) {
        console.warn("Could not stop recorder:", error);
        releaseCameraAndMicrophone();
      }
    } else {
      // If recording never started, release the camera directly on finish.
      releaseCameraAndMicrophone();
    }
  }

  // ---------- SPEECH RECOGNITION ----------

  const RecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (RecognitionAPI) {
    recognitionSupported = true;
    recognition = new RecognitionAPI();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      recognitionRunning = true;
    };

    recognition.onresult = (event) => {
      if (!interviewActive || !waitingForAnswer) return;

      let interim = "";
      let finalText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript + " ";
        }
      }

      if (finalText.trim()) {
        finalAnswerText += finalText;
      }

      const displayText = (finalAnswerText + " " + interim).trim();

      if (displayText) {
        showRollingCaption(displayText);

        clearTimeout(silenceTimeout);

        silenceTimeout = setTimeout(() => {
          if (
            interviewActive &&
            waitingForAnswer &&
            displayText.length > 3
          ) {
            moveToNextQuestion();
          }
        }, 3000);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition:", event.error);
        setStatus("Listening interrupted — select Continue when ready.");
      }
    };

    recognition.onend = () => {
      recognitionRunning = false;

      if (interviewActive && waitingForAnswer) {
        try {
          recognition.start();
        } catch (_) {
          // Recognition may already be restarting.
        }
      }
    };
  }

  // ---------- MICROPHONE SILENCE DETECTION ----------

  function startMicSilenceMonitor() {
    if (!stream || micMonitorId) return;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    micAudioContext = new AudioContextClass();
    micAnalyser = micAudioContext.createAnalyser();
    micAnalyser.fftSize = 1024;

    const micSource = micAudioContext.createMediaStreamSource(stream);
    micSource.connect(micAnalyser);

    if (!micWarning) {
      micWarning = document.createElement("div");

      micWarning.textContent =
        "⚠ Microphone silence detected. Please check your microphone.";

      micWarning.style.cssText =
        "display:none;margin:10px 0;padding:12px;border-radius:8px;" +
        "background:#451a1a;color:#fecaca;border:1px solid #b91c1c;";

      aiState.insertAdjacentElement("afterend", micWarning);
    }

    const audioData = new Uint8Array(micAnalyser.fftSize);

    function checkMicrophone() {
      if (!micMonitorId) return;

      micMonitorId = requestAnimationFrame(checkMicrophone);

      const track = audioTracks[0];

      if (
        !interviewActive ||
        !waitingForAnswer ||
        isMuted ||
        !track.enabled ||
        track.readyState !== "live"
      ) {
        micSilenceStart = null;
        micWarning.style.display = "none";
        return;
      }

      micAnalyser.getByteTimeDomainData(audioData);

      let sum = 0;

      for (let i = 0; i < audioData.length; i++) {
        const value = (audioData[i] - 128) / 128;
        sum += value * value;
      }

      const volume = Math.sqrt(sum / audioData.length);

      if (volume < 0.02) {
        if (micSilenceStart === null) {
          micSilenceStart = Date.now();
        }

        if (Date.now() - micSilenceStart >= 1500) {
          micWarning.style.display = "block";
        }
      } else {
        micSilenceStart = null;
        micWarning.style.display = "none";
      }
    }

    micMonitorId = requestAnimationFrame(checkMicrophone);
    micAudioContext.resume().catch(() => {});
  }

  function stopMicSilenceMonitor() {
    if (micMonitorId !== null) {
      cancelAnimationFrame(micMonitorId);
      micMonitorId = null;
    }

    micSilenceStart = null;

    if (micWarning) {
      micWarning.style.display = "none";
    }

    if (micAudioContext) {
      micAudioContext.close().catch(() => {});
      micAudioContext = null;
      micAnalyser = null;
    }
  }

  function stopRecognition() {
    clearTimeout(silenceTimeout);

    if (recognition && recognitionRunning) {
      try {
        recognition.stop();
      } catch (_) {}
    }
  }

  // ---------- AI VOICE AND QUESTIONS ----------

  function speakQuestion(text) {
    if (!interviewActive) return;

    if (!("speechSynthesis" in window)) {
      questionText.textContent = text;
      liveCaption.textContent =
        "Read the question on screen, answer aloud, then select Continue.";

      setStatus("AI voice is unavailable in this browser.");
      waitingForAnswer = true;
      return;
    }

    const token = ++questionToken;

    waitingForAnswer = false;

    stopRecognition();
    window.speechSynthesis.cancel();

    questionText.textContent = `“${text}”`;
    liveCaption.textContent = text;

    updateQuestionCount();
    setSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;

    utterance.onstart = () => {
      if (token === questionToken) {
        setSpeaking(true);
      }
    };

    utterance.onend = () => {
      if (token !== questionToken || !interviewActive) return;

      setSpeaking(false);
      beginAnswer();
    };

    utterance.onerror = () => {
      if (token !== questionToken) return;

      setSpeaking(false);

      liveCaption.textContent =
        "Voice playback failed. Read the question and select Continue after answering.";

      waitingForAnswer = true;
    };

    window.speechSynthesis.speak(utterance);
  }

  function beginAnswer() {
    if (!interviewActive) return;

    waitingForAnswer = true;
    finalAnswerText = "";

    liveCaption.textContent = recognitionSupported
      ? "Listening to your answer…"
      : "Please answer aloud, then select Continue after answering.";

    setStatus("Your turn to answer");

    if (!recognitionSupported) return;

    try {
      if (!recognitionRunning) {
        recognition.start();
      }
    } catch (error) {
      console.warn("Recognition start:", error);

      liveCaption.textContent =
        "Automatic speech recognition is unavailable. Select Continue after answering.";
    }
  }

  function moveToNextQuestion() {
    if (!interviewActive || !waitingForAnswer) return;

    waitingForAnswer = false;
    stopRecognition();

    answerHistory.push({
      question: questions[questionIndex],
      answer: finalAnswerText.trim()
    });

    questionIndex++;

    if (questionIndex >= questions.length) {
      finishInterview();
      return;
    }

    speakQuestion(questions[questionIndex]);
  }

  // ---------- FEEDBACK ----------

  async function evaluateInterviewAnswers(history) {
    const response = await fetch(
      "http://127.0.0.1:8000/api/evaluate/interview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          answers: history,
          role: "General",
          difficulty: "Medium"
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.detail || `Evaluation failed: ${response.status}`
      );
    }

    return await response.json();
  }

  function displayInterviewFeedback(feedback) {
    const panel = $("feedbackPanel");
    const score = $("overallScore");
    const strengths = $("overallStrengths");
    const improvements = $("overallImprovements");
    const betterAnswers = $("betterAnswers");

    if (!panel || !score || !strengths || !improvements || !betterAnswers) {
      throw new Error("Feedback display section is missing from HTML.");
    }

    score.textContent = `${feedback.overall_score}/100`;

    strengths.replaceChildren();
    improvements.replaceChildren();
    betterAnswers.replaceChildren();

    (feedback.strengths || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      strengths.appendChild(li);
    });

    (feedback.areas_to_improve || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      improvements.appendChild(li);
    });

    (feedback.improved_answers || []).forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "better-answer-card";

      const heading = document.createElement("h4");
      heading.textContent = `Question ${index + 1}: ${item.question}`;

      const answer = document.createElement("p");
      answer.textContent = item.improved_answer;

      card.append(heading, answer);
      betterAnswers.appendChild(card);
    });

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showFeedbackLoading() {
    const panel = $("feedbackPanel");
    const score = $("overallScore");
    const strengths = $("overallStrengths");
    const improvements = $("overallImprovements");
    const betterAnswers = $("betterAnswers");

    if (panel) panel.hidden = false;

    if (score) score.textContent = "Generating…";

    if (strengths) {
      strengths.replaceChildren();
      const li = document.createElement("li");
      li.textContent = "Analyzing your interview answers…";
      strengths.appendChild(li);
    }

    if (improvements) improvements.replaceChildren();
    if (betterAnswers) betterAnswers.replaceChildren();

    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ---------- END INTERVIEW ----------

  async function finishInterview() {
    if (!interviewActive || isFinishing) return;

    isFinishing = true;
    interviewActive = false;
    waitingForAnswer = false;
    ++questionToken;

    stopRecognition();
    stopMicSilenceMonitor();
    clearTimeout(silenceTimeout);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);

    stopFaceMonitoring();
    clearTimeout(faceIssueTimer);

    clearInterval(timerInterval);
    timerInterval = null;

    // Hide interview and controls while evaluation runs.
    const interviewSection = $("interviewSection");
    if (interviewSection) interviewSection.hidden = true;

    const interviewFooter = document.querySelector(".control-bar");
    if (interviewFooter) interviewFooter.hidden = true;

    questionText.textContent = "Interview completed!";
    liveCaption.textContent = "Generating your overall interview feedback…";
    setStatus("Generating overall interview feedback…");

    questionCount.textContent = `${questions.length} of ${questions.length}`;

    startButton.disabled = false;
    startButton.textContent = "↻ Start Again";
    repeatButton.disabled = true;
    continueButton.disabled = true;
    endButton.disabled = true;

    // Show a loading state immediately, rather than a blank page.
    showFeedbackLoading();

    console.log("Interview answer transcript:", answerHistory);

    // Ask the recorder to stop. Camera tracks are released by recorder.onstop.
    stopRecording();

    try {
      const feedback = await evaluateInterviewAnswers(answerHistory);

      window.interviewEvaluationResults = feedback;
      displayInterviewFeedback(feedback);
      setStatus("Evaluation completed");

    } catch (error) {
      console.error("Overall interview evaluation error:", error);

      const strengths = $("overallStrengths");
      const score = $("overallScore");

      if (score) score.textContent = "Unavailable";

      if (strengths) {
        strengths.replaceChildren();
        const li = document.createElement("li");
        li.textContent =
          "Feedback could not be generated. Check that the backend is running and inspect its terminal for errors.";
        strengths.appendChild(li);
      }

      liveCaption.textContent =
        "Interview ended, but feedback could not be generated. Check the backend terminal.";

      setStatus("Evaluation failed");
    } finally {
      isFinishing = false;
    }
  }

  // ---------- BUTTON EVENTS ----------

  startButton.addEventListener("click", async () => {
    if (interviewActive || isFinishing) return;

    const interviewSection = $("interviewSection");
    if (interviewSection) interviewSection.hidden = false;

    const interviewFooter = document.querySelector(".control-bar");
    if (interviewFooter) interviewFooter.hidden = false;

    const feedbackPanel = $("feedbackPanel");
    if (feedbackPanel) feedbackPanel.hidden = true;

    startButton.disabled = true;
    startButton.textContent = "Connecting…";

    // Reacquire the camera if it was released after the previous interview.
    if (!stream || !stream.active) {
      const cameraReady = await startCamera();

      if (!cameraReady) {
        startButton.disabled = false;
        startButton.textContent = "▶ Start Interview";
        return;
      }
    }

    interviewActive = true;
    questionIndex = 0;
    seconds = 0;
    answerHistory = [];
    finalAnswerText = "";
    isFinishing = false;

    startMicSilenceMonitor();

    timerDisplay.textContent = "00:00:00";

    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    startButton.textContent = "Interview Started";

    repeatButton.disabled = false;
    continueButton.disabled = false;
    endButton.disabled = false;

    // Keep the camera stream alive while recording and interviewing.
    startRecording();

    startFaceMonitoring();
    speakQuestion(questions[questionIndex]);
  });

  repeatButton.addEventListener("click", () => {
    if (interviewActive) {
      speakQuestion(questions[questionIndex]);
    }
  });

  continueButton.addEventListener("click", moveToNextQuestion);

  endButton.addEventListener("click", () => {
    if (!interviewActive) return;

    if (confirm("Are you sure you want to end the interview?")) {
      finishInterview();
    }
  });

  muteButton.addEventListener("click", async () => {
    if (!stream || !stream.active) {
      const ready = await startCamera();
      if (!ready) return;
    }

    const tracks = stream.getAudioTracks();
    if (!tracks.length) return;

    isMuted = !isMuted;

    tracks.forEach((track) => {
      track.enabled = !isMuted;
    });

    muteButton.textContent = isMuted ? "🔇 Unmute" : "🎙 Mute";
    muteButton.setAttribute("aria-pressed", String(isMuted));
  });

  cameraButton.addEventListener("click", async () => {
    if (!stream || !stream.active) {
      const ready = await startCamera();
      if (!ready) return;
    }

    const tracks = stream.getVideoTracks();
    if (!tracks.length) return;

    cameraOff = !cameraOff;

    tracks.forEach((track) => {
      track.enabled = !cameraOff;
    });

    cameraButton.textContent =
      cameraOff ? "▣ Camera On" : "▣ Camera Off";

    cameraStatus.textContent =
      cameraOff ? "Camera off" : "Camera connected";

    if (cameraOff) {
      clearTimeout(faceIssueTimer);
      setFaceBadge("amber", "Camera is off");
    } else {
      clearFaceIssue();
      startFaceMonitoring();
    }
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      alert("Fullscreen is unavailable in this browser.");
    }
  });

  settingsButton.addEventListener("click", () => {
    alert(
      "Interview settings\n\n" +
      "• Allow camera and microphone access in your browser.\n" +
      "• AI voice language: English (US).\n" +
      "• Number of questions: 8.\n" +
      "• Video recording is saved locally when the interview ends."
    );
  });

  // ---------- INITIAL STATE ----------

  repeatButton.disabled = true;
  continueButton.disabled = true;
  endButton.disabled = true;

  // Preview camera on page load, but do not stop it when recording starts.
  startCamera();

  // ---------- CLEANUP ----------

  window.addEventListener("beforeunload", () => {
    clearInterval(timerInterval);
    clearTimeout(silenceTimeout);

    stopFaceMonitoring();
    stopMicSilenceMonitor();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (recognition && recognitionRunning) {
      try {
        recognition.stop();
      } catch (_) {}
    }

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (_) {}
    }

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });

      stream = null;
    }

    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      recordingUrl = null;
    }
  });

  // ---------- FEEDBACK BUTTONS ----------

  $("startInterviewAgainBtn")?.addEventListener("click", () => {
    window.location.reload();
  });

  $("backToSetupBtn")?.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    window.location.href = `session.html?${params.toString()}`;
  });
});