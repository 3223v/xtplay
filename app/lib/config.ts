import { existsSync, readFileSync, writeFileSync } from "fs";

import type { AuthConfig, EventConfig, PresetItem, PresetsConfig, Language } from "./types";

export type { AuthConfig, EventConfig, PresetItem, PresetsConfig, Language };

interface AppConfig {
  auth: AuthConfig;
  language: Language;
  presets: PresetsConfig;
  events: Record<Language, EventConfig[]>;
}

const CONFIG_PATH = "app/api/data/config/config.json";

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const defaultConfig: AppConfig = {
    auth: { enabled: false, password: "" },
    language: "zh",
    presets: { urls: [], models: [] },
    events: { en: [], zh: [] },
  };

  if (!existsSync(CONFIG_PATH)) {
    cachedConfig = defaultConfig;
    return cachedConfig;
  }

  try {
    const content = readFileSync(CONFIG_PATH, "utf-8");
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
    cachedConfig = config;
    return cachedConfig;
  } catch {
    cachedConfig = defaultConfig;
    return cachedConfig;
  }
}

export function getAuthConfig(): AuthConfig {
  return getConfig().auth;
}

export function getPresetsConfig(): PresetsConfig {
  return getConfig().presets;
}

export function getLanguageConfig(): Language {
  return getConfig().language;
}

export function getEventsConfig(): EventConfig[] {
  const config = getConfig();
  return config.events[config.language] || [];
}

export function getAllEventsConfig(): Record<Language, EventConfig[]> {
  return getConfig().events;
}

export async function setLanguageConfig(language: Language): Promise<void> {
  cachedConfig = null;

  if (!existsSync(CONFIG_PATH)) {
    return;
  }

  try {
    const content = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(content);
    parsed.language = language;
    writeFileSync(CONFIG_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    cachedConfig = null;
  } catch {
    throw new Error("Failed to write language config");
  }
}
