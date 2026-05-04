import fs from "fs";
import path from "path";

import {
  marketArticleSchema,
  MarketArticle,
} from "./types";

function getUserDataPath(userId: string): string {
  return path.join(process.cwd(), "app", "api", "data", "users", userId);
}

function getMarketPath(userId: string): string {
  return path.join(getUserDataPath(userId), "market");
}

function getDatabasePath(userId: string): string {
  return path.join(getMarketPath(userId), "database.json");
}

function ensureMarketDir(userId: string) {
  const dir = getMarketPath(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureUserDataDir(userId: string) {
  const dir = getUserDataPath(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface DatabaseContent {
  articles: MarketArticle[];
}

function loadDatabase(userId: string): DatabaseContent {
  ensureUserDataDir(userId);
  ensureMarketDir(userId);
  const dbPath = getDatabasePath(userId);

  if (!fs.existsSync(dbPath)) {
    return { articles: [] };
  }

  try {
    const content = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return { articles: [] };
  }
}

function saveDatabase(userId: string, data: DatabaseContent): void {
  ensureUserDataDir(userId);
  ensureMarketDir(userId);
  const dbPath = getDatabasePath(userId);
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function readArticleData(userId: string, articleId: string): MarketArticle {
  const db = loadDatabase(userId);
  const article = db.articles.find((a) => a.id === articleId);

  if (!article) {
    throw new Error(`Article ${articleId} not found`);
  }

  return marketArticleSchema.parse(article);
}

export function writeArticleData(userId: string, articleId: string, data: MarketArticle): MarketArticle {
  const db = loadDatabase(userId);
  const normalized = marketArticleSchema.parse({
    ...data,
    id: articleId,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  const existingIndex = db.articles.findIndex((a) => a.id === articleId);
  if (existingIndex >= 0) {
    db.articles[existingIndex] = normalized;
  } else {
    db.articles.push(normalized);
  }

  saveDatabase(userId, db);
  return normalized;
}

export function deleteArticleData(userId: string, articleId: string): void {
  const db = loadDatabase(userId);
  const filtered = db.articles.filter((a) => a.id !== articleId);

  if (filtered.length === db.articles.length) {
    throw new Error(`Article ${articleId} not found`);
  }

  db.articles = filtered;
  saveDatabase(userId, db);
}

export function listArticles(userId: string): MarketArticle[] {
  const db = loadDatabase(userId);
  return db.articles.map((article) => marketArticleSchema.parse(article));
}

export function generateUniqueArticleId(userId: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  const db = loadDatabase(userId);
  if (db.articles.some((a) => a.id === id)) {
    return generateUniqueArticleId(userId);
  }

  return id;
}