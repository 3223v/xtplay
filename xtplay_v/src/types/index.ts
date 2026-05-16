export interface UserPublic {
  id: number
  username: string
  email: string
  role: string
}

export interface UserUpdate {
  username?: string
  email?: string
  password?: string
}

export interface UserRoleUpdate {
  role: 'normal' | 'admin' | 'super_admin'
}

export interface AuthResponse {
  user: UserPublic
}

export interface Role {
  id: number
  spec: string
  name: string
  description: string
  personality: string
  first_mes: string
  avatar: string
  mes_example: string
  scenario: string
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  tags: string[]
}

export interface Preset {
  id: number
  temperature: number
  frequency_penalty: number
  presence_penalty: number
  top_p: number
  top_k: number
  top_a: number
  min_p: number
  repetition_penalty: number
  names_in_completion: boolean
  main_prompt: string
  impersonation_prompt: string
  assistant_prefill: string
  jailbreak_prompt: string
}

export interface Entry {
  id: number
  uid: number
  key: string[]
  keysecondary: string[]
  comment: string
  content: string
  order: number
}

export interface Lorebook {
  id: number
  name: string
  description: string
  scan_depth: number
  token_budget: number
  entries: Record<string, Entry>
}

export interface StoryRound {
  id: number
  scene: string
  narration: string
  first: 'role1' | 'role2'
  next_scene?: string
  next_narration?: string
  next_first?: 'role1' | 'role2'
  role1_action?: string
  role1_dialogue?: string
  role1_output?: string
  role2_action?: string
  role2_dialogue?: string
  role2_output?: string
}

export interface Session {
  id: number
  story_id: number
  title: string
  status: 'active' | 'completed'
  round: StoryRound[]
  created_at: string
  updated_at: string
}

export interface Story {
  id: number
  title: string
  description: string
  status: 'active' | 'completed'
  url: string
  api_key: string
  model: string
  tags: string[]
  preset: Record<string, unknown>
  lorebook: Record<string, unknown>
  initial_scene: string
  role1: Record<string, unknown>
  role2: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OpeningDraft {
  scene: string
  narration: string
  first: 'role1' | 'role2'
}

export interface Conversation {
  id: number
  role_id: number
  title: string
  status: 'active' | 'archived'
  role_name: string
  role_avatar: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: number
  role: 'user' | 'character'
  action: string
  dialogue: string
  content: string
  created_at: string
}

export interface SendMessageResponse {
  user_message: ConversationMessage
  character_message: ConversationMessage
}

export interface Prompt {
  key: string
  title: string
  category: string
  description: string
  content: string
  created_at: string
  updated_at: string
}
