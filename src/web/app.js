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
      body: JSON.stringify({ message: message }),
    });
    const data = await response.json();
    if (!response.ok) {
      // The server sends its plain-language error in "detail".
      showError(typeof data.detail === "string" ? data.detail : CHECK_FAILED);
      return;
    }
    showResult(message, data);
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
  go("result");
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
