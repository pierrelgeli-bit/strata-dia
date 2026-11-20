# STRATA Dia — Plan de travail

Ce fichier est le plan d'exécution de STRATA Dia.

- **Opus** y écrit les lots de tâches à partir des demandes de PL. Il ne code pas.
- **Sonnet** exécute le premier lot non terminé et coche les cases au fur et à mesure.
- **`docs/cadrage.md`** est la référence : il décrit **comment doit être l'app**. Ce plan dit **quoi faire maintenant**. En cas de contradiction entre les deux, s'arrêter et demander à PL.

## Instructions pour Sonnet (à relire à chaque session)

### Avant de coder

1. Se placer sur la branche `test` (`git checkout test`), vérifier que l'arbre est propre (`git status`).
2. Lire `docs/cadrage.md` **en entier**, puis ce fichier.
3. Le lot à traiter est le **premier lot qui contient encore des cases `[ ]`**. Ne pas commencer un autre lot.
4. **Poser des questions.** Si un point est ambigu, sous-spécifié, contradictoire, ou si plusieurs solutions sont possibles, poser **un maximum de questions** à PL avant de coder, jusqu'à avoir tout compris. Aucune supposition silencieuse sur un point bloquant. PL est là pour trancher quand tu n'arrives pas à décider.

### Pendant le lot

5. **Une tâche à la fois**, dans l'ordre du lot. Rien en dehors du lot, sauf accord de PL.
6. **Tests obligatoires** :
   - tout comportement nouveau ou modifié a un test Playwright (adapter le fichier `test/stepN.test.js` concerné ou en créer un nouveau, à ajouter à la commande du `README.md`) ;
   - lancer la **suite complète** avant de déclarer un lot terminé :

     ```bash
     node build/build.js && node test/step1.test.js && node test/step2.test.js && node test/step3.test.js && node test/step4.test.js && node test/step5.test.js && node test/step6.test.js && node test/step7.test.js && node test/step8.test.js && node test/step9.test.js && node test/step10.test.js
     ```

   - un test rouge = la tâche n'est pas finie.
7. **Cocher** : passer `[ ]` en `[x]` dans ce fichier **dès qu'une tâche est faite et vérifiée**, pas avant. Ne jamais cocher en avance.
8. **Ne pas réécrire le plan** : ne pas supprimer, renommer ou réordonner les tâches. Si une tâche est impossible, inutile ou doit changer, ajouter une ligne `> Note Sonnet : …` sous la tâche et demander à PL.
9. **Ne pas modifier `docs/cadrage.md`** (réservé à Opus). Si le code doit s'écarter du cadrage, demander à PL.
10. Interface **en anglais uniquement** ; code et commentaires en anglais ; ce fichier et les échanges en français.

### Git

11. Travailler **uniquement sur `test`**. Un commit par tâche ou par groupe de tâches cohérent, avec un message clair ; les cases cochées de `plan.md` font partie du commit.
12. **Aucun push** sans demande de PL. **Aucun merge ni push vers `main`** sans instruction explicite de PL (`main` = publication sur GitHub Pages).

### Fin de lot

13. Montrer à PL la **sortie réelle** de la suite de tests (ou un extrait clair) et la liste des tâches cochées. Ne jamais dire « terminé » sans cette preuve.
14. Attendre la validation de PL avant de passer au lot suivant.

## Instructions pour Opus (écriture des lots)

- Un lot par demande de PL, ajouté **à la fin** de la section « Lots à faire », lettre suivante (Lot B, Lot C…).
- Format : contexte, tâches `[ ]` numérotées et vérifiables, critère de fin (ce que PL doit constater, tests à passer). Voir le modèle en bas de fichier.
- Toute décision qui change l'app est aussi reportée dans `docs/cadrage.md` (section concernée + « Décisions prises »).
- Poser à PL toutes les questions nécessaires avant d'écrire un lot ; un lot ne contient pas de point ambigu.
- Ne pas cocher les tâches (c'est Sonnet qui coche) et ne pas écrire de code.

## Historique : étapes terminées

Faites, testées et publiées sur GitHub Pages (`main` = c93e8b2). Ne pas les refaire.

- [x] **Étape 1** : squelette, build, IndexedDB, Jobs / Shifts. *Critère : un job créé est retrouvé après rechargement.*
- [x] **Étape 2** : Approval to Proceed + signatures. *Critère : fiche remplie et signée, aperçu PDF fidèle.*
- [x] **Étape 3** : Asphalt Traceability. *Critère : lignes camions, cumul, alertes 2 h.*
- [x] **Étape 4** : Site Diagram. *Critère : croquis et légendes sauvegardés, ajout de pages de dessin.*
- [x] **Étape 5** : Dip Record + Survey Record. *Critère : ajout à la demande, 3 blocs, relevés, contrôle des limites.*
- [x] **Étape 6** : Quantity & Placement. *Critère : items, totaux, signatures.*
- [x] **Étape 7** : PDF complet + Finish & send. *Critère : pack complet envoyé par mail depuis une tablette.*
- [x] **Étape 8** : export / import JSON. *Critère : aller-retour sans perte entre deux appareils.*
- [x] **Étape 9** : PWA + GitHub Pages. *Critère : app installée, utilisable hors ligne, « Update available – Reload » à chaque nouvelle version.*
- [x] **Étape 10** : renommage STRATA Dia. *Critère : données, réglages, contacts et exports de Strata Lotpack repris sans perte.*

## Lots à faire

### Lot A — Nettoyage après le remplacement de la documentation

Contexte : `docs/ARCHITECTURE.md` est remplacé par `docs/cadrage.md` (référence) et `docs/plan.md` (suivi). Un commentaire du code cite encore l'ancien fichier, et le `README.md` garde un tableau d'avancement qui fait doublon avec ce plan.

- [ ] A1. Dans `src/core/mail.js` (commentaire vers la ligne 54), remplacer `docs/ARCHITECTURE.md` par `docs/cadrage.md`.
- [ ] A2. Dans le `README.md`, remplacer le tableau de la section « Avancement » par une phrase renvoyant à `docs/plan.md`.
- [ ] A3. Vérifier que `grep -rn ARCHITECTURE src build test tools README.md .github` ne renvoie aucune ligne (les mentions dans `docs/` sont normales : elles expliquent le remplacement).
- [ ] A4. Lancer la suite complète de tests : tous verts. Montrer la sortie à PL.
- [ ] A5. Commit sur `test` (cases A1 à A5 cochées comprises). Pas de push.

Critère de fin : plus aucune référence à `ARCHITECTURE.md` hors de `docs/`, suite de tests verte, un commit sur `test`.

## Modèle de lot (pour Opus)

```markdown
### Lot X — Titre court

Contexte : pourquoi ce lot, ce que PL a demandé.

- [ ] X1. Tâche précise et vérifiable (fichier ou écran concerné).
- [ ] X2. Test Playwright du nouveau comportement.
- [ ] X3. Suite complète verte, sortie montrée à PL.
- [ ] X4. Commit sur `test`. Pas de push.

Critère de fin : ce que PL doit pouvoir constater dans l'app, tests à passer.
```
