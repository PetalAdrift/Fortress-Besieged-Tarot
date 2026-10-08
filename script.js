console.log(
  "Credits:\n Webpage coding by Hoyii 🌸, Zhihan 🕊️, and the AI chatbot 🤖.\n Background music by 歌声私有化 @music_privatized 🕶️.\n Graphics by Hoyii, Kristin 🐈‍⬛, 安喵喵 🐱, and Yuyuan 👩.\n Sound effect (card-sounds) by \"henrygillard (Freesound)\" at pixabay."
);

// ---------- DOM ----------
const bgm = document.getElementById("bgm");
const flipSound = document.getElementById("flipSound");
const soundBtn = document.getElementById("soundBtn");
const canvas = document.getElementById("seedCanvas");
const ctx = canvas.getContext("2d");
const seedStage = document.getElementById("seedStage");
const seedWrapper = document.getElementById("seedWrapper");
const seedFeedback = document.getElementById("seedFeedback");
const container = document.getElementById("container");
const selectionStatus = document.getElementById("selectionStatus");
const readingControls = document.getElementById("readingControls");
const flipBtn = document.getElementById("flipBtn");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactLayout = window.matchMedia("(max-width: 768px)");
const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");

// ---------- Audio ----------
let soundEnabled = false;
bgm.volume = 0.5;
flipSound.volume = 0.75;

async function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  soundBtn.setAttribute("aria-pressed", String(enabled));
  soundBtn.textContent = enabled ? "Sound: On" : "Sound: Off";

  if (!enabled) {
    bgm.pause();
    return;
  }

  try {
    await bgm.play();
  } catch (err) {
    soundEnabled = false;
    soundBtn.setAttribute("aria-pressed", "false");
    soundBtn.textContent = "Sound: Off";
    seedFeedback.textContent = "Your browser blocked audio. Tap Sound again to retry.";
    console.log("BGM playback failed:", err);
  }
}

soundBtn.addEventListener("click", () => setSoundEnabled(!soundEnabled));

function playFlipSound() {
  if (!soundEnabled) return;
  flipSound.currentTime = 0;
  flipSound.play().catch((err) => console.log("Flip sound failed:", err));
}

// ---------- Seed drawing ----------
let drawing = false;
let activePointerId = null;
let drawPointsCount = 0;
let drawDistance = 0;
let previousPoint = null;
let rollingSeed = 2166136261;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function mixSeed(x, y, count) {
  const values = [Math.round(x * 10), Math.round(y * 10), count];
  values.forEach((value) => {
    rollingSeed ^= value;
    rollingSeed = Math.imul(rollingSeed, 16777619) >>> 0;
  });
}

function startDrawing(e) {
  if (drawing) return;
  e.preventDefault();

  drawing = true;
  activePointerId = e.pointerId;
  drawPointsCount = 0;
  drawDistance = 0;
  rollingSeed = 2166136261;
  seedFeedback.textContent = "";

  if (canvas.setPointerCapture) {
    canvas.setPointerCapture(e.pointerId);
  }

  const pos = getPos(e);
  previousPoint = pos;
  mixSeed(pos.x, pos.y, 0);

  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!drawing || e.pointerId !== activePointerId) return;
  e.preventDefault();

  const pos = getPos(e);
  drawPointsCount += 1;
  drawDistance += previousPoint
    ? Math.hypot(pos.x - previousPoint.x, pos.y - previousPoint.y)
    : 0;

  mixSeed(pos.x, pos.y, drawPointsCount);

  const hue = (drawPointsCount * 7) % 360;
  const stroke = `hsl(${hue}, 100%, 60%)`;
  const lineWidth = Math.min(10, 1.6 + drawDistance / 40);
  const dx = pos.x - previousPoint.x;
  const dy = pos.y - previousPoint.y;
  const segmentLength = Math.hypot(dx, dy);

  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = Math.min(7, 2 + drawDistance / 80);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(previousPoint.x, previousPoint.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  if (segmentLength > 0.01) {
    const ux = dx / segmentLength;
    const uy = dy / segmentLength;
    const px = -uy;
    const py = ux;
    const baseX = pos.x - ux * lineWidth * 0.18;
    const baseY = pos.y - uy * lineWidth * 0.18;
    const halfBase = lineWidth * 0.52;
    const tipX = pos.x + ux * lineWidth * 0.78;
    const tipY = pos.y + uy * lineWidth * 0.78;

    ctx.beginPath();
    ctx.moveTo(baseX + px * halfBase, baseY + py * halfBase);
    ctx.lineTo(baseX - px * halfBase, baseY - py * halfBase);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  previousPoint = pos;
}

function stopDrawing(e) {
  if (!drawing || e.pointerId !== activePointerId) return;
  e.preventDefault();

  drawing = false;
  activePointerId = null;
  previousPoint = null;
  ctx.beginPath();

  if (drawPointsCount < 4 || drawDistance < 24) {
    seedFeedback.textContent = "Draw a slightly longer mark to begin the reading.";
    return;
  }

  onDrawFinish(rollingSeed >>> 0);
}

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", (e) => {
  if (!drawing || e.pointerId !== activePointerId) return;
  drawing = false;
  activePointerId = null;
  previousPoint = null;
  ctx.beginPath();
  seedFeedback.textContent = "Drawing cancelled. Try again when you are ready.";
});

