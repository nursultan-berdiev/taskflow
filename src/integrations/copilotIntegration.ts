import * as vscode from "vscode";
import { Task } from "../models/task";

/**
 * Интеграция с GitHub Copilot для генерации кода на основе задач
 */
export class CopilotIntegration {
  private copilotAvailable: boolean = false;

  constructor(private context: vscode.ExtensionContext) {
    this.checkCopilotAvailability();
  }

  /**
   * Проверка доступности GitHub Copilot
   */
  private async checkCopilotAvailability(): Promise<void> {
    const copilotExtension = vscode.extensions.getExtension(
      "github.copilot-chat"
    );
    this.copilotAvailable = copilotExtension !== undefined;
  }

  /**
   * Генерация кода на основе задачи с использованием Copilot
   * @param task Задача для генерации кода
   * @param autoComplete Автоматически завершить задачу без диалога (для автоматического режима очереди)
   * @returns true если пользователь подтвердил завершение задачи или autoComplete=true, false в противном случае
   */
  public async generateCodeForTask(
    task: Task,
    autoComplete: boolean = false
  ): Promise<boolean> {
    const enabled = vscode.workspace
      .getConfiguration("taskflow")
      .get<boolean>("copilotIntegration", true);

    if (!enabled) {
      vscode.window.showWarningMessage(
        "Интеграция с Copilot отключена в настройках TaskFlow"
      );
      return false;
    }

    if (!this.copilotAvailable) {
      const result = await vscode.window.showWarningMessage(
        "GitHub Copilot не установлен или не активен",
        "Открыть Marketplace"
      );

      if (result === "Открыть Marketplace") {
        vscode.env.openExternal(
          vscode.Uri.parse(
            "https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat"
          )
        );
      }
      return false;
    }

    // Формирование промпта для Copilot
    const prompt = this.createPromptFromTask(task);

    try {
      // Открытие Copilot Chat с промптом
      await vscode.commands.executeCommand(
        "workbench.panel.chat.view.copilot.focus"
      );

      // Отправка промпта в Copilot Chat
      // Примечание: API для прямой отправки промпта может измениться
      // Используем executeCommand для открытия чата
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: prompt,
      });

