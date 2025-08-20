console.log("Credits:\n Webpage coding by Hoyii 🌸, Zhihan 🕊️, and the AI chatbot 🤖.\n Background music by 歌声私有化 @music_privatized 🕶️.\n Graphics by Hoyii, Kristin 🐈‍⬛, 安喵喵 🐱, and Yuyuan 👩.\n Sound effect (card-sounds) by \"henrygillard (Freesound)\" at pixabay.")
const bgm = document.getElementById("bgm");
const flipSound = document.getElementById("flipSound");

// 第一次点击页面时启动BGM
document.body.addEventListener("click", () => {
  if (bgm.paused) {
    bgm.volume = 0.5;
    bgm.play().catch(err => console.log("BGM 播放失败:", err));
  }
}, { once: true });

const canvas = document.getElementById('seedCanvas');
const ctx = canvas.getContext('2d');
const seedWrapper = document.getElementById('seedWrapper');

let drawing = false;
let drawPointsCount = 0;

canvas.addEventListener('mousedown', () => { drawing = true; drawPointsCount = 0; });
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); onDrawFinish(); });
canvas.addEventListener('mouseout', () => { if(drawing){ drawing=false; ctx.beginPath(); onDrawFinish(); }});
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  drawPointsCount++;
  const hue = drawPointsCount % 360;
  ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

const cardCount = 78;
const container = document.getElementById('container');
const flipBtn = document.getElementById('flipBtn');
const maxSelection = 3;
const cardsPerRow = 26;
const cardHeightVh = 25;
const cardWidthVwApprox = cardHeightVh * 0.583;
const offsetXvw = 1.5;
const rowHeightVh = 27;
const selectedIndices = new Set();
const order = Array.from({ length: cardCount }, (_, i) => i);
const cardOrientation = {};
for (let i = 0; i < cardCount; i++) cardOrientation[i] = Math.random() < 0.5;
const containerWidthVw = 100;
const rowWidthVw = (cardsPerRow - 1) * offsetXvw + cardWidthVwApprox;
const offsetLeftVw = (containerWidthVw - rowWidthVw) / 2 + cardWidthVwApprox / 2;
let seededRandom = null;

// track restart mode
let isRestartMode = false;

function shuffleWithSeed(rng) {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
}

function generateCards() {
  container.innerHTML = '';
  const totalRows = Math.ceil(order.length / cardsPerRow);
  const totalHeightVh = totalRows * rowHeightVh;
  const containerHeightVh = 90;
  const verticalOffsetVh = (containerHeightVh - totalHeightVh) / 2;

  order.forEach((cardIndex, i) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.index = cardIndex;
    const row = Math.floor(i / cardsPerRow);
    const col = i % cardsPerRow;
    card.style.left = `calc(${offsetLeftVw}vw + ${col * offsetXvw}vw)`;
    card.style.top = `${verticalOffsetVh + row * rowHeightVh}vh`;
    card.style.zIndex = row * cardsPerRow + col;

    const inner = document.createElement('div'); inner.classList.add('inner');
    const front = document.createElement('div'); front.classList.add('front'); front.style.backgroundImage = 'url("images/back.jpg")';
    const back = document.createElement('div'); back.classList.add('back'); back.style.backgroundImage = `url("images/${cardIndex}.jpg")`;
    if (!cardOrientation[cardIndex]) back.classList.add('reverse');
    const overlay = document.createElement('div'); overlay.classList.add('overlay');
    const cardNumber = document.createElement('div'); cardNumber.classList.add('card-number');
    const nameDiv = document.createElement('div'); nameDiv.classList.add('name');
    const hoverUprightDiv = document.createElement('div'); hoverUprightDiv.classList.add('hover-upright');
    const hoverReversedDiv = document.createElement('div'); hoverReversedDiv.classList.add('hover-reversed');

    back.append(overlay, cardNumber, nameDiv, hoverUprightDiv, hoverReversedDiv);
    inner.append(front, back);
    card.appendChild(inner);

    card.addEventListener('click', () => {
      const idx = Number(card.dataset.index);
      if (card.classList.contains('flipped') && card.classList.contains('enlarged')) return;
      if (selectedIndices.has(idx)) {
        selectedIndices.delete(idx);
        card.classList.remove('selected');
        card.style.zIndex = row * cardsPerRow + col;
      } else {
        if (selectedIndices.size >= maxSelection) { alert('最多只能选择三张牌'); return; }
        selectedIndices.add(idx);
        card.classList.add('selected');
        card.style.zIndex = 10000;
      }
      updateFlipBtn();
    });

    container.appendChild(card);
  });

  if (window.cardTextData) {
    document.querySelectorAll('.card').forEach(card => {
      const idx = card.dataset.index;
      const back = card.querySelector('.back');
      const nameDiv = back.querySelector('.name');
      const uprightDiv = back.querySelector('.hover-upright');
      const reversedDiv = back.querySelector('.hover-reversed');
      if (window.cardTextData[idx]) {
        if(nameDiv) nameDiv.textContent = window.cardTextData[idx].name;
        if(uprightDiv) uprightDiv.textContent = window.cardTextData[idx].upright;
        if(reversedDiv) reversedDiv.textContent = window.cardTextData[idx].reversed;
        const isReversed = back.classList.contains('reverse');
        uprightDiv.dataset.active = isReversed ? "false" : "true";
        reversedDiv.dataset.active = isReversed ? "true" : "false";
      }
    });
  }
}