// ---------- Seeded random ----------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Card setup ----------
const cardCount = 78;
const maxSelection = 3;
const cardsPerRow = 26;
const selectedIndices = new Set();
const order = Array.from({ length: cardCount }, (_, i) => i);
const cardOrientation = {};
let isRestartMode = false;

function shuffleWithSeed(rng) {
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (let i = 0; i < cardCount; i += 1) {
    cardOrientation[i] = rng() < 0.5;
  }
}

function isReadingMode() {
  return container.classList.contains("revealed-mode");
}

function getCardData(index) {
  return window.cardTextData ? window.cardTextData[index] : null;
}

function updateCardAccessibility(card) {
  const idx = Number(card.dataset.index);

  if (isReadingMode()) {
    const data = getCardData(idx);
    const orientation = cardOrientation[idx] ? "upright" : "reversed";
    const name = data?.name || "Tarot card";
    const expanded = card.classList.contains("show-info");
    card.setAttribute(
      "aria-label",
      `${name}, ${orientation}. ${expanded ? "Interpretation open." : "Tap to read interpretation."}`
    );
    card.setAttribute("aria-expanded", String(expanded));
    card.removeAttribute("aria-pressed");
    return;
  }

  const selected = selectedIndices.has(idx);
  card.setAttribute("aria-pressed", String(selected));
  card.removeAttribute("aria-expanded");
  const orientation = cardOrientation[idx] ? "upright" : "reversed";
  card.setAttribute(
    "aria-label",
    `Tarot card ${Number(card.dataset.position) + 1} of ${cardCount}, ${orientation}, ${selected ? "selected" : "not selected"}. Double-click or press R to invert.`
  );
}

function populateCardText() {
  document.querySelectorAll(".card").forEach((card) => {
    const idx = Number(card.dataset.index);
    const data = getCardData(idx);
    if (!data) return;

    const back = card.querySelector(".back");
    const nameDiv = back.querySelector(".name");
    const uprightDiv = back.querySelector(".hover-upright");
    const reversedDiv = back.querySelector(".hover-reversed");
    const isReversed = !cardOrientation[idx];

    nameDiv.textContent = data.name || "";
    uprightDiv.textContent = data.upright || "";
    reversedDiv.textContent = data.reversed || "";
    uprightDiv.dataset.active = isReversed ? "false" : "true";
    reversedDiv.dataset.active = isReversed ? "true" : "false";

    updateCardAccessibility(card);
  });
}


function syncCardOrientation(card, animate = false) {
  const idx = Number(card.dataset.index);
  const isReversed = !cardOrientation[idx];

  // This class controls which interpretation/text orientation is active.
  // The visible rotation angle itself is kept separately so every inversion
  // can continue in the same direction instead of alternating directions.
  card.classList.toggle("orientation-reversed", isReversed);

  const uprightDiv = card.querySelector(".hover-upright");
  const reversedDiv = card.querySelector(".hover-reversed");

  if (uprightDiv) uprightDiv.dataset.active = isReversed ? "false" : "true";
  if (reversedDiv) reversedDiv.dataset.active = isReversed ? "true" : "false";

  const frame = card.querySelector(".orientation-frame");

  if (!animate && frame) {
    // Establish the seeded starting orientation before the card is painted.
    const initialAngle = isReversed ? 180 : 0;
    card.dataset.orientationAngle = String(initialAngle);
    frame.style.transform = `rotateZ(${initialAngle}deg)`;
  }

  updateCardAccessibility(card);
}