      // Уведомление убрано - Copilot Chat открывается автоматически
    } catch (error) {
      // Альтернативный метод: копирование промпта в буфер обмена
      await vscode.env.clipboard.writeText(prompt);

      const result = await vscode.window.showInformationMessage(
        "Промпт скопирован в буфер обмена. Откройте Copilot Chat и вставьте запрос.",
        "Открыть Copilot Chat"
      );

      if (result === "Открыть Copilot Chat") {
        await vscode.commands.executeCommand(
          "workbench.panel.chat.view.copilot.focus"
        );
      }
    }

    // В автоматическом режиме не показываем диалог
    if (autoComplete) {
      return true;
    }

    // Показываем уведомление и ждем ответа пользователя
    // Используем цикл, чтобы уведомление не исчезало, пока пользователь не ответит
    let userChoice: string | undefined;

    while (!userChoice) {
      userChoice = await vscode.window.showInformationMessage(
        `✅ Код сгенерирован для задачи: "${task.title}"\n\n` +
          `Проверьте результат в Copilot Chat, примените код, затем нажмите кнопку.`,
        { modal: false }, // НЕ модальное - не блокирует UI
        "✅ Завершить задачу",
        "⏭️ Пропустить задачу"
      );

      // Если пользователь закрыл уведомление без выбора (userChoice === undefined),
      // показываем его снова через 2 секунды
      if (!userChoice) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return userChoice === "✅ Завершить задачу";
  }

  /**
   * Создание промпта для Copilot на основе задачи
   */
  private createPromptFromTask(task: Task): string {
    let prompt = `# Задача: ${task.title}\n\n`;

    // Добавление описания
    if (task.description) {
      prompt += `## Описание\n${task.description}\n\n`;
    }

    // Добавление метаданных
    prompt += `## Метаданные\n`;
    prompt += `- Приоритет: ${task.priority}\n`;
    prompt += `- Статус: ${task.status}\n`;

    if (task.category) {
      prompt += `- Категория: ${task.category}\n`;
    }

    if (task.dueDate) {
      prompt += `- Срок выполнения: ${task.dueDate.toLocaleDateString(
        "ru-RU"
      )}\n`;
    }

    // Добавление подзадач
    if (task.subtasks && task.subtasks.length > 0) {
      prompt += `\n## Подзадачи\n`;
      for (const subtask of task.subtasks) {
        const checkbox = subtask.completed ? "[x]" : "[ ]";
        prompt += `- ${checkbox} ${subtask.title}\n`;
      }
    }

    // Добавление инструкций для Copilot
    prompt += `\n## Инструкции\n`;
    prompt += `Пожалуйста, помоги мне реализовать эту задачу. `;
    prompt += `Сгенерируй код с учетом контекста проекта, `;
    prompt += `добавь комментарии и следуй лучшим практикам. `;

    if (task.subtasks && task.subtasks.length > 0) {
      prompt += `Обрати внимание на подзадачи - они описывают шаги реализации.`;
    }

    return prompt;
  }

  /**
   * Создание запроса для конкретного аспекта задачи
   */
  public async askCopilotAboutTask(
    task: Task,
    aspect: "implementation" | "tests" | "documentation" | "review"
  ): Promise<void> {
    const prompts = {
      implementation: `Реализуй следующую задачу:\n\n${task.title}\n${
        task.description || ""
      }`,
      tests: `Напиши unit-тесты для следующей задачи:\n\n${task.title}\n${
        task.description || ""
      }`,
      documentation: `Создай документацию для следующей функциональности:\n\n${
        task.title
      }\n${task.description || ""}`,
      review: `Проверь и предложи улучшения для реализации:\n\n${task.title}\n${
        task.description || ""
      }`,
    };

    const prompt = prompts[aspect];

    try {
      await vscode.env.clipboard.writeText(prompt);
      await vscode.commands.executeCommand(
        "workbench.panel.chat.view.copilot.focus"
      );

      vscode.window.showInformationMessage(
        "Промпт скопирован. Вставьте в Copilot Chat."
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Ошибка при работе с Copilot: ${error}`);
    }
  }

  /**
   * Генерация кода для нескольких задач
   */
  public async generateCodeForMultipleTasks(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) {
      vscode.window.showWarningMessage("Не выбрано ни одной задачи");
      return;
    }

    let prompt = `# Реализация нескольких задач\n\n`;
    prompt += `Помоги мне реализовать следующие задачи в правильной последовательности:\n\n`;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      prompt += `## ${i + 1}. ${task.title}\n`;

      if (task.description) {
        prompt += `${task.description}\n`;
      }

      prompt += `Приоритет: ${task.priority}\n\n`;
    }

    prompt += `Предложи план реализации и сгенерируй код для каждой задачи.`;

    await vscode.env.clipboard.writeText(prompt);
    await vscode.commands.executeCommand(
      "workbench.panel.chat.view.copilot.focus"
    );

    vscode.window.showInformationMessage(
      `Промпт для ${tasks.length} задач скопирован в буфер обмена`
    );
  }

  /**
   * Анализ задачи и предложение декомпозиции
   */
  public async analyzeAndDecomposeTask(task: Task): Promise<void> {
    const prompt = `
# Анализ и декомпозиция задачи

Задача: ${task.title}

${task.description ? `Описание: ${task.description}\n` : ""}

Пожалуйста, проанализируй эту задачу и:
1. Предложи декомпозицию на подзадачи
2. Определи технологии и инструменты для реализации
3. Укажи потенциальные сложности и риски
4. Предложи план реализации с оценкой времени

Сформулируй ответ в виде списка подзадач в формате Markdown, которые я могу добавить в TaskFlow.
    `.trim();

    await vscode.env.clipboard.writeText(prompt);
    await vscode.commands.executeCommand(
      "workbench.panel.chat.view.copilot.focus"
    );

    vscode.window.showInformationMessage(
      "Запрос на декомпозицию задачи скопирован в буфер обмена"
    );
  }

  /**
   * Проверка доступности Copilot
   */
  public isCopilotAvailable(): boolean {
    return this.copilotAvailable;
  }
}
