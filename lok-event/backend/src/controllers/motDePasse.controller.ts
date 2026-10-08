// backend/src/controllers/motDePasse.controller.ts
// Mot de passe oublié en 2 étapes :
//  1. POST /auth/mot-de-passe-oublie        { email }
//     → envoie un code à 6 chiffres par email (valable 15 min)
//  2. POST /auth/reinitialiser-mot-de-passe  { email, code, nouveauMotDePasse }
//     → change le mot de passe et déconnecte tous les appareils
import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { envoyerEmail } from "../lib/email";

const DUREE_CODE_MINUTES = 15;
const TENTATIVES_MAX = 5;
const LONGUEUR_MIN_MDP = 8;

// Même réponse que l'email existe ou non : on ne révèle pas qui est inscrit
const REPONSE_NEUTRE = {
  message:
    "Si un compte existe avec cet email, un code de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.",
};

function hacher(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** Comparaison en temps constant, pour ne rien laisser deviner par le temps de réponse */
function codesEgaux(hashA: string, hashB: string): boolean {
  const a = Buffer.from(hashA, "hex");
  const b = Buffer.from(hashB, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normaliserEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const propre = email.trim().toLowerCase();
  return propre.length > 3 && propre.length <= 200 && propre.includes("@") ? propre : null;
}

function contenuEmail(prenom: string, code: string) {
  const text = `Bonjour ${prenom},

Voici votre code pour réinitialiser votre mot de passe LOKEVENT : ${code}

Ce code est valable ${DUREE_CODE_MINUTES} minutes.
Si vous n'avez pas fait cette demande, ignorez simplement cet email : votre mot de passe ne change pas.

L'équipe LOKEVENT`;

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#111111;border:1px solid #1E1E1E;border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 4px;font-size:22px;font-weight:900;letter-spacing:2px">LOK<span style="color:#00D5BE">EVENT</span></p>
        <p style="margin:0 0 24px;color:#9CA3AF;font-size:13px">L'excellence événementielle</p>
        <p style="margin:0 0 16px;font-size:15px">Bonjour ${prenom},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#D1D5DB">Voici votre code pour réinitialiser votre mot de passe :</p>
        <p style="margin:0 0 16px;font-size:36px;font-weight:900;letter-spacing:10px;color:#00D5BE;text-align:center;background:#050505;border-radius:12px;padding:16px">${code}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF">Ce code est valable ${DUREE_CODE_MINUTES} minutes.</p>
        <p style="margin:0;font-size:12px;color:#6B7280">Si vous n'avez pas fait cette demande, ignorez cet email : votre mot de passe ne change pas.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

/** POST /auth/mot-de-passe-oublie */
export const demanderCode = async (req: Request, res: Response) => {
  try {
    const email = normaliserEmail(req.body?.email);
    if (!email) {
      res.status(400).json({ message: "Adresse email invalide" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, prenom: true, actif: true },
    });

    // Compte inexistant ou désactivé : même réponse, aucun email
    if (!user || !user.actif) {
      res.json(REPONSE_NEUTRE);
      return;
    }

    // Un seul code valable à la fois : les anciens sont annulés
    await prisma.codeReinitialisation.updateMany({
      where: { userId: user.id, utilise: false },
      data: { utilise: true },
    });

    const code = crypto.randomInt(100000, 1000000).toString();
    await prisma.codeReinitialisation.create({
      data: {
        userId: user.id,
        codeHash: hacher(code),
        expireLe: new Date(Date.now() + DUREE_CODE_MINUTES * 60 * 1000),
      },
    });

    const { text, html } = contenuEmail(user.prenom, code);
    await envoyerEmail({
      to: email,
      subject: `${code} est votre code LOKEVENT`,
      text,
      html,
    });

    res.json(REPONSE_NEUTRE);
  } catch (error) {
    console.error("Erreur demande de code:", error);
    res.status(500).json({ message: "Impossible d'envoyer le code pour le moment. Réessayez plus tard." });
  }
};

/** POST /auth/reinitialiser-mot-de-passe */
export const reinitialiserMotDePasse = async (req: Request, res: Response) => {
  try {
    const email = normaliserEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const nouveau = req.body?.nouveauMotDePasse;

    if (!email || !/^\d{6}$/.test(code)) {
      res.status(400).json({ message: "Email ou code invalide" });
      return;
    }
    if (typeof nouveau !== "string" || nouveau.length < LONGUEUR_MIN_MDP || nouveau.length > 128) {
      res.status(400).json({
        message: `Le mot de passe doit contenir entre ${LONGUEUR_MIN_MDP} et 128 caractères`,
      });
      return;
    }

    const erreurCode = { message: "Code incorrect ou expiré. Demandez un nouveau code." };

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, actif: true } });
    if (!user || !user.actif) {
      res.status(400).json(erreurCode);
      return;
    }

    const demande = await prisma.codeReinitialisation.findFirst({
      where: { userId: user.id, utilise: false, expireLe: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!demande || demande.tentatives >= TENTATIVES_MAX) {
      res.status(400).json(erreurCode);
      return;
    }

    if (!codesEgaux(demande.codeHash, hacher(code))) {
      const tentatives = demande.tentatives + 1;
      await prisma.codeReinitialisation.update({
        where: { id: demande.id },
        // Trop d'essais : le code est grillé
        data: { tentatives, utilise: tentatives >= TENTATIVES_MAX },
      });
      const restantes = TENTATIVES_MAX - tentatives;
      res.status(400).json({
        message:
          restantes > 0
            ? `Code incorrect. Il vous reste ${restantes} essai${restantes > 1 ? "s" : ""}.`
            : "Trop d'essais. Demandez un nouveau code.",
      });
      return;
    }

    const hash = await bcrypt.hash(nouveau, 12);
    await prisma.$transaction([
      // tokenVersion +1 : tous les appareils connectés sont déconnectés
      prisma.user.update({
        where: { id: user.id },
        data: { motDePasse: hash, tokenVersion: { increment: 1 } },
      }),
      prisma.codeReinitialisation.updateMany({
        where: { userId: user.id, utilise: false },
        data: { utilise: true },
      }),
    ]);

    res.json({ message: "Mot de passe modifié. Vous pouvez maintenant vous connecter." });
  } catch (error) {
    console.error("Erreur réinitialisation mot de passe:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};