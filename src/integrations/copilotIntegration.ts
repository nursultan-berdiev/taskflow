import * as vscode from "vscode";
import { Task } from "../models/task";
import { InstructionManager } from "../managers/instructionManager";

/**
 * Интеграция с GitHub Copilot для генерации кода на основе задач
 */
export class CopilotIntegration {
  private copilotAvailable: boolean = false;
  private currentTimer: NodeJS.Timeout | null = null;
  private currentTaskId: string | null = null;

  constructor(
    private context: vscode.ExtensionContext,
    private instructionManager: InstructionManager
  ) {
    this.checkCopilotAvailability();
  }

  /**
   * Отмена текущего таймера автоматического выполнения
   */
  public cancelCurrentTimer(): void {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
      this.currentTaskId = null;
    }
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
    const config = vscode.workspace.getConfiguration("taskflow");
    const enabled = config.get<boolean>("copilotIntegration", true);

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
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: prompt,
      });
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

    // Проверяем режим выполнения
    const executionMode = config.get<string>("queueExecutionMode", "manual");
    const isAutomaticMode = executionMode === "automatic";

    // В автоматическом режиме запускаем таймер
    if (isAutomaticMode && !autoComplete) {
      return await this.handleAutomaticMode(task);
    }

    // В режиме autoComplete (для обратной совместимости)
    if (autoComplete) {
      return true;
    }

    // Ручной режим - показываем уведомление и ждем ответа пользователя
    return await this.handleManualMode(task);
  }

  /**
   * Обработка ручного режима выполнения
   */
  private async handleManualMode(task: Task): Promise<boolean> {
    let userChoice: string | undefined;

    while (!userChoice) {
      userChoice = await vscode.window.showInformationMessage(
        `✅ Код сгенерирован для задачи: "${task.title}"\n\n` +
          `Проверьте результат в Copilot Chat, примените код, затем нажмите кнопку.`,
        { modal: false },
        "✅ Завершить задачу",
        "⏭️ Пропустить задачу"
      );

      // Если пользователь закрыл уведомление без выбора, показываем снова через 2 секунды
      if (!userChoice) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return userChoice === "✅ Завершить задачу";
  }

  /**
   * Обработка автоматического режима выполнения с таймером
   */
  private async handleAutomaticMode(task: Task): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("taskflow");
    const defaultDuration = config.get<number>("defaultTaskDuration", 30);

    // Приоритет: индивидуальное время задачи > настройка по умолчанию
    const durationMinutes = task.executionDuration ?? defaultDuration;
    const durationMs = durationMinutes * 60 * 1000;

    this.currentTaskId = task.id;
    let startTime = Date.now();
    let isCompleted = false;
    let userAction: "complete" | "skip" | null = null;

    // Функция для форматирования оставшегося времени
    const formatTime = (ms: number): string => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return minutes > 0 ? `${minutes} мин` : `${seconds} сек`;
    };

    // Создаем Promise для таймера и Promise для действий пользователя
    const timerPromise = new Promise<boolean>((resolve) => {
      // Показываем первое уведомление с прогрессом
      let currentNotification: Thenable<string | undefined> | null = null;

      const showProgressNotification = () => {
        if (isCompleted || this.currentTaskId !== task.id) {
          return;
        }

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, durationMs - elapsed);
        const remainingFormatted = formatTime(remaining);

        currentNotification = vscode.window.showInformationMessage(
          `⏱️ Автоматическое выполнение: ${remainingFormatted} осталось\n` +
            `Задача: "${task.title}"\n\n` +
            `Задача завершится автоматически через ${remainingFormatted}`,
          { modal: false },
          "✅ Завершить сейчас",
          "⏭️ Пропустить"
        );

        currentNotification.then((choice) => {
          if (choice === "✅ Завершить сейчас") {
            userAction = "complete";
            isCompleted = true;
            this.cancelCurrentTimer();
            resolve(true);
          } else if (choice === "⏭️ Пропустить") {
            userAction = "skip";
            isCompleted = true;
            this.cancelCurrentTimer();
            resolve(false);
          }
        });
      };

      // Показываем уведомление каждые 30 секунд
      const notificationInterval = setInterval(() => {
        showProgressNotification();
      }, 30000);

      // Показываем первое уведомление сразу
      showProgressNotification();

      // Основной таймер для автоматического завершения
      this.currentTimer = setTimeout(() => {
        clearInterval(notificationInterval);
        if (!isCompleted) {
          isCompleted = true;
          this.currentTimer = null;
          this.currentTaskId = null;

          vscode.window.showInformationMessage(
            `✅ Задача автоматически завершена: "${task.title}"\n\n` +
              `Начинается следующая задача...`
          );

          resolve(true);
        }
      }, durationMs);

      // Сохраняем интервал для очистки
      this.context.subscriptions.push({
        dispose: () => {
          clearInterval(notificationInterval);
        },
      });
    });

    return await timerPromise;
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

    // Добавление кастомной инструкции или инструкции по умолчанию
    prompt += `\n## Инструкции\n`;

    const instruction = task.instructionId
      ? this.instructionManager.getInstruction(task.instructionId)
      : this.instructionManager.getDefaultInstruction();

    if (instruction) {
      prompt += instruction.content;
    } else {
      // Fallback если инструкция не найдена
      prompt += `Пожалуйста, помоги мне реализовать эту задачу. `;
      prompt += `Сгенерируй код с учетом контекста проекта, `;
      prompt += `добавь комментарии и следуй лучшим практикам.`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
      prompt += `\n\nОбрати внимание на подзадачи - они описывают шаги реализации.`;
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

  /**
   * Генерация описания задачи через AI агент
   * @param briefTitle Краткое название задачи от пользователя
   * @returns Полное описание задачи или null если пользователь отменил
   */
  public async generateTaskDescription(
    briefTitle: string
  ): Promise<{ title: string; description: string } | null> {
    if (!this.copilotAvailable) {
      vscode.window.showWarningMessage(
        "GitHub Copilot не доступен для генерации описания"
      );
      return null;
    }

    try {
      // Пробуем использовать Language Model API для автоматической генерации
      const aiResult = await this.tryLanguageModelGeneration(briefTitle);
      if (aiResult) {
        return aiResult;
      }
    } catch (error) {
      console.log("Language Model API недоступен, используем ручной режим");
    }

    // Fallback: ручной режим через Copilot Chat
    return await this.manualCopilotGeneration(briefTitle);
  }

  /**
   * Попытка использовать Language Model API для автоматической генерации
   */
  private async tryLanguageModelGeneration(
    briefTitle: string
  ): Promise<{ title: string; description: string } | null> {
    // Проверяем доступность Language Model API
    const models = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    if (models.length === 0) {
      return null;
    }

    const model = models[0];

    const prompt = `Ты — помощник для создания задач разработки ПО.

Пользователь хочет создать задачу: "${briefTitle}"

Сгенерируй:
1. Полное и понятное название задачи (одна строка)
2. Подробное описание задачи с ключевыми моментами реализации

Формат ответа (строго следуй):
TITLE: [полное название задачи]
DESCRIPTION: [детальное описание задачи, можно несколько строк]

Будь конкретным и ориентируйся на разработку программного обеспечения.`;

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "🤖 AI генерирует описание задачи...",
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const messages = [vscode.LanguageModelChatMessage.User(prompt)];
          const response = await model.sendRequest(messages, {}, token);

          let fullResponse = "";
          for await (const chunk of response.text) {
            fullResponse += chunk;
            if (token.isCancellationRequested) {
              return null;
            }
          }

          // Парсим ответ
          const titleMatch = fullResponse.match(/TITLE:\s*(.+)/);
          const descMatch = fullResponse.match(/DESCRIPTION:\s*([\s\S]+)/);

          if (titleMatch && descMatch) {
            const title = titleMatch[1].trim();
            const description = descMatch[1].trim();

            return { title, description };
          }

          return null;
        } catch (error) {
          console.error("Ошибка Language Model API:", error);
          return null;
        }
      }
    );
  }

  /**
   * Ручной режим генерации через Copilot Chat
   */
  private async manualCopilotGeneration(
    briefTitle: string
  ): Promise<{ title: string; description: string } | null> {
    const prompt = `
# Генерация описания задачи

Я хочу создать задачу: "${briefTitle}"

Пожалуйста, сгенерируй:
1. Полное и понятное название задачи
2. Подробное описание задачи с ключевыми моментами реализации

Ответ должен быть в формате:
---
Название: [полное название]
Описание: [детальное описание]
---

Будь конкретным и ориентируйся на разработку программного обеспечения.
    `.trim();

    try {
      // Открываем Copilot Chat с промптом
      await vscode.commands.executeCommand(
        "workbench.panel.chat.view.copilot.focus"
      );

      // Отправляем промпт
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: prompt,
      });

      // Показываем диалог для ввода результата от AI
      const result = await vscode.window.showInformationMessage(
        `🤖 AI агент генерирует описание для задачи "${briefTitle}"\n\n` +
          `Проверьте результат в Copilot Chat, затем скопируйте и вставьте сгенерированный текст.`,
        { modal: false },
        "📝 Ввести описание",
        "❌ Отмена"
      );

      if (result === "📝 Ввести описание") {
        // Запрашиваем название
        const generatedTitle = await vscode.window.showInputBox({
          prompt: "Введите сгенерированное AI название задачи",
          placeHolder: briefTitle,
          value: briefTitle,
          validateInput: (value) => {
            return value.trim() ? null : "Название задачи не может быть пустым";
          },
        });

        if (!generatedTitle) {
          return null;
        }

        // Запрашиваем описание
        const generatedDescription = await vscode.window.showInputBox({
          prompt:
            "Введите сгенерированное AI описание задачи (многострочное через Shift+Enter)",
          placeHolder: "Подробное описание задачи от AI...",
        });

        return {
          title: generatedTitle,
          description: generatedDescription || "",
        };
      }

      return null;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Ошибка при генерации описания через AI: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }
}
