import { existsSync, readFileSync } from "fs";

export interface AuthConfig {
  enabled: boolean;
  password: string;
}

export interface EventConfig {
  type: string;
  title: string;
  shortLabel: string;
  description: string;
  defaultPrompt: string;
  accentClass: string;
}

export interface PresetItem {
  value: string;
  label: string;
}

export interface PresetsConfig {
  urls: PresetItem[];
  models: PresetItem[];
}

export interface AppConfig {
  auth: AuthConfig;
  presets: PresetsConfig;
  events: EventConfig[];
}

const CONFIG_PATH = "app/api/data/config/config.json";

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!existsSync(CONFIG_PATH)) {
    cachedConfig = {
      auth: { enabled: false, password: "" },
      presets: { urls: [], models: [] },
      events: [],
    };
    return cachedConfig;
  }

  try {
    const content = readFileSync(CONFIG_PATH, "utf-8");
    cachedConfig = JSON.parse(content) as AppConfig;
    if (!cachedConfig.auth) {
      cachedConfig.auth = { enabled: false, password: "" };
    }
    if (!cachedConfig.presets) {
      cachedConfig.presets = { urls: [], models: [] };
    }
    if (!cachedConfig.events) {
      cachedConfig.events = [];
    }
    return cachedConfig;
  } catch {
    cachedConfig = {
      auth: { enabled: false, password: "" },
      presets: { urls: [], models: [] },
      events: [],
    };
    return cachedConfig;
  }
}

export function getAuthConfig(): AuthConfig {
  return getConfig().auth;
}

export function getPresetsConfig(): PresetsConfig {
  return getConfig().presets;
}

export function getEventsConfig(): EventConfig[] {
  return getConfig().events;
}