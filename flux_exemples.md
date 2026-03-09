# Flux — Exemples de référence

---

## source api
source api("https://jsonplaceholder.typicode.com/users")
puis affiche;

// récupérer des données depuis une API
source api("https://api.exemple.com/utilisateurs")
     puis affiche;

---

## puis extrait

// garder uniquement certaines colonnes
source api("https://api.exemple.com/employes")
     puis extrait [nom, salaire, ville]
     puis affiche;

---

## puis filtre

// garder uniquement les lignes qui satisfont une condition
source api("https://api.exemple.com/produits")
     puis filtre prix < 50
     puis affiche;

---

## puis filtre avec et

// combiner deux conditions
source api("https://api.exemple.com/clients")
     puis filtre age >= 18 et abonne == vrai
     puis affiche;

---

## puis filtre avec ou

// garder les lignes qui satisfont au moins une condition
source api("https://api.exemple.com/stocks")
     puis filtre ville == "Paris" ou ville == "Lyon"
     puis affiche;

---

## puis transforme

// modifier une valeur sur chaque ligne
source api("https://api.exemple.com/catalogue")
     puis transforme prix est prix * 1.2
     puis affiche;

---

## puis transforme (plusieurs fois)

// enchaîner plusieurs modifications
source api("https://api.exemple.com/ventes")
     puis transforme montant est montant * 0.9
     puis transforme devise est "EUR"
     puis affiche;

---

## puis sauvegarde

// écrire le résultat dans un fichier JSON
source api("https://api.exemple.com/meteo")
     puis extrait [ville, temperature, date]
     puis sauvegarde "meteo.json";

---

## puis filtre avec !=

// garder les commandes qui ne sont pas annulées
source api("https://api.exemple.com/commandes")
     puis filtre statut != "annulée"
     puis affiche;

---

## vrai / faux

// filtrer sur un booléen
source api("https://api.exemple.com/comptes")
     puis filtre actif == vrai
     puis affiche;

source api("https://api.exemple.com/comptes")
     puis filtre bloque == faux
     puis affiche;

---

## pipeline / fin

// déclarer un pipeline nommé réutilisable
pipeline traiter_commandes debut
     puis extrait [client, montant, statut]
     puis filtre statut == "validée"
     puis transforme montant est montant * 0.9
     puis sauvegarde "commandes_traitees.json";
fin

source api("https://api.exemple.com/commandes_janvier") | traiter_commandes;
source api("https://api.exemple.com/commandes_fevrier") | traiter_commandes;

---

## Exemple complet — tous les mots-clés ensemble

source api("https://api.exemple.com/ventes")
     puis extrait [vendeur, produit, montant, region, valide]
     puis filtre valide == vrai et montant > 0
     puis filtre region == "Nord" ou region == "Sud"
     puis transforme montant est montant * 0.85
     puis sauvegarde "ventes_finales.json";
