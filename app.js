import { CONFIG } from "./config.js";
import { createStore } from "./store.js";
import { addInterval, daysBetween, lastDone, dueDate, notificationText, intervalLabel } from "./schedule.js";

const store = createStore();
const $ = id => document.getElementById(id);
let state = { tasks: [], completions: [] };
let openTaskId = null; // fiche ouverte (id, "new" ou null)

/* ---------- Dates ---------- */
function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fr(iso, opts = { day: "numeric", month: "short", year: "numeric" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", opts);
}
function inWords(n) {
  if (n === 0) return "Aujourd'hui";
  const a = Math.abs(n);
  let s;
  if (a < 14) s = a + " j";
  else if (a < 60) s = Math.round(a / 7) + " sem.";
  else if (a < 365) s = Math.round(a / 30.4) + " mois";
  else s = (Math.round(a / 36.5) / 10).toString().replace(".", ",").replace(/,0$/, "") + " an" + (a >= 730 ? "s" : "");
  return n < 0 ? "Retard " + s : "Dans " + s;
}

/* ---------- Statut d'une tâche ---------- */
function status(task) {
  const last = lastDone(state.completions, task.id);
  if (!last) return { key: "idle", last: null, due: null, left: null, pct: 0 };
  const due = dueDate(task, last);
  const today = todayISO();
  const total = Math.max(1, daysBetween(last, due));
  const left = daysBetween(today, due);
  const pct = Math.min(100, Math.max(4, (daysBetween(last, today) / total) * 100));
  const soonLimit = Math.max(3, Math.min(14, Math.round(total * 0.2)));
  const key = left <= 0 ? "late" : left <= soonLimit ? "soon" : "ok";
  return { key, last, due, left, pct };
}

/* ---------- Rendu ---------- */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function tileHTML(t, s) {
  const pill = s.key === "idle" ? "À noter" : inWords(s.left);
  const last = s.last ? "Fait le " + fr(s.last, { day: "numeric", month: "short" }) : "Pas encore fait";
  return `<button class="tile ${s.key}" data-id="${t.id}">
    <div class="row"><span class="emo">${esc(t.emoji)}</span><span class="pill">${pill}</span></div>
    <span class="name">${esc(t.name)}</span>
    <div class="bar"><span style="width:${s.pct}%"></span></div>
    <span class="last">${last}</span>
  </button>`;
}

function render() {
  $("today").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase());
  const items = state.tasks.map(t => ({ t, s: status(t) }));
  const todo = items.filter(x => x.s.key === "late" || x.s.key === "soon").sort((a, b) => a.s.left - b.s.left);
  const later = items.filter(x => x.s.key === "ok").sort((a, b) => a.s.left - b.s.left);
  const idle = items.filter(x => x.s.key === "idle");

  const late = items.filter(x => x.s.key === "late").length;
  const soon = items.filter(x => x.s.key === "soon").length;
  $("summary").innerHTML =
    (late ? `<span class="chip late"><i></i>${late} à refaire</span>` : "") +
    (soon ? `<span class="chip soon"><i></i>${soon} bientôt</span>` : "") +
    (later.length ? `<span class="chip ok"><i></i>${later.length} au calme</span>` : "") +
    (idle.length ? `<span class="chip idle"><i></i>${idle.length} à noter</span>` : "");

  const section = (title, list, extra = "") =>
    list.length || extra ? `<section class="section"><h2>${title}</h2><div class="grid">${list.map(x => tileHTML(x.t, x.s)).join("")}${extra}</div></section>` : "";
  const addBtn = `<button class="add" data-id="new"><b>+</b>Ajouter une tâche</button>`;
  $("board").innerHTML =
    `<div style="display:flex;flex-direction:column;gap:22px">` +
    section("À faire bientôt", todo) +
    section("Plus tard", later) +
    section("Jamais notées", idle) +
    section(items.length ? "" : "Aucune tâche", [], addBtn).replace("<h2></h2>", "") +
    `</div>`;

  $("mode").textContent = store.mode === "local"
    ? "Mode essai : les données restent sur ce téléphone. Branchez Supabase pour la synchro et les rappels."
    : "Synchronisé entre vos téléphones · rappels à 9 h";

  renderNotice();
  if (openTaskId !== null) renderSheet();
}

