# Flux — Exemples de référence

---

## source fichier

// lire un fichier csv local
source fichier("produits.csv")
     puis affiche;

---

## source api

// récupérer des données depuis une API
source api("https://api.exemple.com/utilisateurs")
     puis affiche;

---

## source liste

// travailler sur une liste définie en dur
source liste([340, 12, 89, 450, 23, 167])
     puis affiche;

---

## puis extrait

// garder uniquement certaines colonnes d'un fichier
source fichier("employes.csv")
     puis extrait [nom, salaire, ville]
     puis affiche;

---

## puis filtre

// garder uniquement les lignes qui satisfont une condition
source fichier("produits.csv")
     puis filtre prix < 50
     puis affiche;

---

## puis filtre avec et

// combiner deux conditions
source fichier("clients.csv")
     puis filtre age >= 18 et abonne == vrai
     puis affiche;

---

## puis filtre avec ou

// garder les lignes qui satisfont au moins une condition
source fichier("stocks.csv")
     puis filtre ville == "Paris" ou ville == "Lyon"
     puis affiche;

---

## puis transforme

// modifier une valeur sur chaque ligne
source fichier("catalogue.csv")
     puis transforme prix est prix * 1.2
     puis affiche;

---

## puis transforme (plusieurs fois)

// enchaîner plusieurs modifications
source fichier("ventes.csv")
     puis transforme montant est montant * 0.9
     puis transforme devise est "EUR"
     puis affiche;

---

## puis affiche

// afficher le résultat dans la console
source liste([12, 28, 5, 33, 19, 41])
     puis filtre valeur > 20
     puis affiche;

---

## puis sauvegarde

// écrire le résultat dans un fichier
source api("https://api.exemple.com/meteo")
     puis extrait [ville, temperature, date]
     puis sauvegarde "meteo.json";

---

## puis filtre avec !=

// garder les commandes qui ne sont pas annulées
source fichier("commandes.csv")
     puis filtre statut != "annulée"
     puis affiche;

---

## vrai / faux

// filtrer sur un booléen
source fichier("comptes.csv")
     puis filtre actif == vrai
     puis affiche;

source fichier("comptes.csv")
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

source fichier("commandes_janvier.csv") | traiter_commandes;
source fichier("commandes_fevrier.csv") | traiter_commandes;

---

## Exemple complet — tous les mots-clés ensemble

// traitement complet d'un fichier de ventes API
// extrait, filtre, transforme, sauvegarde
source api("https://api.exemple.com/ventes")
     puis extrait [vendeur, produit, montant, region, valide]
     puis filtre valide == vrai et montant > 0
     puis filtre region == "Nord" ou region == "Sud"
     puis transforme montant est montant * 0.85
     puis sauvegarde "ventes_finales.json";
