# STRATA Dia — Cadrage

**STRATA Dia** (anciennement Strata Lotpack) est l'application terrain de la famille Strata. Strata Opus est l'outil global de gestion de projet. STRATA Dia remplace le pack papier COLAS NSW (le « lotpack ») utilisé sur les chantiers d'enrobé.

La V1 est une application web installable (PWA), publiée sur GitHub Pages et 100 % hors ligne après la première ouverture. Elle permet de remplir les fiches sur tablette pendant le poste, puis d'envoyer le lotpack par mail.

> **Ce document fait foi** pour tout le développement. Il remplace `docs/ARCHITECTURE.md` et l'artefact Claude « Strata - Dia - prompt », qui n'est plus mis à jour. Le suivi du travail est dans `docs/plan.md`.
> L'interface de l'application est **uniquement en anglais** ; ce document, le plan et les échanges sont en français.

## Sommaire

1. Cadre du projet
2. Règles de travail
3. Architecture technique
4. Les fiches
5. Modèle de données
6. Spécifications par fiche et par écran
7. Règles métier
8. Interface
9. Sorties : PDF et mail
10. Publication, installation, renommage
11. Décisions prises

---

## 1. Cadre du projet

**Objectifs**

- Remplir sur tablette, pendant le poste, toutes les fiches du pack, avec ou sans réseau.
- Saisir une seule fois les informations communes (client, projet, job, suburb, produit).
- Calculer et contrôler automatiquement (tonnes cumulées, températures, vent, dips).
- Produire un PDF identique aux fiches officielles.
- Terminer par l'envoi par mail du lotpack (PDF + JSON).
- Exporter et importer les données en JSON.

**Hors périmètre V1** : back-end, synchronisation, comptes utilisateurs, photos, partage avec Strata Opus.

**Contexte d'usage** : une seule tablette (ou téléphone) par équipe, iPad ou Android, navigateur récent (Safari, Chrome).

## 2. Règles de travail

**Dépôt et branches**

- Dépôt : `https://github.com/pierrelgeli-bit/strata-dia.git` (anciennement `strata-lotpack`).
- Deux branches : `main` (version validée, publiée) et `test` (développement).
- **Tout le développement se fait sur `test`.** Aucun merge ni push vers `main` sans instruction explicite de PL. Pas de push du tout sans demande de PL.
- La branche `test` n'est jamais publiée. Le workflow `.github/workflows/pages.yml` reconstruit l'app et publie `dist/` à chaque push sur `main`.

**Rôles**

- **Opus** (modèle de cadrage) : met à jour `docs/cadrage.md` et `docs/plan.md`. Il n'écrit pas de code.
- **Sonnet** (modèle de développement) : lit `cadrage.md` puis `plan.md`, code, teste, coche les tâches faites dans `plan.md`.
- **PL** : valide chaque étape et tranche ce que les modèles ne peuvent pas décider seuls.

**Conventions**

- Code et interface en anglais, commentaires courts. Documentation et échanges en français.
- Dates en ISO 8601, heures au fuseau de l'appareil, unités dans les noms de champs si besoin (`windKmh`).
- Toute évolution du modèle incrémente `schemaVersion` avec une fonction de migration.
- Aucune donnée n'est envoyée sur le réseau sans action de l'utilisateur.
- Tests Playwright obligatoires pour chaque étape (dossier `test/`), exécutés avant de déclarer une tâche terminée.

## 3. Architecture technique

**Principes**

- **Un seul fichier livré** : `dist/strata-dia.html`, autonome (CSS, JS, gabarits inclus), publié tel quel (en `index.html`) sur GitHub Pages avec le manifest, le service worker et les icônes. Site statique : aucun serveur applicatif, les données restent sur l'appareil.
- **Sources modulaires** : le code est découpé en modules, assemblés par un script de build (même approche que Strata Opus).
- **Local d'abord** : stockage IndexedDB, sauvegarde automatique à chaque modification.
- **JSON comme format d'échange** : versionné, lisible, réimportable.
- **Rendu fidèle** : le PDF officiel sert de fond ; pdf-lib écrit les valeurs, les cases cochées et les signatures par-dessus, le rendu est donc identique au papier.
- **Vanilla JS** : pas de framework, pour garder un fichier léger et durable. Seule bibliothèque : pdf-lib (licence MIT), intégrée au fichier, sans réseau.

