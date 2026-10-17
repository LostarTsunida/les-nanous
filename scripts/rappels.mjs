// Envoie les notifications « Les Nanous, il est temps de … ! »
// Lancé automatiquement chaque matin par GitHub Actions (.github/workflows/rappels.yml).
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { lastDone, dueDate, notificationText, todayIn, hourIn } from "../schedule.js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, MODE } = process.env;
const NOTIFY_HOUR = 9; // heure de Paris

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY })) {
  if (!v) { console.error(`Secret manquant : ${k} (GitHub > Settings > Secrets and variables > Actions)`); process.exit(1); }
}

webpush.setVapidDetails(VAPID_SUBJECT || "mailto:les-nanous@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function sendToAll(subs, payload) {
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log("Téléphone désinscrit, on l'enlève :", s.endpoint.slice(0, 50));
        await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else console.error("Échec d'envoi :", err.statusCode, err.body || err.message);
    }
  }
  return sent;
}

const subs = must(await sb.from("push_subscriptions").select("*"));
console.log(`${subs.length} téléphone(s) inscrit(s)`);

if (MODE === "test") {
  const n = await sendToAll(subs, { title: "Les Nanous", body: "Les Nanous, il est temps de tester les notifications !", tag: "test" });
  console.log(`Notification de test envoyée à ${n} téléphone(s).`);
  process.exit(0);
}

const today = todayIn("Europe/Paris");
const hour = hourIn("Europe/Paris");
if (hour < NOTIFY_HOUR && MODE !== "force") {
  console.log(`Il est ${hour} h à Paris, on attend ${NOTIFY_HOUR} h.`);
  process.exit(0);
}

const tasks = must(await sb.from("tasks").select("*").eq("archived", false));
const completions = must(await sb.from("completions").select("task_id,done_on"));

let count = 0;
for (const t of tasks) {
  const last = lastDone(completions, t.id);
  const due = dueDate(t, last);
  if (!due || due > today) continue;                     // pas encore l'heure
  if (t.notified_due && t.notified_due >= due) continue;  // déjà prévenus pour cette échéance
  const body = notificationText(t);
  const n = await sendToAll(subs, { title: "Les Nanous", body, tag: "task-" + t.id });
  console.log(`→ ${body} (échéance ${due}, envoyée à ${n} téléphone(s))`);
  if (n > 0) { // si aucun téléphone n'a reçu, on réessaiera au prochain passage
    must(await sb.from("tasks").update({ notified_due: due }).eq("id", t.id));
    count++;
  }
}
console.log(count ? `${count} rappel(s) envoyé(s).` : "Rien à rappeler aujourd'hui.");
