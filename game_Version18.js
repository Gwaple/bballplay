// --- Account System ---
let currentUser = null;

function hash(str) {
  // Simple hash for demo purposes (not secure!)
  let h = 0; for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0; return h.toString();
}
function getAccounts() {
  return JSON.parse(localStorage.getItem("bball2p_accounts") || "{}");
}
function saveAccounts(accounts) {
  localStorage.setItem("bball2p_accounts", JSON.stringify(accounts));
}
function login() {
  let u = document.getElementById("loginUser").value.trim();
  let p = document.getElementById("loginPass").value;
  let accounts = getAccounts();
  if (accounts[u] && accounts[u].pw === hash(p)) {
    currentUser = u;
    document.getElementById("authArea").style.display = "none";
    document.getElementById("gameArea").style.display = "";
    loadProgress(); // Load user progress
    restartGame();
    document.getElementById("loginMsg").textContent = "";
  } else {
    document.getElementById("loginMsg").textContent = "Invalid username or password.";
  }
}
function logout() {
  currentUser = null;
  document.getElementById("gameArea").style.display = "none";
  document.getElementById("authArea").style.display = "";
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
}
function showRegister() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "";
  document.getElementById("registerMsg").textContent = "";
}
function showLogin() {
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("loginBox").style.display = "";
  document.getElementById("loginMsg").textContent = "";
}
function register() {
  let u = document.getElementById("regUser").value.trim();
  let p = document.getElementById("regPass").value;
  let accounts = getAccounts();
  if (!u || !p) {
    document.getElementById("registerMsg").textContent = "Username and password required.";
    return;
  }
  if (accounts[u]) {
    document.getElementById("registerMsg").textContent = "Username already taken.";
    return;
  }
  accounts[u] = { pw: hash(p), score: [0,0] };
  saveAccounts(accounts);
  document.getElementById("registerMsg").textContent = "Account created. Please login.";
  setTimeout(showLogin, 1200);
}

// --- Game Logic ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GROUND = canvas.height - 40;
const PLAYER_RADIUS = 28;
const BALL_RADIUS = 12;
const HOOP_X = [80, canvas.width - 80];
const HOOP_Y = 120;
const HOOP_RIM = 40;

let players = [
  { x: 150, y: GROUND, vx: 0, vy: 0, color: "#2196f3", score: 0, left: 65, right: 68, up: 87, shoot: 32, holding: true },
  { x: canvas.width - 150, y: GROUND, vx: 0, vy: 0, color: "#f44336", score: 0, left: 37, right: 39, up: 38, shoot: 13, holding: false }
];
let ball = { x: players[0].x, y: players[0].y - PLAYER_RADIUS, vx: 0, vy: 0, heldBy: 0 };

let keys = {};
let gameOver = false;

// --- Progress Save/Load tied to accounts ---
function saveProgress() {
  if (!currentUser) { setSaveStatus("Login to save!"); return; }
  let accounts = getAccounts();
  accounts[currentUser].score = [players[0].score, players[1].score];
  saveAccounts(accounts);
  setSaveStatus("Progress saved!");
}
function loadProgress() {
  if (!currentUser) { setSaveStatus("Login to load!"); return; }
  let accounts = getAccounts();
  if (accounts[currentUser] && accounts[currentUser].score) {
    players[0].score = accounts[currentUser].score[0];
    players[1].score = accounts[currentUser].score[1];
    setSaveStatus("Progress loaded!");
  } else {
    players[0].score = 0; players[1].score = 0;
    setSaveStatus("No saved progress found.");
  }
}
function setSaveStatus(msg) {
  document.getElementById("saveStatus").textContent = msg;
  setTimeout(() => {
    document.getElementById("saveStatus").textContent = "";
  }, 2000);
}

// --- Input ---
document.addEventListener("keydown", (e) => keys[e.keyCode] = true);
document.addEventListener("keyup", (e) => keys[e.keyCode] = false);

// --- Game Logic ---
function restartGame() {
  players[0].x = 150; players[0].y = GROUND; players[0].vx = 0; players[0].vy = 0; players[0].holding = true;
  players[1].x = canvas.width - 150; players[1].y = GROUND; players[1].vx = 0; players[1].vy = 0; players[1].holding = false;
  ball.x = players[0].x; ball.y = players[0].y - PLAYER_RADIUS; ball.vx = 0; ball.vy = 0; ball.heldBy = 0;
  gameOver = false;
  loop();
}