function toggleCardOrientation(card) {
  if (isReadingMode()) return;

  const idx = Number(card.dataset.index);
  const frame = card.querySelector(".orientation-frame");

  // Toggle the real tarot orientation first.
  cardOrientation[idx] = !cardOrientation[idx];

  // Always advance the visual angle by +180 degrees. Because the transform
  // function and angle remain continuous (0 -> 180 -> 360 -> 540 ...), both
  // upright-to-reversed and reversed-to-upright rotate in the same direction.
  const currentAngle = Number(card.dataset.orientationAngle || 0);
  const nextAngle = currentAngle + 180;
  card.dataset.orientationAngle = String(nextAngle);

  if (frame) {
    frame.style.transform = `rotateZ(${nextAngle}deg)`;
  }

  syncCardOrientation(card, true);
}

// Native mouse double-clicks fire two ordinary click events first, so the
// selection state naturally returns to where it started. The double-click
// itself only changes orientation.
let suppressNativeDoubleClickUntil = 0;

function handleCardDoubleClick(e) {
  if (isReadingMode()) return;

  // Some touch browsers synthesize dblclick after our pointer-based double tap.
  if (performance.now() < suppressNativeDoubleClickUntil) return;

  e.preventDefault();
  e.stopPropagation();
  toggleCardOrientation(e.currentTarget);
}

// Touch devices do not consistently emit dblclick, so detect a second tap on
// the same card within a short window. The two generated click events still
// cancel each other's selection change, leaving only the orientation toggle.
let lastTouchTapCard = null;
let lastTouchTapTime = 0;
const doubleTapWindow = 340;

function handleCardPointerUp(e) {
  if (isReadingMode() || e.pointerType !== "touch") return;

  const now = performance.now();
  const card = e.currentTarget;

  if (lastTouchTapCard === card && now - lastTouchTapTime <= doubleTapWindow) {
    e.preventDefault();
    lastTouchTapCard = null;
    lastTouchTapTime = 0;
    suppressNativeDoubleClickUntil = now + 500;
    toggleCardOrientation(card);
    return;
  }

  lastTouchTapCard = card;
  lastTouchTapTime = now;
}

function layoutDesktopDeck() {
  if (compactLayout.matches || isReadingMode()) return;

  const rowCenters = [18, 50, 82];
  const colSpacingVw = 2.45;
  const rowWidthVw = (cardsPerRow - 1) * colSpacingVw;
  const leftStartVw = 50 - rowWidthVw / 2;

  document.querySelectorAll(".card").forEach((card) => {
    const position = Number(card.dataset.position);
    const row = Math.floor(position / cardsPerRow);
    const col = position % cardsPerRow;

    card.style.left = `${leftStartVw + col * colSpacingVw}vw`;
    card.style.top = `${rowCenters[row]}%`;
    card.style.zIndex = String(row * cardsPerRow + col + 1);
  });
}

function toggleSelection(card) {
  if (isReadingMode()) {
    toggleCardInfo(card);
    return;
  }

  const idx = Number(card.dataset.index);

  if (selectedIndices.has(idx)) {
    selectedIndices.delete(idx);
    card.classList.remove("selected");
  } else if (selectedIndices.size >= maxSelection) {
    return;
  } else {
    selectedIndices.add(idx);
    card.classList.add("selected");
  }

  updateCardAccessibility(card);
  updateSelectionUI();
}

function toggleCardInfo(card) {
  if (!card.classList.contains("flipped")) return;

  const willOpen = !card.classList.contains("show-info");

  if (coarsePointer.matches && willOpen) {
    document.querySelectorAll(".card.show-info").forEach((openCard) => {
      if (openCard !== card) {
        openCard.classList.remove("show-info");
        updateCardAccessibility(openCard);
      }
    });
  }

  card.classList.toggle("show-info", willOpen);
  updateCardAccessibility(card);
}