**Structure du dépôt**

```text
strata-dia/
├── .github/workflows/
│   └── pages.yml            ← publication GitHub Pages depuis main
├── docs/
│   ├── cadrage.md           ← ce document (référence)
│   ├── plan.md              ← plan de travail et suivi
│   └── forms/               ← scans PDF des fiches officielles (référence)
├── src/
│   ├── index.html           ← squelette de l'app
│   ├── app.js               ← routeur et écrans (Jobs, Shift, Settings)
│   ├── styles/
│   │   └── app.css          ← interface tablette
│   ├── core/
│   │   ├── db.js            ← IndexedDB (CRUD, autosave, reprise de l'ancienne base)
│   │   ├── schema.js        ← modèle, version du schéma, migrations
│   │   ├── io.js            ← export / import JSON, fusion
│   │   ├── pdf.js           ← génération du PDF (pdf-lib)
│   │   ├── mail.js          ← étape Finish & send, modèle de mail
│   │   └── pwa.js           ← service worker, « Update available – Reload »
│   ├── forms/               ← un module par fiche (saisie)
│   │   ├── approval.js      ← MSF28-6
│   │   ├── diagram.js       ← MSF28-7
│   │   ├── traceability.js  ← MSF28-10
│   │   ├── records.js       ← MSF28-9 et MSF28-12
│   │   └── quantities.js    ← MSF28-11
│   ├── pwa/
│   │   ├── manifest.webmanifest
│   │   ├── sw.js            ← cache hors ligne, version = empreinte du build
│   │   └── icons/
│   ├── assets/
│   │   └── lotpack-template.pdf ← gabarit : PDF officiel sans les numéros de page papier
│   ├── vendor/
│   │   └── pdf-lib.min.js   ← pdf-lib (licence MIT), intégré au build
│   └── ui/
│       ├── canvas.js        ← dessin, zoom et signatures (doigt / stylet)
│       └── components.js
├── build/
│   └── build.js             ← assemble src/ en un seul HTML + fichiers PWA
├── tools/
│   ├── make-template.py     ← génère le gabarit depuis docs/forms (PyMuPDF)
│   └── make-icons.py        ← dessine les icônes « SD » (Pillow)
├── test/                    ← tests automatisés (Playwright), étapes 1 à 10
├── dist/
│   ├── index.html           ← app publiée (identique à strata-dia.html)
│   ├── strata-dia.html      ← même app, utilisable en fichier local
│   └── manifest.webmanifest, sw.js, icons/
└── README.md
```

## 4. Les fiches

Ordre dans le PDF : MSF28-6, 7, 10, 9, 12, 11. Une fiche optionnelle non ajoutée est simplement absente.

| Code | Version | Fiche | Contenu principal |
| --- | --- | --- | --- |
| MSF28-6 | V3R2 – 05/09/2024 | Approval to Proceed / Hold Point Release | En-tête, type de travaux, couche, checklist de vérification, commentaires, signatures COLAS et client. Une par poste |
| MSF28-7 | V2R3 – 13/09/2024 | Site Diagram | Croquis sur grille, légendes (key, mix, layer, depth, area, tonnes), completed by. Pages de dessin supplémentaires ajoutables à la demande, sur le modèle de la page 5 du papier : grille, 2 légendes et Completed By propres à chaque page |
| MSF28-10 | V1R5 – 13/09/2024 | Asphalt Traceability | En-tête + météo + tack coat, une ligne par camion, relevés vent / température chaussée toutes les 2 h, lot summary, QA checklist. 23 lignes en page 1, pages de suite de 31 lignes |
| MSF28-9 | V3R3 – 29/01/2025 | Pavement Measured Dip Record | 3 blocs de couche (CC/IC/WC), limites de dip, compaction factor, relevés CH gauche / centre / droite, 38 lignes par bloc (au-delà, nouvelle fiche). Optionnelle : ajoutée au lotpack à la demande |
| MSF28-12 | V3R4 – 29/01/2025 | Survey Record | Même structure que le dip record, couche 1/2/3, relevé fait par COLAS ou client, 40 lignes par bloc (au-delà, nouvelle fiche). Optionnelle : ajoutée au lotpack à la demande |
| MSF28-11 | V2R4 – 13/09/2024 | Quantity & Placement Agreement | Pay items (9 lignes : 5 préimprimées + 4 libres), contractor items (10 lignes : 7 + 3), quantités, waste, m², variations, signatures |