function updateFlipBtn() { flipBtn.disabled = selectedIndices.size !== maxSelection; }

// flip / restart logic
flipBtn.addEventListener('click', () => {
  if (isRestartMode) {
    resetApp();
    return;
  }

  document.querySelectorAll('.card').forEach(card => {
    if(!selectedIndices.has(Number(card.dataset.index))) card.style.display='none';
  });

  const selected = [...selectedIndices];
  if(selected.length !== 3) return;

  const spacingVw = 18;
  const cardElem = container.querySelector('.card');
  const cardWidthPx = cardElem.getBoundingClientRect().width;
  const vwInPx = window.innerWidth / 100;
  const cardWidthVw = cardWidthPx / vwInPx;
  const totalWidthVw = 3 * cardWidthVw + 2 * spacingVw;
  const leftStartVw = 50 - totalWidthVw / 2 + cardWidthVw / 2;
  const containerHeightVh = 90;
  const cardHeightVh = 25;
  const centerYvh = (containerHeightVh - cardHeightVh)/2;

  selected.forEach((idx, i) => {
    const card = container.querySelector(`.card[data-index='${idx}']`);
    if(card){
      card.style.left=`${leftStartVw + i*(cardWidthVw + spacingVw)}vw`;
      card.style.top=`${centerYvh}vh`;
      card.style.zIndex=10000;
    }
  });

  setTimeout(()=>{
    flipSound.currentTime=0; flipSound.play().catch(err=>console.log("翻牌音效失败:", err));
    selectedIndices.forEach(idx => {
      const card = container.querySelector(`.card[data-index='${idx}']`);
      if(card){
        card.classList.add('flipped','enlarged');
        card.classList.remove('selected');
      }
    });
    flipBtn.textContent="Da Capo";
    flipBtn.disabled=false;
    isRestartMode = true;
  }, 600);
});

function onDrawFinish() {
  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const pixelStr = Array.from(imageData.data).join(',');
  const seed = simpleHash(pixelStr);
  seededRandom = mulberry32(seed);
  shuffleWithSeed(seededRandom);
  selectedIndices.clear(); flipBtn.disabled=true;

  seedWrapper.classList.add('shrink-out');

  seedWrapper.addEventListener('animationend', () => {
    seedWrapper.style.display='none';
    container.style.display='block';
    flipBtn.style.display='inline-block';
    generateCards();
  }, { once: true });
}

// reset app state without stopping bgm
function resetApp() {
  selectedIndices.clear();
  isRestartMode = false;
  flipBtn.textContent = "Reveal";
  flipBtn.disabled = true;
  flipBtn.style.display = 'none';

  container.style.display = 'none';
  container.innerHTML = '';

  seedWrapper.classList.remove('shrink-out');
  seedWrapper.style.removeProperty('transform');
  seedWrapper.style.removeProperty('opacity');
  void seedWrapper.offsetWidth; // reflow
  seedWrapper.style.display = 'flex';

  drawing = false;
  drawPointsCount = 0;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.beginPath();

  for (let i = 0; i < cardCount; i++) order[i] = i;
}

fetch('data/card.json')
  .then(response => response.json())
  .then(data => { window.cardTextData = data; });
