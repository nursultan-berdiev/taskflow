/**
 * Интерфейс инструкции для задач
 */
export interface Instruction {
  id: string;
  name: string;
  description?: string;
  content: string; // Текст инструкции для Copilot
  isDefault: boolean; // Является ли инструкцией по умолчанию
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Инструкция по умолчанию
 */
export const DEFAULT_INSTRUCTION: Instruction = {
  id: "default",
  name: "Инструкция по умолчанию",
  description: "Стандартная инструкция для генерации кода",
  content: `Пожалуйста, помоги мне реализовать эту задачу. Сгенерируй код с учетом контекста проекта, добавь комментарии и следуй лучшим практикам.`,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
