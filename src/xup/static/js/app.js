"use strict";

// ─── State ───────────────────────────────────────────────────────────────────

const lobby = document.getElementById("lobby");
if (!lobby) throw new Error("Not on lobby page");

const PARTY_CODE = lobby.dataset.partyCode;
const CURRENT_USER_ID = lobby.dataset.userId;

let shotCount = 1;
let ws = null;
let reconnectDelay = 1500;
let reconnectTimer = null;

// ─── WebSocket ───────────────────────────────────────────────────────────────

async function connect() {
  try {
    const res = await fetch("/challenge/ws-ticket");
    if (!res.ok) { scheduleReconnect(); return; }
    const { ticket } = await res.json();

    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws/${PARTY_CODE}?ticket=${ticket}`);

    ws.onopen = () => {
      reconnectDelay = 1500;
      console.log("[XUP] Connected");
    };

    ws.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data));
      } catch (e) {
        console.error("[XUP] Message parse error", e);
      }
    };

    ws.onclose = () => {
      console.log("[XUP] Disconnected");
      scheduleReconnect();
    };

    ws.onerror = () => ws.close();

  } catch (e) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
}

// ─── Message handlers ────────────────────────────────────────────────────────

function handleMessage(msg) {
  switch (msg.type) {
    case "member_joined":   onMemberJoined(msg); break;
    case "member_offline":  onMemberOffline(msg); break;
    case "challenge_issued": onChallengeIssued(msg); break;
    case "challenge_result": onChallengeResult(msg); break;
    case "challenge_declined": onChallengeDeclined(msg); break;
  }
}

function onMemberJoined(msg) {
  // Add member card if not already present
  if (!document.getElementById(`member-${msg.user_id}`)) {
    const list = document.getElementById("members-list");
    const div = document.createElement("div");
    div.id = `member-${msg.user_id}`;
    div.className = "flex items-center justify-between p-3 bg-gray-800 rounded-xl animate-fade-in";
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
          ${msg.username[0].toUpperCase()}
        </div>
        <div>
          <p class="font-semibold text-sm">${escHtml(msg.username)}</p>
          <p class="text-xs text-gray-500">🏆 0  💀 0</p>
        </div>
      </div>
      <button
        onclick="openChallengeModal('${msg.user_id}', '${escHtml(msg.username)}')"
        class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold active:scale-95 transition-transform"
      >CHALLENGE</button>
    `;
    list.appendChild(div);
    updateMemberCount(1);
  } else {
    // Re-activate if was offline
    const el = document.getElementById(`member-${msg.user_id}`);
    el.classList.remove("opacity-40");
  }
  showToast(`${msg.username} joined the party 🎉`);
}

function onMemberOffline(msg) {
  const el = document.getElementById(`member-${msg.user_id}`);
  if (el) el.classList.add("opacity-40");
}

