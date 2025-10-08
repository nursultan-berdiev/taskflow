import * as vscode from "vscode";
import axios, { AxiosInstance, AxiosError } from "axios";
import {
  YouTrackIssue,
  YouTrackConfig,
  YouTrackConfigValidation,
  YouTrackCustomField,
} from "../models/youtrackTypes";
import { Task, Priority, TaskStatus } from "../models/task";

/**
 * Сервис для интеграции с YouTrack API
 * Обеспечивает импорт задач из YouTrack в локальное хранилище
 */
export class YouTrackIntegration {
  private axiosInstance: AxiosInstance | null = null;
  private config: YouTrackConfig | null = null;

  /**
   * Инициализация подключения к YouTrack
   */
  public async initialize(): Promise<boolean> {
    const config = await this.loadConfiguration();

    if (!config.isValid || !this.config) {
      vscode.window.showErrorMessage(
        `Ошибка конфигурации YouTrack: ${config.error}`
      );
      return false;
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Bearer ${this.config.token}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accept: "application/json",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    return true;
  }

  /**
   * Загрузка конфигурации из настроек VS Code
   */
  private async loadConfiguration(): Promise<YouTrackConfigValidation> {
    const configuration =
      vscode.workspace.getConfiguration("taskflow.youtrack");

    const baseUrl = configuration.get<string>("baseUrl");
    const token = configuration.get<string>("token");
    const projectId = configuration.get<string>("projectId");
    const query = configuration.get<string>("query");

    if (!baseUrl || baseUrl.trim() === "") {
      return {
        isValid: false,
        error:
          "URL YouTrack не указан. Укажите его в настройках: taskflow.youtrack.baseUrl",
      };
    }

    if (!token || token.trim() === "") {
      return {
        isValid: false,
        error:
          "Токен YouTrack не указан. Укажите его в настройках: taskflow.youtrack.token",
      };
    }

    this.config = {
      baseUrl: baseUrl.trim(),
      token: token.trim(),
      projectId: projectId?.trim(),
      query: query?.trim(),
    };

    return { isValid: true };
  }

  /**
   * Импорт задач из YouTrack
   */
  public async importIssues(): Promise<Task[]> {
    if (!this.axiosInstance || !this.config) {
      throw new Error(
        "YouTrack не инициализирован. Вызовите initialize() сначала."
      );
    }

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Импорт задач из YouTrack",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Подключение к YouTrack..." });

          const query = this.buildQuery();
          const fields = this.buildFieldsQuery();

          progress.report({ message: "Загрузка задач..." });

          const response = await this.axiosInstance!.get<YouTrackIssue[]>(
            "/api/issues",
            {
              params: {
                fields: fields,
                query: query,
                $top: 100, // Максимум 100 задач за раз
              },
            }
          );

          // YouTrack API возвращает массив задач напрямую
          const issues = Array.isArray(response.data) ? response.data : [];

          progress.report({
            message: `Обработка ${issues.length} задач...`,
          });

