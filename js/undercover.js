/* =========================================================
   UNDERCOVER — Moteur de jeu (pass and play)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Répartition conseillée selon le nombre de joueurs ---------- */
  /* [undercovers, mister white] — les civils restent toujours majoritaires. */
  var SUGGESTED = {
    3:  [1, 0],  4:  [1, 0],  5:  [1, 1],  6:  [1, 1],
    7:  [2, 1],  8:  [2, 1],  9:  [2, 1],  10: [3, 1],
    11: [3, 1],  12: [3, 2],  13: [3, 2],  14: [4, 2],
    15: [4, 2],  16: [4, 2],  17: [5, 2],  18: [5, 3],
    19: [5, 3],  20: [6, 3]
  };

  var MIN_PLAYERS = 3;
  var MAX_PLAYERS = 20;
  var POINTS = { civil: 2, white: 6, undercover: 10 };
  var STORE_NAMES = "uc.names";
  var STORE_SCORES = "uc.scores";

  var ROLE_LABEL = {
    civil: "Civil",
    undercover: "Undercover",
    white: "Mister White"
  };

  /* ---------- État ---------- */
  var state = {
    names: [],
    difficulty: "mix",
    autoRoles: true,
    counts: { undercover: 1, white: 1 },
    lastRoleTouched: "undercover",
    players: [],
    civilWord: "",
    undercoverWord: "",
    round: 1,
    dealIndex: 0,
    starterId: null,
    selectedVote: null,
    pendingElimination: null,
    over: false
  };

  /* ---------- Raccourcis ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  /* Comparaison souple : casse, accents, tirets et pluriels simples. */
  function normalize(str) {
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .replace(/s$/, "");
  }

  /* ---------- Stockage local (best effort) ---------- */
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignoré */ }
  }

  /* ---------- Navigation entre écrans ---------- */
  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle("is-active", screens[i].id === id);
    }
    window.scrollTo(0, 0);
  }

  /* =========================================================
     ÉCRAN 1 — Configuration
     ========================================================= */

  function playerCount() {
    return clamp(parseInt($("player-count").value, 10) || MIN_PLAYERS, MIN_PLAYERS, MAX_PLAYERS);
  }

  function renderPlayerInputs() {
    var grid = $("players-grid");
    var n = playerCount();
    grid.innerHTML = "";
    for (var i = 0; i < n; i++) {
      var row = el("div", "player-row");
      var badge = el("span", "player-index", String(i + 1));
      var input = el("input", "text-input");
      input.type = "text";
      input.maxLength = 16;
      input.autocomplete = "off";
      input.placeholder = "Joueur " + (i + 1);
      input.value = state.names[i] || "";
      input.setAttribute("aria-label", "Pseudo du joueur " + (i + 1));
      input.dataset.index = String(i);
      input.addEventListener("input", onNameInput);
      row.appendChild(badge);
      row.appendChild(input);
      grid.appendChild(row);
    }
  }

  function onNameInput(event) {
    state.names[Number(event.target.dataset.index)] = event.target.value;
    save(STORE_NAMES, state.names);
  }

  function collectNames() {
    var n = playerCount();
    var used = {};
    var names = [];
    for (var i = 0; i < n; i++) {
      var raw = (state.names[i] || "").trim();
      var name = raw || "Joueur " + (i + 1);
      if (used[name.toLowerCase()]) name = name + " " + (used[name.toLowerCase()] + 1);
      used[name.toLowerCase()] = (used[name.toLowerCase()] || 0) + 1;
      names.push(name);
    }
    return names;
  }

  /* Bornes : au moins un imposteur, et toujours plus de civils qu'eux. */
  function maxImposters(n) { return Math.max(1, Math.ceil(n / 2) - 1); }

  function applySuggestedRoles() {
    var n = playerCount();
    var suggestion = SUGGESTED[n] || [Math.max(1, Math.round(n / 4)), Math.floor(n / 7)];
    state.counts.undercover = suggestion[0];
    state.counts.white = suggestion[1];
  }

  /* Le dernier rôle ajusté est prioritaire : demander un Mister White de plus
     retire un undercover plutôt que d'être ignoré silencieusement. */
  function normalizeRoleCounts() {
    var cap = maxImposters(playerCount());
    var first = state.lastRoleTouched === "white" ? "white" : "undercover";
    var second = first === "white" ? "undercover" : "white";

    state.counts[first] = clamp(state.counts[first], 0, cap);
    state.counts[second] = clamp(state.counts[second], 0, cap - state.counts[first]);
    if (state.counts.undercover + state.counts.white === 0) state.counts[first] = 1;
  }

  function renderRoles() {
    if (state.autoRoles) applySuggestedRoles();
    normalizeRoleCounts();

    var n = playerCount();
    var civils = n - state.counts.undercover - state.counts.white;
    $("count-civil").textContent = String(civils);
    $("count-undercover").value = String(state.counts.undercover);
    $("count-white").value = String(state.counts.white);
    $("roles-box").classList.toggle("is-locked", state.autoRoles);

    var inputs = $("roles-box").querySelectorAll("input, .stepper-btn");
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = state.autoRoles;

    $("roles-hint").textContent = state.autoRoles
      ? "Répartition conseillée pour " + n + " joueurs. Les rôles sont tirés au sort à chaque partie."
      : "Maximum " + maxImposters(n) + " imposteur(s) pour " + n + " joueurs : les civils doivent rester majoritaires. "
        + "Au-delà, ajouter un rôle en retire un autre.";
  }

  function onPlayerCountChange() {
    $("player-count").value = String(playerCount());
    renderPlayerInputs();
    renderRoles();
  }

  function bindSteppers() {
    var steppers = document.querySelectorAll("[data-stepper]");
    for (var i = 0; i < steppers.length; i++) {
      (function (stepper) {
        var kind = stepper.dataset.stepper;
        var input = stepper.querySelector(".stepper-value");
        var buttons = stepper.querySelectorAll(".stepper-btn");
        for (var b = 0; b < buttons.length; b++) {
          buttons[b].addEventListener("click", function (event) {
            var step = Number(event.currentTarget.dataset.step);
            var current = parseInt(input.value, 10) || 0;
            applyStepperValue(kind, current + step);
          });
        }
        input.addEventListener("change", function () {
          applyStepperValue(kind, parseInt(input.value, 10) || 0);
        });
      })(steppers[i]);
    }
  }

  function applyStepperValue(kind, value) {
    if (kind === "players") {
      $("player-count").value = String(clamp(value, MIN_PLAYERS, MAX_PLAYERS));
      onPlayerCountChange();
      return;
    }
    state.counts[kind] = Math.max(0, value);
    state.lastRoleTouched = kind;
    renderRoles();
  }

  function bindDifficulty() {
    var group = $("difficulty");
    group.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-value]");
      if (!btn) return;
      state.difficulty = btn.dataset.value;
      var all = group.querySelectorAll("button");
      for (var i = 0; i < all.length; i++) {
        var active = all[i] === btn;
        all[i].classList.toggle("is-active", active);
        all[i].setAttribute("aria-checked", active ? "true" : "false");
      }
    });
  }

  /* =========================================================
     Démarrage d'une partie
     ========================================================= */

  function drawWordPair() {
    var pools = UNDERCOVER_WORDS;
    var level = state.difficulty;
    if (level === "mix" || !pools[level]) {
      level = pick(["facile", "moyen", "difficile"]);
    }
    var pair = pick(pools[level]);
    // Les civils reçoivent indifféremment l'un ou l'autre mot de la paire.
    return Math.random() < 0.5 ? { civil: pair[0], undercover: pair[1] }
                               : { civil: pair[1], undercover: pair[0] };
  }

  function startGame() {
    var names = collectNames();
    renderRoles();

    var roles = [];
    var i;
    for (i = 0; i < state.counts.undercover; i++) roles.push("undercover");
    for (i = 0; i < state.counts.white; i++) roles.push("white");
    while (roles.length < names.length) roles.push("civil");
    roles = shuffle(roles);

    var words = drawWordPair();
    state.civilWord = words.civil;
    state.undercoverWord = words.undercover;

    state.players = names.map(function (name, index) {
      var role = roles[index];
      return {
        id: index,
        name: name,
        role: role,
        word: role === "civil" ? words.civil : (role === "undercover" ? words.undercover : null),
        alive: true
      };
    });

    state.round = 1;
    state.dealIndex = 0;
    state.selectedVote = null;
    state.pendingElimination = null;
    state.over = false;

    save(STORE_NAMES, state.names);
    renderDeal();
    showScreen("screen-deal");
  }

  /* =========================================================
     ÉCRAN 2 — Distribution des mots
     ========================================================= */

  function renderDeal() {
    var player = state.players[state.dealIndex];
    $("deal-progress").textContent = (state.dealIndex + 1) + " / " + state.players.length;
    $("deal-name").textContent = player.name;
    $("deal-card").classList.remove("is-flipped");
    $("deal-next").disabled = true;
    $("deal-next").textContent = "J'ai vu mon mot";
    $("card-word").textContent = "—";
    $("card-note").textContent = "";
    $("card-role").textContent = "Mot secret";
  }

  function flipDealCard() {
    var card = $("deal-card");
    if (card.classList.contains("is-flipped")) return;
    var player = state.players[state.dealIndex];

    if (player.role === "white") {
      $("card-role").textContent = "Aucun mot";
      $("card-word").textContent = "MISTER WHITE";
      $("card-note").textContent = "Écoute les autres et fais comme si tu savais.";
      $("card-word").classList.add("is-white");
    } else {
      $("card-role").textContent = "Ton mot secret";
      $("card-word").textContent = player.word;
      $("card-note").textContent = "Retiens-le, personne ne doit le prononcer.";
      $("card-word").classList.remove("is-white");
    }

    card.classList.add("is-flipped");
    $("deal-next").disabled = false;
    $("deal-next").textContent = state.dealIndex === state.players.length - 1
      ? "Tout le monde a son mot"
      : "J'ai vu — masquer";
  }

  function nextDeal() {
    if (state.dealIndex < state.players.length - 1) {
      state.dealIndex++;
      renderDeal();
    } else {
      startRound(true);
    }
  }

  /* =========================================================
     ÉCRAN 3 — Manche
     ========================================================= */

  function alivePlayers() {
    return state.players.filter(function (p) { return p.alive; });
  }

  function startRound(isFirst) {
    var alive = alivePlayers();
    // Un Mister White ne commence jamais la première manche : il n'a aucun mot.
    var candidates = isFirst
      ? alive.filter(function (p) { return p.role !== "white"; })
      : alive;
    if (!candidates.length) candidates = alive;

    state.starterId = pick(candidates).id;
    renderRound();
    showScreen("screen-round");
  }

  function turnOrder() {
    var alive = alivePlayers();
    var start = 0;
    for (var i = 0; i < alive.length; i++) {
      if (alive[i].id === state.starterId) { start = i; break; }
    }
    return alive.slice(start).concat(alive.slice(0, start));
  }

  function renderRound() {
    $("round-number").textContent = String(state.round);
    $("vote-round-number").textContent = String(state.round);
    var starter = state.players.filter(function (p) { return p.id === state.starterId; })[0];
    $("starter-name").textContent = starter ? starter.name : "—";

    var list = $("turn-list");
    list.innerHTML = "";
    turnOrder().forEach(function (player, index) {
      var item = el("li", "turn-item");
      item.appendChild(el("span", "turn-index", String(index + 1)));
      item.appendChild(el("span", "turn-name", player.name));
      if (index === 0) item.appendChild(el("span", "turn-flag", "commence"));
      list.appendChild(item);
    });
  }

  /* =========================================================
     ÉCRAN 4 — Vote
     ========================================================= */

  function renderVote() {
    state.selectedVote = null;
    $("confirm-vote").disabled = true;
    var grid = $("vote-grid");
    grid.innerHTML = "";

    alivePlayers().forEach(function (player) {
      var btn = el("button", "vote-card");
      btn.type = "button";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", "false");
      btn.dataset.id = String(player.id);
      btn.appendChild(el("span", "vote-initial", player.name.charAt(0).toUpperCase()));
      btn.appendChild(el("span", "vote-name", player.name));
      btn.addEventListener("click", function () { selectVote(player.id); });
      grid.appendChild(btn);
    });
  }

  function selectVote(id) {
    state.selectedVote = id;
    var cards = $("vote-grid").querySelectorAll(".vote-card");
    for (var i = 0; i < cards.length; i++) {
      var active = Number(cards[i].dataset.id) === id;
      cards[i].classList.toggle("is-selected", active);
      cards[i].setAttribute("aria-selected", active ? "true" : "false");
    }
    $("confirm-vote").disabled = false;
  }

  function confirmVote() {
    if (state.selectedVote === null) return;
    var player = state.players.filter(function (p) { return p.id === state.selectedVote; })[0];
    player.alive = false;
    state.pendingElimination = player;
    openRevealModal(player);
  }

  /* =========================================================
     Modale de révélation + tentative de Mister White
     ========================================================= */

  function openRevealModal(player) {
    $("reveal-title").textContent = player.name + " était…";
    var badge = $("reveal-badge");
    badge.textContent = ROLE_LABEL[player.role];
    badge.className = "reveal-badge reveal-" + player.role;

    var guessForm = $("guess-form");
    var continueBtn = $("reveal-continue");

    if (player.role === "white") {
      $("reveal-text").textContent = "Dernière chance : un mot, une tentative.";
      guessForm.hidden = false;
      continueBtn.hidden = true;
      $("guess-input").value = "";
    } else {
      $("reveal-text").textContent = player.role === "undercover"
        ? "Un imposteur de moins."
        : "Les civils perdent un des leurs.";
      guessForm.hidden = true;
      continueBtn.hidden = false;
    }

    openModal("modal-reveal");
    if (player.role === "white") {
      window.setTimeout(function () { $("guess-input").focus(); }, 120);
    }
  }

  function submitGuess(event) {
    event.preventDefault();
    var guess = $("guess-input").value.trim();
    if (!guess) return;
    finishGuess(normalize(guess) === normalize(state.civilWord));
  }

  function finishGuess(correct) {
    $("guess-form").hidden = true;
    var white = state.pendingElimination;

    if (correct) {
      $("reveal-text").textContent =
        "Bien vu : le mot des civils était « " + state.civilWord + " ».";
      closeModal("modal-reveal");
      endGame("white", white.name + " a deviné le mot des civils.");
      return;
    }

    $("reveal-text").textContent =
      "Raté. Le mot des civils n'était pas celui-là — " + white.name + " quitte la partie.";
    $("reveal-continue").hidden = false;
    $("reveal-continue").focus();
  }

  function afterReveal() {
    closeModal("modal-reveal");
    state.pendingElimination = null;
    var verdict = checkVictory();
    if (verdict) {
      endGame(verdict.camp, verdict.reason);
    } else {
      state.round++;
      startRound(false);
    }
  }

  /* =========================================================
     Conditions de victoire
     ========================================================= */

  function checkVictory() {
    var alive = alivePlayers();
    var civils = alive.filter(function (p) { return p.role === "civil"; }).length;
    var imposteurs = alive.length - civils;

    if (imposteurs === 0) {
      return { camp: "civil", reason: "Tous les imposteurs ont été démasqués." };
    }
    if (civils <= imposteurs) {
      return {
        camp: "imposteurs",
        reason: "Les imposteurs sont aussi nombreux que les civils : impossible de les rattraper."
      };
    }
    return null;
  }

  /* =========================================================
     ÉCRAN 5 — Fin de partie
     ========================================================= */

  function endGame(camp, reason) {
    state.over = true;

    var titles = {
      civil: "Les civils l'emportent",
      imposteurs: "Les imposteurs l'emportent",
      white: "Mister White l'emporte",
      abandon: "Partie abandonnée"
    };
    $("end-title").textContent = titles[camp] || "Fin de partie";
    $("end-subtitle").textContent = reason || "";
    $("end-eyebrow").textContent = camp === "abandon" ? "Révélation" : "Fin de partie";
    $("end-civil-word").textContent = state.civilWord;
    $("end-undercover-word").textContent = state.undercoverWord;

    var winners = {
      civil: function (p) { return p.role === "civil"; },
      imposteurs: function (p) { return p.role !== "civil"; },
      white: function (p) { return p.role === "white"; }
    }[camp];

    var list = $("reveal-list");
    list.innerHTML = "";
    state.players.forEach(function (player) {
      var item = el("li", "reveal-item" + (player.alive ? "" : " is-out"));
      item.appendChild(el("span", "reveal-name", player.name));
      item.appendChild(el("span", "role-tag role-" + player.role, ROLE_LABEL[player.role]));
      if (winners && winners(player)) item.appendChild(el("span", "reveal-win", "+" + POINTS[player.role]));
      list.appendChild(item);
    });

    if (winners) {
      var scores = load(STORE_SCORES, {});
      state.players.forEach(function (player) {
        if (!winners(player)) return;
        scores[player.name] = (scores[player.name] || 0) + POINTS[player.role];
      });
      save(STORE_SCORES, scores);
    }

    showScreen("screen-end");
  }

  function abandonGame() {
    endGame("abandon", "Voici ce que tout le monde avait en main.");
  }

  /* =========================================================
     Scores
     ========================================================= */

  function renderScores() {
    var scores = load(STORE_SCORES, {});
    var list = $("score-list");
    list.innerHTML = "";

    var rows = Object.keys(scores).map(function (name) {
      return { name: name, points: scores[name] };
    }).sort(function (a, b) { return b.points - a.points; });

    if (!rows.length) {
      list.appendChild(el("li", "score-empty", "Aucune partie terminée pour l'instant."));
      return;
    }
    rows.forEach(function (row, index) {
      var item = el("li", "score-item");
      item.appendChild(el("span", "score-rank", String(index + 1)));
      item.appendChild(el("span", "score-name", row.name));
      item.appendChild(el("span", "score-points", row.points + " pts"));
      list.appendChild(item);
    });
  }

  /* =========================================================
     Modales
     ========================================================= */

  var lastFocused = null;

  function openModal(id) {
    lastFocused = document.activeElement;
    $(id).hidden = false;
    document.body.classList.add("modal-open");
  }
  function closeModal(id) {
    $(id).hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function bindModals() {
    var closers = document.querySelectorAll("[data-close-modal]");
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener("click", function (event) {
        closeModal(event.target.closest(".modal").id);
      });
    }
    // Un clic sur le fond ferme les modales informatives uniquement.
    ["modal-rules", "modal-scores"].forEach(function (id) {
      $(id).addEventListener("click", function (event) {
        if (event.target === $(id)) closeModal(id);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      ["modal-rules", "modal-scores"].forEach(function (id) {
        if (!$(id).hidden) closeModal(id);
      });
    });
  }

  /* =========================================================
     Initialisation
     ========================================================= */

  function init() {
    state.names = load(STORE_NAMES, []);
    if (!Array.isArray(state.names)) state.names = [];

    bindSteppers();
    bindDifficulty();
    bindModals();

    $("auto-roles").addEventListener("change", function (event) {
      state.autoRoles = event.target.checked;
      renderRoles();
    });

    $("start-game").addEventListener("click", startGame);
    $("deal-card").addEventListener("click", flipDealCard);
    $("deal-next").addEventListener("click", nextDeal);
    $("go-vote").addEventListener("click", function () {
      renderVote();
      showScreen("screen-vote");
    });
    $("back-round").addEventListener("click", function () { showScreen("screen-round"); });
    $("abandon").addEventListener("click", abandonGame);
    $("confirm-vote").addEventListener("click", confirmVote);
    $("reveal-continue").addEventListener("click", afterReveal);
    $("guess-form").addEventListener("submit", submitGuess);
    $("guess-skip").addEventListener("click", function () { finishGuess(false); });

    $("replay").addEventListener("click", startGame);
    $("new-setup").addEventListener("click", function () { showScreen("screen-setup"); });

    $("open-rules").addEventListener("click", function () { openModal("modal-rules"); });
    $("open-scores").addEventListener("click", function () {
      renderScores();
      openModal("modal-scores");
    });
    $("reset-scores").addEventListener("click", function () {
      save(STORE_SCORES, {});
      renderScores();
    });

    onPlayerCountChange();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
