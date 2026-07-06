// backend/src/server.ts
import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 5000;

if (!process.env.FRONTEND_URL && process.env.NODE_ENV === "production") {
  console.error(
    "ERREUR CRITIQUE : FRONTEND_URL n'est pas défini en production. Arrêt du serveur."
  );
  process.exit(1);
}

app.listen(PORT, () => console.log(`LOKEVENT API running on port ${PORT}`));