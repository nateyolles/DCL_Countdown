import { DotLottie } from "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.30.0/+esm";

const DATE_PARAM = "date";

const form = document.getElementById("date-form");
const dateInput = document.getElementById("date-input");
const countdownEl = document.getElementById("countdown");
const changeDateBtn = document.getElementById("change-date");
const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

let timerId = null;

const EMOJI_COUNT = 64;
const zeroEmojiAssignments = new Map();

function emojiPath(n) {
  return `assets/emoji/countdownEmoji_${String(n).padStart(2, "0")}.png`;
}

function pickEmoji(excluded) {
  let n;
  do {
    n = Math.floor(Math.random() * EMOJI_COUNT) + 1;
  } while (excluded.has(n));
  return n;
}

function ensureDigitSlots(unitEl, count) {
  while (unitEl.children.length < count) {
    const span = document.createElement("span");
    span.className = "digit";
    unitEl.appendChild(span);
  }
  while (unitEl.children.length > count) {
    unitEl.removeChild(unitEl.lastChild);
  }
}

// Must match the .digit-leaf animation-duration values in style.css.
const FLIP_PHASE_MS = 160;

function makeGlyph() {
  const span = document.createElement("span");
  span.className = "digit-glyph";
  return span;
}

function buildDigitTile(el) {
  el.innerHTML = "";
  const top = document.createElement("span");
  top.className = "digit-half digit-top";
  top.appendChild(makeGlyph());

  const bottom = document.createElement("span");
  bottom.className = "digit-half digit-bottom";
  bottom.appendChild(makeGlyph());

  const leafTop = document.createElement("span");
  leafTop.className = "digit-leaf digit-leaf--top";
  leafTop.appendChild(makeGlyph());

  const leafBottom = document.createElement("span");
  leafBottom.className = "digit-leaf digit-leaf--bottom";
  leafBottom.appendChild(makeGlyph());

  el.append(top, bottom, leafTop, leafBottom);
}

function setGlyph(glyphEl, content) {
  if (content.type === "emoji") {
    glyphEl.classList.add("digit-glyph--emoji");
    let img = glyphEl.querySelector("img");
    if (!img) {
      glyphEl.textContent = "";
      img = document.createElement("img");
      img.alt = "";
      glyphEl.appendChild(img);
    }
    img.src = content.src;
  } else {
    glyphEl.classList.remove("digit-glyph--emoji");
    glyphEl.replaceChildren(document.createTextNode(content.value));
  }
}

function contentKey(content) {
  return content.type === "emoji" ? `emoji:${content.src}` : `text:${content.value}`;
}

function playLeafFlip(leafEl) {
  leafEl.classList.remove("is-flipping");
  void leafEl.offsetWidth;
  leafEl.classList.add("is-flipping");
}

function updateDigitTile(el, content) {
  if (!el.dataset.built) {
    el.dataset.built = "1";
    buildDigitTile(el);
  }

  const key = contentKey(content);
  if (el.dataset.key === key) return;
  const isFirst = el.dataset.key === undefined;
  el.dataset.key = key;

  const topGlyph = el.querySelector(".digit-top .digit-glyph");
  const bottomGlyph = el.querySelector(".digit-bottom .digit-glyph");

  if (isFirst) {
    setGlyph(topGlyph, content);
    setGlyph(bottomGlyph, content);
    return;
  }

  const leafTop = el.querySelector(".digit-leaf--top");
  const leafBottom = el.querySelector(".digit-leaf--bottom");

  leafTop.replaceChildren(topGlyph.cloneNode(true));
  setGlyph(topGlyph, content);
  playLeafFlip(leafTop);

  setTimeout(() => {
    leafTop.classList.remove("is-flipping");
    setGlyph(leafBottom.querySelector(".digit-glyph"), content);
    playLeafFlip(leafBottom);

    setTimeout(() => {
      leafBottom.classList.remove("is-flipping");
      setGlyph(bottomGlyph, content);
    }, FLIP_PHASE_MS);
  }, FLIP_PHASE_MS);
}

function renderDigits(unitEl, slotPrefix, digitStr, usedEmojis) {
  ensureDigitSlots(unitEl, digitStr.length);
  const digitEls = unitEl.querySelectorAll(".digit");

  digitStr.split("").forEach((char, i) => {
    const slotKey = `${slotPrefix}-${i}`;
    const el = digitEls[i];

    if (char !== "0") {
      zeroEmojiAssignments.delete(slotKey);
      updateDigitTile(el, { type: "text", value: char });
      return;
    }

    let assigned = zeroEmojiAssignments.get(slotKey);
    if (!assigned || usedEmojis.has(assigned)) {
      assigned = pickEmoji(usedEmojis);
      zeroEmojiAssignments.set(slotKey, assigned);
    }
    usedEmojis.add(assigned);

    updateDigitTile(el, { type: "emoji", src: emojiPath(assigned) });
  });
}

initBackground();
initFromUrl();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const target = parseDateInput(dateInput.value);
  if (!target || Number.isNaN(target.getTime())) return;
  target.setSeconds(target.getSeconds() - 1); // subtract 1 second to match the app functionality
  setUrlDate(target);
  startCountdown(target);
});

changeDateBtn.addEventListener("click", () => {
  stopCountdown();
  showForm();
});

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(DATE_PARAM);
  const target = raw ? new Date(raw) : null;

  if (target && !Number.isNaN(target.getTime())) {
    dateInput.value = toLocalInputValue(target);
    startCountdown(target);
  } else {
    showForm();
  }
}

function setUrlDate(date) {
  const params = new URLSearchParams(window.location.search);
  params.set(DATE_PARAM, date.toISOString());
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function toLocalInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function showForm() {
  form.hidden = false;
  countdownEl.hidden = true;
  changeDateBtn.hidden = true;
}

function startCountdown(target) {
  form.hidden = true;
  changeDateBtn.hidden = false;
  stopCountdown();
  tick(target);
  timerId = setInterval(() => tick(target), 1000);
}

function stopCountdown() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function tick(target) {
  const diff = target.getTime() - Date.now();

  if (diff <= 0) {
    stopCountdown();
  }

  countdownEl.hidden = false;

  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const usedEmojis = new Set();
  renderDigits(daysEl, "days", String(days).padStart(2, "0"), usedEmojis);
  renderDigits(hoursEl, "hours", String(hours).padStart(2, "0"), usedEmojis);
  renderDigits(minutesEl, "minutes", String(minutes).padStart(2, "0"), usedEmojis);
  renderDigits(secondsEl, "seconds", String(seconds).padStart(2, "0"), usedEmojis);
}

function initBackground() {
  const canvas = document.getElementById("background-canvas");

  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  };
  resize();

  const dotLottie = new DotLottie({
    canvas,
    src: "assets/animations/landing_background_lottie.json",
    autoplay: true,
    loop: true,
  });

  window.addEventListener("resize", () => {
    resize();
    dotLottie.resize();
  });
}