## 5. Modèle de données

Unité de travail : le **Job** (projet global). Un job contient plusieurs **Shifts** (un lotpack par poste), chacun créé avec toutes ses fiches vides.

- **Job details** (panneau repliable en haut du job) : `client`, `projectTitle`, `jobNumber`.
- **Shift details** (panneau repliable en haut du shift, au-dessus de toutes les fiches) : `date`, `shiftType` (Day / Night), `suburb`, `supplyingPlant`, `haulageKm`, `product`, `nominatedThickness`, `completedBy`.
- Liste des shifts : toujours triée par date croissante (le 3 novembre avant le 4, quel que soit l'ordre de création), puis jour avant nuit.
- Les en-têtes des fiches ne sont plus saisis dans chaque fiche : ils sont repris automatiquement du job et du shift (écran et PDF). Exemple : l'Approval to Proceed ne garde que Type of work, Layer, la checklist de vérification, les commentaires et les signatures.
- `shiftType` (Day / Night) reste uniquement dans l'app ; il n'apparaît pas sur le PDF.

**Format d'échange JSON (schéma v2)**

```json
{
  "schemaVersion": 2,
  "app": "strata-dia",
  "exportedAt": "2026-11-04T09:00:00+08:00",
  "contacts": [{ "name": "", "email": "", "lastUsed": null }],
  "settings": { "theme": "system", "alwaysCc": "", "defaultCompletedBy": "" },
  "jobs": [{
    "id": "uuid",
    "client": "", "projectTitle": "", "jobNumber": "",
    "shifts": [{
      "id": "uuid", "date": "2026-11-04", "shiftType": "day",
      "suburb": "", "supplyingPlant": "", "haulageKm": null,
      "product": "", "nominatedThickness": null,
      "workType": ["supplyLay"], "layer": ["wearing"],
      "weather": "",
      "approval": {},
      "traceability": { "loads": [], "envReadings": [] },
      "diagram": { "pages": [] },
      "dipRecords": [],
      "surveys": [],
      "quantities": {},
      "completedBy": "",
      "sendLog": [{ "sentBy": "", "to": [], "cc": [], "sentAt": null, "method": "share", "files": [] }],
      "status": "draft"
    }]
  }]
}
```

**Détail des objets**

- **approval** : `checks` (plant, materials, surface, base, thickness, wind, underlying, pavementTemp + sous-cases), `comments`, `colasSign {name, signature, dateTime}`, `clientSign {name, signature, position, dateTime}`, `clientComments`.
- **traceability** : `tackRate {litres, m2}`, `tackBroken`, `surfaceClean`, `loads[] {no, docket, tonnes, progress, tipTime, temp, chStart, chEnd, run, width, comment}`, `envReadings[] {time, windKmh, pavementTemp}`, `lotSummary {qtyDelivered, qtyPaved, m2Paved, completedBy}`, `qa {tempsRecorded, dipsRecorded, labDiscussed}`, `limits {minLoadTemp, maxWind, minPavementTemp}`.
- **diagram** : `pages[] {strokes[], legends[] {color, mix, layer, depth, area, tonnes}}`, une entrée par page de dessin.
  - Traits vectoriels `{c, w, p[[x, y]]}` en coordonnées relatives à la grille (de 0 à 1), redessinés tels quels dans le PDF.
  - `color` = Key et couleur de trait. `mix`, `layer`, `depth` vides = valeurs du shift (Product, Layer de l'Approval, Nominated thickness). `layer` devient une liste dès qu'une case est modifiée.
- **dipRecord / survey** : `id`, `date` (vide = date du shift), `mixType` (vide = Product du shift), `frequency`, `existingSurface` (asphalt, granular ou seal), `sealSize`, `completedBy`.
  - Dip : `compactionFactor`, `lowerLimit`, `upperLimit`. Survey : `surveyBy` (colas ou client).
  - Dans chaque bloc, `level` vaut survey ou nominal (Dip) et `layer` vaut 1, 2 ou 3 (Survey).
  - Sur le Survey, chaque relevé a deux cases Centre (`c` et `c2` : Centre 1 et Centre 2, comme les deux sous-cases du papier).
  - `courses[3] {course, length, depth, offsets {l, c, r}, direction, level, run, width, readings[] {ch, l, c, r}}`.
- **quantities** : `payItems[9]`, `contractorItems[10]` `{no, description, detail, estab[], unit, qtyDelivered, waste, qtyUsed, m2Paved, profiledM2}`, `variations`, `comments`, `colasSign {name, signature, date}`, `clientSign {name, signature, position, date}`.
  - `detail` = contenu des parenthèses des lignes préimprimées ; `estab` = Crew / MTV / Profiler entourés ; une valeur vide affiche le calcul ou le préremplissage.
  - Plus d'en-tête : client, projet, job, suburb, plant et haulage viennent du job et du shift ; la Work Description est calculée.

**Import / export**

- Fusion par `id`, la version la plus récente (`updatedAt`) l'emporte, avec un rapport des conflits affiché à l'utilisateur avant d'appliquer (ajouté, remplacé, conservé, heures à la seconde).
- La fusion se fait poste par poste (les détails du job à part).
- Les réglages de l'appareil ne sont jamais écrasés ; les contacts sont fusionnés par adresse ; un fichier d'une version plus récente de l'app est refusé.
- Export complet depuis Settings, export d'un job depuis l'écran Job.
- Limite connue : une suppression n'est pas propagée (un poste supprimé sur un appareil revient si l'on importe un fichier qui le contient).

## 6. Spécifications par fiche et par écran

### Approval to Proceed (MSF28-6)

- Garde uniquement : Type of work, Layer, checklist de vérification, commentaires, signatures. L'en-tête vient du job et du shift.
- Le nom du représentant COLAS est prérempli avec le **Completed by** du shift, modifiable.
- Avertissement tant que l'Approval to Proceed du poste n'est pas signé.

### Site Diagram (MSF28-7)

- **Pas d'en-tête ni de Type of work** dans la fiche : ces infos sont déjà dans Shift details et l'Approval to Proceed. Pas de champ Completed by en bas (repris de Shift details).
- **Plein écran** pour dessiner.
- **Zoom** : pincer à deux doigts pour zoomer et se déplacer ; un doigt ou le stylet dessine à l'endroit zoomé. Boutons + / − / « Fit » en complément. Le trait reste fin quel que soit le zoom, pour pouvoir ajouter de petits détails.
- **Légendes** : seule « Legend 1 » est affichée au départ ; un bouton **+** ajoute une légende (Legend 2, 3…), chacune avec une nouvelle couleur. Champs d'une légende :
  - **Key** : la couleur, choisie dans la palette ; c'est aussi la couleur de trait associée.
  - **Mix** : le type d'enrobé, prérempli avec le Product du shift, modifiable.
  - **Layer** : cases Base / Intermediate / Wearing / Correction / Other, précochées comme dans l'Approval to Proceed, modifiables.
  - **Depth** : liée au Nominated thickness de Shift details, modifiable.
  - **Area (m²)** : conservée, saisie manuelle.
  - **Tonnes** : saisie manuelle.
- Sur le PDF : la grille et le croquis à l'échelle de la page, puis le tableau des légendes.
- Pages de dessin supplémentaires : sur le modèle de la page 5 du papier (codée MSF28-7), chacune avec sa grille et ses légendes.
- Légendes 3 et suivantes : imprimées sur une page de suite « Site Diagram — Legends (continued) » (32 lignes par page), placée après les pages de dessin et comptée dans « Page X of Y ». Chaque légende porte sa couleur (pastille + numéro) dans la colonne Key.

### Asphalt Traceability (MSF28-10)

- En-tête supprimé, sauf **Weather conditions** (bloc repliable). Type of work et Layer supprimés.
- Questionnaire tack coat (application rate, tack coat broken, surface clean) conservé, **repliable**. `tackBroken` et `surfaceClean` valent yes, no ou vide (réponse entourée dans le PDF).
- **Lignes camions repliables** (téléphone et tablette) : repliée, une ligne montre seulement **Load No, Docket No, Progress tonnes** ; dépliée, tous les champs. Bouton « Add load ».
- **Relevés Wind / Pavement temp** : même principe, repliables, dans une liste séparée des camions.
- Lot summary et QA checklist inchangés.
- Une seule couche / un seul enrobé par fiche de traçabilité, sinon commentaire conseillé.

### Dip Record (MSF28-9) et Survey Record (MSF28-12)

- Client, Project title et Job number supprimés.
- **Date** préremplie avec celle du shift, modifiable sans changer la date du shift.
- **Mix type** prérempli avec le Product du shift, modifiable.
- Optionnelles : ajoutées au lotpack à la demande, avec une nouvelle fiche au-delà de 38 lignes par bloc (Dip) ou 40 (Survey).

### Quantity & Placement (MSF28-11)

- En-tête entièrement supprimé (client, date, project title, job number, suburb, work description). **Supplying plant** et **Haulage distance** viennent de Shift details.
- Restent : pay items, contractor items, variations, commentaires, signatures.

### Jobs et shifts

- **Menu contextuel** d'un job ou d'un shift : clic droit (appui long sur tactile) → **Duplicate** ou **Delete** (avec confirmation). **Ctrl+C / Ctrl+V** duplique aussi la sélection.
- Sélection au clic (carte surlignée) ; double-clic, Entrée ou bouton Open pour ouvrir.
- La duplication copie **tout le contenu** (fiches, camions, relevés, croquis, signatures) avec de nouveaux `id` ; l'historique d'envoi est vidé et le statut repasse à draft ; l'utilisateur supprime ensuite à la main ce qu'il ne veut pas garder.

### Navigation sur téléphone

- La barre d'onglets des fiches défile horizontalement ; l'onglet sélectionné reste centré et visible au changement de fiche, la barre ne revient pas au début.

### Settings

- Carnet d'adresses (ajouter, modifier, supprimer des contacts nom + email), derniers destinataires mémorisés.
- **Adresse toujours en copie**, thème jour / nuit, nom par défaut du rédacteur.
- Export complet JSON, import JSON, rappel de faire un export régulier.

## 7. Règles métier

- **Aucun champ n'est obligatoire.** Les contrôles affichent des avertissements, jamais de blocage.
- Les tableaux se remplissent ligne par ligne avec un bouton « Add row », comme sur papier.
- Les tonnes cumulées (progress) sont calculées automatiquement.
- **Relevés vent / température chaussée** : une ligne ajoutée à chaque relevé, avec l'heure.
  - Dans le PDF, chaque relevé va dans les colonnes jaunes de la ligne camion la plus proche dans le temps (le relevé avant démarrage sur la 1re ligne), avec son heure en petit.
  - Rappel discret si plus de 2 h depuis le dernier relevé, sans obligation.
- **Limites** (température, vent, dips) saisies directement dans la fiche, pas de valeurs codées en dur, non imprimées.
- **Dip Record** : chaque relevé brut (Left, Centre, Right) est comparé à Lower et Upper Dip Limit ; hors limites, avertissement et case surlignée, sans blocage ; le Compaction Factor est seulement reporté.
- **Lot summary** : QTY Delivered et QTY Paved préremplis avec la somme des tonnes des camions (modifiables) ; m² paved saisi à la main.
- **Quantity & Placement** :
  - la 1re ligne Supply, Deliver, Lay est préremplie depuis la traçabilité (produit du poste, unité t, QTY Delivered et m² Paved du Lot Summary) ;
  - Qty Used = QTY Delivered − Waste dès que les deux sont connus ;
  - Work Description proposée à partir du type de travaux et de la couche ;
  - toute valeur tapée remplace le calcul.

## 8. Interface

- **Tout le texte de l'interface est en anglais**, libellés identiques aux fiches papier.
- **Responsive** : utilisable sur téléphone (portrait, une colonne, tableaux en cartes) comme sur tablette (paysage, tableaux complets).
- **Mode jour / mode nuit** : bascule manuelle dans l'en-tête, choix mémorisé, mode système par défaut. Le mode jour est à fort contraste pour le soleil ; le PDF reste toujours en version claire.
- Grandes zones tactiles, clavier numérique pour les nombres.
- Navigation : **Jobs → Shift → onglets par fiche → Finish & send**.
- Indicateur de complétude par fiche (vide, en cours, complète).
- **Croquis à main levée** au doigt ou au stylet, plusieurs couleurs, épaisseur, gomme, annuler / rétablir. Bouton plein écran en haut à droite de la zone de dessin (même bouton ou Échap pour revenir) ; la zone garde les proportions de la grille imprimée.
- Signatures sur écran (COLAS et client), acceptées par les clients.

## 9. Sorties : PDF et mail

### PDF

- Généré avec pdf-lib sur le PDF officiel en fond (`core/pdf.js`), sans passer par la boîte d'impression, pour que le fichier puisse être joint automatiquement au brouillon.
- Fiches au format officiel, **incohérences du papier corrigées** :
  - numéros de page du papier retirés du gabarit, bons codes MSF ;
  - pagination continue « Page X of Y » calculée sur les pages réellement présentes dans le pack, fiches optionnelles et pages de suite incluses ;
  - les pages de dessin supplémentaires reprennent la page 5 du papier, codée MSF28-7 ; la page 9 du papier (grille seule, codée à tort MSF28-12) n'est pas utilisée.
- Logo COLAS en haut à droite de chaque page : il fait partie du PDF officiel utilisé en fond, rien à ajouter.
- Ordre : MSF28-6 Approval, MSF28-7 Site Diagram (+ pages de dessin), MSF28-10 Traceability (+ pages de suite), MSF28-9 Dip Record, MSF28-12 Survey Record, MSF28-11 Quantity & Placement.

### Finish & send

1. **Récapitulatif** de ce qui est rempli ou vide (sans bloquer).
2. Génération du PDF, puis du JSON du poste.
3. **Destinataires en tickets** : les contacts du carnet s'affichent comme des tickets cliquables ; on en sélectionne un ou plusieurs. Une adresse peut aussi être tapée à la main ; elle devient un ticket et rejoint les derniers destinataires. L'adresse **toujours en copie** (Settings) est ajoutée automatiquement en CC.
4. **Brouillon de mail, pas d'envoi automatique, pas de script.** Au clic sur « Send », l'app ouvre un brouillon prêt dans l'application mail de l'appareil (Outlook de préférence, ou Gmail), comme le ferait une macro Excel : destinataires, CC, objet, corps récapitulatif et pièces jointes. L'utilisateur vérifie puis envoie depuis sa messagerie.
   - **Tablette / téléphone** : bouton « Share to Outlook » (Web Share API avec fichiers) → choix de l'app Outlook → brouillon avec PDF + JSON joints, objet et corps transmis. Le partage ne transmet pas les destinataires : les adresses To / CC sont copiées dans le presse-papiers, à coller dans le brouillon. Le bouton « Email draft (attach manually) » reste proposé en second choix. Le PDF est construit à l'ouverture de l'écran, pour que le partage parte dès le toucher.
   - **Ordinateur** (partage de fichiers indisponible) : téléchargement du PDF + JSON, puis ouverture d'un brouillon `mailto` prérempli ; les fichiers sont joints à la main (limite technique des liens mailto, notamment sur Outlook).
   - **Hors connexion** : le brouillon est créé quand même ; il part de la boîte d'envoi dès que le réseau revient.
5. **Historique d'envoi** dans chaque shift et chaque job : expéditeur, destinataires, CC, date et heure de création du brouillon, moyen utilisé (partage ou brouillon mailto) ; le poste passe au statut sent. Un partage annulé n'est pas enregistré.

### Modèle de mail

Modèle par défaut intégré à l'app, générique, en anglais. Pas de réglage dans Settings.

- Objet : `Lotpack – <job> – <date du lotpack> (Day/Night)`.
- Dates au format JJ/MM/AAAA ; l'objet et le corps portent la date saisie dans le lotpack (date du poste), le plus souvent le jour de l'envoi.
- Un champ vide est simplement omis.
- L'objet et le corps sont **entièrement modifiables** dans Finish & send avant l'ouverture du brouillon (bouton « Reset to default text » pour revenir au modèle).

```text
Subject: Lotpack – {jobNumber} {projectTitle} – {shiftDate} ({Day|Night})

Hi,

Please find attached the lot pack for {jobNumber} {projectTitle} – {shiftDate} ({Day|Night} shift).

Sheets included:
- Approval to Proceed (MSF28-6)
- Site Diagram (MSF28-7)[ – {n} drawing pages]
- Asphalt Traceability (MSF28-10)
- Pavement Measured Dip Record {i} (MSF28-9)     (si ajouté)
- Survey Record {i} (MSF28-12)                   (si ajouté)
- Quantity & Placement Agreement (MSF28-11)

Attachments:
- {pdfFileName}
- {jsonFileName}

Regards,
{completedBy}
```

## 10. Publication, installation, renommage

**Publication**

- **Dépôt public** + **GitHub Pages** : `dist/strata-dia.html` est publié en `index.html` à l'adresse `https://pierrelgeli-bit.github.io/strata-dia/`. Sur un compte gratuit, repasser le dépôt en privé désactive le site.
- Publication depuis `main` uniquement, donc seulement après validation de PL (workflow `pages.yml`).

**Application installable (PWA)**

- `manifest.webmanifest` : nom « STRATA Dia », icônes « SD », couleurs jour / nuit, affichage plein écran.
- **Service worker** : met l'app en cache pour un fonctionnement 100 % hors ligne après la première ouverture. Sa version est une empreinte du HTML, du manifest, de `sw.js` et des icônes.
- Mise à jour : le service worker détecte une nouvelle version et propose « Update available – Reload ». Tant que l'utilisateur ne touche pas Reload, il reste sur la version en mémoire.
- Installation sur téléphone / tablette : ouvrir l'adresse une fois avec réseau, puis iPhone / iPad « Partager → Sur l'écran d'accueil », Android « ⋮ → Installer l'application ».
- Les données restent uniquement sur l'appareil (IndexedDB). Le site ne sert qu'à distribuer le code. Effacer les données du navigateur supprime les lotpacks : rappeler dans Settings de faire un export JSON régulier.
- La page HTTPS est nécessaire au partage natif avec pièces jointes (Web Share API) ; l'ouverture du fichier en local (`file://`) reste possible en secours, sans installation ni mise à jour automatique.

**Renommage Strata Lotpack → STRATA Dia**

- Dépôt `strata-dia` et nouvelle adresse du site ; l'ancienne adresse `/strata-lotpack/` n'est pas redirigée, l'app est à réinstaller depuis la nouvelle.
- Identifiants internes `strata-dia` : base IndexedDB, champ `app` des exports, cache.
- Au premier démarrage, les jobs, réglages et contacts de l'ancienne base `strata-lotpack` sont copiés une fois (l'ancienne base est conservée) ; les exports JSON marqués `strata-lotpack` restent importables ; l'ancien cache est supprimé.
- Le mot « Lotpack » reste celui du document COLAS (objet du mail, noms des PDF et JSON du shift).

