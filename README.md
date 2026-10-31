# Cold Outreach - Dashboard

Personal dashboard for the outreach backend: today's drafts, mark them sent/replied, good-fit jobs to apply to manually,
run history with errors, and LLM / contact-finder usage.

```bash
npm install
cp .env.example .env.local   # VITE_API_URL=http://localhost:8000
npm run dev                  # http://localhost:5173, log in with the backend's API_KEY
```

Deploy on Vercel: import the repo, set `VITE_API_URL` to the Render URL, and add the Vercel URL to the backend's
`FRONTEND_ORIGINS`. The API key is typed in on first visit and kept in this browser's localStorage only.