          const tasks = issues.map((issue) =>
            this.mapYouTrackIssueToTask(issue)
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
   * Построение строки запроса для фильтрации задач
   */
  private buildQuery(): string {
    const parts: string[] = [];

    if (this.config?.projectId) {
      parts.push(`project: ${this.config.projectId}`);
    }

    if (this.config?.query) {
      parts.push(this.config.query);
    }

    return parts.length > 0 ? parts.join(" ") : "";
  }

  /**
   * Построение списка полей для запроса
   */
  private buildFieldsQuery(): string {
    return [
      "id",
      "idReadable",
      "summary",
      "description",
      "created",
      "updated",
      "customFields(id,name,value(name,text,isResolved))",
      "reporter(login,fullName)",
    ].join(",");
  }

  /**
   * Преобразование задачи YouTrack в локальный формат Task
   */
  private mapYouTrackIssueToTask(issue: YouTrackIssue): Task {
    return {
      id: `youtrack-${issue.idReadable}`,
      title: `[${issue.idReadable}] ${issue.summary}`,
      description: issue.description || undefined,
      status: this.mapStatus(issue.customFields),
      priority: this.mapPriority(issue.customFields),
      category: this.extractCategory(issue.customFields),
      tag: issue.idReadable,
      createdAt: new Date(issue.created),
      updatedAt: new Date(issue.updated),
      assignee: issue.reporter?.fullName || issue.reporter?.login,
    };
  }

  /**
   * Извлечение и маппинг статуса задачи
   */
  private mapStatus(customFields?: YouTrackCustomField[]): TaskStatus {
    const stateField = customFields?.find(
      (field) =>
        field.name.toLowerCase() === "state" ||
        field.name.toLowerCase() === "статус"
    );

    if (!stateField?.value?.name) {
      return TaskStatus.Pending;
    }

    const stateName = stateField.value.name.toLowerCase();

    if (stateName.includes("в работе") || stateName.includes("in progress")) {
      return TaskStatus.InProgress;
    }

    if (
      stateName.includes("завершен") ||
      stateName.includes("closed") ||
      stateName.includes("done") ||
      stateName.includes("fixed")
    ) {
      return TaskStatus.Completed;
    }

    return TaskStatus.Pending;
  }

  /**
   * Извлечение и маппинг приоритета задачи
   */
  private mapPriority(customFields?: YouTrackCustomField[]): Priority {
    const priorityField = customFields?.find(
      (field) =>
        field.name.toLowerCase() === "priority" ||
        field.name.toLowerCase() === "приоритет"
    );

    if (!priorityField?.value?.name) {
      return Priority.Medium;
    }

    const priorityName = priorityField.value.name.toLowerCase();

    if (
      priorityName.includes("критический") ||
      priorityName.includes("высокий") ||
      priorityName.includes("critical") ||
      priorityName.includes("high")
    ) {
      return Priority.High;
    }

    if (
      priorityName.includes("низкий") ||
      priorityName.includes("minor") ||
      priorityName.includes("low")
    ) {
      return Priority.Low;
    }

    return Priority.Medium;
  }

  /**
   * Извлечение категории из кастомных полей
   */
  private extractCategory(
    customFields?: YouTrackCustomField[]
  ): string | undefined {
    const typeField = customFields?.find(
      (field) =>
        field.name.toLowerCase() === "type" ||
        field.name.toLowerCase() === "тип"
    );

    return typeField?.value?.name;
  }

  /**
   * Обработка ошибок при взаимодействии с API
   */
  private handleError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Ошибка от сервера
        const status = axiosError.response.status;
        let message = "Ошибка при подключении к YouTrack: ";

        switch (status) {
          case 401:
            message += "Неверный токен авторизации. Проверьте настройки.";
            break;
          case 403:
            message += "Доступ запрещён. Проверьте права доступа токена.";
            break;
          case 404:
            message += "API endpoint не найден. Проверьте URL YouTrack.";
            break;
          default:
            message += `HTTP ${status} - ${axiosError.message}`;
        }

        vscode.window.showErrorMessage(message);
        console.error("YouTrack API Error:", axiosError.response.data);
      } else if (axiosError.request) {
        // Запрос был отправлен, но ответа не получено
        vscode.window.showErrorMessage(
          "YouTrack API недоступен. Проверьте подключение к интернету и URL."
        );
        console.error("YouTrack Network Error:", axiosError.message);
      } else {
        // Ошибка при настройке запроса
        vscode.window.showErrorMessage(
          `Ошибка запроса к YouTrack: ${axiosError.message}`
        );
        console.error("YouTrack Request Error:", axiosError.message);
      }
    } else {
      // Неизвестная ошибка
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Неизвестная ошибка при импорте из YouTrack: ${errorMessage}`
      );
      console.error("YouTrack Unknown Error:", error);
    }
  }

  /**
   * Проверка подключения к YouTrack
   */
  public async testConnection(): Promise<boolean> {
    if (!this.axiosInstance || !this.config) {
      throw new Error(
        "YouTrack не инициализирован. Вызовите initialize() сначала."
      );
    }

    try {
      await this.axiosInstance.get("/api/admin/timeTrackingSettings");
      vscode.window.showInformationMessage(
        "✅ Подключение к YouTrack успешно!"
      );
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
}
