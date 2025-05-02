// 모든 변수 설정
let score = 0;
let combo = 0;
let maxCombo = 0;
let lastFeverCombo = 0;
let inFeverTime = false;
let isCharacterFrozen = false;
let freezeUntilTime = null;
let currentCharacter = "ruby";
let feverPausedAt = null;  // 일시정지 시점
let feverPausedDuration = 0;  // 누적 일시정지 시간

let startTime = Date.now();
let elapsedTime = 0;
let gamePaused = false;
let gameInterval = null;
let lastSwitchTime = 0;
let nextSwitchInterval = getRandomInterval();
let gaugeDuration = 0;
let gaugeStartTime = 0;
let elapsedGaugeTime = 0;

let feverStartTime = 0;
let feverDuration = 10000;
let feverEndTime = 0; // ← 이거 새로 추가

const feverGauge = document.getElementById("feverGaugeFill");
const gauge = document.getElementById("gaugeFill");

const characterMap = {
  ruby: { name: "ルビィちゃん", image: "assets/ruby.png", flavor: "mint" },
  ayumu: { name: "歩夢ちゃん", image: "assets/ayumu.png", flavor: "strawberry" },
  shiki: { name: "四季ちゃん", image: "assets/wakanashiki.png", flavor: "cookies" },
};

const flavors = ["mint", "strawberry", "cookies"];
const flavorImages = {
  mint: "assets/ice_ruby.png",
  strawberry: "assets/ice_ayumu.png",
  cookies: "assets/ice_shiki.png",
};

const scoreDisplay = document.getElementById("score");
const comboDisplay = document.getElementById("combo");
const characterImg = document.getElementById("character");
const characterName = document.getElementById("characterName");
const grid = document.querySelector(".grid");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const pauseModal = document.getElementById("pauseModal");
const bgm = document.getElementById("bgm");

function getRandomInterval() {
  return 5 + Math.floor(Math.random() * 2); // 5~9초 사이
}


function isFixedCharacterTime(time) {
  return (time >= 91 && time < 98) || (time >= 98 && time < 106) ||
         (time >= 106 && time < 113) || (time >= 113 && time < 123);
}
function updateCharacter(newChar) {
  currentCharacter = newChar;
  characterImg.src = characterMap[newChar].image;

  // 캐릭터 이름 설정 (선택)
  characterName.textContent = characterMap[newChar].name;

  // 캐릭터별 테두리/게이지 색상 지정
  const panel = document.querySelector('.character-panel');
  const gaugeFill = document.getElementById('gaugeFill');

  if (newChar === "ruby") {
    panel.style.border = "3px solid #e93cac";
    gaugeFill.style.backgroundColor = "#e93cac";
  } else if (newChar === "ayumu") {
    panel.style.border = "3px solid #ED7D95";
    gaugeFill.style.backgroundColor = "#ED7D95";
  } else if (newChar === "shiki") {
    panel.style.border = "3px solid #b2ffdd";
    gaugeFill.style.backgroundColor = "#b2ffdd";
  }

  gaugeStartTime = Date.now();
  gaugeDuration = nextSwitchInterval * 1000;
  document.querySelector(".character-gauge").style.display = "block";
  document.querySelector(".fever-gauge").style.display = "none";
  gauge.style.transform = "scaleX(1)";
}


