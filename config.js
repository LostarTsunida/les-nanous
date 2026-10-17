// ⚙️ Réglages de connexion — à remplir une seule fois (voir LISEZMOI.md, étapes 2 et 4).
// Tant que ces champs sont vides, l'appli tourne en « mode essai » : les données restent sur le téléphone, sans synchro ni notifs.
export const CONFIG = {
  SUPABASE_URL: "https://hodcxygjrcmjalyljjji.supabase.co",       // ex. "https://abcdefghijkl.supabase.co"
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZGN4eWdqcmNtamFseWxqamppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTMzMjksImV4cCI6MjEwNzgyOTMyOX0.Ft56kt6dckrG0HBl49M3tcRkaczENlCb-Ar9YUL1_hs",  // la clé « anon public » (ou « publishable ») de Supabase
  VAPID_PUBLIC_KEY: "BNJpf55C8H2GO2sErqAvHRIkBoSFF4kG7bZAMbQNCJUJIOD70_LUWCRfjJw1-a-EVY7cCs4ueAeLnQO-tfpiVyQ",   // la clé publique générée pour les notifications
};
