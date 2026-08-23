import { DotLottie } from "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.30.0/+esm";

const DATE_PARAM = "date";
const ROTATE_PARAM = "rotate";
const CRUISES_API_URL = "https://t40n13yy36.execute-api.us-west-2.amazonaws.com/cruises";

const form = document.getElementById("date-form");
const dateInput = document.getElementById("date-input");
const manualDateBack = document.getElementById("manual-date-back");
const countdownEl = document.getElementById("countdown");
const changeDateBtn = document.getElementById("change-date");
const dateModal = document.getElementById("date-modal");
const modalBackdrop = document.getElementById("date-modal-backdrop");
const cruiseForm = document.getElementById("cruise-form");
const shipSelect = document.getElementById("ship-select");
const cruiseSelect = document.getElementById("cruise-select");
const cruiseLoadError = document.getElementById("cruise-load-error");
const manualDateToggle = document.getElementById("manual-date-toggle");
const settingsToggle = document.getElementById("settings-toggle");
const settingsModal = document.getElementById("settings-modal");
const settingsModalBackdrop = document.getElementById("settings-modal-backdrop");
const settingsBack = document.getElementById("settings-back");
const rotateCwBtn = document.getElementById("rotate-cw-btn");
const rotateCcwBtn = document.getElementById("rotate-ccw-btn");
const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

let timerId = null;
let cruises = [];
let cruisesLoadFailed = false;
let backgroundResize = null;
let dotLottieInstance = null;

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

function preloadEmojis() {
  for (let n = 1; n <= EMOJI_COUNT; n++) {
    const img = new Image();
    img.src = emojiPath(n);
  }
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

initRotationFromUrl();
initBackground();
initFromUrl();
preloadEmojis();
loadCruises();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  commitDateValue(dateInput.value);
});

cruiseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  commitDateValue(cruiseSelect.value);
});

shipSelect.addEventListener("change", () => {
  populateCruiseSelect(shipSelect.value);
});

manualDateToggle.addEventListener("click", () => {
  cruiseForm.hidden = true;
  form.hidden = false;
});

manualDateBack.addEventListener("click", () => {
  form.hidden = true;
  cruiseForm.hidden = false;
});

changeDateBtn.addEventListener("click", () => {
  showForm();
});

settingsToggle.addEventListener("click", openSettings);
settingsBack.addEventListener("click", closeSettings);
settingsModalBackdrop.addEventListener("click", closeSettings);

rotateCwBtn.addEventListener("click", () => {
  setRotation(currentRotation() === "cw" ? null : "cw");
});

rotateCcwBtn.addEventListener("click", () => {
  setRotation(currentRotation() === "ccw" ? null : "ccw");
});

modalBackdrop.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!settingsModal.hidden) {
    closeSettings();
  } else {
    closeModal();
  }
});

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(DATE_PARAM);

  if (raw && applyDate(raw)) {
    dateInput.value = raw;
  } else {
    showForm();
  }
}

