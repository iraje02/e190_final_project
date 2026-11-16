// ===== 1. Screens =====
// Each screen is a <main id="view-..."> in index.html. Only one is shown at a time.
const VIEWS = ["home", "check", "result", "practice"];

function go(name, scrollId) {
  for (const view of VIEWS) {
    document.getElementById("view-" + view).hidden = view !== name;
  }

  // Outline the nav button for the screen we're on (but not "How it works", which only scrolls).
  for (const button of document.querySelectorAll(".nav-links button")) {
    if (button.dataset.go === name && !button.dataset.scroll) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }

  // Opening the Practice screen starts a new round of 5.
  if (name === "practice") startPractice();

  // Scroll to a section if one was asked for, otherwise to the top.
  if (scrollId) {
    document.getElementById(scrollId).scrollIntoView({ behavior: "smooth" });
  } else {
    window.scrollTo(0, 0);
  }
}

// Any button with data-go="screen" or data-scroll="section-id" moves around the page.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-go], [data-scroll]");
  if (button) {
    go(button.dataset.go || "home", button.dataset.scroll);
  }
});

// ===== 2. Text size =====
// One slider shows on phones and one on laptops. Moving either changes the
// whole page's text size and keeps the other slider in step.
const sliders = [document.getElementById("size-d"), document.getElementById("size-m")];

function setTextSize(px) {
  document.documentElement.style.setProperty("--text-size", px + "px");
  for (const slider of sliders) {
    slider.value = px;
  }
}

for (const slider of sliders) {
  slider.addEventListener("input", () => {
    setTextSize(slider.value);
    try { localStorage.setItem("textSize", slider.value); } catch (e) {}
  });
}

// Use the size saved on this device last time, if there is one.
try {
  const saved = localStorage.getItem("textSize");
  if (saved) setTextSize(saved);
} catch (e) {}

// ===== 3. Text message / Email tabs =====
const tabs = document.querySelectorAll(".tab");

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      const isThisOne = other === tab;
      other.setAttribute("aria-selected", String(isThisOne));
      document.getElementById(other.getAttribute("aria-controls")).hidden = !isThisOne;
    }
  });
}

// ===== 4. Paste button =====
const msg = document.getElementById("msg");
const pasteNote = document.getElementById("paste-note");

document.getElementById("paste-btn").addEventListener("click", async () => {
  try {
    msg.value = await navigator.clipboard.readText();
    pasteNote.hidden = true;
  } catch (e) {
    // Some phones block reading the clipboard, so explain how to paste by hand.
    pasteNote.hidden = false;
  }
});

// Once there's text in the box, the "how to paste" note isn't needed.
msg.addEventListener("input", () => {
  if (msg.value.trim()) pasteNote.hidden = true;
});

// ===== 5. Check this message =====
const CHECK_FAILED = "Sorry, I couldn't check this message right now. Please try again in a minute. Until then, don't tap any links or reply.";
const checkBtn = document.getElementById("check-btn");
const checkLabel = document.getElementById("check-label");
const checkError = document.getElementById("check-error");

function showError(text) {
  checkError.textContent = text;
  checkError.hidden = false;
}

checkBtn.addEventListener("click", async () => {
  checkError.hidden = true;
  const message = msg.value.trim();
  if (!message) {
    showError("Please paste a message first.");
    return;
  }

  // Loading state: the button says "Checking…" and can't be tapped again.
  checkBtn.disabled = true;
  checkLabel.textContent = "Checking…";

  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, code: deviceCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      // The server sends its plain-language error in "detail".
      showError(typeof data.detail === "string" ? data.detail : CHECK_FAILED);
      return;
    }
    showResult(message, data);
    loadLastCheck();  // so the Home screen shows this check next time
  } catch (e) {
    // No internet, or the server didn't answer.
    showError(CHECK_FAILED);
  } finally {
    checkBtn.disabled = false;
    checkLabel.textContent = "Check this message";
  }
});

