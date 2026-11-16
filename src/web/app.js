// ===== Screens =====
const screens = {
  home: document.getElementById("home-screen"),
  check: document.getElementById("check-screen"),
  result: document.getElementById("result-screen"),
};

function show(name) {
  for (const key in screens) {
    screens[key].hidden = key !== name;
  }
  window.scrollTo(0, 0);
}

document.getElementById("go-check").addEventListener("click", () => show("check"));
for (const button of document.querySelectorAll("[data-home]")) {
  button.addEventListener("click", () => show("home"));
}

// ===== Text-size slider =====
const slider = document.getElementById("textsize");

function setTextSize(px) {
  document.documentElement.style.setProperty("--text-size", px + "px");
}

slider.addEventListener("input", () => {
  setTextSize(slider.value);
  try { localStorage.setItem("textSize", slider.value); } catch (e) {}
});

// Use the size saved on this phone last time, if there is one.
try {
  const saved = localStorage.getItem("textSize");
  if (saved) {
    slider.value = saved;
    setTextSize(saved);
  }
} catch (e) {}

// ===== Paste button =====
const msg = document.getElementById("msg");
const pasteNotice = document.getElementById("paste-notice");

document.getElementById("paste-btn").addEventListener("click", async () => {
  pasteNotice.hidden = true;
  try {
    msg.value = await navigator.clipboard.readText();
  } catch (e) {
    // Some phones block reading the clipboard; tell them how to paste by hand.
    pasteNotice.hidden = false;
  }
});

// ===== Check this message =====
const checkBtn = document.getElementById("check-btn");
const checkBtnText = document.getElementById("check-btn-text");
const checkError = document.getElementById("check-error");

const LEVELS = {
  likely_scam: {
    boxClass: "result-likely",
    kicker: "Result · Likely scam",
    headline: "This looks like a scam",
    line: "Please don't tap any links or reply.",
  },
  be_careful: {
    boxClass: "result-careful",
    kicker: "Result · Be careful",
    headline: "Be careful with this one",
    line: "Check before you do anything it asks.",
  },
  no_signs_found: {
    boxClass: "result-none",
    kicker: "Result · No signs found",
    headline: "No warning signs found",
    line: "That doesn't mean it's safe for sure.",
  },
};

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

  // Loading state: the button says "Checking…" and can't be tapped twice.
  checkBtn.disabled = true;
  checkBtnText.textContent = "Checking…";

  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(typeof data.detail === "string" ? data.detail : "");
    }
    showResult(message, data);
  } catch (e) {
    showError(e.message || "Sorry, I couldn't check this message right now. Please try again in a minute. Until then, don't tap any links or reply.");
  } finally {
    checkBtn.disabled = false;
    checkBtnText.textContent = "Check this message";
  }
});

// ===== Result =====
function showResult(message, data) {
  const level = LEVELS[data.level];
  document.getElementById("result-box").className = "result " + level.boxClass;
  document.getElementById("result-kicker").textContent = level.kicker;
  document.getElementById("result-headline").textContent = level.headline;
  document.getElementById("result-line").textContent = level.line;
  document.getElementById("pasted").textContent = message;

  const list = document.getElementById("reasons");
  list.innerHTML = "";
  data.reasons.forEach((reason, i) => {
    const item = document.createElement("li");
    const num = document.createElement("span");
    num.className = "num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = String(i + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.textContent = reason;
    item.append(num, text);
    list.append(item);
  });

  document.getElementById("next-step").textContent = data.next_step;
  show("result");
}

document.getElementById("again-btn").addEventListener("click", () => {
  msg.value = "";
  show("check");
});
