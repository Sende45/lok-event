"use client";

import {
  BarChart3, Users, Briefcase, Calendar, LogOut, Menu, X, DollarSign,
  Check, AlertCircle, Tag as TagIcon, FolderTree, Plus, Edit2, Trash2, Power,
  RefreshCw, Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";

interface EvolutionMois {
  mois: string;
  revenus: number;
  volumeAffaires: number;
}

interface Stats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: number;      // revenus réels : abonnements Premium encaissés
  volumeAffaires: number;    // GMV : budgets des prestations terminées
  totalPremium: number;      // membres Premium actifs
  abonnementsEnAttente: number;
  pendingProviders: number;
  todayBookings: number;
  evolutionMensuelle: EvolutionMois[];
}

interface RecentBooking {
  id: string;
  client: { nom: string; prenom: string };
  prestataire: { nomEntreprise: string };
  dateEvenement: string;
  budget: number | null;
  statut: string;
}

interface PendingProvider {
  id: string;
  nomEntreprise: string;
  categorie: { nom: string };
  quartier: string;
  ville: string;
  createdAt: string;
}

interface ProviderRow {
  id: string;
  nomEntreprise: string;
  verifie: boolean;
  actif: boolean;
  categorie: { nom: string };
  user: { nom: string; prenom: string; email: string };
}

interface ProvidersResponse {
  providers: ProviderRow[];
  pagination: { total: number };
}

interface UserRow {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  estPremium?: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: UserRow[];
  pagination: { total: number };
}

interface DemandeAbonnement {
  id: string;
  pack: string;
  montant: number;
  statut: string;
  moyenPaiement: string | null;
  referencePaiement: string | null;
  debutLe: string | null;
  finLe: string | null;
  createdAt: string;
  user: { id: string; nom: string; prenom: string; email: string; telephone: string | null };
}

interface Categorie {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  icone: string | null;
  couleur: string | null;
  _count: { prestataires: number };
}

interface Tag {
  id: string;
  nom: string;
  slug: string;
  groupe: string;
  icone: string | null;
}

type TagsGrouped = Record<string, Tag[]>;

const statutLabels: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500" },
  CONFIRMEE: { label: "Confirmé", color: "bg-green-500/20 text-green-500" },
  TERMINEE: { label: "Terminé", color: "bg-blue-500/20 text-blue-500" },
  ANNULEE: { label: "Annulé", color: "bg-red-500/20 text-red-500" },
};

const abonnementLabels: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "À valider", color: "bg-yellow-500/20 text-yellow-500" },
  ACTIF: { label: "Actif", color: "bg-green-500/20 text-green-500" },
  EXPIRE: { label: "Expiré", color: "bg-gray-500/20 text-gray-400" },
  REFUSE: { label: "Refusé", color: "bg-red-500/20 text-red-400" },
};

const tabs = [
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "premium", label: "Premium", icon: Crown },
  { id: "providers", label: "Prestataires", icon: Briefcase },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "categories", label: "Catégories", icon: FolderTree },
  { id: "tags", label: "Tags", icon: TagIcon },
];

