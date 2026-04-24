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

function getArticlePath(articleId: string) {
  return path.join(getMarketPath(), `${articleId}.json`);
}

function getIndexPath() {
  return path.join(getMarketPath(), "index.json");
}

function ensureMarketDir() {
  const dir = getMarketPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readArticleData(articleId: string): MarketArticle {
  ensureMarketDir();
  const filePath = getArticlePath(articleId);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Article ${articleId} not found`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const raw = JSON.parse(fileContent);

  return marketArticleSchema.parse(raw);
}

export function writeArticleData(articleId: string, data: MarketArticle): MarketArticle {
  ensureMarketDir();
  const filePath = getArticlePath(articleId);
  const normalized = marketArticleSchema.parse({
    ...data,
    id: articleId,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
  updateIndex(articleId, normalized.title);

  return normalized;
}

export function deleteArticleData(articleId: string): void {
  ensureMarketDir();
  const filePath = getArticlePath(articleId);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  removeFromIndex(articleId);
}

export function listArticles(): MarketArticle[] {
  ensureMarketDir();
  const indexPath = getIndexPath();

  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const indexContent = fs.readFileSync(indexPath, "utf-8");
  const index: { id: string; title: string }[] = JSON.parse(indexContent);

  const articles: MarketArticle[] = [];

  for (const item of index) {
    try {
      const article = readArticleData(item.id);
      articles.push(article);
    } catch {
      // Skip invalid articles
    }
  }

  return articles;
}

function updateIndex(articleId: string, title: string): void {
  const indexPath = getIndexPath();
  let index: { id: string; title: string }[] = [];

  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, "utf-8");
    index = JSON.parse(content);
  }

  const existingIndex = index.findIndex((item) => item.id === articleId);
  if (existingIndex >= 0) {
    index[existingIndex].title = title;
  } else {
    index.push({ id: articleId, title });
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

function removeFromIndex(articleId: string): void {
  const indexPath = getIndexPath();

  if (!fs.existsSync(indexPath)) {
    return;
  }

  const content = fs.readFileSync(indexPath, "utf-8");
  const index: { id: string; title: string }[] = JSON.parse(content);

  const filtered = index.filter((item) => item.id !== articleId);
  fs.writeFileSync(indexPath, JSON.stringify(filtered, null, 2));
}

export function generateUniqueArticleId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  const filePath = getArticlePath(id);
  if (fs.existsSync(filePath)) {
    return generateUniqueArticleId();
  }

  return id;
}