## 11. Décisions prises

- Hébergement : GitHub Pages + PWA (dépôt public) ; le fichier local reste utilisable en secours.
- Limites (température, vent, dips) saisies dans la fiche ; pas de photos en V1 ; une tablette par équipe ; signature sur écran acceptée ; pas de partage avec Strata Opus.
- Croquis à main levée multicolore ; Site Diagram extensible par pages de dessin supplémentaires, chacune avec ses légendes ; légendes 3 et suivantes sur une page de suite.
- PDF corrigé et paginé (« Page X of Y » cohérente), généré par pdf-lib sur le PDF officiel en fond, et joint automatiquement. Ordre : 6, 7, 10, 9, 12, 11.
- Dip Record et Survey Record optionnels, ajoutés à la demande.
- Mail générique en anglais, enrichi (job, shift, liste des fiches) et modifiable.
- Sélection d'une carte au clic, ouverture au double-clic ou par le bouton Open, Ctrl+C / Ctrl+V pour dupliquer ; duplication remise à zéro (historique d'envoi vidé, statut draft).
- Application renommée STRATA Dia (dépôt `strata-dia`), avec reprise des données et des exports de Strata Lotpack ; le document envoyé reste le « Lotpack ».
- Développement étape par étape, avec validation de PL entre chaque étape.

**Questions ouvertes** : aucune.
