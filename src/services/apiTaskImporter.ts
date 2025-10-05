import * as vscode from "vscode";
import { TaskManager } from "../managers/taskManager";
import { Priority, TaskStatus } from "../models/task";

/**
 * Интерфейс для структуры задачи, созданной AI
 */
interface AIGeneratedTask {
  title: string;
  description?: string;
  priority?: Priority;
  category?: string;
  dueDate?: string;
}

/**
 * Интерфейс для ответа AI с группой задач
 */
interface AITaskGroup {
  groupName: string;
  tasks: AIGeneratedTask[];
}

/**
 * Сервис для импорта задач из внешнего API с использованием AI
 */
export class ApiTaskImporter {
  constructor(private taskManager: TaskManager) {}

  /**
   * Импортирует задачи из API URL, используя AI для форматирования
   */
  public async importTasksFromApi(): Promise<void> {
    try {
      // 1. Получить URL из настроек
      const apiUrl = this.getApiUrl();
      if (!apiUrl) {
        const inputUrl = await vscode.window.showInputBox({
          prompt: "Введите URL для получения задач (HTTP GET)",
          placeHolder: "https://api.example.com/tasks",
          validateInput: (value) => {
            if (!value) {
              return "URL не может быть пустым";
            }
            try {
              new URL(value);
              return null;
            } catch {
              return "Некорректный URL";
            }
          },
        });

        if (!inputUrl) {
          return;
        }

        // Сохранить URL в настройки
        await this.saveApiUrl(inputUrl);
        return this.importTasksFromApi();
      }

      // 2. Показать индикатор загрузки
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Импорт задач из API",
          cancellable: true,
        },
        async (progress, token) => {
          // 3. Получить данные из API
          progress.report({ message: "Загрузка данных..." });
          const apiData = await this.fetchDataFromApi(apiUrl, token);

          if (!apiData) {
            return;
          }

          // 4. Обработать данные с помощью AI
          progress.report({ message: "AI обрабатывает данные..." });
          const taskGroup = await this.processWithAI(apiData, token);

          if (!taskGroup) {
            return;
          }

          // 5. Создать задачи
          progress.report({ message: "Создание задач..." });
          await this.createTasks(taskGroup);

          vscode.window.showInformationMessage(
            `✅ Импортировано ${taskGroup.tasks.length} задач в группу "${taskGroup.groupName}"`
          );
        }
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Получает URL из настроек
   */
  private getApiUrl(): string {
    const config = vscode.workspace.getConfiguration("taskflow");
    return config.get<string>("apiTasksUrl", "");
  }

  /**
   * Сохраняет URL в настройки
   */
  private async saveApiUrl(url: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("taskflow");
    await config.update("apiTasksUrl", url, vscode.ConfigurationTarget.Global);
  }

  /**
   * Выполняет HTTP GET запрос к API
   */
  private async fetchDataFromApi(
    url: string,
    token: vscode.CancellationToken
  ): Promise<unknown | null> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: token.isCancellationRequested ? AbortSignal.abort() : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        vscode.window.showInformationMessage("Импорт отменен");
        return null;
      }
      throw error;
    }
  }

  /**
   * Обрабатывает данные с помощью Language Model API
   */
  private async processWithAI(
    data: unknown,
    token: vscode.CancellationToken
  ): Promise<AITaskGroup | null> {
    try {
      // Получить доступные модели
      const models = await vscode.lm.selectChatModels({
        vendor: "copilot",
        family: "gpt-4o",
      });

      if (models.length === 0) {
        vscode.window.showErrorMessage(
          "AI модель недоступна. Убедитесь, что GitHub Copilot активен."
        );
        return null;
      }

      const model = models[0];

      // Создать промпт для AI
      const currentDate = new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const prompt = `Ты - ассистент для создания задач в TaskFlow.

Получены данные из API:
${JSON.stringify(data, null, 2)}

ЗАДАЧА:
1. Проанализируй данные и создай группу задач
2. Название группы должно отражать суть задач + дата/время: "${currentDate}"
3. Каждая задача должна иметь:
   - title (обязательно, краткое название)
   - description (опционально, подробное описание)
   - priority (опционально: "Высокий", "Средний", "Низкий")
   - category (опционально, категория задачи)
   - dueDate (опционально, формат: YYYY-MM-DD)

ФОРМАТ ОТВЕТА (строго JSON):
{
  "groupName": "Название группы ${currentDate}",
  "tasks": [
    {
      "title": "Название задачи",
      "description": "Описание задачи",
      "priority": "Средний",
      "category": "Категория",
      "dueDate": "2025-12-31"
    }
  ]
}

Верни ТОЛЬКО валидный JSON, без дополнительного текста.`;

      const messages = [vscode.LanguageModelChatMessage.User(prompt)];

      // Отправить запрос к AI
      const response = await model.sendRequest(messages, {}, token);

      // Собрать ответ
      let fullResponse = "";
      for await (const chunk of response.text) {
        if (token.isCancellationRequested) {
          vscode.window.showInformationMessage("Импорт отменен");
          return null;
        }
        fullResponse += chunk;
      }

      // Парсинг JSON из ответа
      return this.parseAIResponse(fullResponse);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("CancellationError")
      ) {
        vscode.window.showInformationMessage("Импорт отменен");
        return null;
      }
      throw error;
    }
  }

  /**
   * Парсит ответ AI и извлекает JSON
   */
  private parseAIResponse(response: string): AITaskGroup {
    try {
      // Убрать markdown code blocks если есть
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(jsonStr);

      // Валидация структуры
      if (!parsed.groupName || !Array.isArray(parsed.tasks)) {
        throw new Error("Неверная структура ответа AI");
      }

      return parsed as AITaskGroup;
    } catch (error) {
      throw new Error(
        `Не удалось распарсить ответ AI: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Создает задачи в TaskManager
   */
  private async createTasks(taskGroup: AITaskGroup): Promise<void> {
    for (const aiTask of taskGroup.tasks) {
      try {
        await this.taskManager.addTask({
          title: aiTask.title,
          description: aiTask.description || "",
          priority: aiTask.priority || Priority.Medium,
          category: aiTask.category || taskGroup.groupName,
          status: TaskStatus.Pending,
          dueDate: aiTask.dueDate ? new Date(aiTask.dueDate) : undefined,
        });
      } catch (error) {
        vscode.window.showWarningMessage(
          `Не удалось создать задачу "${aiTask.title}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Обработка ошибок
   */
  private handleError(error: unknown): void {
    let message = "Ошибка импорта задач";

    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        message =
          "Не удалось подключиться к API. Проверьте URL и интернет-соединение.";
      } else if (error.message.includes("HTTP")) {
        message = `Ошибка API: ${error.message}`;
      } else {
        message = `${message}: ${error.message}`;
      }
    }

    vscode.window.showErrorMessage(message);
  }
}
