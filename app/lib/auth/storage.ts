import { User, Session } from "./types";

let users: User[] = [
  {
    id: "user_1",
    username: "admin",
    email: "admin@example.com",
    password: "123456",
  },
];

let sessions: Session[] = [];

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function getUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserByIdentifier(identifier: string): User | undefined {
  return getUserByUsername(identifier) || getUserByEmail(identifier);
}

export function createSession(userId: string): Session {
  const session: Session = {
    session_id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    user_id: userId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  sessions.push(session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
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
  sessions = sessions.filter((s) => s.session_id !== sessionId);
}