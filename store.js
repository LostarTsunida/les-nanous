// Accès aux données : Supabase (synchro entre vos deux iPhones) ou mode essai local.
import { CONFIG } from "./config.js";
import { DEFAULT_TASKS } from "./tasks-default.js";

const CACHE_KEY = "nanous-cache-v1";

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

/* ---------- Mode essai (aucune config) ---------- */
function localStore() {
  const KEY = "nanous-local-v1";
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!db) {
    db = { seq: 1, tasks: DEFAULT_TASKS.map((t, i) => ({ id: i + 1, position: i + 1, archived: false, notified_due: null, ...t })), completions: [] };
    db.seq = db.tasks.length + 1;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
  return {
    mode: "local",
    async session() { return true; },
    async signIn() { return true; },
    async signOut() {},
    async load() { return { tasks: db.tasks.filter(t => !t.archived), completions: db.completions }; },
    async addCompletion(task_id, done_on) { db.completions.push({ id: db.seq++, task_id, done_on, created_at: new Date().toISOString() }); save(); },
    async deleteCompletion(id) { db.completions = db.completions.filter(c => c.id !== id); save(); },
    async saveTask(t) {
      if (t.id) Object.assign(db.tasks.find(x => x.id === t.id), t);
      else db.tasks.push({ ...t, id: db.seq++, position: db.tasks.length + 1, archived: false, notified_due: null });
      save();
    },
    async archiveTask(id) { db.tasks.find(x => x.id === id).archived = true; save(); },
    async saveSubscription() { throw new Error("Les notifications demandent la connexion à Supabase (voir LISEZMOI.md)."); },
    onChange() {},
  };
}

/* ---------- Mode synchronisé (Supabase) ---------- */
function remoteStore() {
  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "nanous-auth" },
  });
  const check = ({ error }) => { if (error) throw new Error(error.message); };
  return {
    mode: "remote",
    async session() { const { data } = await sb.auth.getSession(); return !!data.session; },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message.includes("Invalid") ? "E-mail ou mot de passe incorrect." : error.message);
      return true;
    },
    async signOut() { await sb.auth.signOut(); },
    async load() {
      const [t, c] = await Promise.all([
        sb.from("tasks").select("*").eq("archived", false).order("position"),
        sb.from("completions").select("id,task_id,done_on,created_at").order("done_on", { ascending: false }),
      ]);
      check(t); check(c);
      const data = { tasks: t.data, completions: c.data };
      writeCache(data);
      return data;
    },
    cached() { return readCache(); },
    async addCompletion(task_id, done_on) { check(await sb.from("completions").insert({ task_id, done_on })); },
    async deleteCompletion(id) { check(await sb.from("completions").delete().eq("id", id)); },
    async saveTask(t) {
      const row = { name: t.name, emoji: t.emoji, action: t.action, interval_months: t.interval_months, interval_days: t.interval_days };
      if (t.id) check(await sb.from("tasks").update(row).eq("id", t.id));
      else {
        const { data } = await sb.from("tasks").select("position").order("position", { ascending: false }).limit(1);
        check(await sb.from("tasks").insert({ ...row, position: (data?.[0]?.position || 0) + 1 }));
      }
    },
    async archiveTask(id) { check(await sb.from("tasks").update({ archived: true }).eq("id", id)); },
    async saveSubscription(sub, label) {
      const j = sub.toJSON();
      check(await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, label }));
    },
    onChange(fn) {
      sb.channel("nanous")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fn)
        .on("postgres_changes", { event: "*", schema: "public", table: "completions" }, fn)
        .subscribe();
    },
  };
}

export function createStore() {
  const configured = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase;
  return configured ? remoteStore() : localStore();
}
