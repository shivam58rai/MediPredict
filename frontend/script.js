/* ─────────────────────────────────────────────────────────
   MediPredict – script.js
   Connects the symptom-picker UI to the Flask /predict API
   ───────────────────────────────────────────────────────── */

const API_BASE = "";

// ── DOM refs ──────────────────────────────────────────────
const symptomsGrid    = document.getElementById("symptoms-grid");
const symptomSearch   = document.getElementById("symptom-search");
const clearSearch     = document.getElementById("clear-search");
const pillsContainer  = document.getElementById("pills-container");
const selectedCount   = document.getElementById("selected-count");
const clearAllBtn     = document.getElementById("clear-all-btn");
const predictBtn      = document.getElementById("predict-btn");
const btnText         = predictBtn.querySelector(".btn-text");
const btnLoader       = predictBtn.querySelector(".btn-loader");
const errorBanner     = document.getElementById("error-banner");
const errorMsg        = document.getElementById("error-msg");
const resultSection   = document.getElementById("result-section");
const resultDisease   = document.getElementById("result-disease");
const confidencePct   = document.getElementById("confidence-pct");
const progressFill    = document.getElementById("progress-fill");
const top3List        = document.getElementById("top3-list");
const predictAgainBtn = document.getElementById("predict-again-btn");
const searchSection   = document.querySelector(".search-section");

// ── State ─────────────────────────────────────────────────
let allSymptoms = [];
const selected  = new Set();

// ── Helpers ───────────────────────────────────────────────
const fmt = s => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.remove("hidden");
  setTimeout(() => errorBanner.classList.add("hidden"), 4000);
}

function hideError() { errorBanner.classList.add("hidden"); }

function setLoading(on) {
  if (on) {
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
    predictBtn.disabled = true;
  } else {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
    predictBtn.disabled = false;
  }
}

// ── Fetch symptom list from Flask ─────────────────────────
async function loadSymptoms() {
  try {
    const res  = await fetch(`${API_BASE}/symptoms`);
    const data = await res.json();
    allSymptoms = data.symptoms;
    renderSymptoms(allSymptoms);
  } catch {
    symptomsGrid.innerHTML = `
      <div class="loading-symptoms" style="flex-direction:column;gap:8px;">
        <span style="font-size:2rem">⚠️</span>
        <span style="color:#ef4444;font-weight:600">Could not connect to backend</span>
        <span style="font-size:0.8rem;color:#94a3b8">Make sure <code>python app.py</code> is running on port 5000</span>
      </div>`;
  }
}

// ── Render checkbox grid ──────────────────────────────────
function renderSymptoms(list) {
  symptomsGrid.innerHTML = "";
  if (!list.length) {
    symptomsGrid.innerHTML = `<div class="loading-symptoms"><span>No symptoms match your search.</span></div>`;
    return;
  }

  list.forEach(sym => {
    const isSelected = selected.has(sym);
    const item = document.createElement("div");
    item.className = `symptom-item${isSelected ? " selected" : ""}`;
    item.dataset.sym = sym;
    item.innerHTML = `
      <div class="sym-checkbox">
        <span class="sym-check-icon">✓</span>
      </div>
      <span class="sym-label">${fmt(sym)}</span>`;
    item.addEventListener("click", () => toggleSymptom(sym, item));
    symptomsGrid.appendChild(item);
  });
}

// ── Toggle a symptom on / off ─────────────────────────────
function toggleSymptom(sym, itemEl) {
  if (selected.has(sym)) {
    selected.delete(sym);
    itemEl.classList.remove("selected");
  } else {
    selected.add(sym);
    itemEl.classList.add("selected");
  }
  updatePills();
  updateCount();
  hideError();
}

// ── Pills (selected symptom badges) ──────────────────────
function updatePills() {
  pillsContainer.innerHTML = "";
  if (selected.size === 0) {
    pillsContainer.innerHTML = `<span class="no-pills-text">None selected</span>`;
    return;
  }
  selected.forEach(sym => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.innerHTML = `${fmt(sym)} <span class="pill-remove">✕</span>`;
    pill.addEventListener("click", () => {
      selected.delete(sym);
      // also deselect in grid
      const gridItem = symptomsGrid.querySelector(`[data-sym="${sym}"]`);
      if (gridItem) gridItem.classList.remove("selected");
      updatePills();
      updateCount();
    });
    pillsContainer.appendChild(pill);
  });
}

function updateCount() {
  selectedCount.textContent = `${selected.size} symptom${selected.size !== 1 ? "s" : ""} selected`;
}

// ── Search / filter ───────────────────────────────────────
symptomSearch.addEventListener("input", () => {
  const q = symptomSearch.value.toLowerCase().trim();
  const filtered = q
    ? allSymptoms.filter(s => s.replace(/_/g," ").includes(q))
    : allSymptoms;
  renderSymptoms(filtered);
  // restore selected states
  filtered.forEach(sym => {
    if (selected.has(sym)) {
      const el = symptomsGrid.querySelector(`[data-sym="${sym}"]`);
      if (el) el.classList.add("selected");
    }
  });
});

clearSearch.addEventListener("click", () => {
  symptomSearch.value = "";
  renderSymptoms(allSymptoms);
  selected.forEach(sym => {
    const el = symptomsGrid.querySelector(`[data-sym="${sym}"]`);
    if (el) el.classList.add("selected");
  });
});

// ── Clear all ─────────────────────────────────────────────
clearAllBtn.addEventListener("click", () => {
  selected.clear();
  document.querySelectorAll(".symptom-item.selected").forEach(el => el.classList.remove("selected"));
  updatePills();
  updateCount();
});

// ── Predict ───────────────────────────────────────────────
predictBtn.addEventListener("click", async () => {
  if (selected.size === 0) { showError("Please select at least one symptom."); return; }
  hideError();
  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ symptoms: [...selected] }),
    });

    const data = await res.json();
    if (!res.ok || data.error) { showError(data.error || "Prediction failed."); setLoading(false); return; }

    showResult(data);
  } catch (e) {
    showError("Could not reach the backend. Is Flask running?");
  }
  setLoading(false);
});

// ── Display result ────────────────────────────────────────
function showResult({ disease, confidence, top3 }) {
  resultDisease.textContent = disease;
  confidencePct.textContent = `${confidence.toFixed(1)}%`;

  // Animate progress bar
  progressFill.style.width = "0%";
  requestAnimationFrame(() => {
    setTimeout(() => { progressFill.style.width = `${confidence}%`; }, 80);
  });

  // Top-3 list
  top3List.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉"];
  top3.forEach(({ disease: d, confidence: c }, i) => {
    const item = document.createElement("div");
    item.className = "top3-item";
    item.style.animationDelay = `${0.05 + i * 0.07}s`;
    item.innerHTML = `
      <div class="top3-rank">${medals[i] || i + 1}</div>
      <span class="top3-name">${d}</span>
      <div class="top3-bar-wrap">
        <div class="top3-bar-fill" style="width:0%" data-pct="${c}"></div>
      </div>
      <span class="top3-pct">${c.toFixed(1)}%</span>`;
    top3List.appendChild(item);
  });

  // Animate mini bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".top3-bar-fill").forEach(el => {
        el.style.width = `${el.dataset.pct}%`;
      });
    }, 200);
  });

  // Show result, hide search
  searchSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Predict Again ─────────────────────────────────────────
predictAgainBtn.addEventListener("click", () => {
  resultSection.classList.add("hidden");
  searchSection.classList.remove("hidden");
  // Reset progress
  progressFill.style.width = "0%";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Init ──────────────────────────────────────────────────
loadSymptoms();
