require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

console.log("Connexion vers :", process.env.DATABASE_URL?.split("@")[1]);

client
  .connect()
  .then(() => client.query("SELECT version(), current_database()"))
  .then((r) => {
    console.log("✅ CONNEXION RÉUSSIE !");
    console.log(r.rows[0]);
    return client.end();
  })
  .catch((e) => {
    console.error("❌ ERREUR RÉELLE :", e.message);
    console.error("Code :", e.code);
    client.end();
  });