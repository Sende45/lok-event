// src/app/privacy/page.tsx
// Politique de confidentialité — exigée par Google Play et l'App Store
// (lien à renseigner dans la fiche de l'application).
import Link from "next/link";

// ⚠️ Adresse de contact affichée publiquement : elle doit exister et être relevée
const EMAIL_CONTACT = "contact@eden-group.co";

export const metadata = {
  title: "Politique de confidentialité — LOKEVENT",
  description: "Politique de confidentialité du site et de l'application mobile LOKEVENT",
};

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3">{titre}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : octobre 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed text-sm md:text-base">
          <Section titre="1. Qui sommes-nous">
            <p>
              LOKEVENT est une plateforme de mise en relation entre organisateurs d&apos;événements et
              prestataires de services événementiels en Côte d&apos;Ivoire (traiteurs, DJ, photographes,
              décorateurs, salles…), accessible sur le site lokevent.eden-group.co et dans
              l&apos;application mobile LOKEVENT (Android et iOS). Cette politique explique quelles données
              nous collectons, pourquoi, et comment vous gardez le contrôle dessus.
            </p>
          </Section>

          <Section titre="2. Données collectées">
            <p>
              <span className="text-white">Compte (tous les utilisateurs) :</span> nom, prénom, adresse
              e-mail, numéro de téléphone (facultatif), photo de profil (facultative) et mot de passe,
              stocké uniquement sous forme chiffrée.
            </p>
            <p>
              <span className="text-white">Prestataires :</span> nom de l&apos;entreprise, catégorie,
              description, commune et quartier, position sur la carte (si le prestataire la renseigne),
              photos, prestations et tarifs, coordonnées professionnelles, disponibilités.
            </p>
            <p>
              <span className="text-white">Réservations et messages :</span> date, lieu et type
              d&apos;événement, nombre de personnes, budget, messages échangés entre organisateurs et
              prestataires, avis laissés après une prestation.
            </p>
            <p>
              <span className="text-white">Abonnement Premium (prestataires) :</span> pack choisi, moyen
              de paiement mobile money et référence de la transaction. Nous ne recevons jamais vos codes
              ni identifiants mobile money.
            </p>
            <p>
              <span className="text-white">Position de l&apos;appareil :</span> utilisée seulement avec
              votre autorisation, au moment où vous l&apos;utilisez (« Autour de moi », itinéraire,
              placement de votre activité sur la carte). La position d&apos;un organisateur n&apos;est
              jamais enregistrée : elle sert uniquement à calculer les distances pendant la recherche.
            </p>
            <p>
              <span className="text-white">Notifications :</span> si vous les acceptez dans
              l&apos;application, un identifiant technique de votre téléphone (jeton de notification) est
              enregistré pour vous prévenir d&apos;un message, d&apos;une réservation ou de votre
              abonnement. Il est supprimé à la déconnexion.
            </p>
          </Section>

          <Section titre="3. Utilisation des données">
            <p>
              Vos données servent uniquement au fonctionnement de LOKEVENT : gestion de votre compte,
              affichage des prestataires, messagerie, réservations, avis, notifications, abonnements
              Premium, sécurité de la plateforme et statistiques globales (nombre d&apos;affichages et de
              clics des publicités, sans profilage individuel). Nous ne vendons pas vos données et nous ne
              les utilisons pas pour de la publicité ciblée.
            </p>
          </Section>

          <Section titre="4. Ce qui est visible publiquement">
            <p>
              Les fiches des prestataires (nom, catégorie, photos, commune, prestations, tarifs, avis et,
              pour les fiches Premium, position sur la carte et coordonnées) sont visibles par tous les
              visiteurs. Les fiches non Premium sont affichées floutées : seuls la catégorie, la commune et
              une distance arrondie sont visibles. Les coordonnées d&apos;un organisateur ne sont
              communiquées qu&apos;au prestataire qu&apos;il contacte.
            </p>
          </Section>

          <Section titre="5. Prestataires techniques">
            <p>Pour faire fonctionner le service, certaines données sont traitées par :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Vercel (hébergement du site web) ;</li>
              <li>Railway (hébergement du serveur de l&apos;application) ;</li>
              <li>Neon (base de données, hébergée dans l&apos;Union européenne) ;</li>
              <li>ImgBB (stockage des photos publiées) ;</li>
              <li>Resend (envoi des e-mails, par exemple le code de mot de passe oublié) ;</li>
              <li>Expo et Google Firebase (acheminement des notifications sur le téléphone) ;</li>
              <li>OpenStreetMap (affichage des cartes) ;</li>
              <li>Google Maps ou Plans d&apos;Apple, seulement si vous lancez un itinéraire.</li>
            </ul>
            <p>Ces prestataires n&apos;utilisent vos données que pour rendre ce service.</p>
          </Section>

          <Section titre="6. Cookies et stockage">
            <p>
              Sur le site, votre session est conservée dans un cookie sécurisé (httpOnly), inaccessible
              aux scripts de la page, valable 7 jours et supprimé à la déconnexion. Votre prénom et votre
              rôle sont gardés dans le navigateur pour l&apos;affichage du menu. Dans l&apos;application,
              votre session est enregistrée dans l&apos;espace sécurisé du téléphone. Nous
              n&apos;utilisons aucun cookie publicitaire ni outil de suivi tiers.
            </p>
          </Section>

          <Section titre="7. Conservation et sécurité">
            <p>
              Vos données sont conservées tant que votre compte existe. Les codes de réinitialisation de
              mot de passe expirent après 15 minutes. Nous protégeons vos données par le chiffrement des
              mots de passe, des connexions HTTPS, des contrôles d&apos;accès par rôle, la limitation des
              tentatives de connexion et la révocation des sessions lors d&apos;un changement de mot de
              passe.
            </p>
          </Section>

          <Section titre="8. Suppression de votre compte">
            <p>
              Vous pouvez supprimer votre compte à tout moment depuis l&apos;application (Mon compte →
              Supprimer mon compte) ou en nous écrivant. La suppression est définitive : profil, fiche
              prestataire, photos, prestations, réservations, messages, avis, favoris, notifications et
              abonnements sont effacés immédiatement.{" "}
              <Link href="/suppression-compte" className="text-teal-400 hover:text-teal-300">
                Voir la procédure détaillée
              </Link>
              .
            </p>
          </Section>

          <Section titre="9. Vos droits">
            <p>
              Conformément à la loi ivoirienne n° 2013-450 relative à la protection des données à
              caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification,
              d&apos;opposition et de suppression de vos données. Vous pouvez modifier votre profil
              directement dans l&apos;application ou nous écrire à l&apos;adresse ci-dessous. Vous pouvez
              aussi saisir l&apos;ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte
              d&apos;Ivoire).
            </p>
          </Section>

          <Section titre="10. Mineurs">
            <p>LOKEVENT s&apos;adresse aux personnes majeures. Les comptes de mineurs ne sont pas autorisés.</p>
          </Section>

          <Section titre="11. Contact">
            <p>
              Pour toute question sur vos données :{" "}
              <a href={`mailto:${EMAIL_CONTACT}`} className="text-teal-400 hover:text-teal-300">
                {EMAIL_CONTACT}
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}