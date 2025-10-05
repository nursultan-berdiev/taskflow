import { Task, SubTask, Priority, TaskStatus } from "../models/task";
import { v4 as uuidv4 } from "uuid";

/**
 * Парсер для преобразования Markdown-файлов задач в структурированные данные
 */
export class MarkdownParser {
  /**
   * Парсит содержимое Markdown-файла в массив задач
   */
  public parseTasksFromMarkdown(content: string): Task[] {
    const tasks: Task[] = [];
    const lines = content.split("\n");
    let currentCategory: string | undefined;
    let currentTask: Task | null = null;
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Проверка на блоки кода
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) {
        continue;
      }

      // Парсинг заголовков категорий
      if (line.startsWith("##")) {
        currentCategory = line.replace(/^##\s*/, "").trim();
        continue;
      }

      // Парсинг задач
      const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
      if (taskMatch) {
        const [, statusChar, taskContent] = taskMatch;
        const completed = statusChar.toLowerCase() === "x";

        // Сохранить предыдущую задачу
        if (currentTask) {
          tasks.push(currentTask);
        }

        // Создать новую задачу
        currentTask = this.parseTaskContent(
          taskContent,
          completed,
          currentCategory
        );
        continue;
      }

      // Парсинг подзадач
      if (currentTask && line.match(/^\s+-\s*\[([ xX])\]\s*(.+)$/)) {
        const subtaskMatch = line.match(/^\s+-\s*\[([ xX])\]\s*(.+)$/);
        if (subtaskMatch) {
          const [, statusChar, subtaskTitle] = subtaskMatch;
          const subtask: SubTask = {
            id: uuidv4(),
            title: subtaskTitle.trim(),
            completed: statusChar.toLowerCase() === "x",
          };

          if (!currentTask.subtasks) {
            currentTask.subtasks = [];
          }
          currentTask.subtasks.push(subtask);
        }
        continue;
      }

      // Парсинг дополнительных полей задачи
      if (currentTask && line.startsWith("  ")) {
        const description = line.trim();
        if (description && !description.startsWith("-")) {
          if (currentTask.description) {
            currentTask.description += "\n" + description;
          } else {
            currentTask.description = description;
          }
        }
      }
    }

    // Добавить последнюю задачу
    if (currentTask) {
      tasks.push(currentTask);
    }

    return tasks;
  }

  /**
   * Парсит содержимое задачи и извлекает метаданные
   */
  private parseTaskContent(
    content: string,
    completed: boolean,
    category?: string
  ): Task {
    let title = content;
    let priority: Priority = Priority.Medium;
    let dueDate: Date | undefined;
    let assignee: string | undefined;
    let queuePosition: number | undefined;

    // Извлечение приоритета
    const priorityMatch = content.match(/\[(Высокий|Средний|Низкий)\]/i);
    if (priorityMatch) {
      priority = priorityMatch[1] as Priority;
      title = title.replace(priorityMatch[0], "").trim();
    }

    // Извлечение срока выполнения
    const dueDateMatch = content.match(/Срок:\s*(\d{4}-\d{2}-\d{2})/);
    if (dueDateMatch) {
      dueDate = new Date(dueDateMatch[1]);
      title = title.replace(/Срок:\s*\d{4}-\d{2}-\d{2}/, "").trim();
    }

    // Извлечение исполнителя
    const assigneeMatch = content.match(/@(\w+)/);
    if (assigneeMatch) {
      assignee = assigneeMatch[1];
      title = title.replace(assigneeMatch[0], "").trim();
    }

    // Извлечение позиции в очереди
    const queueMatch = content.match(/Очередь:\s*(\d+)/);
    if (queueMatch) {
      queuePosition = parseInt(queueMatch[1]);
      title = title.replace(/Очередь:\s*\d+/, "").trim();
    }

    const now = new Date();
    return {
      id: uuidv4(),
      title: title.trim(),
      status: completed ? TaskStatus.Completed : TaskStatus.Pending,
      priority,
      category,
      dueDate,
      assignee,
      queuePosition,
      createdAt: now,
      updatedAt: now,
      subtasks: [],
    };
  }

  /**
   * Конвертирует массив задач обратно в Markdown-формат
   */
  public convertTasksToMarkdown(tasks: Task[]): string {
    const categories = new Map<string, Task[]>();
    const uncategorized: Task[] = [];

    // Группировка задач по категориям
    for (const task of tasks) {
      if (task.category) {
        if (!categories.has(task.category)) {
          categories.set(task.category, []);
        }
        categories.get(task.category)!.push(task);
      } else {
        uncategorized.push(task);
      }
    }

    let markdown = "# Задачи\n\n";

    // Генерация Markdown для категоризированных задач
    for (const [category, categoryTasks] of categories) {
      markdown += `## ${category}\n\n`;
      markdown += this.tasksToMarkdown(categoryTasks);
      markdown += "\n";
    }

    // Генерация Markdown для некатегоризированных задач
    if (uncategorized.length > 0) {
      markdown += "## Без категории\n\n";
      markdown += this.tasksToMarkdown(uncategorized);
    }

    return markdown.trim() + "\n";
  }

  /**
   * Конвертирует список задач в Markdown
   */
  private tasksToMarkdown(tasks: Task[]): string {
    let markdown = "";

    for (const task of tasks) {
      const checkbox = task.status === TaskStatus.Completed ? "[x]" : "[ ]";
      let taskLine = `- ${checkbox} ${task.title}`;

      // Добавление метаданных
      if (task.priority !== Priority.Medium) {
        taskLine += ` [${task.priority}]`;
      }

      if (task.dueDate) {
        const dateStr = task.dueDate.toISOString().split("T")[0];
        taskLine += ` Срок: ${dateStr}`;
      }

      if (task.assignee) {
        taskLine += ` @${task.assignee}`;
      }

      if (task.queuePosition !== undefined && task.queuePosition !== null) {
        taskLine += ` Очередь: ${task.queuePosition}`;
      }

      markdown += taskLine + "\n";

      // Добавление описания
      if (task.description) {
        const descLines = task.description.split("\n");
        for (const line of descLines) {
          markdown += `  ${line}\n`;
        }
      }

      // Добавление подзадач
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          const subtaskCheckbox = subtask.completed ? "[x]" : "[ ]";
          markdown += `  - ${subtaskCheckbox} ${subtask.title}\n`;
        }
      }

      markdown += "\n";
    }

    return markdown;
  }

  /**
   * Проверяет, является ли строка корректной задачей Markdown
   */
  public isValidTaskLine(line: string): boolean {
    return /^-\s*\[([ xX])\]\s*.+$/.test(line.trim());
  }
}
