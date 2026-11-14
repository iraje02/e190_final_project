# Project: 
CheckFirst is a phone-friendly web app for older adults: paste or forward a suspicious message and get a clear, plain-language answer on whether it’s a scam and what to do next.

## Stack
Our stack for this lab if predefined.
The API layer is handled by FastAPI and SQLModel in src/main.py
The Database is handled by SQLite in the codespace while Postgres is on Railway, from DATABASE_URL. Additionally the database will alos have teh tables from create_all.
The page, they will be plain HTML, CSS and JavaScript in src/web/, being served by the same app and not a framework or a build step.
The deployment we use a Dockerfile at the repo root, on Railway, with Railway's Postgres

## Rules
- Phone width first is the priority large text, high contrast since users are older adults
- Semantic, accessible HTML. Every network call shows loading and error states.
- Secrets only in environment variables, never in code or git.
- Call the LLM only when a user acts, never on page load.
- Keep code simple; I must be able to explain every line.
- One task per branch open a PR, don't push to main.
- Never edit anything in CONTRACT.md

## Mistakes to avoid
empty for now