// ===== 6. Result =====
// What the verdict card says for each level the API can return.
const LEVELS = {
  likely_scam: {
    className: "v-likely",
    icon: "warning",
    reasonsTitle: "Warning signs found",
    title: "This looks like a scam",
    sub: "Please don't tap any links or reply.",
  },
  be_careful: {
    className: "v-careful",
    icon: "warning",
    reasonsTitle: "Warning signs found",
    title: "Be careful with this one",
    sub: "Check before you do anything it asks.",
  },
  no_signs_found: {
    className: "v-none",
    icon: "search",
    reasonsTitle: "What I looked at",
    title: "No warning signs found",
    sub: "That doesn't mean it's safe for sure.",
  },
};

function showResult(message, data) {
  const level = LEVELS[data.level];
  document.getElementById("verdict").className = "verdict-card " + level.className;
  // Show the triangle or the magnifying glass, whichever this level uses.
  document.getElementById("icon-warning").hidden = level.icon !== "warning";
  document.getElementById("icon-search").hidden = level.icon !== "search";
  document.getElementById("verdict-title").textContent = level.title;
  document.getElementById("verdict-sub").textContent = level.sub;
  document.getElementById("reasons-title").textContent = level.reasonsTitle;

  // One numbered row per reason. textContent keeps the text plain (no HTML from outside).
  const list = document.getElementById("reasons");
  list.innerHTML = "";
  data.reasons.forEach((reason, i) => {
    const item = document.createElement("li");
    item.className = "reason";
    const number = document.createElement("span");
    number.className = "n";
    number.textContent = i + 1;
    const text = document.createElement("span");
    text.textContent = reason;
    item.append(number, text);
    list.append(item);
  });

  document.getElementById("next-step").textContent = data.next_step;
  document.getElementById("pasted").textContent = message;
  showLinks(data.links, data.link_check);
  go("result");
}

// ===== 6b. Link check (Google Safe Browsing) =====
// The words and pill style for each result the API can return.
const PILLS = {
  suspected_phishing: { text: "Suspected phishing", className: "pill" },
  suspected_malware: { text: "Suspected malware", className: "pill" },
  no_match: { text: "Not on Google's list", className: "pill pill-sage" },
};

function showLinks(links, linkCheck) {
  // No links in the message: hide the whole link-check area.
  document.getElementById("link-check").hidden = links.length === 0;

  // If Google couldn't be reached, say so instead of showing any results.
  const unavailable = linkCheck === "unavailable";
  document.getElementById("link-unavailable").hidden = !unavailable;
  document.getElementById("link-credit").hidden = unavailable;

  // One row per link: "Link check: <link>" and its pill.
  const rows = document.getElementById("link-rows");
  rows.innerHTML = "";
  if (unavailable) return;
  for (const link of links) {
    const pill = PILLS[link.result];
    const row = document.createElement("div");
    row.className = "links-check";
    const label = document.createElement("span");
    const url = document.createElement("strong");
    url.textContent = link.url;
    label.append("Link check: ", url);
    const badge = document.createElement("span");
    badge.className = pill.className;
    badge.textContent = pill.text;
    row.append(label, badge);
    rows.append(row);
  }
}

// ===== 7. Check another message =====
for (const button of document.querySelectorAll("[data-again]")) {
  button.addEventListener("click", () => {
    msg.value = "";
    checkError.hidden = true;
    pasteNote.hidden = true;
    go("check");
  });
}

// ===== 8. Practice =====
// One round is 5 messages. We remember which ones were shown so none repeat in a round.
const ROUND_LENGTH = 5;
let seenIds = [];    // ids of messages shown this round
let questionNumber = 0;  // which message we're on (1 to 5)
let score = 0;       // how many they got right
let currentId = null;  // id of the message on screen

const practiceLoading = document.getElementById("practice-loading");
const practiceErrorBox = document.getElementById("practice-error-box");
const practiceQuestion = document.getElementById("practice-question");
const practiceChoices = document.getElementById("practice-choices");
const practiceFeedback = document.getElementById("practice-feedback");
const practiceScore = document.getElementById("practice-score");
const answerError = document.getElementById("answer-error");
const answerButtons = document.querySelectorAll("[data-answer]");

