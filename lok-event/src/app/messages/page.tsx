// src/app/messages/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, MessageSquare, Home } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";

interface Sender {
  id: string;
  nom: string;
  prenom: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  contenu: string;
  lu: boolean;
  createdAt: string;
  sender: Sender;
}

interface Conversation {
  id: string;
  clientId: string;
  client: { id: string; nom: string; prenom: string; avatar: string | null };
  prestataire: {
    id: string;
    nomEntreprise: string;
    photos: string[];
    userId: string;
  };
  messages: Message[]; // dernier message uniquement
  nonLus: number;
  updatedAt: string;
}

function heureCourte(dateStr: string) {
  const d = new Date(dateStr);
  const aujourdhui = new Date();
  if (d.toDateString() === aujourdhui.toDateString()) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("c");

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Récupère l'utilisateur connecté (sinon redirige vers login)
  useEffect(() => {
    const stored = localStorage.getItem("lokevent_user");
    if (!stored) {
      router.push("/login");
      return;
    }
    try {
      setUserId(JSON.parse(stored).id);
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Charge les conversations
  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        const data = await api.get<Conversation[]>("/conversations");
        setConversations(data);
        // Ouvre la conversation demandée via ?c= (depuis une fiche prestataire)
        if (conversationParam) {
          const target = data.find((c) => c.id === conversationParam);
          if (target) handleSelect(target, data);
        }
      } catch (err) {
        console.error("Erreur chargement conversations:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, conversationParam]);

  // Connexion Socket.io pour recevoir les messages en temps réel.
  // ⚠️ On utilise le socket PARTAGÉ (lib/socket.ts) : authentifié par JWT
  // et en websocket direct (le polling casse derrière le proxy de Render).
  // On ne crée plus de socket local ici, et on ne déconnecte JAMAIS le
  // socket partagé au démontage — on retire uniquement nos listeners.
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (message: Message) => {
      // Message de la conversation ouverte : on l'affiche directement
      if (message.conversationId === selectedIdRef.current) {
        setMessages((prev) => [...prev, message]);
      }
      // Dans tous les cas : mise à jour de la liste (dernier message, non lus, ordre)
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                messages: [message],
                nonLus:
                  message.conversationId === selectedIdRef.current
                    ? c.nonLus
                    : c.nonLus + 1,
                updatedAt: message.createdAt,
              }
            : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    };

    socket.on("newMessage", onNewMessage);

    return () => {
      socket.off("newMessage", onNewMessage);
    };
  }, [userId]);

  // Défilement automatique vers le dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelect = async (conversation: Conversation, liste?: Conversation[]) => {
    setSelected(conversation);
    selectedIdRef.current = conversation.id;
    setMessages([]);
    try {
      const data = await api.get<Message[]>(`/conversations/${conversation.id}/messages`);
      setMessages(data);
      // Les messages reçus sont marqués lus côté serveur : on remet le compteur à zéro
      setConversations((prev) =>
        (liste || prev).map((c) => (c.id === conversation.id ? { ...c, nonLus: 0 } : c))
      );
    } catch (err) {
      console.error("Erreur chargement messages:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const sent = await api.post<Message>(
        `/conversations/${selected.id}/messages`,
        { contenu: newMessage.trim() }
      );
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
      setConversations((prev) =>
        [...prev.map((c) => (c.id === selected.id ? { ...c, messages: [sent], updatedAt: sent.createdAt } : c))].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      );
    } catch (err) {
      console.error("Erreur envoi:", err);
      alert(err instanceof Error ? err.message : "Impossible d'envoyer le message");
    } finally {
      setIsSending(false);
    }
  };

  // Nom + photo de l'interlocuteur (dépend de quel côté on est)
  const interlocuteur = (c: Conversation) => {
    const jeSuisLeClient = c.clientId === userId;
    return jeSuisLeClient
      ? { nom: c.prestataire.nomEntreprise, photo: c.prestataire.photos?.[0] || null }
      : { nom: `${c.client.prenom} ${c.client.nom}`, photo: c.client.avatar };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Barre du haut */}
      <div className="border-b border-white/5 px-4 md:px-8 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="p-2 rounded-full hover:bg-white/10 transition-colors" title="Accueil">
          <Home className="w-5 h-5 text-gray-400" />
        </Link>
        <h1 className="font-bold text-lg">Messages</h1>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-6xl w-full mx-auto">
        {/* Liste des conversations — masquée sur mobile quand un chat est ouvert */}
        <aside
          className={`${
            selected ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-80 lg:w-96 border-r border-white/5 overflow-y-auto flex-shrink-0`}
        >
          {conversations.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              Aucune conversation pour le moment.
              <br />
              Contactez un prestataire depuis sa fiche pour démarrer.
            </div>
          )}
          {conversations.map((c) => {
            const autre = interlocuteur(c);
            const dernier = c.messages[0];
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`flex items-center gap-3 px-4 py-3 text-left border-b border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors ${
                  selected?.id === c.id ? "bg-white/5" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  {autre.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={autre.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-teal-400 font-bold text-sm">
                      {autre.nom.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{autre.nom}</p>
                    {dernier && (
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {heureCourte(dernier.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 truncate">
                      {dernier
                        ? `${dernier.senderId === userId ? "Vous : " : ""}${dernier.contenu}`
                        : "Nouvelle conversation"}
                    </p>
                    {c.nonLus > 0 && (
                      <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-teal-400 text-[10px] font-bold text-black flex-shrink-0">
                        {c.nonLus > 9 ? "9+" : c.nonLus}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Fenêtre de chat */}
        <main className={`${selected ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm gap-3">
              <MessageSquare className="w-12 h-12 text-gray-600" />
              Sélectionnez une conversation
            </div>
          ) : (
            <>
              {/* En-tête du chat */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelected(null);
                    selectedIdRef.current = null;
                  }}
                  className="md:hidden p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  {interlocuteur(selected).photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={interlocuteur(selected).photo!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-teal-400 font-bold text-xs">
                      {interlocuteur(selected).nom.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm truncate">{interlocuteur(selected).nom}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.map((m) => {
                  const estMoi = m.senderId === userId;
                  return (
                    <div key={m.id} className={`flex ${estMoi ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] md:max-w-[65%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          estMoi
                            ? "bg-teal-400 text-black rounded-br-md"
                            : "bg-white/10 text-white rounded-bl-md"
                        }`}
                      >
                        {m.contenu}
                        <span
                          className={`block text-[10px] mt-1 text-right ${
                            estMoi ? "text-black/50" : "text-gray-500"
                          }`}
                        >
                          {heureCourte(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Zone de saisie */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-3 md:px-4 py-3 border-t border-white/5 flex-shrink-0"
              >
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  maxLength={2000}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-full text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="p-3 rounded-full bg-teal-400 text-black hover:bg-teal-300 active:bg-teal-500 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// useSearchParams exige une frontière Suspense en App Router
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}