/* ---------- Fiche d'une tâche ---------- */
function taskForm(t) {
  const v = t || { name: "", emoji: "✨", action: "nettoyer ", interval_months: 1, interval_days: 0 };
  return `
    <div class="form ${t ? "" : "bare"}" id="taskForm">
      <label class="field"><span>Nom de la tâche</span><input type="text" id="fName" value="${esc(v.name)}" placeholder="ex. Plinthes" maxlength="60"></label>
      <label class="field"><span>Emoji</span><input type="text" id="fEmoji" value="${esc(v.emoji)}" maxlength="4"></label>
      <label class="field"><span>Texte de la notification</span>
        <div class="inline" style="flex-wrap:wrap"><span style="font-size:13px;color:var(--muted)">Les Nanous, il est temps de…</span></div>
        <input type="text" id="fAction" value="${esc(v.action)}" placeholder="nettoyer les plinthes">
      </label>
      <div class="preview" id="fPreview"></div>
      <div class="field"><span>À refaire tous les</span>
        <div class="inline"><input type="number" id="fMonths" min="0" max="60" inputmode="numeric" value="${v.interval_months}"><span>mois</span>
        <span>+</span><input type="number" id="fDays" min="0" max="365" inputmode="numeric" value="${v.interval_days}"><span>jours</span></div>
      </div>
      <button class="primary" id="fSave">${t ? "Enregistrer" : "Ajouter la tâche"}</button>
      ${t ? `<button class="danger" id="fArchive">Retirer cette tâche</button>` : ""}
    </div>`;
}

function renderSheet() {
  const body = $("sheetBody");
  if (openTaskId === "new") {
    body.innerHTML = `<div class="grab"></div>
      <div class="sh-head"><span class="emo">✨</span><div><h3>Nouvelle tâche</h3><p>Elle s'ajoute sans toucher à vos données</p></div><button class="icon-btn close" data-close>✕</button></div>
      ${taskForm(null)}`;
    wireForm(null);
    return;
  }
  const t = state.tasks.find(x => x.id === openTaskId);
  if (!t) return closeSheet();
  const s = status(t);
  const hist = state.completions.filter(c => c.task_id === t.id).sort((a, b) => (a.done_on < b.done_on ? 1 : -1));
  const today = todayISO();
  body.innerHTML = `<div class="grab"></div>
    <div class="sh-head"><span class="emo" style="background:var(--${s.key === "late" ? "apricot" : s.key === "soon" ? "honey" : s.key === "ok" ? "sage" : "idle"}-soft)">${esc(t.emoji)}</span>
      <div><h3>${esc(t.name)}</h3><p>Tous les ${intervalLabel(t.interval_months, t.interval_days)}</p></div>
      <button class="icon-btn close" data-close aria-label="Fermer">✕</button></div>
    <div class="facts">
      <div class="fact"><small>Dernière fois</small><b>${s.last ? fr(s.last) : "—"}</b></div>
      <div class="fact"><small>Prochaine fois</small><b>${s.due ? fr(s.due) : "—"}</b></div>
    </div>
    <button class="primary" id="doneToday">C'est fait aujourd'hui ✓</button>
    <div class="other"><label for="otherDate">Autre date</label><input type="date" id="otherDate" max="${today}" value="${today}"><button class="ghost" id="doneOther">Noter</button></div>
    <div class="block"><h4>Historique</h4>
      ${hist.length ? `<ul class="hist">${hist.map(c => {
        const ago = daysBetween(c.done_on, today);
        return `<li><span>${fr(c.done_on)}</span><em>${ago === 0 ? "aujourd'hui" : "il y a " + ago + " j"}</em><button class="del" data-del="${c.id}" aria-label="Supprimer cette date">✕</button></li>`;
      }).join("")}</ul>` : `<p class="empty">Rien de noté pour l'instant. Entrez la dernière fois que vous l'avez fait, même approximative.</p>`}
    </div>
    <details><summary>Réglages de la tâche</summary>${taskForm(t)}</details>`;

  $("doneToday").onclick = () => addDone(t, today);
  $("doneOther").onclick = () => { const d = $("otherDate").value; if (d) addDone(t, d); };
  body.querySelectorAll("[data-del]").forEach(b => (b.onclick = () => {
    if (!b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = "Supprimer ?"; return; }
    run(() => store.deleteCompletion(Number(b.dataset.del)), "Date supprimée");
  }));
  wireForm(t);
}

