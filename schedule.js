// Calcul des échéances — partagé entre l'appli (navigateur) et le script de rappels (Node).
// Toutes les dates sont au format "AAAA-MM-JJ".

const DAY = 86400000;

function parse(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function format(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

/** Ajoute des mois "calendaires" (17/10 + 4 mois = 17/02) puis des jours. 31/01 + 1 mois = 28/02. */
export function addInterval(iso, months = 0, days = 0) {
  const d = new Date(parse(iso));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return format(d.getTime() + days * DAY);
}

export function daysBetween(fromIso, toIso) {
  return Math.round((parse(toIso) - parse(fromIso)) / DAY);
}

/** Date du jour à Paris (ou dans le fuseau donné). */
export function todayIn(timeZone = "Europe/Paris", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function hourIn(timeZone = "Europe/Paris", now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hour12: false }).format(now));
}

/** Dernière date de réalisation d'une tâche (ou null). */
export function lastDone(completions, taskId) {
  let last = null;
  for (const c of completions) if (c.task_id === taskId && (!last || c.done_on > last)) last = c.done_on;
  return last;
}

/** Échéance = dernière fois + intervalle. */
export function dueDate(task, last) {
  return last ? addInterval(last, task.interval_months, task.interval_days) : null;
}

/** "Les Nanous, il est temps de nettoyer les VMC !" — gère l'élision (d'apporter…). */
export function notificationText(task) {
  const action = task.action.trim();
  const elide = /^[aeiouyhàâéèêëîïôöûüœ]/i.test(action);
  return "Les Nanous, il est temps " + (elide ? "d'" : "de ") + action + " !";
}

/** Libellé lisible d'un intervalle : "4 mois", "1 mois et demi", "3 semaines", "1 an". */
export function intervalLabel(months, days) {
  const parts = [];
  if (months) {
    if (months % 12 === 0) parts.push(months / 12 + (months / 12 > 1 ? " ans" : " an"));
    else parts.push(months + " mois");
  }
  if (days) {
    if (months && days === 15) return parts[0] + " et demi";
    if (days % 7 === 0) parts.push(days / 7 + (days / 7 > 1 ? " semaines" : " semaine"));
    else parts.push(days + (days > 1 ? " jours" : " jour"));
  }
  return parts.join(" et ") || "—";
}
