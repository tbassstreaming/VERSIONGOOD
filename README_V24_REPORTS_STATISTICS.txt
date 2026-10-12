T-BASS V24 — RAPPORTS ET STATISTIQUES

Cette version ajoute au dashboard privé :
- filtres : mois en cours, historique complet, 30 jours, 7 jours ;
- nombre de demandes, clients actifs, paiements vérifiés, revenus associés aux paiements marqués vérifiés ;
- graphique des demandes sur les six derniers mois ;
- répartition par plan, dossiers en attente/expirés et taux d’activation ;
- export CSV contenant le résumé et les dossiers de la période choisie.

IMPORTANT : les revenus sont calculés à partir des dossiers dont payment_status vaut VERIFIED. Vérifiez manuellement les paiements NatCash/MonCash avant de les marquer vérifiés. Ces rapports sont un outil de suivi interne, pas un relevé comptable certifié.

Installation : décompressez ce paquet dans votre projet de test en gardant la structure des dossiers, installez les dépendances avec npm install, configurez les variables de sécurité et lancez selon le README principal. Faites une sauvegarde de la base data/tbass.sqlite avant toute mise à jour. Testez avec des dossiers de démonstration avant usage réel.
