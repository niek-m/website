/*
 * SchaalX Baanrace — vanilla JS canvas game met een gesimuleerde
 * "e-mail eerst, dan spelen"-flow en een gesimuleerd (lokaal) scorebord.
 *
 * BACKEND TODO (voor de beheerder):
 * Er is nog geen echte backend. Op dit moment:
 *   - wordt er GEEN echte e-mail met inloglink verstuurd (zie
 *     simulateSendLoginLink / het "Simuleer: link geopend"-scherm);
 *   - is het scorebord alleen lokaal in de browser van de speler zichtbaar
 *     (localStorage), niet gedeeld tussen deelnemers.
 * Om dit echt te maken heb je nodig: een backend + database (bv. Supabase:
 * Auth met magic links regelt de e-mailverificatie, Postgres kan de
 * ranglijst bijhouden) en een hostingkeuze die serverless functions
 * ondersteunt (bv. Vercel of Netlify). Zie racegame/README.md.
 */
const SUBMIT_ENDPOINT = ""; // niet meer gebruikt in de gesimuleerde flow, staat klaar voor later

(function () {
  "use strict";

  // ---------- Config: spel ----------
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

  const MIN_PLAY_SECONDS = 2;  // te snel game-overen mag niet meetellen
  const CAP_BUFFER = 1.15;     // marge op de theoretische maximale score

  const LANE_W = CANVAS_W / LANES;
  const LEADERBOARD_MAX = 10;

  // ---------- DOM: views ----------
  const viewLanding = document.getElementById("view-landing");
  const viewCheckinbox = document.getElementById("view-checkinbox");
  const viewGame = document.getElementById("view-game");
  const views = { landing: viewLanding, checkinbox: viewCheckinbox, game: viewGame };

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
  }

  // ---------- DOM: gate ----------
  const gateForm = document.getElementById("gate-form");
  const gateEmail = document.getElementById("gate-email");
  const gateWebsite = document.getElementById("gate-website"); // honeypot
  const gateConsent = document.getElementById("gate-consent");
  const gateError = document.getElementById("gate-error");
  const checkinboxEmail = document.getElementById("checkinbox-email");
  const btnSimVerify = document.getElementById("btn-sim-verify");
  const btnGateBack = document.getElementById("btn-gate-back");

  // ---------- DOM: leaderboard ----------
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardEmpty = document.getElementById("leaderboard-empty");

  // ---------- DOM: game ----------
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const hudScore = document.getElementById("hud-score");
  const hudHighscore = document.getElementById("hud-highscore");
  const overlayStart = document.getElementById("overlay-start");
  const overlayGameover = document.getElementById("overlay-gameover");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnViewLeaderboard = document.getElementById("btn-view-leaderboard");
  const finalScoreEl = document.getElementById("final-score");
  const newRecordEl = document.getElementById("new-record");
  const leaderboardStatus = document.getElementById("leaderboard-status");
  const touchLeft = document.getElementById("touch-left");
  const touchRight = document.getElementById("touch-right");

  // ---------- Persistentie (lokaal, per browser) ----------
  const HIGHSCORE_KEY = "racegame_highscore";
  const LEADERBOARD_KEY = "racegame_leaderboard"; // gesimuleerd "gedeeld" scorebord, zie TODO bovenaan

  function getHighScore() {
    return Number(localStorage.getItem(HIGHSCORE_KEY) || 0);
  }
  function setHighScore(v) {
    localStorage.setItem(HIGHSCORE_KEY, String(v));
  }

  function getLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function maskEmail(email) {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const visible = local.slice(0, 1) || "*";
    return `${visible}***@${domain}`;
  }

  function addToLeaderboard(email, score) {
    const entries = getLeaderboard();
    const existingIdx = entries.findIndex((e) => e.email.toLowerCase() === email.toLowerCase());
    if (existingIdx === -1) {
      entries.push({ email, score, ts: Date.now() });
    } else if (score > entries[existingIdx].score) {
      entries[existingIdx] = { email, score, ts: Date.now() };
    }
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const entries = getLeaderboard().slice(0, LEADERBOARD_MAX);
    leaderboardList.innerHTML = "";
    leaderboardEmpty.classList.toggle("hidden", entries.length > 0);

    entries.forEach((entry, i) => {
      const li = document.createElement("li");

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `${i + 1}.`;

      const email = document.createElement("span");
      email.className = "leaderboard-email";
      email.textContent = maskEmail(entry.email);

      const score = document.createElement("span");
      score.className = "leaderboard-score";
      score.textContent = Math.floor(entry.score);

      li.append(rank, email, score);
      leaderboardList.appendChild(li);
    });
  }

  // ---------- Gesimuleerde e-mail-gate ----------
  let pendingEmail = "";
  let verifiedEmail = "";

  function showGateError(msg) {
    gateError.textContent = msg;
    gateError.classList.remove("hidden");
  }

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    gateError.classList.add("hidden");

    // Honeypot: bots vullen dit verborgen veld vaak automatisch in.
    if (gateWebsite.value.trim() !== "") {
      return; // stil negeren, geen feedback geven aan de bot
    }

    const email = gateEmail.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      showGateError("Vul een geldig e-mailadres in.");
      return;
    }
    if (!gateConsent.checked) {
      showGateError("Je moet akkoord gaan met de actievoorwaarden om mee te doen.");
      return;
    }

    pendingEmail = email;
    checkinboxEmail.textContent = email;
    showView("checkinbox");
  });

  btnGateBack.addEventListener("click", function () {
    pendingEmail = "";
    showView("landing");
  });

  btnSimVerify.addEventListener("click", function () {
    // In het echt zou dit de klik op de link in de ontvangen e-mail zijn,
    // die een token server-side laat valideren. Nu simuleren we dat direct.
    verifiedEmail = pendingEmail;
    showView("game");
    hudHighscore.textContent = getHighScore();
    overlayStart.classList.remove("hidden");
    overlayGameover.classList.add("hidden");
    draw();
  });

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
      state.obstacles.push({ lane, y: -OBSTACLE_H, scored: false });
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

    const target = laneCenter(state.lane);
    state.carX += (target - state.carX) * Math.min(1, dt * 14);

    trySpawn(dt);
    updateObstacles(dt, speed);

    state.score += speed * dt * SCORE_PER_PIXEL;

    const spawnRate = 1 / spawnIntervalAt(state.elapsed);
    state.scoreCap += speed * dt * SCORE_PER_PIXEL + spawnRate * dt * BONUS_PER_OBSTACLE * (state.elapsed > 20 ? 2 : 1);

    hudScore.textContent = Math.floor(state.score);

    if (checkCollision()) {
      endRun();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

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

    for (const ob of state.obstacles) {
      const x = laneCenter(ob.lane) - OBSTACLE_W / 2;
      drawRoundedRect(x, ob.y, OBSTACLE_W, OBSTACLE_H, 8, "#ff9d4c");
      ctx.fillStyle = "#3a2412";
      ctx.fillRect(x + 8, ob.y + 12, OBSTACLE_W - 16, 8);
      ctx.fillRect(x + 8, ob.y + 30, OBSTACLE_W - 16, 8);
    }

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

  // ---------- Flow: spel starten/eindigen ----------
  function startGame() {
    state = freshState();
    state.running = true;
    state.lastTime = performance.now();
    overlayStart.classList.add("hidden");
    overlayGameover.classList.add("hidden");
    rafId = requestAnimationFrame(loop);
  }

  function isPlausibleScore(score, elapsedSeconds, cap) {
    if (elapsedSeconds < MIN_PLAY_SECONDS) return false;
    if (score < 0) return false;
    return score <= cap * CAP_BUFFER + 20; // kleine vaste marge voor korte runs
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

    if (isPlausibleScore(finalScore, state.elapsed, state.scoreCap)) {
      addToLeaderboard(verifiedEmail, finalScore);
      leaderboardStatus.textContent = `Toegevoegd aan de ranglijst als ${maskEmail(verifiedEmail)}.`;
    } else {
      leaderboardStatus.textContent = "Deze score kon niet worden geverifieerd en telt niet mee voor de ranglijst.";
    }

    overlayGameover.classList.remove("hidden");
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);
  btnViewLeaderboard.addEventListener("click", function () {
    showView("landing");
    document.querySelector(".leaderboard-card").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ---------- Init ----------
  renderLeaderboard();
  draw();
})();