function setUrlDate(value) {
  const params = new URLSearchParams(window.location.search);
  params.set(DATE_PARAM, value);
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

function applyDate(value) {
  const target = parseDateInput(value);
  if (!target || Number.isNaN(target.getTime())) return false;
  // target.setSeconds(target.getSeconds() - 1); // subtract 1 second to match the app functionality
  startCountdown(target);
  return true;
}

function commitDateValue(value) {
  if (!applyDate(value)) return;
  setUrlDate(value);
}

async function loadCruises() {
  try {
    const res = await fetch(CRUISES_API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const today = toLocalInputValue(new Date());
    cruises = data.filter((cruise) => cruise.departure_date >= today);
    populateShipSelect();
  } catch (err) {
    cruisesLoadFailed = true;
  }

  if (!dateModal.hidden) resetModalView();
}

function populateShipSelect() {
  const ships = [...new Set(cruises.map((cruise) => cruise.ship_name))].sort();
  shipSelect.innerHTML = '<option value="" disabled selected>Choose a ship</option>';
  for (const ship of ships) {
    const option = document.createElement("option");
    option.value = ship;
    option.textContent = ship;
    shipSelect.appendChild(option);
  }
  shipSelect.disabled = false;
}

function formatDepartureDate(dateStr) {
  return parseDateInput(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function populateCruiseSelect(shipName) {
  const shipCruises = cruises
    .filter((cruise) => cruise.ship_name === shipName)
    .sort((a, b) => a.departure_date.localeCompare(b.departure_date));

  cruiseSelect.innerHTML = '<option value="" disabled selected>Choose a departure date</option>';
  for (const cruise of shipCruises) {
    const option = document.createElement("option");
    option.value = cruise.departure_date;
    option.textContent = `${formatDepartureDate(cruise.departure_date)} — ${cruise.title}`;
    cruiseSelect.appendChild(option);
  }
  cruiseSelect.disabled = shipCruises.length === 0;
}

function resetModalView() {
  form.hidden = true;
  if (cruisesLoadFailed) {
    cruiseForm.hidden = true;
    cruiseLoadError.hidden = false;
    form.hidden = false;
  } else {
    cruiseForm.hidden = false;
    cruiseLoadError.hidden = true;
  }
}

function showForm() {
  dateModal.hidden = false;
  resetModalView();
}

function closeModal() {
  if (changeDateBtn.hidden) return; // no active countdown to return to
  dateModal.hidden = true;
}

function openSettings() {
  dateModal.hidden = true;
  settingsModal.hidden = false;
  updateRotateButtonStates();
}

function closeSettings() {
  settingsModal.hidden = true;
  dateModal.hidden = false;
}

function currentRotation() {
  if (document.body.classList.contains("rotate-cw")) return "cw";
  if (document.body.classList.contains("rotate-ccw")) return "ccw";
  return null;
}

function updateRotateButtonStates() {
  const rotation = currentRotation();
  rotateCwBtn.classList.toggle("is-active", rotation === "cw");
  rotateCcwBtn.classList.toggle("is-active", rotation === "ccw");
}

function applyRotation(value) {
  document.body.classList.remove("rotate-cw", "rotate-ccw");
  if (value === "cw" || value === "ccw") {
    document.body.classList.add(`rotate-${value}`);
  }
  if (backgroundResize) backgroundResize();
}

function setRotation(value) {
  applyRotation(value);
  updateRotateButtonStates();

  const params = new URLSearchParams(window.location.search);
  if (value) {
    params.set(ROTATE_PARAM, value);
  } else {
    params.delete(ROTATE_PARAM);
  }
  const qs = params.toString();
  const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  window.history.replaceState({}, "", newUrl);
}

function initRotationFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(ROTATE_PARAM);
  applyRotation(raw === "cw" || raw === "ccw" ? raw : null);
}

function startCountdown(target) {
  dateModal.hidden = true;
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

// DotLottie's own public resize() derives canvas.width/height from
// canvas.getBoundingClientRect(), which is the POST-rotation on-screen box —
// always the plain viewport size, never the swapped orientation we need while
// rotated. So instead of calling it, we set canvas.width/height ourselves and
// drive the WASM core's resize directly, keeping its internal render buffer
// in sync with what we just set (mixing the two desyncs the buffer's stride
// from the canvas's actual size and renders as scrambled pixels).
function syncBackgroundCanvas(canvas, dotLottie) {
  const rotated = currentRotation() !== null;
  const width = rotated ? window.innerHeight : window.innerWidth;
  const height = rotated ? window.innerWidth : window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const core = dotLottie && dotLottie._dotLottieCore;
  if (core && typeof core.resize === "function") {
    if (core.resize(canvas.width, canvas.height)) dotLottie._render();
  } else if (dotLottie) {
    dotLottie.resize();
  }
}

function initBackground() {
  const canvas = document.getElementById("background-canvas");

  const resize = () => syncBackgroundCanvas(canvas, dotLottieInstance);
  backgroundResize = resize;
  resize();

  const dotLottie = new DotLottie({
    canvas,
    src: "assets/animations/landing_background_cropped.lottie",
    autoplay: true,
    loop: true,
  });
  dotLottieInstance = dotLottie;

  // DotLottie resizes itself (from the not-yet-correct on-screen box) right
  // before its first frame; the "frame" event fires right after that resize
  // but before the render, so correcting here lands before anything is drawn.
  function handleFirstFrame() {
    dotLottie.removeEventListener("frame", handleFirstFrame);
    resize();
  }
  dotLottie.addEventListener("frame", handleFirstFrame);

  window.addEventListener("resize", resize);
}
