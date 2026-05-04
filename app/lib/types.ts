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

export type Language = "en" | "zh";
