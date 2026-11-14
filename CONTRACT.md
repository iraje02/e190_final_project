# CheckFirst — Contract

What CheckFirst does and how it's built. If the code and this file disagree, fix one of them on purpose, in a PR.

## The product

A phone-friendly web page that helps older adults (65+, living alone or far from family) check whether a text or email is a scam, and practice spotting scams safely, without giving any app access to their inbox or phone.

## Rules

1. Never say "safe." The best result is "No warning signs found."
2. If a message asks for money, gift cards, passwords, codes, or personal info, always tell the user to contact the company using a number they already trust.
3. Never store the text of a checked message. Only store the time, warning level, and a short topic (e.g. "Text about a package").
4. If the model or link check fails, say so in plain words. A failed link check never counts as clean.
5. Large text, high contrast, plain words, one main action per screen, usable at phone width.
6. Call the model and Safe Browsing only when the user taps a button, never on page load.
7. API keys only in environment variables, never in code, git, or the browser.

## Screens

- **Home:** two big buttons (Is this a scam? / Practice) and a list of recent checks.
- **Is this a scam?:** paste a message, tap **Check this message**, see the warning level, 2–3 reasons, and one safe next step.
- **Practice:** read a practice message, answer "Scam" or "Not a scam," see what you caught or missed.

Warning levels: **Likely scam**, **Be careful**, **No warning signs found**. If Safe Browsing flags a link, the result is always **Likely scam**.

## Device code

No accounts. The server makes a short code the first time someone visits, and the page saves it on the phone. Recent checks and practice progress belong to that code.

## API

| Route | What it does |
|---|---|
| `POST /api/devices` | Make a device code |
| `POST /api/check` | Check a pasted message: pull out links, check them with Safe Browsing, send everything to the model, save the result |
| `GET /api/checks?code=` | Recent checks for the home screen |
| `GET /api/practice/next?code=` | A new practice message, aimed at the signs this user misses most |
| `POST /api/practice/{id}/answer` | Mark an answer right or wrong and explain why |
| `GET /health` | Health check |

## Database

- **Device:** code, created_at
- **Check:** device_code, created_at, level, topic, input_tokens, output_tokens
- **PracticeItem:** device_code, message, is_scam, signs, explanation
- **PracticeAttempt:** item_id, device_code, answer, correct

## New API: Google Safe Browsing

Checks links in a message against Google's list of known phishing and malware sites. No match does not mean safe. Use hedged words ("suspected") and show "Advisory provided by Google."

## Stretch goals (only after the above works)

- **Forward an email** to a CheckFirst address (Mailgun inbound route), only if testing shows pasting is too hard.
- **Help with my phone:** step-by-step tech help.
- **Screenshot upload.**

## Done means

- Works on a phone, on cell data, at the live URL.
- Data is still there after a redeploy.
- Breaking either API key shows an honest error, not a broken page.
