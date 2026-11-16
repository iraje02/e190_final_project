# Project: CheckFirst
CheckFirst is a phone-friendly web app for older adults: paste a suspicious message and get a clear, plain-language answer on whether it's a scam and what to do next.

Follow CONTRACT.md for what the app does.

## Stack
We use the course stack.
The API layer is handled by FastAPI and SQLModel in src/main.py.
The database is SQLite in the codespace and Postgres on Railway, from DATABASE_URL. The tables are made by create_all.
The page is plain HTML, CSS and JavaScript in src/web/, served by the same app, with no framework and no build step.
For deployment we use a Dockerfile at the repo root, on Railway, with Railway's Postgres.

## Rules
- Phone width first is the priority: large text, high contrast, since users are older adults.
- Semantic, accessible HTML. Every network call shows loading and error states.
- Secrets only in environment variables, never in code or git.
- Call the LLM only when a user acts, never on page load.
- Keep code simple; I must be able to explain every line.
- One task per branch; open a PR, don't push to main.
- Don't change CONTRACT.md unless I ask. Propose changes in a PR.

## Mistakes to avoid
- The LLM goes through Glassroom with the OpenAI SDK (base_url + GLASSROOM_API_KEY). Never use the Anthropic SDK directly
- Locally the app uses SQLite, so Postgres problems only show up on Railway. After adding or changing a database package, check it works with a Postgres URL before merging.