// Show one part of the practice screen and hide the others.
function showPracticePart(part) {
  practiceLoading.hidden = part !== "loading";
  practiceErrorBox.hidden = part !== "error";
  practiceQuestion.hidden = part !== "question";
  practiceScore.hidden = part !== "score";
}

function startPractice() {
  seenIds = [];
  questionNumber = 0;
  score = 0;
  loadNextMessage();
}

async function loadNextMessage() {
  showPracticePart("loading");
  try {
    const response = await fetch("/api/practice/next?exclude=" + seenIds.join(","));
    if (!response.ok) throw new Error();
    const example = await response.json();
    questionNumber += 1;
    seenIds.push(example.id);
    showMessage(example);
  } catch (e) {
    document.getElementById("practice-error").textContent =
      "Sorry, I couldn't load a practice message right now. Please try again in a minute.";
    showPracticePart("error");
  }
}

document.getElementById("practice-retry").addEventListener("click", loadNextMessage);

// Put the message on screen, styled as a text or an email.
function showMessage(example) {
  currentId = example.id;
  document.getElementById("practice-progress").textContent = "Practice · " + questionNumber + " of " + ROUND_LENGTH;

  const isEmail = example.kind === "email";
  document.getElementById("practice-kind").textContent = isEmail ? "Email" : "Text message";
  document.getElementById("practice-sms").hidden = isEmail;
  document.getElementById("practice-email").hidden = !isEmail;
  if (isEmail) {
    document.getElementById("email-from").textContent = example.from;
    document.getElementById("email-subject").textContent = example.subject;
    document.getElementById("email-message").textContent = example.message;
  } else {
    document.getElementById("sms-from").textContent = example.from;
    document.getElementById("sms-message").textContent = example.message;
  }

  // Fresh question: answer buttons on, feedback off.
  practiceChoices.hidden = false;
  practiceFeedback.hidden = true;
  answerError.hidden = true;
  for (const button of answerButtons) button.disabled = false;
  showPracticePart("question");
  window.scrollTo(0, 0);
}

// "Scam" or "Not a scam" was tapped.
for (const button of answerButtons) {
  button.addEventListener("click", async () => {
    answerError.hidden = true;
    for (const b of answerButtons) b.disabled = true;  // loading: no double taps
    try {
      const response = await fetch("/api/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId, answer: button.dataset.answer, code: deviceCode }),
      });
      if (!response.ok) throw new Error();
      showFeedback(await response.json());
    } catch (e) {
      answerError.textContent = "Sorry, I couldn't check your answer right now. Please try again.";
      answerError.hidden = false;
      for (const b of answerButtons) b.disabled = false;
    }
  });
}

// Show whether they were right, what gave it away, and why.
function showFeedback(data) {
  if (data.correct) score += 1;

  practiceFeedback.className = "feedback " + (data.correct ? "feedback-right" : "feedback-wrong");
  document.getElementById("feedback-title").textContent = data.correct ? "You got it!" : "Not quite";
  // Say "This one is a scam." for scams. For real messages the explanation already starts with "This one is real."
  const truth = document.getElementById("feedback-truth");
  truth.textContent = "This one is a scam.";
  truth.hidden = !data.is_scam;

  // One chip per warning sign. Real messages have none, so the box is hidden.
  const signs = document.getElementById("feedback-signs");
  signs.innerHTML = "";
  for (const sign of data.signs) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = sign;
    signs.append(chip);
  }
  document.getElementById("feedback-signs-box").hidden = data.signs.length === 0;

  document.getElementById("feedback-explanation").textContent = data.explanation;
  document.getElementById("practice-next").textContent =
    questionNumber < ROUND_LENGTH ? "Next message" : "See my score";

  practiceChoices.hidden = true;
  practiceFeedback.hidden = false;
}

// "Next message", or the score after the 5th.
document.getElementById("practice-next").addEventListener("click", () => {
  if (questionNumber < ROUND_LENGTH) {
    loadNextMessage();
  } else {
    showScore();
  }
});

