import {
  getUserById as getServerUserById,
  getUserByUsername as getServerUserByUsername,
  getUserByEmail as getServerUserByEmail,
  findUserByIdentifier as findServerUserByIdentifier,
  createSession as createServerSession,
  getSession as getServerSession,
  deleteSession as deleteServerSession,
} from "./server-storage";
import { User, Session } from "./types";

export function getUserById(id: string): User | undefined {
  return getServerUserById(id);
}

export function getUserByUsername(username: string): User | undefined {
  return getServerUserByUsername(username);
}

export function getUserByEmail(email: string): User | undefined {
  return getServerUserByEmail(email);
}

export function findUserByIdentifier(identifier: string): User | undefined {
  return findServerUserByIdentifier(identifier);
}

export function createSession(userId: string): Session {
  return createServerSession(userId);
}

export function getSession(sessionId: string): Session | undefined {
  return getServerSession(sessionId);
}

export function deleteSession(sessionId: string): void {
  deleteServerSession(sessionId);
}
