/*
 * Baanrace Challenge — vanilla JS canvas game.
 *
 * BACKEND TODO (voor de beheerder):
 * Er is nog geen echte backend. Zet SUBMIT_ENDPOINT hieronder op een echt
 * endpoint (bv. Formspree, Netlify Forms, of een eigen serverless functie)
 * om inzendingen (naam, e-mail, score) daadwerkelijk te ontvangen en op te
 * slaan. Zolang dit leeg is, worden inzendingen alleen lokaal in de browser
 * bewaard (localStorage) — prima om te testen, niet geschikt om live te
 * gaan met een echte prijsvraag.
 */
const SUBMIT_ENDPOINT = ""; // bv. "https://formspree.io/f/xxxxxxx"

(function () {
  "use strict";

  // ---------- Config ----------
  const LANES = 3;
  const CANVAS_W = 360;
  const CANVAS_H = 560;
  const CAR_W = 46;
  const CAR_H = 74;
  const OBSTACLE_W = 46;
  const OBSTACLE_H = 60;

  const BASE_SPEED = 220;      // px/s bij start
  const MAX_SPEED = 520;       // px/s plafond
  const RAMP_RATE = 6;         // px/s toename per seconde
  const SCORE_PER_PIXEL = 0.05;
  const BONUS_PER_OBSTACLE = 8;
  const MIN_SPAWN_INTERVAL = 0.35;
  const BASE_SPAWN_INTERVAL = 0.9;
  const SPAWN_RAMP = 0.01;

  const MIN_PLAY_SECONDS = 2;  // te snel game-overen mag niet ingezonden worden
  const CAP_BUFFER = 1.15;     // marge op de theoretische maximale score

  const LANE_W = CANVAS_W / LANES;

  // ---------- DOM ----------
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const hudScore = document.getElementById("hud-score");
  const hudHighscore = document.getElementById("hud-highscore");
  const overlayStart = document.getElementById("overlay-start");
  const overlayGameover = document.getElementById("overlay-gameover");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnRestartAfterEntry = document.getElementById("btn-restart-after-entry");
  const finalScoreEl = document.getElementById("final-score");
  const newRecordEl = document.getElementById("new-record");
  const entryForm = document.getElementById("entry-form");
  const entryName = document.getElementById("entry-name");
  const entryEmail = document.getElementById("entry-email");
  const entryConsent = document.getElementById("entry-consent");
  const honeypot = document.getElementById("website");
  const formError = document.getElementById("form-error");
  const confirmation = document.getElementById("confirmation");
  const confirmationScore = document.getElementById("confirmation-score");
  const confirmationEmail = document.getElementById("confirmation-email");
  const touchLeft = document.getElementById("touch-left");
  const touchRight = document.getElementById("touch-right");
  const btnSubmit = document.getElementById("btn-submit");

  // ---------- Persistentie (lokaal, per browser) ----------
  const HIGHSCORE_KEY = "racegame_highscore";
  const ENTRIES_KEY = "racegame_entries"; // tijdelijke lokale opslag, zie TODO bovenaan

  function getHighScore() {
    return Number(localStorage.getItem(HIGHSCORE_KEY) || 0);
  }
  function setHighScore(v) {
    localStorage.setItem(HIGHSCORE_KEY, String(v));
  }

  // ---------- Game state (bewust NIET op window, zodat je niet met
  // "window.score = 999999" in de console kunt cheaten) ----------
  let state = null;

  function freshState() {
    return {
      running: false,
      lane: 1,
      carX: laneCenter(1),
      obstacles: [],
      spawnTimer: 0,
      elapsed: 0,
      score: 0,
      scoreCap: 0, // theoretische max-score-tot-nu, voor plausibiliteitscheck
      lastTime: 0,
    };
  }

  function laneCenter(lane) {
    return lane * LANE_W + LANE_W / 2;
  }

  function speedAt(t) {
    return Math.min(BASE_SPEED + RAMP_RATE * t, MAX_SPEED);
  }
  function spawnIntervalAt(t) {
    return Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - SPAWN_RAMP * t);
  }

  // ---------- Input ----------
  function moveLeft() {
    if (!state || !state.running) return;
    state.lane = Math.max(0, state.lane - 1);
  }
  function moveRight() {
    if (!state || !state.running) return;
    state.lane = Math.min(LANES - 1, state.lane + 1);
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") moveLeft();
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") moveRight();
  });

  touchLeft.addEventListener("click", moveLeft);
  touchRight.addEventListener("click", moveRight);

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) moveLeft();
    else moveRight();
  });

  // ---------- Obstakels ----------
  function trySpawn(dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) return;
    state.spawnTimer = spawnIntervalAt(state.elapsed);

    // Nooit alle drie de banen blokkeren: laat er altijd minstens één vrij.
    const lanes = [0, 1, 2];
    const blockedCount = state.elapsed > 20 ? 2 : 1;
    const blocked = [];
    for (let i = 0; i < blockedCount; i++) {
      const idx = Math.floor(Math.random() * lanes.length);
      blocked.push(lanes.splice(idx, 1)[0]);
    }
    blocked.forEach((lane) => {
      state.obstacles.push({
        lane,
        y: -OBSTACLE_H,
        scored: false,
      });
    });
  }

  function updateObstacles(dt, speed) {
    for (const ob of state.obstacles) {
      ob.y += speed * dt;
      if (!ob.scored && ob.y > CANVAS_H) {
        ob.scored = true;
        state.score += BONUS_PER_OBSTACLE;
      }
    }
    state.obstacles = state.obstacles.filter((ob) => ob.y < CANVAS_H + OBSTACLE_H);
  }

  function checkCollision() {
    const carTop = CANVAS_H - CAR_H - 20;
    const carBottom = carTop + CAR_H;
    const carLeft = state.carX - CAR_W / 2;
    const carRight = state.carX + CAR_W / 2;

    for (const ob of state.obstacles) {
      const obCenterX = laneCenter(ob.lane);
      const obLeft = obCenterX - OBSTACLE_W / 2;
      const obRight = obCenterX + OBSTACLE_W / 2;
      const obTop = ob.y;
      const obBottom = ob.y + OBSTACLE_H;

      const overlapX = carLeft < obRight && carRight > obLeft;
      const overlapY = carTop < obBottom && carBottom > obTop;
      if (overlapX && overlapY) return true;
    }
    return false;
  }

  // ---------- Loop ----------
  function update(dt) {
    state.elapsed += dt;
    const speed = speedAt(state.elapsed);

    // Vloeiend naar de gekozen baan bewegen.
    const target = laneCenter(state.lane);
    state.carX += (target - state.carX) * Math.min(1, dt * 14);

    trySpawn(dt);
    updateObstacles(dt, speed);

    // Score: afstand afgelegd + bonus per ontweken obstakel (in updateObstacles).
    state.score += speed * dt * SCORE_PER_PIXEL;

    // Theoretisch max haalbare score tot nu toe (upper bound), voor de
    // plausibiliteitscheck bij het inzenden. Zie MIN_PLAY_SECONDS/CAP_BUFFER.
    const spawnRate = 1 / spawnIntervalAt(state.elapsed);
    state.scoreCap += speed * dt * SCORE_PER_PIXEL + spawnRate * dt * BONUS_PER_OBSTACLE * (state.elapsed > 20 ? 2 : 1);

    hudScore.textContent = Math.floor(state.score);

    if (checkCollision()) {
      endRun();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Weg + baanstrepen
    ctx.fillStyle = "#23283a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = "#4a5170";
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 16]);
    const dashOffset = (state ? state.elapsed : 0) * -260;
    for (let i = 1; i < LANES; i++) {
      const x = i * LANE_W;
      ctx.beginPath();
      ctx.lineDashOffset = dashOffset;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (!state) return;

    // Obstakels
    for (const ob of state.obstacles) {
      const x = laneCenter(ob.lane) - OBSTACLE_W / 2;
      drawRoundedRect(x, ob.y, OBSTACLE_W, OBSTACLE_H, 8, "#ff9d4c");
      ctx.fillStyle = "#3a2412";
      ctx.fillRect(x + 8, ob.y + 12, OBSTACLE_W - 16, 8);
      ctx.fillRect(x + 8, ob.y + 30, OBSTACLE_W - 16, 8);
    }

    // Auto
    const carTop = CANVAS_H - CAR_H - 20;
    const carLeft = state.carX - CAR_W / 2;
    drawRoundedRect(carLeft, carTop, CAR_W, CAR_H, 10, "#2fd6a4");
    ctx.fillStyle = "#0b3a2c";
    ctx.fillRect(carLeft + 6, carTop + 10, CAR_W - 12, 16);
    ctx.fillRect(carLeft + 6, carTop + CAR_H - 26, CAR_W - 12, 16);
  }

  function drawRoundedRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  let rafId = null;
  function loop(now) {
    if (!state || !state.running) return;
    const dt = Math.min(0.05, (now - state.lastTime) / 1000 || 0);
    state.lastTime = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ---------- Flow ----------
  function startGame() {
    state = freshState();
    state.running = true;
    state.lastTime = performance.now();
    hudHighscore.textContent = getHighScore();
    overlayStart.classList.add("hidden");
    overlayGameover.classList.add("hidden");
    resetForm();
    rafId = requestAnimationFrame(loop);
  }

  function endRun() {
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);

    const finalScore = Math.floor(state.score);
    const highScore = getHighScore();
    const isRecord = finalScore > highScore;
    if (isRecord) setHighScore(finalScore);

    finalScoreEl.textContent = finalScore;
    newRecordEl.classList.toggle("hidden", !isRecord);
    hudHighscore.textContent = getHighScore();

    overlayGameover.classList.remove("hidden");
  }

  function resetForm() {
    entryForm.classList.remove("hidden");
    confirmation.classList.add("hidden");
    entryForm.reset();
    formError.classList.add("hidden");
    btnSubmit.disabled = false;
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);
  btnRestartAfterEntry.addEventListener("click", startGame);

  // ---------- Inzending (met basis anti-misbruik maatregelen) ----------
  function isPlausibleScore(score, elapsedSeconds, cap) {
    if (elapsedSeconds < MIN_PLAY_SECONDS) return false;
    if (score < 0) return false;
    return score <= cap * CAP_BUFFER + 20; // kleine vaste marge voor korte runs
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove("hidden");
  }

  entryForm.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.classList.add("hidden");

    // Honeypot: als dit verborgen veld is ingevuld, is het (bijna zeker) een bot.
    // We doen alsof het gelukt is, zonder de inzending echt te verwerken.
    if (honeypot.value.trim() !== "") {
      showConfirmation(entryEmail.value.trim(), Math.floor(state ? state.score : 0));
      return;
    }

    const name = entryName.value.trim();
    const email = entryEmail.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailOk) {
      showError("Vul een geldig e-mailadres in.");
      return;
    }
    if (!entryConsent.checked) {
      showError("Je moet akkoord gaan met de actievoorwaarden om mee te doen.");
      return;
    }
    if (!state) {
      showError("Speel eerst een potje voordat je een score inzendt.");
      return;
    }

    const finalScore = Math.floor(state.score);
    if (!isPlausibleScore(finalScore, state.elapsed, state.scoreCap)) {
      showError("Deze score kon niet worden geverifieerd. Speel het spel opnieuw en probeer het nogmaals.");
      return;
    }

    btnSubmit.disabled = true;
    submitEntry({ name, email, score: finalScore, elapsedSeconds: state.elapsed })
      .then(() => showConfirmation(email, finalScore))
      .catch(() => {
        showError("Inzenden is niet gelukt. Probeer het later opnieuw.");
        btnSubmit.disabled = false;
      });
  });

  function submitEntry(entry) {
    if (SUBMIT_ENDPOINT) {
      return fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entry, ts: Date.now() }),
      }).then((res) => {
        if (!res.ok) throw new Error("submit failed");
      });
    }

    // Geen backend gekoppeld: bewaar tijdelijk lokaal zodat je tijdens het
    // testen kunt zien dat de flow werkt. Eén entry per e-mailadres,
    // hoogste score telt (zie actievoorwaarden). Dit is GEEN vervanging
    // voor een echte backend — zie de TODO bovenaan dit bestand.
    return new Promise((resolve) => {
      const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || "[]");
      const existing = entries.find((e) => e.email.toLowerCase() === entry.email.toLowerCase());
      if (!existing || entry.score > existing.score) {
        const next = entries.filter((e) => e.email.toLowerCase() !== entry.email.toLowerCase());
        next.push({ ...entry, ts: Date.now() });
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(next));
      }
      resolve();
    });
  }

  function showConfirmation(email, score) {
    entryForm.classList.add("hidden");
    confirmation.classList.remove("hidden");
    confirmationScore.textContent = score;
    confirmationEmail.textContent = email;
  }

  // ---------- Init ----------
  hudHighscore.textContent = getHighScore();
  draw();
})();
