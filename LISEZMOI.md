# Les Nanous 🏡 — guide d'installation

Comptez environ 30 minutes, une seule fois. Tout est gratuit.
Les étapes 1 à 6 se font sur le PC, l'étape 7 sur chaque iPhone.

Ce qu'il vous faut : un compte GitHub, un compte Supabase (créé à l'étape 1), Node.js sur le PC (pour l'étape 2), et des iPhones sous iOS 16.4 ou plus récent.

---

## 1. Créer la base de données (Supabase)

1. Allez sur **supabase.com** → *Start your project* → connectez-vous avec GitHub.
2. *New project* : nom `les-nanous`, choisissez un mot de passe de base (gardez-le quelque part), région **Paris (eu-west-3)** → *Create*. Attendez 1 à 2 minutes.
3. Menu de gauche → **SQL Editor** → *New query*. Collez **tout** le contenu de `supabase/1-creation.sql`, puis cliquez sur **Run**. Le message attendu est « Success ».
4. Menu de gauche → **Authentication → Users** → *Add user → Create new user*.
   - Mettez un e-mail et un mot de passe **que vous utiliserez tous les deux** (c'est le compte commun du foyer).
   - Cochez **Auto Confirm User** → *Create user*.
5. Toujours dans **Authentication**, ouvrez **Sign In / Providers** (ou *Settings*) et **désactivez « Allow new users to sign up »**. Ainsi, personne d'autre ne peut se créer un compte.
6. **Project Settings → API Keys** (ou *Data API*). Notez trois valeurs :
   - **Project URL** (`https://xxxx.supabase.co`) ;
   - la clé **anon / publishable** (publique, elle va dans l'appli) ;
   - la clé **service_role / secret** (secrète, elle va uniquement dans GitHub à l'étape 5, jamais dans l'appli).

## 2. Générer les clés des notifications

Sur le PC, ouvrez un terminal (PowerShell) et tapez :

```
npx web-push generate-vapid-keys
```

Il affiche une **Public Key** et une **Private Key**. Gardez les deux.

## 3. Remplir `config.js`

Ouvrez `config.js` avec un éditeur (VS Code ou le Bloc-notes) et collez :

```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "la clé anon / publishable",
VAPID_PUBLIC_KEY: "la Public Key de l'étape 2",
```

## 4. Mettre l'appli en ligne (GitHub Pages)

1. Sur **github.com** → *New repository* → nom `les-nanous`, en **Public** → *Create repository*.
2. Cliquez sur **uploading an existing file**, puis glissez **le contenu** du dossier `les-nanous` : tous les fichiers et dossiers (`index.html`, `app.js`, `icons/`, `vendor/`, `scripts/`, `supabase/`, `.github/`…), **pas le dossier lui-même**. → *Commit changes*.
   - Vérification : sur la page d'accueil du dépôt, on doit voir `index.html` directement. Sinon, c'est la cause de l'erreur 404.
   - Si le dossier `.github` n'apparaît pas (il est parfois masqué sous Windows), faites *Add file → Create new file*, nommez-le `.github/workflows/rappels.yml` et collez-y le contenu du fichier.
3. **Settings → Pages** → *Branch* : `main`, dossier `/ (root)` → *Save*.
   Après environ 1 minute, l'adresse s'affiche en haut : `https://VOTRE-PSEUDO.github.io/les-nanous/`.

## 5. Brancher les rappels de 9 h (GitHub Actions)

Dans le dépôt : **Settings → Secrets and variables → Actions → New repository secret**. Créez ces 5 secrets, avec exactement ces noms :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | la Project URL |
| `SUPABASE_SERVICE_KEY` | la clé **service_role / secret** |
| `VAPID_PUBLIC_KEY` | la Public Key de l'étape 2 |
| `VAPID_PRIVATE_KEY` | la Private Key de l'étape 2 |
| `VAPID_SUBJECT` | `mailto:votre-email@exemple.com` |

Ensuite, ouvrez l'onglet **Actions**. Si GitHub le demande, cliquez sur *I understand… enable them*.

## 6. Vérifier

Ouvrez l'adresse de l'étape 4 sur le PC. L'écran de connexion doit s'afficher : entrez l'e-mail et le mot de passe de l'étape 1.4.

## 7. Installer sur chaque iPhone

1. Ouvrez l'adresse dans **Safari**.
2. **••• → Partager → Sur l'écran d'accueil → Ajouter**.
3. Ouvrez **Les Nanous depuis l'icône** (et plus jamais depuis Safari), puis connectez-vous.
4. Touchez **Activer** dans le bandeau des rappels, puis **Autoriser**. Une notification de confirmation arrive aussitôt.

Faites-le sur les deux téléphones. Pour tester un vrai rappel venu du serveur : GitHub → **Actions → Rappels ménage → Run workflow** (mode `test`). Les deux iPhones reçoivent « Les Nanous, il est temps de tester les notifications ! ».

---

## Comment ça marche

- **Noter une tâche** : touchez sa carte → *C'est fait aujourd'hui*, ou choisissez une autre date. La prochaine échéance se calcule toute seule (17/10 + 4 mois = 17/02).
- **Rappel** : chaque matin, GitHub vérifie les échéances. À **9 h** (heure de Paris) le jour J, vos deux iPhones reçoivent « Les Nanous, il est temps de … ! ». Chaque échéance n'est rappelée qu'**une fois**. Si une tâche reste en retard, elle reste en haut de l'appli, en orange.
- **Synchro** : ce que l'un note apparaît chez l'autre.
- **Erreur de date** : dans la fiche, *Historique* → ✕ → *Supprimer ?*

## Faire évoluer l'appli sans rien perdre

Vos données (tâches, dates, historique) sont dans **Supabase**, pas dans les fichiers de l'appli. Vous pouvez donc changer l'appli autant que vous voulez.

- **Ajouter, renommer ou changer une tâche** (nom, emoji, texte de la notif, fréquence) : directement dans l'appli. Bouton *Ajouter une tâche* en bas, ou fiche d'une tâche → *Réglages de la tâche*. *Retirer* une tâche la cache sans effacer son historique.
- **Changer le code** (design, nouvelles fonctions) : remplacez les fichiers sur GitHub et augmentez le numéro dans `sw.js` (`nanous-v1` → `nanous-v2`). Les téléphones prennent la nouvelle version à la prochaine ouverture.
- **Changer la base** : ajoutez un nouveau fichier `supabase/2-….sql` qui *ajoute* des colonnes ou des tables (`alter table … add column …`). Ne relancez jamais une commande qui supprime (`drop`).
- **Changer l'heure des rappels** : `NOTIFY_HOUR` dans `scripts/rappels.mjs`, et les horaires `cron` dans `.github/workflows/rappels.yml` (en heure UTC).

## Bon à savoir

- La clé *anon* visible dans `config.js` est faite pour être publique. Les données sont protégées par la connexion, et les inscriptions sont fermées (étape 1.5).
- Supabase gratuit met en pause un projet inutilisé pendant 7 jours. Le passage quotidien des rappels le garde éveillé.
- Si vous supprimez l'icône de l'iPhone, les données ne sont pas perdues : réinstallez-la, reconnectez-vous et réactivez les rappels.
