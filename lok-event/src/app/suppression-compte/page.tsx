// src/app/suppression-compte/page.tsx
// Procédure de suppression de compte — URL exigée par Google Play
// (Play Console → Contenu de l'application → Sécurité des données → Suppression du compte).
import Link from "next/link";

// ⚠️ Adresse de contact affichée publiquement : elle doit exister et être relevée
const EMAIL_CONTACT = "contact@eden-group.co";

export const metadata = {
  title: "Supprimer mon compte — LOKEVENT",
  description: "Comment supprimer votre compte LOKEVENT et les données associées",
};

const ETAPES = [
  "Ouvrez l'application LOKEVENT et connectez-vous.",
  "Organisateur : onglet « Compte » → « Mon compte ». Prestataire : onglet « Profil » → « Mon compte ».",
  "Tout en bas, appuyez sur « Supprimer mon compte ».",
  "Confirmez avec votre mot de passe. La suppression est immédiate.",
];

export default function SuppressionComptePage() {
  const sujet = encodeURIComponent("Suppression de mon compte LOKEVENT");
  const corps = encodeURIComponent(
    "Bonjour,\n\nJe souhaite supprimer mon compte LOKEVENT.\nAdresse e-mail du compte : \n\nMerci."
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">Supprimer mon compte LOKEVENT</h1>
        <p className="text-gray-400 mb-10">
          Application LOKEVENT (Android, iOS) et site lokevent.eden-group.co
        </p>

        <div className="space-y-8 text-gray-300 leading-relaxed text-sm md:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Depuis l&apos;application</h2>
            <ol className="space-y-3">
              {ETAPES.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-teal-400 text-black text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{e}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Sans l&apos;application</h2>
            <p className="mb-4">
              Envoyez-nous un e-mail depuis l&apos;adresse de votre compte. Nous supprimons le compte
              sous 7 jours au maximum et vous confirmons la suppression par e-mail.
            </p>
            <a
              href={`mailto:${EMAIL_CONTACT}?subject=${sujet}&body=${corps}`}
              className="inline-block px-5 py-3 bg-teal-400 text-black font-semibold rounded-lg hover:bg-teal-300 transition-colors"
            >
              Demander la suppression par e-mail
            </a>
            <p className="text-xs text-gray-500 mt-2">{EMAIL_CONTACT}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Données supprimées</h2>
            <p>
              Tout ce qui est lié au compte est effacé définitivement : profil et photo, fiche
              prestataire, photos, prestations, disponibilités, réservations, messages et conversations,
              avis publiés, favoris, notifications, appareils enregistrés pour les notifications et
              historique d&apos;abonnement Premium.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Données conservées</h2>
            <p>
              Aucune donnée personnelle n&apos;est conservée après la suppression. Seules subsistent des
              statistiques globales anonymes (par exemple le nombre total d&apos;affichages d&apos;une
              publicité), qui ne permettent pas de vous identifier.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}