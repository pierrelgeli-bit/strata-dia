# STRATA Dia — Plan de travail

Ce fichier est le plan d'exécution de STRATA Dia. **Opus** y écrit les prompts (lots de tâches). **Sonnet** les exécute et coche les cases au fur et à mesure.
La référence fonctionnelle et technique est `docs/cadrage.md`. Le plan dit **quoi faire maintenant** ; le cadrage dit **comment doit être l'app**.

## Instructions pour Sonnet (à lire en premier, à chaque session)

1. **Lire dans cet ordre** : `docs/cadrage.md` en entier, puis ce fichier. Le premier lot non terminé (cases `[ ]`) est celui à traiter.
2. **Poser des questions.** Si un point est ambigu, sous-spécifié ou contradictoire entre le cadrage et le plan, pose **un maximum de questions** à PL, avant de coder, jusqu'à avoir tout compris. Aucune supposition silencieuse sur un point bloquant. PL est là pour trancher quand tu n'arrives pas à décider.
3. **Une tâche à la fois**, dans l'ordre du lot. Ne rien faire hors du lot en cours, sauf accord de PL.
4. **Tester avant de cocher.** Les tests sont obligatoires :
   - lancer le build (`node build/build.js`) et les tests Playwright du dossier `test/` concernés, **toujours tous les tests existants** avant de déclarer un lot terminé ;
   - ajouter ou adapter un test pour chaque comportement nouveau ;
   - ne cocher une case qu'après avoir vu la sortie réelle (tests verts, résultat visible). Montrer cette sortie à PL ; ne jamais dire « terminé » sans preuve.
5. **Cocher** : passer `[ ]` en `[x]` dans ce fichier, tâche par tâche, dès qu'elle est faite et testée. Ne pas cocher en avance. Ne pas réécrire les lots, ne pas supprimer de tâche ; si une tâche est impossible ou change, l'écrire en note sous la tâche et demander à PL.
6. **Ne pas modifier `docs/cadrage.md`** : seul Opus le met à jour. Si le code doit s'écarter du cadrage, demander à PL.
7. **Git** :
   - travailler **uniquement sur `test`** ;
   - un commit par tâche ou par groupe de tâches cohérent, message clair ;
   - **aucun push** sans demande de PL, **aucun merge ni push vers `main`** sans instruction explicite de PL.
8. **Interface en anglais uniquement.** Code et commentaires en anglais ; ce fichier et les échanges en français.
9. **Fin de lot** : résumer à PL ce qui a été fait, avec la sortie des tests, puis attendre sa validation avant de passer au lot suivant.

## Historique : étapes terminées

Ces étapes sont faites, testées et publiées (détail dans `docs/cadrage.md`). Ne pas les refaire.

- [x] Étape 1 : squelette, build, IndexedDB, Jobs / Shifts
- [x] Étape 2 : Approval to Proceed + signatures
- [x] Étape 3 : Asphalt Traceability
- [x] Étape 4 : Site Diagram
- [x] Étape 5 : Dip Record + Survey Record
- [x] Étape 6 : Quantity & Placement
- [x] Étape 7 : PDF complet + Finish & send
- [x] Étape 8 : export / import JSON
- [x] Étape 9 : PWA + GitHub Pages
- [x] Étape 10 : renommage STRATA Dia (reprise des données de Strata Lotpack)

Tests existants : `test/step1` à `test/step10` (Playwright). Commande de test : voir le `README.md`.

## Lots à faire

### Lot A — Nettoyage après le renommage de la doc

Contexte : `docs/ARCHITECTURE.md` est remplacé par `docs/cadrage.md`. Un commentaire du code cite encore l'ancien nom.

- [ ] A1. Dans `src/core/mail.js` (commentaire ligne ~54), remplacer la mention `docs/ARCHITECTURE.md` par `docs/cadrage.md`.
- [ ] A2. Reconstruire (`node build/build.js`) et vérifier qu'aucun fichier de `src/`, `build/`, `test/`, `tools/`, `README.md` ni `.github/` ne cite plus `ARCHITECTURE.md` (`grep -rn ARCHITECTURE src build test tools README.md .github`, résultat attendu : aucune ligne). Les mentions dans `docs/` sont normales (elles expliquent le remplacement).
- [ ] A3. Relancer tous les tests (`test/step1` à `test/step10`) : tous verts. Montrer la sortie.
- [ ] A4. Commit sur `test`. Pas de push.

## Lots suivants

Opus ajoutera ici les prochains prompts, un lot par section « Lot B », « Lot C », etc., avec le même format : contexte, tâches `[ ]` numérotées, critère de fin.

Modèle de lot :

```markdown
### Lot X — Titre

Contexte : pourquoi ce lot.

- [ ] X1. Tâche précise et vérifiable.
- [ ] X2. …

Critère de fin : ce que PL doit pouvoir constater, tests à passer.
```
