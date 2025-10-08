/**
 * Типы данных для интеграции с YouTrack API
 */

/**
 * Интерфейс пользовательского поля в YouTrack
 */
export interface YouTrackCustomField {
  $type: string;
  name: string;
  value?: {
    name?: string;
    text?: string;
    isResolved?: boolean;
  };
}

/**
 * Интерфейс задачи в YouTrack API
 */
export interface YouTrackIssue {
  id: string;
  idReadable: string;
  summary: string;
  description?: string;
  created: number;
  updated: number;
  customFields?: YouTrackCustomField[];
  reporter?: {
    login: string;
    fullName: string;
  };
}

/**
 * Ответ API YouTrack при получении списка задач
 */
export interface YouTrackIssuesResponse {
  issues: YouTrackIssue[];
  skip: number;
  top: number;
  total: number;
}

/**
 * Конфигурация подключения к YouTrack
 */
export interface YouTrackConfig {
  baseUrl: string;
  token: string;
  projectId?: string;
  query?: string;
}

/**
 * Результат валидации конфигурации YouTrack
 */
export interface YouTrackConfigValidation {
  isValid: boolean;
  error?: string;
}
