import fs from "fs";
import path from "path";

import { MarketArticle } from "./types";

function getMarketDatabasePath() {
  return path.join(process.cwd(), "app", "api", "data", "market", "database.json");
}

function ensureMarketDir() {
  const dir = path.join(process.cwd(), "app", "api", "data", "market");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadArticles(): MarketArticle[] {
  ensureMarketDir();
  const dbPath = getMarketDatabasePath();

  if (!fs.existsSync(dbPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(content) as MarketArticle[];
  } catch {
    return [];
  }
}

function saveArticles(articles: MarketArticle[]): void {
  ensureMarketDir();
  const dbPath = getMarketDatabasePath();
  fs.writeFileSync(dbPath, JSON.stringify(articles, null, 2));
}

export function getAllArticles(): MarketArticle[] {
  return loadArticles();
}

export function getArticleById(id: string): MarketArticle | undefined {
  const articles = loadArticles();
  return articles.find((a) => a.id === id);
}

export function createArticle(article: Omit<MarketArticle, "id" | "createdAt" | "updatedAt">): MarketArticle {
  const articles = loadArticles();
  const now = new Date().toISOString().split("T")[0];

  const newArticle: MarketArticle = {
    ...article,
    id: `market_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  articles.push(newArticle);
  saveArticles(articles);

  return newArticle;
}

export function updateArticle(id: string, updates: Partial<MarketArticle>): MarketArticle | undefined {
  const articles = loadArticles();
  const index = articles.findIndex((a) => a.id === id);

  if (index === -1) {
    return undefined;
  }

  const now = new Date().toISOString().split("T")[0];
  articles[index] = {
    ...articles[index],
    ...updates,
    id: articles[index].id,
    createdAt: articles[index].createdAt,
    updatedAt: now,
  };

  saveArticles(articles);

  return articles[index];
}

export function deleteArticle(id: string): boolean {
  const articles = loadArticles();
  const filtered = articles.filter((a) => a.id !== id);

  if (filtered.length === articles.length) {
    return false;
  }

  saveArticles(filtered);
  return true;
}