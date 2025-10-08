import * as vscode from "vscode";
import axios, { AxiosInstance, AxiosError } from "axios";
import {
  TrelloCard,
  TrelloConfig,
  TrelloConfigValidation,
  TrelloList,
  TrelloChecklist,
  TrelloLabel,
} from "../models/trelloTypes";
import { Task, Priority, TaskStatus, SubTask } from "../models/task";

/**
 * Сервис для интеграции с Trello API
 * Обеспечивает импорт карточек из Trello в локальное хранилище
 */
export class TrelloIntegration {
  private axiosInstance: AxiosInstance | null = null;
  private config: TrelloConfig | null = null;
  private readonly baseUrl = "https://api.trello.com/1";

  /**
   * Инициализация подключения к Trello
   */
  public async initialize(): Promise<boolean> {
    const config = await this.loadConfiguration();

    if (!config.isValid || !this.config) {
      vscode.window.showErrorMessage(
        `Ошибка конфигурации Trello: ${config.error}`
      );
      return false;
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    return true;
  }

  /**
   * Загрузка конфигурации из настроек VS Code
   */
  private async loadConfiguration(): Promise<TrelloConfigValidation> {
    const configuration = vscode.workspace.getConfiguration("taskflow.trello");

    const apiKey = configuration.get<string>("apiKey");
    const token = configuration.get<string>("token");
    const boardId = configuration.get<string>("boardId");
    const listIds = configuration.get<string>("listIds");

    if (!apiKey || apiKey.trim() === "") {
      return {
        isValid: false,
        error:
          "API Key Trello не указан. Укажите его в настройках: taskflow.trello.apiKey",
      };
    }

    if (!token || token.trim() === "") {
      return {
        isValid: false,
        error:
          "Token Trello не указан. Укажите его в настройках: taskflow.trello.token",
      };
    }

    this.config = {
      apiKey: apiKey.trim(),
      token: token.trim(),
      boardId: boardId?.trim(),
      listIds: listIds
        ?.trim()
        .split(",")
        .map((id) => id.trim()),
    };

    return { isValid: true };
  }

  /**
   * Построение параметров аутентификации для запроса
   */
  private getAuthParams(): { key: string; token: string } {
    return {
      key: this.config!.apiKey,
      token: this.config!.token,
    };
  }

  /**
   * Импорт карточек из Trello
   */
  public async importCards(): Promise<Task[]> {
    if (!this.axiosInstance || !this.config) {
      throw new Error(
        "Trello не инициализирован. Вызовите initialize() сначала."
      );
    }

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Импорт задач из Trello",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Подключение к Trello..." });

          let cards: TrelloCard[] = [];

          if (this.config?.boardId) {
            // Получаем карточки с конкретной доски
            progress.report({ message: "Загрузка карточек с доски..." });
            cards = await this.getCardsFromBoard(this.config.boardId);
          } else {
            // Получаем карточки пользователя
            progress.report({ message: "Загрузка ваших карточек..." });
            cards = await this.getMyCards();
          }

          // Фильтруем по спискам, если указаны
          if (this.config?.listIds && this.config.listIds.length > 0) {
            cards = cards.filter((card) =>
              this.config!.listIds!.includes(card.idList)
            );
          }

          progress.report({
            message: `Обработка ${cards.length} карточек...`,
          });

          const tasks = await Promise.all(
            cards.map((card) => this.mapTrelloCardToTask(card))
          );

          progress.report({ message: "Импорт завершён!" });