function handleCardKeydown(e) {
  if ((e.key === "r" || e.key === "R") && !isReadingMode()) {
    e.preventDefault();
    toggleCardOrientation(e.currentTarget);
    return;
  }

  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  toggleSelection(e.currentTarget);
}

function generateCards() {
  container.innerHTML = "";
  container.className = "deck-mode";

  order.forEach((cardIndex, position) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = String(cardIndex);
    card.dataset.position = String(position);
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const orientationFrame = document.createElement("div");
    orientationFrame.className = "orientation-frame";

    const inner = document.createElement("div");
    inner.className = "inner";

    const front = document.createElement("div");
    front.className = "front";
    front.style.backgroundImage = 'url("images/back.jpg")';

    const back = document.createElement("div");
    back.className = "back";
    back.style.backgroundImage = `url("images/${cardIndex}.jpg")`;

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const nameDiv = document.createElement("div");
    nameDiv.className = "name";

    const uprightDiv = document.createElement("div");
    uprightDiv.className = "hover-upright meaning";

    const reversedDiv = document.createElement("div");
    reversedDiv.className = "hover-reversed meaning";

    back.append(overlay, nameDiv, uprightDiv, reversedDiv);
    inner.append(front, back);
    orientationFrame.appendChild(inner);
    card.appendChild(orientationFrame);

    // Initialize the seeded orientation before inserting the card into the
    // document, preventing an unwanted startup rotation animation.
    syncCardOrientation(card);

    card.addEventListener("click", () => toggleSelection(card));
    card.addEventListener("dblclick", handleCardDoubleClick);
    card.addEventListener("pointerup", handleCardPointerUp);
    card.addEventListener("keydown", handleCardKeydown);
    container.appendChild(card);

    updateCardAccessibility(card);
  });

  populateCardText();
  layoutDesktopDeck();
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = selectedIndices.size;
  flipBtn.disabled = count !== maxSelection;
  container.classList.toggle("selection-locked", count >= maxSelection);

  document.querySelectorAll(".card").forEach((card) => {
    updateCardAccessibility(card);
  });

  selectionStatus.querySelectorAll(".reading-slot").forEach((slot, index) => {
    slot.classList.toggle("active", index < count);
  });
  selectionStatus.setAttribute(
    "aria-label",
    `${count} of ${maxSelection} cards selected: past, present, future`
  );
}

// ---------- Reveal / restart ----------
function finishRevealAnimation(cards) {
  cards.forEach((card) => {
    card.classList.remove("reveal-moving");
    card.style.removeProperty("transition");
    card.style.removeProperty("transform");
    card.style.removeProperty("transform-origin");
    card.style.removeProperty("will-change");
    card.classList.add("flipped");
    updateCardAccessibility(card);
  });

  playFlipSound();
  flipBtn.textContent = "Da Capo";
  flipBtn.disabled = false;
  isRestartMode = true;

  const firstVisibleCard = cards[0];
  firstVisibleCard?.focus({ preventScroll: true });
}

