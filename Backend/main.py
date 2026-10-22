
import os
from typing import List

import pymupdf
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from groq import Groq

load_dotenv()

app = FastAPI(title="AI Interview Coach API", version="1.0.0")


# Allow the local frontend served by VS Code Live Server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "null",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Request and response models
# --------------------------------------------------

class EvaluationRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    answer: str = Field(min_length=1, max_length=12000)
    role: str = Field(default="General", max_length=200)
    difficulty: str = Field(default="Medium", max_length=50)


class EvaluationResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    relevance: str
    strengths: List[str]
    missing_concepts: List[str]
    improvements: List[str]
    sample_improved_answer: str

class InterviewAnswerItem(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    answer: str = Field(default="", max_length=12000)


class OverallInterviewRequest(BaseModel):
    answers: List[InterviewAnswerItem]
    role: str = Field(default="General", max_length=200)
    difficulty: str = Field(default="Medium", max_length=50)


class ImprovedAnswerItem(BaseModel):
    question: str
    improved_answer: str


class OverallInterviewResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    strengths: List[str]
    areas_to_improve: List[str]
    improved_answers: List[ImprovedAnswerItem]


# --------------------------------------------------
# Health and root endpoints
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "running",
        "service": "AI Interview Coach API",
        "evaluation_endpoint": "/api/evaluate",
        "resume_upload_endpoint": "/api/resume/upload",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------
# Resume PDF upload and text extraction
# --------------------------------------------------

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    # Check the file extension.
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF resume.",
        )

    # Read the uploaded PDF into memory.
    pdf_bytes = await file.read()

    # Reject empty files.
    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is empty.",
        )

    # Limit upload size to 10 MB.
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF size must be 10 MB or less.",
        )

    try:
        # Open the PDF using PyMuPDF.
        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as document:

            if document.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            # Extract text from every page.
            extracted_pages = []

            for page in document:
                extracted_pages.append(page.get_text())

            resume_text = "\n".join(extracted_pages).strip()

    except HTTPException:
        raise

    except Exception as exc:
        print(
            f"Resume extraction error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read this PDF. "
                "Please upload a valid PDF file."
            ),
        ) from exc

    # Scanned PDFs may require OCR, which is not implemented here.
    if not resume_text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No selectable text found in this PDF. "
                "Scanned resumes need OCR support."
            ),
        )

    # Return the extracted text to the frontend.
    # This endpoint does not save the resume permanently.
    return {
        "message": "Resume uploaded and text extracted successfully.",
        "filename": file.filename,
        "character_count": len(resume_text),
        "resume_text": resume_text,
    }


# --------------------------------------------------
# AI interview answer evaluation
# --------------------------------------------------

@app.post(
    "/api/evaluate",
    response_model=EvaluationResponse,
)
def evaluate_answer(payload: EvaluationRequest):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "GEMINI_API_KEY is missing. "
                "Add it to Backend/.env and restart the server."
            ),
        )

    prompt = f"""
You are a fair, constructive AI interview coach.

Evaluate the candidate's answer to the interview question.

Role: {payload.role}
Difficulty: {payload.difficulty}
Question: {payload.question}
Candidate answer: {payload.answer}

Evaluate correctness, relevance, clarity, and important concepts
for the stated role and difficulty.

Do not reward length alone. If the answer is empty or says
"I don't know", score it accordingly.

Be encouraging but honest. Do not claim the score is a validated
hiring decision; it is only practice feedback.

Return JSON with exactly these fields:
- score: integer from 0 to 100
- relevance: short explanation of how well the answer addresses
  the question
- strengths: array of 1 to 4 concise strings
- missing_concepts: array of 1 to 5 concise strings
- improvements: array of 1 to 4 actionable strings
- sample_improved_answer: a concise example answer appropriate
  for this role and level

If a field has no items, return an empty array.
Do not include markdown fences.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=os.getenv(
                "GEMINI_MODEL",
                "gemini-2.5-flash",
            ),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": EvaluationResponse,
            },
        )

        if not response.text:
            raise ValueError(
                "Gemini returned an empty response."
            )

        return EvaluationResponse.model_validate_json(
            response.text
        )

    except Exception as exc:
        # Keep internal exception details in the backend terminal.
        print(
            f"Gemini evaluation error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "AI evaluation failed. Check the backend terminal, "
                "API key, model access, and quota."
            ),
        ) from exc
   
@app.post(
    "/api/evaluate/interview",
    response_model=OverallInterviewResponse,
)

def evaluate_full_interview(payload: OverallInterviewRequest):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing in Backend/.env",
        )

    answers = [
        item for item in payload.answers
        if item.question.strip()
    ]

    if not answers:
        raise HTTPException(
            status_code=400,
            detail="No interview questions were provided.",
        )

    transcript = "\n\n".join(
        f"Question {index}:\n{item.question}\n"
        f"Candidate answer: {item.answer.strip() or 'No answer provided.'}"
        for index, item in enumerate(answers, start=1)
    )

    prompt = f"""
You are a fair, constructive AI interview coach.

Evaluate the candidate's complete interview as ONE overall performance.

Role: {payload.role}
Difficulty: {payload.difficulty}

Interview transcript:
{transcript}

Return exactly these fields:
- overall_score: integer from 0 to 100 for the complete interview,
  not an average of separate question scores.
- strengths: array of 2 to 5 concise overall strengths.
- areas_to_improve: array of 2 to 5 actionable overall improvements.
- improved_answers: one item for EVERY question, in the original order.
  Each item must contain:
  - question: the exact original question.
  - improved_answer: a clear, professional example answer that
    directly answers that question.

