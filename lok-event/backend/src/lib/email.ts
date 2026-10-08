// backend/src/lib/email.ts — envoi d'emails via Resend (https://resend.com)
// Variables d'environnement :
//   RESEND_API_KEY : clé API Resend
//   EMAIL_FROM     : expéditeur, ex. "LOKEVENT <no-reply@eden-group.co>"
//                    (le domaine doit être vérifié dans Resend)
// En développement sans clé, l'email est simplement affiché dans la console.

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function envoyerEmail({ to, subject, html, text }: Email): Promise<void> {
  const cle = process.env.RESEND_API_KEY;

  if (!cle) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY manquante : impossible d'envoyer l'email");
    }
    console.log(`\n📧 [DEV] Email pour ${to}\nSujet : ${subject}\n${text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "LOKEVENT <no-reply@eden-group.co>",
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi Resend (${res.status}) : ${detail}`);
  }
}