function wireForm(t) {
  const upd = () => {
    const action = $("fAction").value.trim() || "…";
    $("fPreview").innerHTML = `<small>Aperçu de la notif</small>${esc(notificationText({ action }))}`;
  };
  $("fAction").oninput = upd; upd();
  $("fSave").onclick = () => {
    const name = $("fName").value.trim(), action = $("fAction").value.trim();
    const months = Math.max(0, parseInt($("fMonths").value || "0", 10)), days = Math.max(0, parseInt($("fDays").value || "0", 10));
    if (!name) return toast("Donnez un nom à la tâche.");
    if (!action) return toast("Complétez le texte de la notification.");
    if (!months && !days) return toast("Indiquez tous les combien la refaire.");
    const row = { ...(t ? { id: t.id } : {}), name, emoji: $("fEmoji").value.trim() || "✨", action, interval_months: months, interval_days: days };
    run(() => store.saveTask(row), t ? "Tâche enregistrée" : "Tâche ajoutée", !t);
  };
  if (t) $("fArchive").onclick = e => {
    const b = e.currentTarget;
    if (!b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = "Oui, retirer « " + t.name + " » (l'historique est gardé)"; return; }
    run(() => store.archiveTask(t.id), "Tâche retirée", true);
  };
}

function addDone(t, iso) {
  const next = addInterval(iso, t.interval_months, t.interval_days);
  run(() => store.addCompletion(t.id, iso), "Noté ✓ Prochaine fois le " + fr(next, { day: "numeric", month: "long" }), true);
}

async function run(fn, msg, close = false) {
  try {
    await fn();
    state = await store.load();
    if (close) closeSheet();
    render();
    toast(msg);
  } catch (e) {
    toast("Oups : " + e.message);
  }
}

function openSheet(id) {
  openTaskId = id;
  renderSheet();
  $("scrim").classList.add("open");
  $("sheet").classList.add("open");
  $("sheet").scrollTop = 0;
}
function closeSheet() {
  openTaskId = null;
  $("scrim").classList.remove("open");
  $("sheet").classList.remove("open");
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Notifications ---------- */
const isStandalone = () => window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function renderNotice() {
  const el = $("notice");
  if (store.mode === "local" || !CONFIG.VAPID_PUBLIC_KEY) { el.innerHTML = ""; return; }
  let ok = false;
  try { ok = localStorage.getItem("nanous-push") === "on"; } catch {}
  if (ok && pushSupported() && Notification.permission === "granted") { el.innerHTML = ""; return; }
  if (!isStandalone() && /iPhone|iPad/.test(navigator.userAgent)) {
    el.innerHTML = `<div class="notice"><span class="grow">Pour recevoir les rappels, ajoutez l'appli à l'écran d'accueil (Partager → Sur l'écran d'accueil) puis ouvrez-la depuis l'icône.</span></div>`;
    return;
  }
  if (!pushSupported()) { el.innerHTML = ""; return; }
  if (Notification.permission === "denied") {
    el.innerHTML = `<div class="notice"><span class="grow">Les notifications sont bloquées. Réglages → Notifications → Les Nanous pour les autoriser.</span></div>`;
    return;
  }
  el.innerHTML = `<div class="notice"><span class="grow">Recevez « Les Nanous, il est temps de… » à 9 h le jour J.</span><button id="enablePush">Activer</button></div>`;
  $("enablePush").onclick = enablePush;
}

function b64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function enablePush() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { renderNotice(); return toast("Notifications refusées."); }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CONFIG.VAPID_PUBLIC_KEY) });
    await store.saveSubscription(sub, navigator.userAgent.slice(0, 120));
    try { localStorage.setItem("nanous-push", "on"); } catch {}
    reg.showNotification("Les Nanous", { body: "C'est tout bon, les rappels sont activés sur ce téléphone 🏡", icon: "icons/icon-192.png" });
    renderNotice();
  } catch (e) {
    toast("Impossible d'activer : " + e.message);
  }
}

/* ---------- Démarrage ---------- */
async function refresh() {
  try { state = await store.load(); render(); }
  catch (e) { toast("Pas de connexion, affichage de la dernière version."); }
}

document.addEventListener("click", e => {
  const tile = e.target.closest("[data-id]");
  if (tile) return openSheet(tile.dataset.id === "new" ? "new" : Number(tile.dataset.id));
  if (e.target.closest("[data-close]") || e.target === $("scrim")) closeSheet();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
$("refresh").onclick = () => refresh().then(() => toast("À jour"));
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  $("loginErr").textContent = "";
  try {
    await store.signIn($("loginEmail").value.trim(), $("loginPass").value);
    $("login").hidden = true;
    start();
  } catch (err) { $("loginErr").textContent = err.message; }
};

async function start() {
  if (store.cached) { const c = store.cached(); if (c) { state = c; render(); } }
  await refresh();
  store.onChange(() => refresh());
}

(async () => {
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (!(await store.session())) { $("login").hidden = false; return; }
  start();
})();
