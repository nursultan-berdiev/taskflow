/**
 * Приоритет задачи
 */
export enum Priority {
  High = "Высокий",
  Medium = "Средний",
  Low = "Низкий",
}

/**
 * Статус задачи
 */
export enum TaskStatus {
  Pending = "ожидает",
  Completed = "завершено",
  InProgress = "в процессе",
}

/**
 * Интерфейс подзадачи
 */
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Основной интерфейс задачи
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category?: string;
  tag?: string; // Тег задачи (необязательно, до 50 символов, буквы/цифры/дефис/подчеркивание)
  dueDate?: Date;
  subtasks?: SubTask[];
  createdAt: Date;
  updatedAt: Date;
  assignee?: string;
  queuePosition?: number; // Позиция в очереди выполнения (null если не в очереди)
  instructionId?: string; // ID кастомной инструкции для Copilot (если не указано - используется по умолчанию)
  executionDuration?: number; // Время выполнения задачи в минутах (опционально, если не указано - используется defaultTaskDuration)
  result?: string; // Результат выполнения задачи (краткое описание того, что было сделано)
}

/**
 * Интерфейс категории задач
 */
export interface TaskCategory {
  name: string;
  tasks: Task[];
}

/**
 * Статистика прогресса
 */
export interface ProgressStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
}

/**
 * Максимальная длина тега
 */
export const MAX_TAG_LENGTH = 50;

/**
 * Регулярное выражение для валидации тега
 * Разрешены: буквы (латиница и кириллица), цифры, дефис, подчеркивание
 */
const TAG_VALIDATION_REGEX = /^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/;

/**
 * Результат валидации тега
 */
export interface TagValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Валидация тега задачи
 * @param tag Тег для валидации
 * @returns Результат валидации с ошибкой если есть
 */
export function validateTag(tag: string | undefined): TagValidationResult {
  // Пустой или undefined тег валиден (поле необязательное)
  if (!tag || tag.trim().length === 0) {
    return { isValid: true };
  }

  const trimmedTag = tag.trim();

  // Проверка длины
  if (trimmedTag.length > MAX_TAG_LENGTH) {
    return {
      isValid: false,
      error: `Длина тега не должна превышать ${MAX_TAG_LENGTH} символов`,
    };
  }

  // Проверка допустимых символов
  if (!TAG_VALIDATION_REGEX.test(trimmedTag)) {
    return {
      isValid: false,
      error:
        "Тег может содержать только буквы, цифры, дефис и подчеркивание",
    };
  }

  return { isValid: true };
}
