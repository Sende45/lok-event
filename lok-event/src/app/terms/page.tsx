// src/app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Conditions d'utilisation — LOKEVENT",
  description: "Conditions générales d'utilisation de la plateforme LOKEVENT",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">Conditions d'utilisation</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed text-sm md:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Objet</h2>
            <p>
              LOKEVENT est une plateforme de mise en relation entre des organisateurs
              d'événements (« Clients ») et des prestataires de services
              événementiels (« Prestataires ») en Côte d'Ivoire. En créant un compte
              ou en utilisant la plateforme, vous acceptez les présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Rôle de LOKEVENT</h2>
            <p>
              LOKEVENT agit exclusivement comme intermédiaire de mise en relation.
              <span className="text-white"> Aucun paiement n'est effectué via la
              plateforme</span> : les fourchettes de prix affichées sont purement
              indicatives, et les conditions de la prestation (prix définitif,
              modalités, acomptes) sont convenues directement entre le Client et le
              Prestataire. LOKEVENT n'est pas partie au contrat conclu entre eux et
              ne saurait être tenu responsable de l'exécution, de la qualité ou de
              l'annulation d'une prestation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Comptes utilisateurs</h2>
            <p>
              La création d'un compte nécessite des informations exactes et à jour.
              Vous êtes responsable de la confidentialité de vos identifiants et de
              toute activité effectuée depuis votre compte. LOKEVENT se réserve le
              droit de suspendre ou supprimer un compte en cas de violation des
              présentes conditions, de fausses informations ou de comportement
              frauduleux.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Obligations des Prestataires</h2>
            <p>
              Les Prestataires s'engagent à fournir des informations exactes sur
              leurs services, tarifs indicatifs, localisation et disponibilités, à
              publier uniquement des photos dont ils détiennent les droits, à
              répondre avec diligence aux demandes de réservation, et à exercer leur
              activité dans le respect de la réglementation ivoirienne applicable.
              Le badge « Vérifié » atteste uniquement d'une vérification
              administrative par LOKEVENT et ne constitue pas une garantie de
              qualité.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Demandes de réservation</h2>
            <p>
              Une demande de réservation envoyée via la plateforme constitue une
              simple mise en relation : elle n'engage ni le Client ni le Prestataire
              tant que ceux-ci n'ont pas convenu directement des termes de la
              prestation. Le Client peut annuler sa demande, et le Prestataire peut
              l'accepter ou la refuser librement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Avis vérifiés</h2>
            <p>
              Seuls les Clients ayant effectué une réservation marquée comme
              terminée peuvent publier un avis sur le Prestataire concerné, à raison
              d'un avis par réservation. Les avis doivent être honnêtes, respectueux
              et fondés sur une expérience réelle. LOKEVENT se réserve le droit de
              retirer tout avis diffamatoire, injurieux, discriminatoire ou
              manifestement frauduleux.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Contenus interdits</h2>
            <p>
              Il est interdit de publier des contenus illicites, trompeurs,
              contrefaisants ou portant atteinte aux droits de tiers, d'utiliser la
              plateforme à des fins de démarchage abusif, de collecte de données ou
              de toute activité frauduleuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Propriété intellectuelle</h2>
            <p>
              La marque LOKEVENT, le logo, l'interface et les éléments de la
              plateforme sont protégés. Les Prestataires conservent la propriété des
              contenus qu'ils publient et accordent à LOKEVENT une licence
              d'affichage sur la plateforme aux fins du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Responsabilité et disponibilité</h2>
            <p>
              LOKEVENT met tout en œuvre pour assurer la disponibilité et la
              sécurité de la plateforme, sans pouvoir garantir un fonctionnement
              ininterrompu. La responsabilité de LOKEVENT ne saurait être engagée
              pour les dommages résultant de la relation contractuelle entre Clients
              et Prestataires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par le droit ivoirien. Tout
              litige relatif à leur interprétation ou leur exécution relève des
              juridictions compétentes de Côte d'Ivoire, après tentative de
              résolution amiable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
            <p>
              Pour toute question relative aux présentes conditions, contactez-nous
              via les coordonnées indiquées sur la plateforme.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}