          return tasks;
        } catch (error) {
          this.handleError(error);
          throw error;
        }
      }
    );
  }

  /**
   * Получение карточек с конкретной доски
   */
  private async getCardsFromBoard(boardId: string): Promise<TrelloCard[]> {
    const response = await this.axiosInstance!.get<TrelloCard[]>(
      `/boards/${boardId}/cards`,
      {
        params: {
          ...this.getAuthParams(),
          checklists: "all",
          fields:
            "name,desc,idList,idBoard,labels,due,dueComplete,dateLastActivity,url,closed",
        },
      }
    );

    return response.data;
  }

  /**
   * Получение карточек текущего пользователя
   */
  private async getMyCards(): Promise<TrelloCard[]> {
    const response = await this.axiosInstance!.get<TrelloCard[]>(
      "/members/me/cards",
      {
        params: {
          ...this.getAuthParams(),
          filter: "open",
          checklists: "all",
          fields:
            "name,desc,idList,idBoard,labels,due,dueComplete,dateLastActivity,url,closed",
        },
      }
    );

    return response.data;
  }

  /**
   * Получение информации о списке
   */
  private async getList(listId: string): Promise<TrelloList | null> {
    try {
      const response = await this.axiosInstance!.get<TrelloList>(
        `/lists/${listId}`,
        {
          params: this.getAuthParams(),
        }
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Получение чеклистов карточки
   */
  private async getCardChecklists(cardId: string): Promise<TrelloChecklist[]> {
    try {
      const response = await this.axiosInstance!.get<TrelloChecklist[]>(
        `/cards/${cardId}/checklists`,
        {
          params: this.getAuthParams(),
        }
      );
      return response.data;
    } catch {
      return [];
    }
  }

  /**
   * Преобразование карточки Trello в локальный формат Task
   */
  private async mapTrelloCardToTask(card: TrelloCard): Promise<Task> {
    // Получаем информацию о списке для категории
    const list = await this.getList(card.idList);
    const category = list?.name || "Без категории";

    // Получаем чеклисты для подзадач
    const checklists = await this.getCardChecklists(card.id);
    const subtasks = this.mapChecklistsToSubtasks(checklists);

    return {
      id: `trello-${card.id}`,
      title: card.name,
      description: card.desc || undefined,
      status: this.mapStatus(card),
      priority: this.mapPriority(card.labels),
      category: category,
      tag: card.id.substring(0, 8), // Используем часть ID как тег
      dueDate: card.due ? new Date(card.due) : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      createdAt: new Date(card.dateLastActivity),
      updatedAt: new Date(card.dateLastActivity),
    };
  }

  /**
   * Маппинг чеклистов в подзадачи
   */
  private mapChecklistsToSubtasks(checklists: TrelloChecklist[]): SubTask[] {
    const subtasks: SubTask[] = [];

    for (const checklist of checklists) {
      for (const item of checklist.checkItems) {
        subtasks.push({
          id: item.id,
          title: item.name,
          completed: item.state === "complete",
        });
      }
    }

    return subtasks;
  }

  /**
   * Извлечение и маппинг статуса карточки
   */
  private mapStatus(card: TrelloCard): TaskStatus {
    // Если карточка закрыта или due дата выполнена
    if (card.closed || card.dueComplete) {
      return TaskStatus.Completed;
    }

    // Если есть активность недавно - в процессе
    const lastActivity = new Date(card.dateLastActivity);
    const daysSinceActivity =
      (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity < 2) {
      return TaskStatus.InProgress;
    }

    return TaskStatus.Pending;
  }

  /**
   * Извлечение и маппинг приоритета из меток
   */
  private mapPriority(labels: TrelloLabel[]): Priority {
    // Ищем метки с приоритетом
    const priorityLabel = labels.find((label) => {
      const name = label.name.toLowerCase();
      return (
        name.includes("приоритет") ||
        name.includes("priority") ||
        name.includes("важн") ||
        name.includes("urgent")
      );
    });

    if (priorityLabel) {
      const name = priorityLabel.name.toLowerCase();
      const color = priorityLabel.color.toLowerCase();

      // По названию или цвету
      if (
        name.includes("высок") ||
        name.includes("high") ||
        name.includes("критич") ||
        name.includes("critical") ||
        color === "red" ||
        color === "orange"
      ) {
        return Priority.High;
      }

      if (
        name.includes("низк") ||
        name.includes("low") ||
        name.includes("minor") ||
        color === "green" ||
        color === "blue"
      ) {
        return Priority.Low;
      }
    }

    return Priority.Medium;
  }

  /**
   * Поиск существующей задачи по тегу и названию
   */
  public findDuplicateTask(allTasks: Task[], newTask: Task): Task | undefined {
    return allTasks.find((existingTask) => {
      // Проверка 1: По ID
      if (existingTask.id === newTask.id) {
        return true;
      }

      // Проверка 2: По тегу
      if (
        newTask.tag &&
        existingTask.tag &&
        existingTask.tag.toLowerCase() === newTask.tag.toLowerCase()
      ) {
        return true;
      }

      // Проверка 3: По названию
      if (
        existingTask.title.trim().toLowerCase() ===
        newTask.title.trim().toLowerCase()
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Обработка ошибок при взаимодействии с API
   */
  private handleError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        let message = "Ошибка при подключении к Trello: ";

        switch (status) {
          case 401:
            message += "Неверный API Key или Token. Проверьте настройки.";
            break;
          case 403:
            message += "Доступ запрещён. Проверьте права доступа токена.";
            break;
          case 404:
            message += "Доска или список не найдены. Проверьте Board ID.";
            break;
          case 429:
            message += "Превышен лимит запросов. Попробуйте позже.";
            break;
          default:
            message += `HTTP ${status} - ${axiosError.message}`;
        }

        vscode.window.showErrorMessage(message);
        console.error("Trello API Error:", axiosError.response.data);
      } else if (axiosError.request) {
        vscode.window.showErrorMessage(
          "Trello API недоступен. Проверьте подключение к интернету."
        );
        console.error("Trello Network Error:", axiosError.message);
      } else {
        vscode.window.showErrorMessage(
          `Ошибка запроса к Trello: ${axiosError.message}`
        );
        console.error("Trello Request Error:", axiosError.message);
      }
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Неизвестная ошибка при импорте из Trello: ${errorMessage}`
      );
      console.error("Trello Unknown Error:", error);
    }
  }

  /**
   * Проверка подключения к Trello
   */
  public async testConnection(): Promise<boolean> {
    if (!this.axiosInstance || !this.config) {
      throw new Error(
        "Trello не инициализирован. Вызовите initialize() сначала."
      );
    }

    try {
      await this.axiosInstance.get("/members/me", {
        params: this.getAuthParams(),
      });
      vscode.window.showInformationMessage("✅ Подключение к Trello успешно!");
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
}