function loop() {
  update();
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

function update() {
  // Player controls
  players.forEach((p, i) => {
    if (keys[p.left]) p.x -= 5;
    if (keys[p.right]) p.x += 5;
    if (keys[p.up] && p.y === GROUND) { p.vy = -12; }
    // Don't go off screen
    p.x = Math.max(PLAYER_RADIUS, Math.min(canvas.width - PLAYER_RADIUS, p.x));
  });

  players.forEach((p, i) => {
    p.vy += 0.7; // gravity
    p.y += p.vy;
    if (p.y > GROUND) { p.y = GROUND; p.vy = 0; }
  });

  // Ball follows player if held
  if (ball.heldBy !== null) {
    let p = players[ball.heldBy];
    ball.x = p.x;
    ball.y = p.y - PLAYER_RADIUS;
    ball.vx = 0; ball.vy = 0;
    // Shoot
    if (keys[players[ball.heldBy].shoot]) {
      let power = 13;
      let dir = ball.heldBy === 0 ? 1 : -1;
      ball.vx = dir * (7 + Math.random() * 2);
      ball.vy = -power + Math.random() * 2;
      ball.heldBy = null;
      players[0].holding = false;
      players[1].holding = false;
    }
  } else {
    // Ball physics
    ball.vy += 0.7;
    ball.x += ball.vx;
    ball.y += ball.vy;
    // Floor
    if (ball.y + BALL_RADIUS > GROUND) {
      ball.y = GROUND - BALL_RADIUS;
      ball.vy *= -0.5; // bounce
      ball.vx *= 0.7;
      if (Math.abs(ball.vy) < 2) ball.vy = 0;
    }
    // Walls
    if (ball.x - BALL_RADIUS < 0 || ball.x + BALL_RADIUS > canvas.width) {
      ball.vx *= -1;
      ball.x = Math.max(BALL_RADIUS, Math.min(canvas.width - BALL_RADIUS, ball.x));
    }
    // Pick up
    players.forEach((p, i) => {
      let dx = ball.x - p.x, dy = ball.y - (p.y - PLAYER_RADIUS);
      if (!p.holding && Math.abs(dx) < PLAYER_RADIUS && Math.abs(dy) < PLAYER_RADIUS && ball.vy < 2 && ball.vx < 2) {
        ball.heldBy = i;
        p.holding = true;
        players[1-i].holding = false;
      }
    });
    // Check for hoop score
    for (let i = 0; i < 2; ++i) {
      if (
        ball.x > HOOP_X[i] - HOOP_RIM/2 && ball.x < HOOP_X[i] + HOOP_RIM/2 &&
        ball.y - BALL_RADIUS < HOOP_Y + 10 && ball.y - BALL_RADIUS > HOOP_Y - 30 &&
        ball.vy > 0
      ) {
        players[i].score++;
        saveProgress(); // Auto-save on score
        resetAfterScore(i);
        return;
      }
    }
  }
}

function resetAfterScore(scoringPlayer) {
  // Give ball to scoring player
  players.forEach((p,i) => { p.x = (i === 0 ? 150 : canvas.width-150); p.y = GROUND; p.vx = 0; p.vy = 0; p.holding = false; });
  ball.x = players[scoringPlayer].x;
  ball.y = players[scoringPlayer].y - PLAYER_RADIUS;
  ball.vx = 0; ball.vy = 0; ball.heldBy = scoringPlayer;
  players[scoringPlayer].holding = true;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Draw ground
  ctx.fillStyle = "#8bc34a";
  ctx.fillRect(0, GROUND, canvas.width, canvas.height-GROUND);

  // Draw hoops
  for (let i = 0; i < 2; ++i) {
    ctx.save();
    ctx.strokeStyle = "#ff9800";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(HOOP_X[i], HOOP_Y, HOOP_RIM/2, 0, Math.PI, false);
    ctx.stroke();
    ctx.restore();
    // Backboard
    ctx.fillStyle = "#607d8b";
    ctx.fillRect(HOOP_X[i]-HOOP_RIM/2, HOOP_Y-30, HOOP_RIM, 8);
  }

  // Draw players
  players.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
  });

  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI*2);
  ctx.fillStyle = "#ffa726";
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.stroke();

  // Scores
  ctx.fillStyle = "#333";
  ctx.font = "28px Arial";
  ctx.fillText("P1: "+players[0].score, 60, 40);
  ctx.fillText("P2: "+players[1].score, canvas.width-140, 40);
}

// --- Start ---
window.onload = () => {
  document.getElementById("authArea").style.display = "";
  document.getElementById("gameArea").style.display = "none";
  showLogin();
};