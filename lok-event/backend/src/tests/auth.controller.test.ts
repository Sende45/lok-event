import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

describe("Auth Controller", () => {
  describe("POST /api/auth/register", () => {
    it("crée un utilisateur avec le rôle CLIENT par défaut si aucun rôle n'est fourni", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nom: "Kouassi",
        prenom: "Awa",
        email: "awa@example.com",
        motDePasse: "motdepasse123",
        telephone: "0700000000",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("CLIENT");
      expect(res.body.token).toBeDefined();
    });

    it("permet explicitement le rôle PRESTATAIRE (légitime)", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nom: "Kone",
        prenom: "Ibrahim",
        email: "ibrahim@example.com",
        motDePasse: "motdepasse123",
        role: "PRESTATAIRE",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("PRESTATAIRE");
    });

    // Test de non-régression CRITIQUE — voir Point 1 de l'audit de sécurité.
    // Ce test doit TOUJOURS passer. S'il échoue un jour, c'est que la faille
    // d'élévation de privilèges est revenue dans le code.
    it("REFUSE la création d'un compte ADMIN via l'inscription publique", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nom: "Attaquant",
        prenom: "Malveillant",
        email: "hacker@example.com",
        motDePasse: "motdepasse123",
        role: "ADMIN",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("CLIENT");
      expect(res.body.user.role).not.toBe("ADMIN");
    });

    it("rejette une inscription avec un email déjà utilisé", async () => {
      await request(app).post("/api/auth/register").send({
        nom: "Test",
        prenom: "Doublon",
        email: "doublon@example.com",
        motDePasse: "motdepasse123",
      });

      const res = await request(app).post("/api/auth/register").send({
        nom: "Test2",
        prenom: "Doublon2",
        email: "doublon@example.com",
        motDePasse: "autremotdepasse",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/déjà utilisé/i);
    });

    it("hash le mot de passe avec bcrypt (jamais stocké en clair)", async () => {
      await request(app).post("/api/auth/register").send({
        nom: "Test",
        prenom: "Hash",
        email: "hash-test@example.com",
        motDePasse: "motdepasseclair",
      });

      const user = await prisma.user.findUnique({
        where: { email: "hash-test@example.com" },
      });

      expect(user).not.toBeNull();
      expect(user!.motDePasse).not.toBe("motdepasseclair");
      expect(user!.motDePasse).toMatch(/^\$2[aby]\$/); // format bcrypt
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        nom: "Kouassi",
        prenom: "Awa",
        email: "login-test@example.com",
        motDePasse: "bonmotdepasse",
      });
    });

    it("connecte avec les bons identifiants et renvoie un token", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login-test@example.com",
        motDePasse: "bonmotdepasse",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("login-test@example.com");
    });

    it("refuse un mauvais mot de passe", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login-test@example.com",
        motDePasse: "mauvaismotdepasse",
      });

      expect(res.status).toBe(401);
    });

    it("refuse un email inexistant", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nexistepas@example.com",
        motDePasse: "peuimporte",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("refuse l'accès sans token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("refuse l'accès avec un token invalide", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer token_invalide_bidon");
      expect(res.status).toBe(401);
    });

    it("renvoie le profil de l'utilisateur connecté avec un token valide", async () => {
      const inscription = await request(app).post("/api/auth/register").send({
        nom: "Kouassi",
        prenom: "Awa",
        email: "me-test@example.com",
        motDePasse: "motdepasse123",
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${inscription.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("me-test@example.com");
    });
  });
});