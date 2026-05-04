import fs from "fs";
import path from "path";

import { User, Session } from "./types";

function getUsersPath() {
  return path.join(process.cwd(), "app", "api", "data", "users");
}

function getUsersDatabasePath() {
  return path.join(getUsersPath(), "database.json");
}

function getSessionsPath() {
  return path.join(process.cwd(), "app", "api", "data", "sessions");
}

function getSessionsDatabasePath() {
  return path.join(getSessionsPath(), "database.json");
}

function ensureUsersDir() {
  const dir = getUsersPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureSessionsDir() {
  const dir = getSessionsPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadUsers(): User[] {
  ensureUsersDir();
  const dbPath = getUsersDatabasePath();

  if (!fs.existsSync(dbPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(content) as User[];
  } catch {
    return [];
  }
}

function loadSessions(): Session[] {
  ensureSessionsDir();
  const dbPath = getSessionsDatabasePath();

  if (!fs.existsSync(dbPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(content) as Session[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]): void {
  ensureSessionsDir();
  const dbPath = getSessionsDatabasePath();
  fs.writeFileSync(dbPath, JSON.stringify(sessions, null, 2));
}

export function getUserById(id: string): User | undefined {
  const users = loadUsers();
  return users.find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  const users = loadUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function getUserByEmail(email: string): User | undefined {
  const users = loadUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserByIdentifier(identifier: string): User | undefined {
  return getUserByUsername(identifier) || getUserByEmail(identifier);
}

export function createSession(userId: string): Session {
  const sessions = loadSessions();

  const session: Session = {
    session_id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    user_id: userId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  sessions.push(session);
  saveSessions(sessions);

  return session;
}

export function getSession(sessionId: string): Session | undefined {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.session_id === sessionId);

  if (!session) {
    return undefined;
  }

  if (new Date(session.expires_at) < new Date()) {
    deleteSession(sessionId);
    return undefined;
  }

  return session;
}

export function deleteSession(sessionId: string): void {
  const sessions = loadSessions();
  const filtered = sessions.filter((s) => s.session_id !== sessionId);
  saveSessions(filtered);
}

export function ensureUserDataDir(userId: string): string {
  const userDir = path.join(getUsersPath(), userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

export function getUserDataPath(userId: string): string {
  return ensureUserDataDir(userId);
}