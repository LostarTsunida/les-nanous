// Liste de départ des tâches. Elle sert uniquement à remplir la base la première fois :
// ensuite, tout se modifie directement dans l'appli (réglages de chaque tâche, bouton « Ajouter une tâche »).
// action = la fin de la phrase « Les Nanous, il est temps de … ! »
export const DEFAULT_TASKS = [
  { name: "Interrupteurs & poignées", emoji: "💡", action: "nettoyer les interrupteurs et les poignées", interval_months: 2, interval_days: 0 },
  { name: "VMC", emoji: "🌀", action: "nettoyer les VMC", interval_months: 4, interval_days: 0 },
  { name: "Poussière", emoji: "🪶", action: "faire la poussière", interval_months: 1, interval_days: 15 },
  { name: "Vitres", emoji: "🪟", action: "nettoyer les vitres", interval_months: 8, interval_days: 0 },
  { name: "Toilettes", emoji: "🚽", action: "nettoyer les toilettes", interval_months: 0, interval_days: 10 },
  { name: "Douche", emoji: "🚿", action: "nettoyer la douche", interval_months: 2, interval_days: 0 },
  { name: "Changer les draps", emoji: "🛏️", action: "changer les draps", interval_months: 0, interval_days: 21 },
  { name: "Lavabo", emoji: "🚰", action: "nettoyer le lavabo", interval_months: 1, interval_days: 15 },
  { name: "Four", emoji: "🥧", action: "nettoyer le four", interval_months: 12, interval_days: 0 },
  { name: "Frigo", emoji: "🧊", action: "nettoyer le frigo", interval_months: 7, interval_days: 0 },
  { name: "Serpillière", emoji: "🧽", action: "passer la serpillière", interval_months: 0, interval_days: 21 },
  { name: "Hotte", emoji: "💨", action: "nettoyer la hotte", interval_months: 12, interval_days: 0 },
  { name: "Calcaire bouilloire / machine à café", emoji: "☕", action: "détartrer la bouilloire et la machine à café", interval_months: 3, interval_days: 15 },
  { name: "Micro-ondes", emoji: "🍿", action: "nettoyer le micro-ondes", interval_months: 12, interval_days: 0 },
  { name: "Litière en profondeur", emoji: "🐈", action: "nettoyer la litière en profondeur", interval_months: 1, interval_days: 15 },
  { name: "Machine à laver", emoji: "🫧", action: "nettoyer la machine à laver", interval_months: 7, interval_days: 0 },
  { name: "Miroirs", emoji: "🪞", action: "nettoyer les miroirs", interval_months: 2, interval_days: 0 },
  { name: "Placards", emoji: "🗄️", action: "nettoyer les placards", interval_months: 12, interval_days: 0 },
  { name: "Pressing (couettes, oreillers, rideaux)", emoji: "🧺", action: "apporter les couettes, les oreillers et les rideaux au pressing", interval_months: 12, interval_days: 0 },
  { name: "Serviettes de bain", emoji: "🛁", action: "changer les serviettes de bain", interval_months: 0, interval_days: 21 },
  { name: "Siphons & canalisations", emoji: "🔧", action: "nettoyer les siphons et les canalisations", interval_months: 5, interval_days: 0 },
  { name: "Portes", emoji: "🚪", action: "nettoyer les portes", interval_months: 7, interval_days: 0 },
];