/** Format compact des montants FCFA pour les axes du graphique (1,5M / 250k) */
function formatFCFACompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}M`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}k`;
  return value.toString();
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [pendingProviders, setPendingProviders] = useState<PendingProvider[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Providers
  const [providers, setProviders] = useState<ProviderRow[]>([]);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);

  // Premium
  const [demandes, setDemandes] = useState<DemandeAbonnement[]>([]);
  const [filtreAbo, setFiltreAbo] = useState<string>("EN_ATTENTE");

  // Categories
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [catForm, setCatForm] = useState({ nom: "", slug: "", description: "", icone: "", couleur: "" });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Tags
  const [tagsGrouped, setTagsGrouped] = useState<TagsGrouped>({});
  const [tagForm, setTagForm] = useState({ nom: "", slug: "", groupe: "PERSONNEL", icone: "" });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Rechargement des données "vivantes" (stats, réservations récentes,
  // prestataires en attente) — utilisé au montage, au clic sur Actualiser
  // et par l'auto-refresh
  const loadLiveData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsData, bookingsData, pendingData] = await Promise.all([
        api.get<Stats>("/admin/stats"),
        api.get<RecentBooking[]>("/admin/bookings/recent"),
        api.get<PendingProvider[]>("/admin/providers/pending"),
      ]);
      setStats(statsData);
      setRecentBookings(bookingsData);
      setPendingProviders(pendingData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Erreur rafraîchissement stats:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        const [statsData, bookingsData, pendingData, providersData, usersData, catsData, tagsData, demandesData] =
          await Promise.all([
            api.get<Stats>("/admin/stats"),
            api.get<RecentBooking[]>("/admin/bookings/recent"),
            api.get<PendingProvider[]>("/admin/providers/pending"),
            api.get<ProvidersResponse>("/admin/providers"),
            api.get<UsersResponse>("/admin/users"),
            api.get<Categorie[]>("/categories"),
            api.get<TagsGrouped>("/tags"),
            api.get<DemandeAbonnement[]>("/premium/demandes").catch(() => [] as DemandeAbonnement[]),
          ]);
        setStats(statsData);
        setRecentBookings(bookingsData);
        setPendingProviders(pendingData);
        setProviders(providersData.providers);
        setUsers(usersData.users);
        setCategories(catsData);
        setTagsGrouped(tagsData);
        setDemandes(demandesData);
        setLastRefresh(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

  // Auto-refresh des stats toutes les 60 secondes (uniquement sur l'onglet Stats)
  useEffect(() => {
    if (activeTab !== "stats") return;
    const interval = setInterval(loadLiveData, 60_000);
    return () => clearInterval(interval);
  }, [activeTab, loadLiveData]);

  const handleLogout = () => {
    localStorage.removeItem("lokevent_token");
    localStorage.removeItem("lokevent_user");
    router.push("/login");
  };

  const handleVerify = async (id: string) => {
    await api.patch(`/admin/providers/${id}/verify`, {});
    setPendingProviders((prev) => prev.filter((p) => p.id !== id));
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, verifie: true } : p)));
  };

  const handleReject = async (id: string) => {
    await api.patch(`/admin/providers/${id}/reject`, {});
    setPendingProviders((prev) => prev.filter((p) => p.id !== id));
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, actif: false } : p)));
  };

  const handleToggleActive = async (id: string) => {
    const updated = await api.patch<{ actif: boolean }>(`/admin/providers/${id}/toggle-active`, {});
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, actif: updated.actif } : p)));
  };

  // ---- Premium ----
  const handleValiderDemande = async (id: string) => {
    if (!confirm("Confirmer : le paiement a bien été reçu sur le compte mobile money ?")) return;
    try {
      await api.patch(`/premium/demandes/${id}/valider`, {});
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut: "ACTIF" } : d)));
      setUsers((prev) =>
        prev.map((u) =>
          demandes.find((d) => d.id === id)?.user.id === u.id ? { ...u, estPremium: true } : u
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la validation");
    }
  };

  const handleRefuserDemande = async (id: string) => {
    const motif = prompt("Motif du refus (optionnel, sera envoyé à l'utilisateur) :");
    if (motif === null) return; // annulé
    try {
      await api.patch(`/premium/demandes/${id}/refuser`, { motif: motif || undefined });
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut: "REFUSE" } : d)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du refus");
    }
  };

  // ---- Catégories CRUD ----
  const resetCatForm = () => {
    setCatForm({ nom: "", slug: "", description: "", icone: "", couleur: "" });
    setEditingCatId(null);
  };

  const handleSubmitCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCatId) {
        const updated = await api.put<Categorie>(`/categories/${editingCatId}`, catForm);
        setCategories((prev) => prev.map((c) => (c.id === editingCatId ? { ...c, ...updated } : c)));
      } else {
        const created = await api.post<Categorie>("/categories", catForm);
        setCategories((prev) => [...prev, { ...created, _count: { prestataires: 0 } }]);
      }
      resetCatForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleEditCategorie = (cat: Categorie) => {
    setEditingCatId(cat.id);
    setCatForm({
      nom: cat.nom,
      slug: cat.slug,
      description: cat.description || "",
      icone: cat.icone || "",
      couleur: cat.couleur || "",
    });
  };

  const handleDeleteCategorie = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  // ---- Tags CRUD ----
  const resetTagForm = () => {
    setTagForm({ nom: "", slug: "", groupe: "PERSONNEL", icone: "" });
    setEditingTagId(null);
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTagId) {
        const updated = await api.put<Tag>(`/tags/${editingTagId}`, tagForm);
        setTagsGrouped((prev) => {
          const next = { ...prev };
          for (const g of Object.keys(next)) {
            next[g] = next[g].map((t) => (t.id === editingTagId ? updated : t));
          }
          return next;
        });
      } else {
        const created = await api.post<Tag>("/tags", tagForm);
        setTagsGrouped((prev) => ({
          ...prev,
          [created.groupe]: [...(prev[created.groupe] || []), created],
        }));
      }
      resetTagForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagForm({ nom: tag.nom, slug: tag.slug, groupe: tag.groupe, icone: tag.icone || "" });
  };

  const handleDeleteTag = async (id: string, groupe: string) => {
    if (!confirm("Supprimer ce tag ?")) return;
    try {
      await api.delete(`/tags/${id}`);
      setTagsGrouped((prev) => ({
        ...prev,
        [groupe]: prev[groupe].filter((t) => t.id !== id),
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              LOK<span className="text-teal-400">EVENT</span>
            </span>
            <span className="text-[10px] bg-teal-400/20 text-teal-400 px-2 py-0.5 rounded-full">Admin</span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-teal-400/10 text-teal-400 border border-teal-400/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-20 px-6 md:hidden"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                    activeTab === tab.id
                      ? "bg-teal-400/10 text-teal-400 border border-teal-400/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400">
                <LogOut className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        {activeTab === "stats" && stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Barre d'actualisation */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                {lastRefresh &&
                  `Actualisé à ${lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · auto toutes les 60s`}
              </p>
              <button
                onClick={loadLiveData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Actualiser
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Utilisateurs</span>
                  <Users className="w-5 h-5 text-teal-400" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalUsers}</p>
                <p className="text-xs text-yellow-400 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  {stats.totalPremium} Premium
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Prestataires</span>
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalProviders}</p>
                <p className="text-xs text-yellow-500">{stats.pendingProviders} en attente</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Réservations</span>
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalBookings}</p>
                <p className="text-xs text-teal-400">{stats.todayBookings} aujourd'hui</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Revenus (Premium)</span>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalRevenue.toLocaleString("fr-FR")} FCFA</p>
                <p className="text-xs text-gray-400">
                  Volume d'affaires : {formatFCFACompact(stats.volumeAffaires)} FCFA
                </p>
                {stats.abonnementsEnAttente > 0 && (
                  <p className="text-xs text-yellow-400 mt-0.5">
                    {stats.abonnementsEnAttente} abonnement(s) à valider
                  </p>
                )}
              </div>
            </div>

            {/* Évolution sur 6 mois : revenus Premium (barres) vs volume d'affaires (courbe) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold mb-1">Évolution sur 6 mois</h2>
              <p className="text-xs text-gray-500 mb-4">
                Revenus = abonnements Premium encaissés · Volume d'affaires = budgets des prestations terminées (argent des prestataires, pas de LOKEVENT)
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.evolutionMensuelle} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="mois" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="revenus"
                      stroke="#2dd4bf"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatFCFACompact}
                    />
                    <YAxis
                      yAxisId="volume"
                      orientation="right"
                      stroke="#a78bfa"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatFCFACompact}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value ?? 0).toLocaleString("fr-FR")} FCFA`,
                        name === "revenus" ? "Revenus Premium" : "Volume d'affaires",
                      ]}
                      contentStyle={{
                        backgroundColor: "#111",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "revenus" ? "Revenus Premium" : "Volume d'affaires"
                      }
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Bar yAxisId="revenus" dataKey="revenus" fill="#2dd4bf" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Line
                      yAxisId="volume"
                      type="monotone"
                      dataKey="volumeAffaires"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#a78bfa" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4">Réservations récentes</h2>
                <div className="space-y-3">
                  {recentBookings.length === 0 && <p className="text-sm text-gray-500">Aucune réservation.</p>}
                  {recentBookings.map((booking) => {
                    const info = statutLabels[booking.statut] || { label: booking.statut, color: "bg-gray-500/20 text-gray-400" };
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div>
                          <p className="font-medium">{booking.client.prenom} {booking.client.nom}</p>
                          <p className="text-sm text-gray-400">{booking.prestataire.nomEntreprise}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span>{new Date(booking.dateEvenement).toLocaleDateString("fr-FR")}</span>
                            {booking.budget && <span>{booking.budget.toLocaleString()} FCFA</span>}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>{info.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">En attente de validation</h3>
                  <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full">
                    {pendingProviders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingProviders.length === 0 && <p className="text-sm text-gray-500">Aucun en attente.</p>}
                  {pendingProviders.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{provider.nomEntreprise}</p>
                        <p className="text-xs text-gray-400">{provider.categorie.nom} · {provider.quartier}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleVerify(provider.id)} className="p-1 hover:bg-green-500/20 rounded-lg">
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                        <button onClick={() => handleReject(provider.id)} className="p-1 hover:bg-red-500/20 rounded-lg">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "providers" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-bold mb-4">Tous les prestataires ({providers.length})</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Entreprise</th>
                    <th className="text-left px-4 py-3">Propriétaire</th>
                    <th className="text-left px-4 py-3">Catégorie</th>
                    <th className="text-left px-4 py-3">Statut</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="px-4 py-3 font-medium">{p.nomEntreprise}</td>
                      <td className="px-4 py-3 text-gray-400">{p.user.prenom} {p.user.nom}</td>
                      <td className="px-4 py-3 text-gray-400">{p.categorie.nom}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${p.verifie ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                            {p.verifie ? "Vérifié" : "Non vérifié"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${p.actif ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                            {p.actif ? "Actif" : "Suspendu"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleActive(p.id)}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title={p.actif ? "Suspendre" : "Réactiver"}
                        >
                          <Power className={`w-4 h-4 ${p.actif ? "text-red-400" : "text-green-400"}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-bold mb-4">Tous les utilisateurs ({users.length})</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Nom</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Rôle</th>
                    <th className="text-left px-4 py-3">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5">
                      <td className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          {u.prenom} {u.nom}
                          {u.estPremium && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "premium" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                Abonnements Premium
              </h2>
              <div className="flex gap-1.5">
                {["EN_ATTENTE", "ACTIF", "EXPIRE", "REFUSE", "TOUS"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltreAbo(f)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      filtreAbo === f
                        ? "bg-teal-400/10 text-teal-400 border-teal-400/30"
                        : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {f === "TOUS" ? "Tous" : abonnementLabels[f]?.label || f}
                    {f === "EN_ATTENTE" && demandes.filter((d) => d.statut === "EN_ATTENTE").length > 0 && (
                      <span className="ml-1.5 bg-yellow-500 text-black rounded-full px-1.5 font-bold">
                        {demandes.filter((d) => d.statut === "EN_ATTENTE").length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {demandes.filter((d) => filtreAbo === "TOUS" || d.statut === filtreAbo).length === 0 && (
                <p className="text-sm text-gray-500 bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  Aucun abonnement {filtreAbo !== "TOUS" ? `« ${abonnementLabels[filtreAbo]?.label || filtreAbo} »` : ""} pour le moment.
                </p>
              )}
              {demandes
                .filter((d) => filtreAbo === "TOUS" || d.statut === filtreAbo)
                .map((d) => {
                  const info = abonnementLabels[d.statut] || { label: d.statut, color: "bg-gray-500/20 text-gray-400" };
                  return (
                    <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {d.user.prenom} {d.user.nom}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                              {info.label}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {d.user.email}
                            {d.user.telephone && ` · ${d.user.telephone}`}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                            <span className="text-teal-400 font-medium">
                              {d.pack} — {d.montant.toLocaleString("fr-FR")} FCFA
                            </span>
                            {d.moyenPaiement && <span>via {d.moyenPaiement.replace("_", " ")}</span>}
                            <span>demandé le {new Date(d.createdAt).toLocaleDateString("fr-FR")}</span>
                            {d.finLe && <span>expire le {new Date(d.finLe).toLocaleDateString("fr-FR")}</span>}
                          </div>
                          {d.referencePaiement && (
                            <p className="text-xs mt-2">
                              <span className="text-gray-500">Réf. transaction : </span>
                              <span className="font-mono bg-black/40 border border-white/10 rounded px-2 py-0.5 text-gray-300">
                                {d.referencePaiement}
                              </span>
                            </p>
                          )}
                        </div>
                        {d.statut === "EN_ATTENTE" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleValiderDemande(d.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-400 text-black rounded-lg hover:bg-teal-300 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Valider
                            </button>
                            <button
                              onClick={() => handleRefuserDemande(d.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {activeTab === "categories" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-bold mb-4">Catégories</h2>

            <form onSubmit={handleSubmitCategorie} className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Nom"
                value={catForm.nom}
                onChange={(e) => setCatForm({ ...catForm, nom: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
                required
              />
              <input
                placeholder="Slug"
                value={catForm.slug}
                onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
                required
              />
              <input
                placeholder="Icône (emoji)"
                value={catForm.icone}
                onChange={(e) => setCatForm({ ...catForm, icone: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
              />
              <input
                placeholder="Couleur (#hex)"
                value={catForm.couleur}
                onChange={(e) => setCatForm({ ...catForm, couleur: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
              />
              <textarea
                placeholder="Description"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="md:col-span-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none resize-none"
                rows={2}
              />
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-teal-400 text-black rounded-lg font-medium hover:bg-teal-300 transition-colors">
                  <Plus className="w-4 h-4" />
                  {editingCatId ? "Mettre à jour" : "Ajouter"}
                </button>
                {editingCatId && (
                  <button type="button" onClick={resetCatForm} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                    Annuler
                  </button>
                )}
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <span>{cat.icone}</span>
                      {cat.nom}
                    </p>
                    <p className="text-xs text-gray-400">{cat._count.prestataires} prestataire(s)</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditCategorie(cat)} className="p-1.5 hover:bg-white/10 rounded-lg">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => handleDeleteCategorie(cat.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "tags" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-bold mb-4">Tags</h2>

            <form onSubmit={handleSubmitTag} className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Nom"
                value={tagForm.nom}
                onChange={(e) => setTagForm({ ...tagForm, nom: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
                required
              />
              <input
                placeholder="Slug"
                value={tagForm.slug}
                onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
                required
              />
              <select
                value={tagForm.groupe}
                onChange={(e) => setTagForm({ ...tagForm, groupe: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:border-teal-400/50 focus:outline-none"
              >
                <option value="PERSONNEL">Personnel</option>
                <option value="TECHNIQUE">Technique</option>
                <option value="EVENEMENTIEL">Événementiel</option>
              </select>
              <input
                placeholder="Icône (emoji)"
                value={tagForm.icone}
                onChange={(e) => setTagForm({ ...tagForm, icone: e.target.value })}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
              />
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-teal-400 text-black rounded-lg font-medium hover:bg-teal-300 transition-colors">
                  <Plus className="w-4 h-4" />
                  {editingTagId ? "Mettre à jour" : "Ajouter"}
                </button>
                {editingTagId && (
                  <button type="button" onClick={resetTagForm} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                    Annuler
                  </button>
                )}
              </div>
            </form>

            {Object.entries(tagsGrouped).map(([groupe, tags]) => (
              <div key={groupe} className="mb-6">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">{groupe}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <span>{tag.icone}</span>
                        {tag.nom}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditTag(tag)} className="p-1 hover:bg-white/10 rounded">
                          <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => handleDeleteTag(tag.id, tag.groupe)} className="p-1 hover:bg-red-500/20 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}