Rules:
- Do not return individual question scores.
- Do not return question-by-question feedback.
- Do not invent personal experience, projects, skills, or achievements.
- For personal questions, provide an adaptable example without
  inventing facts about the candidate.
- Be constructive and honest.
- The overall score is for practice, not a hiring decision.
- Return valid JSON only, without Markdown fences.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": OverallInterviewResponse,
            },
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = OverallInterviewResponse.model_validate_json(
            response.text
        )

        if len(result.improved_answers) != len(answers):
            raise ValueError(
                "Gemini did not return one improved answer per question."
            )

        return result

    except Exception as exc:
        print(
            f"Overall interview evaluation error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Overall interview evaluation failed. "
                "Check Gemini API access, model, and quota."
            ),
        ) from exc
    
# Request model for resume-based questions
class ResumeQuestionRequest(BaseModel):
    resume_text: str = Field(min_length=20, max_length=20000)
    role: str = Field(default="Software Developer", max_length=200)
    difficulty: str = Field(default="Medium", max_length=50)


# Response model
class ResumeQuestionResponse(BaseModel):
    questions: List[str]


# Generate personalized interview questions
@app.post(
    "/api/resume/questions",
    response_model=ResumeQuestionResponse
)
def generate_resume_questions(payload: ResumeQuestionRequest):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing in Backend/.env"
        )

    prompt = f"""
You are an expert technical interview coach.

Generate exactly 10 interview questions based on the
candidate's resume below.

Target role: {payload.role}
Difficulty: {payload.difficulty}

Resume:
{payload.resume_text}

Instructions:
- Personalize questions using the candidate's actual skills.
- Include questions about projects and internship experience.
- Include technical and practical questions relevant to the role.
- Do not invent experience that is not in the resume.
- Return valid JSON with one field named "questions".
- The questions field must be an array of exactly 10 strings.
- Do not include markdown fences.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=os.getenv(
                "GEMINI_MODEL",
                "gemini-2.5-flash"
            ),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": ResumeQuestionResponse,
            },
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = ResumeQuestionResponse.model_validate_json(
            response.text
        )

        if len(result.questions) != 10:
            raise ValueError(
                "Gemini did not return exactly 10 questions."
            )

        return result

    except Exception as exc:
        print(
            f"Resume question generation error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Could not generate interview questions. "
                "Check the backend terminal, Gemini model access, "
                "API key, and quota."
            ),
        ) from exc
    
# Generate dynamic interview questions for Voice/Video mode
class DynamicQuestionRequest(BaseModel):
    role: str = Field(default="Software Developer", max_length=200)
    difficulty: str = Field(default="Medium", max_length=50)
    experience: str = Field(default="Fresher", max_length=100)
    previous_question: str = Field(default="", max_length=2000)
    previous_answer: str = Field(default="", max_length=12000)
    resume_text: str = Field(default="", max_length=20000)


class DynamicQuestionResponse(BaseModel):
    questions: List[str]


@app.post(
    "/api/interview/questions",
    response_model=DynamicQuestionResponse,
)
def generate_dynamic_questions(payload: DynamicQuestionRequest):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing in Backend/.env",
        )

    prompt = f"""
You are an adaptive AI interview coach.

Generate 3 fresh interview questions for:
Role: {payload.role}
Difficulty: {payload.difficulty}
Experience level: {payload.experience}

Resume details:
{payload.resume_text or "No resume provided."}

Previous question:
{payload.previous_question or "This is the beginning of the interview."}

Candidate's previous answer:
{payload.previous_answer or "No previous answer yet."}

Rules:
- Generate questions relevant to the specified role.
- Personalize questions using resume details when provided.
- If a previous answer exists, use it to create relevant follow-up
  questions that test understanding or explore the answer further.
- Do not repeat the previous question.
- Do not invent qualifications or experience.
- Return JSON with a "questions" array containing exactly 3 strings.
- Do not include markdown fences.
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": DynamicQuestionResponse,
            },
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = DynamicQuestionResponse.model_validate_json(
            response.text
        )

        if len(result.questions) != 3:
            raise ValueError("Gemini did not return 3 questions.")

        return result

    except Exception as exc:
        print(
            f"Dynamic question generation error: "
            f"{type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=502,
            detail="Question generation failed. Check Gemini API access and quota.",
        ) from exc
    # --------------------------------------------------
# Groq speech transcription
# --------------------------------------------------

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is missing in Backend/.env",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Audio filename is missing.",
        )

    allowed_extensions = (
        ".webm", ".wav", ".mp3", ".m4a",
        ".mp4", ".mpeg", ".mpga", ".ogg", ".flac"
    )

    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format.",
        )

    audio_bytes = await file.read()

    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded audio is empty.",
        )

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Audio file must be 25 MB or smaller.",
        )

    try:
        client = Groq(api_key=api_key)

        transcription = client.audio.transcriptions.create(
            file=(
                file.filename,
                audio_bytes,
                file.content_type or "application/octet-stream",
            ),
            model=os.getenv(
                "GROQ_TRANSCRIPTION_MODEL",
                "whisper-large-v3-turbo",
            ),
            response_format="json",
        )

        return {
            "text": transcription.text.strip(),
            "filename": file.filename,
        }

    except Exception as exc:
        print(
            f"Groq transcription error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Audio transcription failed. Check the Groq API key, "
                "model access, file format, and API quota."
            ),
        ) from exc

    finally:
        await file.close()
