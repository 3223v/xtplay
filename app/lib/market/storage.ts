import fs from "fs";
import path from "path";

import {
  marketArticleSchema,
  MarketArticle,
} from "./types";

function getDataPath() {
  return path.join(process.cwd(), "app", "api", "data");
}

function getMarketPath() {
  return path.join(getDataPath(), "market");
}

function getDatabasePath() {
  return path.join(getMarketPath(), "database.json");
}

function ensureMarketDir() {
  const dir = getMarketPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface DatabaseContent {
  articles: MarketArticle[];
}

function loadDatabase(): DatabaseContent {
  ensureMarketDir();
  const dbPath = getDatabasePath();

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

function saveDatabase(data: DatabaseContent): void {
  ensureMarketDir();
  const dbPath = getDatabasePath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function readArticleData(articleId: string): MarketArticle {
  const db = loadDatabase();
  const article = db.articles.find((a) => a.id === articleId);

  if (!article) {
    throw new Error(`Article ${articleId} not found`);
  }

  return marketArticleSchema.parse(article);
}

export function writeArticleData(articleId: string, data: MarketArticle): MarketArticle {
  const db = loadDatabase();
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

  saveDatabase(db);
  return normalized;
}

export function deleteArticleData(articleId: string): void {
  const db = loadDatabase();
  const filtered = db.articles.filter((a) => a.id !== articleId);

  if (filtered.length === db.articles.length) {
    throw new Error(`Article ${articleId} not found`);
  }

  db.articles = filtered;
  saveDatabase(db);
}

export function listArticles(): MarketArticle[] {
  const db = loadDatabase();
  return db.articles.map((article) => marketArticleSchema.parse(article));
}

export function generateUniqueArticleId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  const db = loadDatabase();
  if (db.articles.some((a) => a.id === id)) {
    return generateUniqueArticleId();
  }

  return id;
}