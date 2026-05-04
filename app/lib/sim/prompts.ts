import * as enPrompts from "./prompts.en";
import * as zhPrompts from "./prompts.zh";

export type Language = "en" | "zh";

export type PromptModule = typeof enPrompts;

export function getPrompts(language: Language): PromptModule {
  return language === "zh" ? zhPrompts : enPrompts;
}

export * from "./prompts.en";
