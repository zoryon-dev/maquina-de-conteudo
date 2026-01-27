/**
 * Settings Server Actions
 *
 * Centralized exports for all settings-related server actions
 */

export {
  saveUserSettingsAction,
  savePromptAction,
  deletePromptAction,
  saveVariableAction,
  deleteVariableAction,
  getUserVariablesAction,
} from "./save-settings"

export type {
  SaveSettingsResult,
  UserSettingsData,
  PromptData,
  VariableData,
  DocumentMetadata,
  DocumentUploadResult,
} from "./save-settings"

export {
  getSystemStatusAction,
} from "./system-status"

export type {
  SystemStatusResult,
  ServiceStatus,
} from "./system-status"