function revealSelectedCards() {
  const selected = [...selectedIndices];
  if (selected.length !== maxSelection) return;

  const selectedCards = selected
    .map((idx) => container.querySelector(`.card[data-index='${idx}']`))
    .filter(Boolean);

  // Capture each selected card while it is still in its real deck position.
  const startRects = new Map(
    selectedCards.map((card) => [card, card.getBoundingClientRect()])
  );

  flipBtn.disabled = true;

  // Critical: freeze CSS transitions BEFORE changing positioning modes.
  // Otherwise left/top/transform transitions can interpolate toward the flex layout
  // and make every card appear to launch from a shared corner.
  selectedCards.forEach((card) => {
    card.classList.add("reveal-moving");
    card.style.transition = "none";
  });

  document.querySelectorAll(".card").forEach((card) => {
    const idx = Number(card.dataset.index);
    const isSelected = selectedIndices.has(idx);
    card.hidden = !isSelected;
    card.classList.remove("selected", "show-info", "flipped");

    if (isSelected) {
      card.style.order = String(selected.indexOf(idx));
      card.style.removeProperty("left");
      card.style.removeProperty("top");
      card.style.removeProperty("z-index");
    }
  });

  container.classList.remove("deck-mode", "selection-locked");
  container.classList.add("revealed-mode");
  container.scrollLeft = 0;

  // Resolve the final flex positions only after all deck positioning has been removed.
  void container.offsetWidth;

  const animations = [];
  const revealMoveDuration = 850;

  selectedCards.forEach((card) => {
    const start = startRects.get(card);
    const end = card.getBoundingClientRect();
    if (!start || !end.width || !end.height) return;

    const dx = start.left - end.left;
    const dy = start.top - end.top;
    const sx = start.width / end.width;
    const sy = start.height / end.height;

    // Web Animations avoids any interference from the card's normal CSS transitions.
    // Using top-left transform origin lets the measured rectangles map exactly.
    card.style.transformOrigin = "top left";
    card.style.willChange = "transform";

    if (reduceMotion.matches || typeof card.animate !== "function") {
      card.style.transform = "none";
      return;
    }

    const animation = card.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: "translate(0px, 0px) scale(1, 1)" },
      ],
      {
        duration: revealMoveDuration,
        easing: "cubic-bezier(0.16, 0.72, 0.18, 1)",
        fill: "none",
      }
    );

    animations.push(animation.finished.catch(() => undefined));
  });

  if (reduceMotion.matches || animations.length === 0) {
    finishRevealAnimation(selectedCards);
    return;
  }

  Promise.all(animations).then(() => {
    // Let the cards settle briefly before the slower face flip.
    window.setTimeout(() => finishRevealAnimation(selectedCards), 100);
  });
}

flipBtn.addEventListener("click", () => {
  if (isRestartMode) {
    resetApp();
    return;
  }

  revealSelectedCards();
});

// Escape closes any open interpretation.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !isReadingMode()) return;

  document.querySelectorAll(".card.show-info").forEach((card) => {
    card.classList.remove("show-info");
    updateCardAccessibility(card);
  });
});

// ---------- Reset ----------
function resetApp() {
  selectedIndices.clear();
  isRestartMode = false;

  flipBtn.textContent = "Reveal";
  flipBtn.disabled = true;
  flipBtn.hidden = true;
  selectionStatus.hidden = true;

  container.hidden = true;
  container.innerHTML = "";
  container.className = "deck-mode";

  seedStage.hidden = false;
  seedWrapper.classList.remove("shrink-out");
  seedFeedback.textContent = "";

  drawing = false;
  activePointerId = null;
  drawPointsCount = 0;
  drawDistance = 0;
  previousPoint = null;
  rollingSeed = 2166136261;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();

  for (let i = 0; i < cardCount; i += 1) order[i] = i;
}

// ---------- Finish drawing ----------
function onDrawFinish(seed) {
  const seededRandom = mulberry32(seed || 1);
  shuffleWithSeed(seededRandom);
  selectedIndices.clear();
  generateCards();

  seedWrapper.classList.add("shrink-out");
  const transitionDelay = reduceMotion.matches ? 0 : 700;

  window.setTimeout(() => {
    seedStage.hidden = true;
    container.hidden = false;
    selectionStatus.hidden = false;
    flipBtn.hidden = false;
    flipBtn.disabled = true;

    // Re-run layout after the container becomes measurable.
    layoutDesktopDeck();
    updateSelectionUI();
  }, transitionDelay);
}

// ---------- Responsive layout ----------
function handleLayoutChange() {
  if (isReadingMode()) return;
  layoutDesktopDeck();
}

if (compactLayout.addEventListener) {
  compactLayout.addEventListener("change", handleLayoutChange);
} else {
  compactLayout.addListener(handleLayoutChange);
}
window.addEventListener("resize", handleLayoutChange);

// ---------- Load card data ----------
fetch("data/card.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    window.cardTextData = data;
    populateCardText();
  })
  .catch((err) => {
    console.error("Card data failed to load:", err);
    seedFeedback.textContent = "Card images will still work, but interpretation text could not be loaded.";
  });
