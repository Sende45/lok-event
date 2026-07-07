// src/app/privacy/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — LOKEVENT",
  description: "Politique de confidentialité de la plateforme LOKEVENT",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed text-sm md:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Qui sommes-nous</h2>
            <p>
              LOKEVENT est une plateforme de mise en relation entre organisateurs
              d'événements et prestataires de services événementiels en Côte d'Ivoire
              (traiteurs, DJ, photographes, décorateurs, salles et espaces...).
              La présente politique décrit comment nous collectons, utilisons et
              protégeons vos données personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Données collectées</h2>
            <p className="mb-3">Nous collectons les données suivantes :</p>
            <p>
              <span className="text-white">Pour tous les utilisateurs :</span> nom,
              prénom, adresse e-mail, numéro de téléphone (optionnel) et mot de passe
              (stocké sous forme chiffrée, jamais en clair).
            </p>
            <p className="mt-2">
              <span className="text-white">Pour les prestataires :</span> nom
              d'entreprise, description des services, localisation (ville, commune,
              quartier et, si le prestataire le renseigne volontairement, position
              géographique précise affichée publiquement sur la carte), photos,
              coordonnées de contact professionnelles et fourchette de prix indicative.
            </p>
            <p className="mt-2">
              <span className="text-white">Pour les réservations :</span> date, lieu et
              type d'événement, nombre de personnes, budget estimé et messages
              transmis au prestataire.
            </p>
            <p className="mt-2">
              <span className="text-white">Géolocalisation de l'appareil :</span> la
              fonctionnalité « Autour de moi » utilise la position de votre appareil
              uniquement avec votre autorisation explicite, le temps de la recherche.
              Cette position n'est ni stockée ni partagée.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Utilisation des données</h2>
            <p>
              Vos données servent exclusivement au fonctionnement de la plateforme :
              création et gestion de votre compte, mise en relation entre clients et
              prestataires, traitement des demandes de réservation, publication des
              avis vérifiés, et amélioration du service. Nous ne vendons pas vos
              données à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Partage et hébergement</h2>
            <p>
              Certaines données sont traitées par nos prestataires techniques :
              hébergement de l'application et de la base de données (Vercel, Render)
              et hébergement des photos (Imgbb). Les informations publiques des
              profils prestataires (nom d'entreprise, photos, localisation, avis)
              sont visibles par tous les visiteurs de la plateforme. Vos coordonnées
              de contact ne sont transmises qu'aux prestataires auprès desquels vous
              effectuez une demande de réservation, et réciproquement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Cookies et stockage local</h2>
            <p>
              LOKEVENT utilise le stockage local de votre navigateur pour conserver
              votre session de connexion (jeton d'authentification). Ces informations
              sont supprimées lors de votre déconnexion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Conservation et sécurité</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. Nous
              mettons en œuvre des mesures de sécurité appropriées : chiffrement des
              mots de passe, connexions sécurisées (HTTPS), contrôle d'accès par
              rôles et limitation du débit des requêtes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Vos droits</h2>
            <p>
              Conformément à la loi ivoirienne n° 2013-450 relative à la protection
              des données à caractère personnel, vous disposez d'un droit d'accès, de
              rectification et de suppression de vos données. Vous pouvez exercer ces
              droits en modifiant votre profil directement sur la plateforme ou en
              nous contactant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Contact</h2>
            <p>
              Pour toute question relative à cette politique ou à vos données
              personnelles, contactez-nous via les coordonnées indiquées sur la
              plateforme.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}