function createGrid() {
  const flavorPool = [...flavors, ...Array(13).fill(null)].map((f, i) =>
    f || flavors[Math.floor(Math.random() * flavors.length)]
  );
  shuffle(flavorPool);
  grid.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const flavor = flavorPool[i];
    const block = document.createElement("div");
    block.className = "icecream-block";
    const img = document.createElement("img");
    img.src = flavorImages[flavor];
    img.dataset.flavor = flavor;
    img.addEventListener("click", () => onClickIcecream(img));
    block.appendChild(img);
    grid.appendChild(block);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function onClickIcecream(img) {
  const flavor = img.dataset.flavor;
  const correctFlavor = characterMap[currentCharacter]?.flavor;
  if (inFeverTime || currentCharacter === "all" || flavor === correctFlavor) {
    handleCorrect();
  } else {
    handleWrong();
  }
  changeIcecream(img);
}

function changeIcecream(img) {
  const current = img.dataset.flavor;
  const currentFlavors = [...document.querySelectorAll(".icecream-block img")]
    .filter(i => i !== img)
    .map(i => i.dataset.flavor);
  const unique = new Set(currentFlavors);
  if (unique.size === 2) {
    const missing = flavors.find(f => !unique.has(f));
    img.dataset.flavor = missing;
    img.src = flavorImages[missing];
  } else {
    const options = flavors.filter(f => f !== current);
    const next = options[Math.floor(Math.random() * options.length)];
    img.dataset.flavor = next;
    img.src = flavorImages[next];
  }
  validateGrid();
}

function validateGrid() {
  const currentFlavors = [...document.querySelectorAll(".icecream-block img")].map(img => img.dataset.flavor);
  const unique = new Set(currentFlavors);
  if (unique.size < 3) {
    const missing = flavors.find(f => !unique.has(f));
    const randomImg = document.querySelector(".icecream-block img");
    randomImg.dataset.flavor = missing;
    randomImg.src = flavorImages[missing];
  }
}
function handleCorrect() {
  if (!inFeverTime) {
    combo++;
    maxCombo = Math.max(combo, maxCombo);
  }

  // 기본 점수
  let base = 1;

  // 콤보에 따른 2배 증가: 15콤보 → 2점, 30콤보 → 4점, 45콤보 → 8점...
  if (combo >= 25) {
    base = Math.pow(2, Math.floor(combo / 25));
  }

  // 고정 시간 구간이면 5배 추가
  const currentSec = Math.floor((Date.now() - startTime) / 1000);
  if (isFixedCharacterTime(currentSec)) {
    base *= 5;
  }

  // 피버타임이면 또 5배
  if (inFeverTime) {
    base *= 5;
  }

  // 점수 추가
  score += base;
  updateScoreUI();

  // 피버타임 발동 or 연장
  if (combo % 25 === 0 && combo !== 0 && !isFixedCharacterTime(currentSec)) {
    if (!inFeverTime && combo !== lastFeverCombo) {
      lastFeverCombo = combo;
      triggerFeverTime();
    } else if (inFeverTime && combo !== lastFeverCombo) {
      lastFeverCombo = combo;
      feverEndTime += 10000;
    }
  }
}









function handleWrong() {
  const nowSec = Math.floor((Date.now() - startTime) / 1000);
  
  // ✅ 고정 캐릭터 구간에서는 오답 무시
  if (isFixedCharacterTime(nowSec)) return;

  if (score > 0) score--;
  combo = 0;
  updateScoreUI();
}

function updateScoreUI() {
  scoreDisplay.textContent = `🍨 SCORE ${score}`;
  comboDisplay.textContent = `💫 COMBO ${combo}`;
}


function updateAllCharacterUI() {
  characterImg.src = "assets/triple.jpg";
  characterName.textContent = "みな〜！何が好き？";
}

function triggerFeverTime() {
  inFeverTime = true;
  isCharacterFrozen = true;

  characterImg.src = "assets/triple.jpg";
  characterName.textContent = "みな〜！何が好き？";
  document.querySelector(".character-gauge").style.display = "none";
  document.querySelector(".fever-gauge").style.display = "block";

  feverStartTime = Date.now();
  feverEndTime = feverStartTime + 10000; // 기본 10초

  const feverTick = setInterval(() => {
    const now = Date.now();
    const progress = Math.max(0, 1 - (now - feverStartTime) / (feverEndTime - feverStartTime));
    feverGauge.style.transform = `scaleX(${progress})`;

    if (now >= feverEndTime) {
      clearInterval(feverTick);
      inFeverTime = false;
      isCharacterFrozen = false;
      document.querySelector(".fever-gauge").style.display = "none";
      updateCharacter(currentCharacter);
    }
  }, 100);
}



function handleRandomCharacterChange() {
  const now = Math.floor((Date.now() - startTime) / 1000);
  if (now - lastSwitchTime >= nextSwitchInterval) {
    const options = ["ruby", "ayumu", "shiki"].filter(c => c !== currentCharacter);
    const next = options[Math.floor(Math.random() * options.length)];
    nextSwitchInterval = getRandomInterval();
    gaugeStartTime = Date.now();
    gaugeDuration = nextSwitchInterval * 1000;
    updateCharacter(next);
    lastSwitchTime = now;
  }
}

pauseBtn.addEventListener("click", () => {
  gamePaused = true;
  clearInterval(gameInterval);
  bgm.pause();
  elapsedTime = Date.now() - startTime;
  elapsedGaugeTime = Date.now() - gaugeStartTime;

  // ✅ 피버타임 일시정지 기록
  if (inFeverTime) {
    feverPausedAt = Date.now();
  }

  pauseModal.classList.remove("hidden");
});


resumeBtn.addEventListener("click", () => {
  gamePaused = false;
  startTime = Date.now() - elapsedTime;
  gaugeStartTime = Date.now() - elapsedGaugeTime;

  // ✅ 피버타임 시간 보정
  if (inFeverTime && feverPausedAt) {
    const pausedDuration = Date.now() - feverPausedAt;
    feverStartTime += pausedDuration;
    feverEndTime += pausedDuration;
    feverPausedDuration += pausedDuration;
    feverPausedAt = null;
  }

  startGameTimer();
  bgm.play();
  pauseModal.classList.add("hidden");
});


const startModal = document.getElementById("startModal");
const startGameBtn = document.getElementById("startGameBtn");
let gameStarted = false;

startGameBtn.addEventListener("click", () => {
  startModal.classList.add("hidden");
  gameStarted = true;
  elapsedTime = 0;
  startTime = Date.now();
  bgm.play();
  startGameTimer();
  createGrid();
  updateScoreUI();
  updateCharacter("ruby");
  gaugeStartTime = Date.now();
  gaugeDuration = nextSwitchInterval * 1000;
  document.querySelector(".character-gauge").style.display = "block";
});

function startGameTimer() {
  gameInterval = setInterval(() => {
    if (!gameStarted || gamePaused) return;

    const time = Math.floor((Date.now() - startTime) / 1000);

    // 고정 캐릭터 처리
    if (time === 91) {
      updateCharacter("ruby");
      gaugeDuration = 6000;
      gaugeStartTime = Date.now();
    } else if (time === 98) {
      updateCharacter("ayumu");
      gaugeDuration = 7000;
      gaugeStartTime = Date.now();
    } else if (time === 106) {
      updateCharacter("shiki");
      gaugeDuration = 6000;
      gaugeStartTime = Date.now();
    } else if (time === 113) {
      currentCharacter = "all";
      updateAllCharacterUI();
      gaugeDuration = 9000;
      gaugeStartTime = Date.now();
    } else if (!inFeverTime && !isFixedCharacterTime(time) && !isCharacterFrozen) {
      handleRandomCharacterChange();
    }

    // 일반 게이지
    if (!inFeverTime && !gamePaused && gaugeDuration > 0) {
      const elapsed = Date.now() - gaugeStartTime;
      const remaining = Math.max(0, 1 - elapsed / gaugeDuration);
      gauge.style.transform = `scaleX(${remaining})`;

      if (remaining === 0 && !isFixedCharacterTime(time)) {
        handleRandomCharacterChange();
      }
    }

    // 피버타임 게이지
    if (inFeverTime && !gamePaused) {
      const feverElapsed = Date.now() - feverStartTime;
      const feverRemaining = Math.max(0, 1 - feverElapsed / feverDuration);
      feverGauge.style.transform = `scaleX(${feverRemaining})`;
    }

  }, 100);
}

function endGame() {
  clearInterval(gameInterval);
  bgm.pause();

  document.getElementById("finalScore").textContent = `점수: ${score}`;
  document.getElementById("finalCombo").textContent = `최고 콤보: ${maxCombo}`;
  document.getElementById("resultModal").classList.remove("hidden");
}

function updateIcecreamBorders() {
  const allBlocks = document.querySelectorAll(".icecream-block img");

  allBlocks.forEach(img => {
    const flavor = img.dataset.flavor;
    const parent = img.parentElement;

    switch (flavor) {
      case "mint":
        parent.style.border = "3px solid #e93cac"; // 루비: 핑크
        break;
      case "strawberry":
        parent.style.border = "3px solid #ED7D95"; // 아유무: 빨간 핑크
        break;
      case "cookies":
        parent.style.border = "3px solid #b2ffdd"; // 시키: 민트
        break;
      default:
        parent.style.border = "3px solid transparent";
    }
  });
}

bgm.addEventListener("ended", () => {
  if (!gamePaused) {
    endGame();
  }
});

document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) {
    e.preventDefault();  // 2손가락 확대 방지
  }
}, { passive: false });

document.addEventListener('dblclick', function(e) {
  e.preventDefault();  // 더블탭 확대 방지
});