function onChallengeIssued(msg) {
  removeNoChallengesMsg();
  const list = document.getElementById("challenges-list");
  const isTarget = msg.target_id === CURRENT_USER_ID;

  const div = document.createElement("div");
  div.id = `challenge-${msg.challenge_id}`;
  div.className = "p-3 bg-gray-800 rounded-xl border border-gray-700 animate-fade-in";
  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <p class="text-sm">
        <span class="font-bold text-purple-300">${escHtml(msg.challenger_username)}</span>
        <span class="text-gray-500"> challenged </span>
        <span class="font-bold ${isTarget ? "text-pink-300" : "text-white"}">
          ${escHtml(msg.target_username)}${isTarget ? " (you!)" : ""}
        </span>
      </p>
      <span class="text-amber-400 font-bold text-sm">${msg.shots} 🥃</span>
    </div>
    ${isTarget ? `
    <div class="flex gap-2 mt-2">
      <button onclick="respondToChallenge('${msg.challenge_id}', true)"
        class="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-sm font-bold active:scale-95 transition-all">
        Accept ✅
      </button>
      <button onclick="respondToChallenge('${msg.challenge_id}', false)"
        class="flex-1 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-sm font-bold active:scale-95 transition-all">
        Decline ❌
      </button>
    </div>` : ""}
  `;
  list.appendChild(div);

  if (isTarget) {
    showToast(`${msg.challenger_username} challenged you for ${msg.shots} shot${msg.shots > 1 ? "s" : ""}! 🎯`, "challenge");
  }
}

function onChallengeResult(msg) {
  removeChallengeCard(msg.challenge_id);
  showCoinFlip(msg);
}

function onChallengeDeclined(msg) {
  removeChallengeCard(msg.challenge_id);
  showToast(`${msg.decliner_username} declined the challenge.`, "info");
}

// ─── Coin flip ───────────────────────────────────────────────────────────────

function showCoinFlip(msg) {
  const overlay = document.getElementById("flip-overlay");
  const coin = document.getElementById("coin");
  const result = document.getElementById("flip-result");
  const winnerText = document.getElementById("flip-winner-text");
  const detailText = document.getElementById("flip-detail-text");
  const dismissBtn = document.getElementById("flip-dismiss");

  const isWinner = msg.winner_id === CURRENT_USER_ID;

  // Reset state
  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
  result.classList.add("hidden");
  dismissBtn.classList.add("hidden");
  coin.classList.remove("coin-spin");
  void coin.offsetWidth; // Force reflow to restart animation
  coin.classList.add("coin-spin");

  // After animation, show result
  setTimeout(() => {
    coin.textContent = isWinner ? "🏆" : "💀";
    result.classList.remove("hidden");
    dismissBtn.classList.remove("hidden");

    if (isWinner) {
      winnerText.textContent = "YOU WIN! 🎉";
      winnerText.className = "text-3xl font-black text-green-400";
      detailText.textContent = `${msg.loser_username} drinks ${msg.shots} shot${msg.shots > 1 ? "s" : ""}!`;
    } else {
      winnerText.textContent = "YOU LOSE 💀";
      winnerText.className = "text-3xl font-black text-red-400";
      detailText.textContent = `Drink ${msg.shots} shot${msg.shots > 1 ? "s" : ""}. Cheers 🥃`;
    }
  }, 2400);
}

function dismissFlip() {
  const overlay = document.getElementById("flip-overlay");
  overlay.classList.add("hidden");
  overlay.classList.remove("flex");
  document.getElementById("coin").textContent = "🪙";
}

// ─── Challenge modal ──────────────────────────────────────────────────────────

function openChallengeModal(targetId, targetUsername) {
  document.getElementById("modal-target-id").value = targetId;
  document.getElementById("modal-target-name").textContent = targetUsername;
  shotCount = 1;
  document.getElementById("shots-display").textContent = shotCount;
  document.getElementById("challenge-modal").classList.remove("hidden");
  document.getElementById("challenge-modal").classList.add("flex");
}

function closeModal() {
  document.getElementById("challenge-modal").classList.add("hidden");
  document.getElementById("challenge-modal").classList.remove("flex");
}

function adjustShots(delta) {
  shotCount = Math.max(1, Math.min(10, shotCount + delta));
  document.getElementById("shots-display").textContent = shotCount;
}

async function sendChallenge() {
  const targetId = document.getElementById("modal-target-id").value;
  closeModal();

  try {
    const res = await fetch("/challenge/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        party_code: PARTY_CODE,
        target_id: targetId,
        shots: shotCount,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.detail || "Failed to send challenge.", "error");
    }
  } catch {
    showToast("Network error. Try again.", "error");
  }
}

async function respondToChallenge(challengeId, accept) {
  // Immediately remove buttons to prevent double-tap
  const card = document.getElementById(`challenge-${challengeId}`);
  if (card) {
    const btns = card.querySelectorAll("button");
    btns.forEach(b => b.disabled = true);
  }

  try {
    const res = await fetch(`/challenge/${challengeId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.detail || "Failed to respond.", "error");
      // Re-enable buttons on error
      if (card) {
        const btns = card.querySelectorAll("button");
        btns.forEach(b => b.disabled = false);
      }
    }
  } catch {
    showToast("Network error. Try again.", "error");
  }
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Party code ${code} copied! 📋`);
  });
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const colors = {
    info: "bg-gray-800 border-gray-700 text-gray-200",
    challenge: "bg-purple-900 border-purple-700 text-purple-100",
    error: "bg-red-950 border-red-800 text-red-200",
  };
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-fade-in ${colors[type] || colors.info}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.4s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function removeChallengeCard(challengeId) {
  const el = document.getElementById(`challenge-${challengeId}`);
  if (el) el.remove();
  checkNoChallenges();
}

function removeNoChallengesMsg() {
  const msg = document.getElementById("no-challenges-msg");
  if (msg) msg.remove();
}

function checkNoChallenges() {
  const list = document.getElementById("challenges-list");
  if (list.children.length === 0) {
    const p = document.createElement("p");
    p.id = "no-challenges-msg";
    p.className = "text-gray-600 text-sm text-center py-2";
    p.textContent = "No active challenges";
    list.appendChild(p);
  }
}

function updateMemberCount(delta) {
  const el = document.getElementById("member-count");
  if (el) el.textContent = parseInt(el.textContent) + delta;
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}

// ─── Init ─────────────────────────────────────────────────────────────────────

connect();
