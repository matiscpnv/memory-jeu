// === À PERSONNALISER ===
// Image du dos des cartes
const BACK_IMAGE = "./images/back.png"; // ← ton image ici

// 10 images de face (une par paire) avec leurs noms / emojis
const FRONT_IMAGES = [
  { src: "./images/chien.png", name: "chien 🐶" },
  { src: "./images/chat.png", name: "chat 🐱" },
  { src: "./images/pomme.png", name: "pomme 🍎" },
  { src: "./images/soleil.png", name: "soleil ☀️" },
  { src: "./images/fleur.png", name: "fleur 🌸" },
  { src: "./images/voiture.png", name: "voiture 🚗" },
  { src: "./images/livre.png", name: "livre 📘" },
  { src: "./images/musique.png", name: "note de musique 🎵" },
  { src: "./images/maison.png", name: "maison 🏠" },
  { src: "./images/coeur.png", name: "cœur ❤️" },
];
// === Fin de la zone à personnaliser ===

const GRID_COLS = 5,
  GRID_ROWS = 4; // 5×4 = 20 cartes
const TOTAL_CARDS = GRID_COLS * GRID_ROWS;
const TOTAL_PAIRS = TOTAL_CARDS / 2;

// === RÉFÉRENCES DOM ===
const boardEl = document.getElementById("board");
const movesEl = document.getElementById("moves");
const pairsEl = document.getElementById("pairs");
const finishedEl = document.getElementById("finished");
const moves2El = document.getElementById("moves2");
const resetBtn = document.getElementById("reset");
const foundInfoEl = document.getElementById("found-info");

let deck = [];
let firstCard = null;
let secondCard = null;
let lock = false;
let moves = 0;
let foundPairs = 0;

// === UTILS ===
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// === CONSTRUCTION DU PLATEAU ===
function buildDeck() {
  const base = FRONT_IMAGES.slice(0, TOTAL_PAIRS);
  deck = shuffle([...base, ...base]); // on duplique puis on mélange
}

function createCard(cardData, index) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.image = cardData.src;
  card.dataset.name = cardData.name;
  card.dataset.index = index;

  const inner = document.createElement("div");
  inner.className = "inner";

  const back = document.createElement("div");
  back.className = "face back";
  const backImg = document.createElement("img");
  backImg.src = BACK_IMAGE;
  back.appendChild(backImg);

  const front = document.createElement("div");
  front.className = "face front";
  const frontImg = document.createElement("img");
  frontImg.src = cardData.src;
  front.appendChild(frontImg);

  inner.appendChild(back);
  inner.appendChild(front);
  card.appendChild(inner);

  card.addEventListener("click", () => onCardClick(card));
  return card;
}

function renderBoard() {
  boardEl.innerHTML = "";
  deck.forEach((cardData, i) => boardEl.appendChild(createCard(cardData, i)));
}

// === GESTION DU JEU ===
function resetStats() {
  moves = 0;
  foundPairs = 0;
  movesEl.textContent = moves;
  pairsEl.textContent = foundPairs;
  finishedEl.classList.remove("show");
  foundInfoEl.innerHTML = "";
}

function flip(card) {
  card.classList.add("flipped");
}
function unflip(card) {
  card.classList.remove("flipped");
}

function onCardClick(card) {
  if (lock) return;
  if (card.classList.contains("flipped")) return;

  flip(card);
  if (!firstCard) {
    firstCard = card;
    return;
  }

  if (card === firstCard) return;

  secondCard = card;
  lock = true;
  moves++;
  movesEl.textContent = moves;

  const isMatch = firstCard.dataset.image === secondCard.dataset.image;
  if (isMatch) {
    firstCard.querySelector(".inner").style.cursor = "default";
    secondCard.querySelector(".inner").style.cursor = "default";

    const foundCard = FRONT_IMAGES.find(
      (c) => c.src === firstCard.dataset.image
    );
    if (foundCard) {
      foundInfoEl.innerHTML = `✨ Tu as trouvé la carte « ${foundCard.name} » !`;
    }

    firstCard = null;
    secondCard = null;
    lock = false;
    foundPairs++;
    pairsEl.textContent = foundPairs;

    if (foundPairs === TOTAL_PAIRS) {
      moves2El.textContent = moves;
      finishedEl.classList.add("show");
      showEndScreen();
    }
  } else {
    setTimeout(() => {
      unflip(firstCard);
      unflip(secondCard);
      firstCard = null;
      secondCard = null;
      lock = false;
    }, 700);
  }
}

function preloadImages(urls) {
  urls.forEach((u) => {
    const img = new Image();
    img.src = u;
  });
}

function startGame() {
  resetStats();
  buildDeck();
  renderBoard();
  preloadImages([BACK_IMAGE, ...FRONT_IMAGES.map((c) => c.src)]);
}

resetBtn.addEventListener("click", startGame);
startGame();

// === PAGE DE FIN + CLASSEMENT FIREBASE ===

// Affiche un petit formulaire pour entrer le prénom
function showEndScreen() {
  foundInfoEl.innerHTML = `
    <div class="score-form">
      <h3>🎉 Bravo, tu as trouvé toutes les cartes !</h3>
      <p>Entre ton prénom pour enregistrer ton score :</p>
      <input type="text" id="player-name" placeholder="Ton prénom" maxlength="15" />
      <button id="save-score">Enregistrer</button>
    </div>
    <div id="leaderboard" class="leaderboard"></div>
  `;

  document
    .getElementById("save-score")
    .addEventListener("click", savePlayerScore);
}

// Enregistre le score sur Firebase
function savePlayerScore() {
  const name = document.getElementById("player-name").value.trim();
  if (!name) {
    alert("Entre ton prénom avant d’enregistrer ton score !");
    return;
  }

  const scoreData = {
    name,
    score: moves,
    date: new Date().toISOString(),
  };

  // 🔥 Envoie sur Firebase
  db.ref("scores").push(scoreData, (err) => {
    if (err) {
      alert("Erreur lors de l’enregistrement du score : " + err);
    } else {
      showLeaderboard();
    }
  });
}

// Affiche le classement global (Top 10)
function showLeaderboard() {
  db.ref("scores")
    .orderByChild("score")
    .limitToFirst(10)
    .once("value", (snapshot) => {
      const data = snapshot.val();
      const board = document.getElementById("leaderboard");
      if (!data) {
        board.innerHTML = "<p>Aucun score pour le moment.</p>";
        return;
      }

      let html = "<h3>🏆 Classement mondial</h3><ol>";
      Object.values(data).forEach((item) => {
        html += `<li><b>${item.name}</b> — ${item.score} coups</li>`;
      });
      html += "</ol>";
      board.innerHTML = html;
    });
}

// === DÉMO AUTOMATIQUE SI PAS D’IMAGES ===
if (FRONT_IMAGES.length === 0) {
  const demo = Array.from({ length: TOTAL_PAIRS }, (_, i) => ({
    src: `https://picsum.photos/seed/demo${i}/300/300`,
    name: `image ${i + 1}`,
  }));
  FRONT_IMAGES.push(...demo);
}
startGame();
// 🧪 Appuyer sur "G" pour gagner instantanément (mode test)
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "g") {
    foundPairs = TOTAL_PAIRS;
    movesEl.textContent = moves;
    pairsEl.textContent = foundPairs;
    finishedEl.classList.add("show");
    showEndScreen();
  }
});
