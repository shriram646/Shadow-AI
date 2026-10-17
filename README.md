# Shadow AI — AI chat

A local, responsive AI chat app built with React, Vite, Express, and Google's official Gemini JavaScript SDK. Conversations and the selected theme are saved in your browser; chat content is not stored by the backend.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Get started

1. Open two VS Code terminals in this project.
2. In the first terminal, install and start the backend:

   ```powershell
   cd server
   npm install
   Copy-Item ..\.env.example .env
   ```

   Open `server/.env`, replace `your_gemini_api_key_here` with your API key, save, then run:

   ```powershell
   npm run dev
   ```

3. In the second terminal, install and start the frontend:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

4. Open **[http://127.0.0.1:5173](https://shadowmind-chi.vercel.app)** in your browser.

The Vite development server proxies `/api` requests to the Express server on port 3001. The backend listens on `127.0.0.1` and never sends the API key to the browser.

## Try a conversation

Choose a suggested prompt or type a message and press **Enter**. Press **Shift+Enter** to add a line. Use **Attach** to include photos, PDFs, Word `.docx` documents, or text/code files with your question; you can attach up to four files per message. Ask follow-up questions in the same chat to include recent context, including earlier files. Use the stop control to stop waiting for a response; the provider may still finish processing a request already sent. Create, rename, or delete chats in the sidebar. Conversations and theme preference are saved in this browser's local storage; attachment file data is kept in this browser's IndexedDB and is removed when you delete its conversation.

## Configuration

The backend reads environment variables from `server/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | Required secret from Google AI Studio; never put it in the client. |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Gemini text model. Set to another model available to your API key if desired. |
| `ALLOWED_ORIGINS` | `http://127.0.0.1:5173,http://localhost:5173` | Comma-separated browser origins allowed by the backend. |
| `PORT` | `3001` | Backend port. The Vite proxy expects port 3001 unless you update `client/vite.config.js`. |

The backend health endpoint is `http://127.0.0.1:3001/api/health`. It reports whether a key is configured and which model is selected, never the key itself.

## Safety and limits

- Each chat request accepts up to 21 messages, up to 6,000 characters per message, and up to 24,000 characters in total.
- Supported attachments: JPEG, PNG, WebP, PDF, DOCX, and common text/code formats (TXT, CSV, JSON, Markdown, YAML, JavaScript/TypeScript, Python, and others). Limit: 4 files per message, 8 MB per image, 10 MB per PDF, 5 MB per DOCX, 1 MB per text file, and 12 MB of attachments per request.
- DOCX archives are checked before extraction; their uncompressed content is limited to 10 MB. Only the document text is sent to Gemini, not the Word file's embedded images or other media.
- The backend allows 20 chat requests per IP address per 15 minutes and limits JSON request bodies to 20 MB.
- Up to 20 recent prior messages are sent for follow-up context.
- The server does not save prompts or generated answers. Google processes requests under its Gemini API terms and data policies.
- Uploaded DOCX files are converted to text on the backend; text/code files are decoded as UTF-8. Images and PDFs are sent to Gemini as file content. The backend does not store uploaded files.
- Markdown is rendered without enabling raw HTML.

## Troubleshooting

- **API key needed:** Confirm `server/.env` exists, contains `GEMINI_API_KEY=...` with a valid key, and restart the backend. The health endpoint should show `"configured": true`.
- **Invalid key/model:** Check the key in Google AI Studio, confirm the Gemini API is available to your project, and choose a model supported for that key in `GEMINI_MODEL`.
- **Backend unavailable:** Keep the backend terminal running, start it from the `server` folder, and confirm port 3001 is available.
- **Frontend/API connection problems:** Start Vite from the `client` folder. The browser URL should be `http://127.0.0.1:5173`, one of the default allowed origins.
- **Rate limited:** Wait a few minutes and try again. Gemini API quotas can also vary by account and model.
- **Dependency/install errors:** Confirm Node.js is version 20.19+ or 22.12+, then run `npm install` separately in both `server` and `client`.

## Production build

From the `client` folder run:

```powershell
npm run build
```
