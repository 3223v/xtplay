import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { AuthConfig, EventConfig, PresetItem, PresetsConfig, Language } from "./types";

export type { AuthConfig, EventConfig, PresetItem, PresetsConfig, Language };

interface UserConfig {
  language: Language;
  presets: PresetsConfig;
  events: Record<Language, EventConfig[]>;
}

interface AppConfig {
  auth: AuthConfig;
  language: Language;
  presets: PresetsConfig;
  events: Record<Language, EventConfig[]>;
}

const GLOBAL_CONFIG_PATH = "app/api/data/config/config.json";

let cachedGlobalConfig: AppConfig | null = null;

function getGlobalConfig(): AppConfig {
  if (cachedGlobalConfig) {
    return cachedGlobalConfig;
  }

  const defaultConfig: AppConfig = {
    auth: { enabled: false, password: "" },
    language: "zh",
    presets: { urls: [], models: [] },
    events: { en: [], zh: [] },
  };

  if (!existsSync(GLOBAL_CONFIG_PATH)) {
    cachedGlobalConfig = defaultConfig;
    return cachedGlobalConfig;
  }

  try {
    const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(content) as any;
    const config: AppConfig = {
      ...defaultConfig,
      ...parsed,
    };
    if (!config.auth) {
      config.auth = { enabled: false, password: "" };
    }
    if (!config.presets) {
      config.presets = { urls: [], models: [] };
    }
    if (!config.language) {
      config.language = "zh";
    }
    if (!config.events) {
      config.events = { en: [], zh: [] };
    } else if (Array.isArray(config.events)) {
      const oldEvents = config.events as EventConfig[];
      config.events = {
        en: oldEvents,
        zh: oldEvents,
      };
    }
    cachedGlobalConfig = config;
    return cachedGlobalConfig;
  } catch {
    cachedGlobalConfig = defaultConfig;
    return cachedGlobalConfig;
  }
}

function getUserDataPath(userId: string): string {
  return path.join(process.cwd(), "app", "api", "data", "users", userId);
}

function getUserConfigPath(userId: string): string {
  return path.join(getUserDataPath(userId), "config.json");
}

function ensureUserDataDir(userId: string) {
  const dir = getUserDataPath(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const fs = require("fs");

function getUserConfig(userId: string): UserConfig {
  ensureUserDataDir(userId);
  const configPath = getUserConfigPath(userId);

  const globalConfig = getGlobalConfig();

  if (!existsSync(configPath)) {
    const defaultUserConfig: UserConfig = {
      language: globalConfig.language,
      presets: globalConfig.presets,
      events: globalConfig.events,
    };
    writeFileSync(configPath, JSON.stringify(defaultUserConfig, null, 2));
    return defaultUserConfig;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as UserConfig;
    return {
      language: parsed.language || globalConfig.language,
      presets: parsed.presets || globalConfig.presets,
      events: parsed.events || globalConfig.events,
    };
  } catch {
    return {
      language: globalConfig.language,
      presets: globalConfig.presets,
      events: globalConfig.events,
    };
  }
}

export function getAuthConfig(): AuthConfig {
  return getGlobalConfig().auth;
}

export function getPresetsConfig(): PresetsConfig {
  return getGlobalConfig().presets;
}

export function getLanguageConfig(): Language {
  return getGlobalConfig().language;
}

export function getEventsConfig(): EventConfig[] {
  const config = getGlobalConfig();
  return config.events[config.language] || [];
}

export function getAllEventsConfig(): Record<Language, EventConfig[]> {
  return getGlobalConfig().events;
}

export async function setLanguageConfig(language: Language): Promise<void> {
  cachedGlobalConfig = null;

  if (!existsSync(GLOBAL_CONFIG_PATH)) {
    return;
  }

  try {
    const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(content);
    parsed.language = language;
    writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    cachedGlobalConfig = null;
  } catch {
    throw new Error("Failed to write language config");
  }
}

export function getUserLanguageConfig(userId: string): Language {
  const userConfig = getUserConfig(userId);
  return userConfig.language;
}

export function getUserEventsConfig(userId: string): EventConfig[] {
  const userConfig = getUserConfig(userId);
  return userConfig.events[userConfig.language] || [];
}

export function getUserPresetsConfig(userId: string): PresetsConfig {
  const userConfig = getUserConfig(userId);
  return userConfig.presets;
}

export async function setUserLanguageConfig(userId: string, language: Language): Promise<void> {
  ensureUserDataDir(userId);
  const configPath = getUserConfigPath(userId);

  const userConfig = getUserConfig(userId);
  userConfig.language = language;

  writeFileSync(configPath, JSON.stringify(userConfig, null, 2), "utf-8");
}