function showScore() {
  document.getElementById("practice-progress").textContent = "Practice";
  document.getElementById("score-title").textContent = "You got " + score + " of " + ROUND_LENGTH + " right";
  document.getElementById("score-note").textContent =
    score === ROUND_LENGTH
      ? "Great job. You spotted every one."
      : "Every message you practice makes the next real one easier to spot.";
  showPracticePart("score");
  loadProgress();
  window.scrollTo(0, 0);
}

document.getElementById("practice-again").addEventListener("click", startPractice);

// ===== 9. Device code, last check and all-time progress =====
// No accounts: the server gives this phone a short code, and we keep it in localStorage.
// It's sent with every check and practice answer so history belongs to this phone.
let deviceCode = null;

async function makeNewDeviceCode() {
  try {
    const response = await fetch("/api/devices", { method: "POST" });
    if (!response.ok) throw new Error();
    deviceCode = (await response.json()).code;
    try { localStorage.setItem("deviceCode", deviceCode); } catch (e) {}
  } catch (e) {
    // Checks and practice still work without a code; they just aren't saved.
    deviceCode = null;
  }
}

// Words for each level on the "Last check" line, and the pill colour to use.
const LAST_LEVELS = {
  likely_scam: { text: "Likely scam", className: "pill" },
  be_careful: { text: "Be careful", className: "pill pill-ochre" },
  no_signs_found: { text: "No warning signs found", className: "pill pill-sage" },
};

// Turn a time into "today", "yesterday", "3 days ago" or a date.
function whenText(iso) {
  const then = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThen = new Date(then);
  startOfThen.setHours(0, 0, 0, 0);
  const days = Math.round((startOfToday - startOfThen) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return days + " days ago";
  return then.toLocaleDateString();
}

// Show the "Last check" line on Home. It's a small extra, so while it loads or if it
// fails, the line just stays hidden. Returns false only if the server didn't know our code.
async function loadLastCheck() {
  const line = document.getElementById("last-check");
  if (!deviceCode) {
    line.hidden = true;
    return true;
  }
  try {
    const response = await fetch("/api/checks/last?code=" + encodeURIComponent(deviceCode));
    if (response.status === 404) return false;  // unknown code
    if (!response.ok) throw new Error();
    const last = await response.json();
    if (!last) {
      line.hidden = true;  // no checks yet
      return true;
    }
    const level = LAST_LEVELS[last.level];
    document.getElementById("last-topic").textContent = last.topic;
    document.getElementById("last-when").textContent = whenText(last.when);
    const pill = document.getElementById("last-level");
    pill.textContent = level.text;
    pill.className = level.className;
    line.hidden = false;
  } catch (e) {
    line.hidden = true;
  }
  return true;
}

// All-time practice results on the score screen.
async function loadProgress() {
  const status = document.getElementById("all-time-status");
  const scoreLine = document.getElementById("all-time-score");
  const missedLine = document.getElementById("all-time-missed");
  scoreLine.hidden = true;
  missedLine.hidden = true;
  if (!deviceCode) {
    status.hidden = true;
    return;
  }

  status.textContent = "Loading your all-time score…";
  status.hidden = false;
  try {
    const response = await fetch("/api/progress?code=" + encodeURIComponent(deviceCode));
    if (!response.ok) throw new Error();
    const progress = await response.json();
    status.hidden = true;
    scoreLine.innerHTML = "";
    scoreLine.append("All time: ");
    const strong = document.createElement("strong");
    strong.textContent = progress.correct + " of " + progress.attempted + " right";
    scoreLine.append(strong);
    scoreLine.hidden = false;
    if (progress.most_missed) {
      missedLine.textContent = "You most often miss: " + progress.most_missed + ".";
      missedLine.hidden = false;
    }
  } catch (e) {
    status.textContent = "Sorry, I couldn't load your all-time score right now.";
  }
}

// When the page opens: use the saved code if the server knows it, otherwise get a new one.
async function setUpDevice() {
  try { deviceCode = localStorage.getItem("deviceCode"); } catch (e) {}
  if (deviceCode && await loadLastCheck()) return;
  await makeNewDeviceCode();
}

setUpDevice();
