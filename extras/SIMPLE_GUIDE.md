# ⚡ Use Locally in VS Code (Super Quick)

This is the fastest way to run everything and use the extension with a built‑in prompt.

## 1) Start everything

- Double‑click `start_all.bat`
- Windows that open and stay up:
  - "Ollama" (local LLM)
  - "AI Review API" (http://localhost:7070)
  - "AI Review Web" (http://localhost:5173)
  - VS Code Extension Development Host (opens automatically)

> First run may download the model (~4.7 GB). Let it finish.

## 2) In VS Code (button by button)

- The "AI Quick Prompt" panel auto‑opens on the right

  1.  Paste code or type your question
  2.  Pick language (Python/JS/TS/Plain)
  3.  Click "Review" → answer appears below
  4.  Re‑open anytime: Ctrl+Alt+A (or Command Palette → "AI Code Review: Open Quick Prompt")

- Review current file

  - Click the status bar "AI Review" button (bottom‑right)
  - Or press Ctrl+Shift+R
  - Or Command Palette → "AI Code Review: Review Current File"

- Open the Web UI (browser)
  - Ctrl+Shift+O
  - Or Command Palette → "AI Code Review: Open Web UI"

## 3) Optional: Postman

- POST `http://localhost:7070/api/review`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  { "language": "python", "code": "def add(a,b): return a+b" }
  ```

## 4) Stop everything

- Double‑click `stop_all.bat`
- (Closes Ollama/API/Web; you can close any remaining windows manually.)

## Notes

- `demo/buggy_python.py` is intentionally "bad" for review; it now auto‑creates a small SQLite DB so it won’t crash if run.
- If the Quick Prompt shows "API: OFFLINE", check the "AI Review API" window for errors.
- If ports are busy, run `stop_all.bat` and try again.
