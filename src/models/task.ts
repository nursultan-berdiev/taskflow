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
  dueDate?: Date;
  subtasks?: SubTask[];
  createdAt: Date;
  updatedAt: Date;
  assignee?: string;
  queuePosition?: number; // Позиция в очереди выполнения (null если не в очереди)
  instructionId?: string; // ID кастомной инструкции для Copilot (если не указано - используется по умолчанию)
  executionDuration?: number; // Время выполнения задачи в минутах (опционально, если не указано - используется defaultTaskDuration)
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
