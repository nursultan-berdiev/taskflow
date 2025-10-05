import * as vscode from "vscode";
import { Task } from "../models/task";

/**
 * Структура JSON файла с задачами
 */
interface TasksData {
  version: number;
  lastModified: string;
  tasks: Task[];
}

/**
 * Класс для работы с JSON хранилищем задач
 */
export class JsonStorage {
  private static readonly STORAGE_VERSION = 1;

  /**
   * Сохранить задачи в JSON файл
   */
  public static async saveTasks(
    filePath: string,
    tasks: Map<string, Task>
  ): Promise<void> {
    const data: TasksData = {
      version: this.STORAGE_VERSION,
      lastModified: new Date().toISOString(),
      tasks: Array.from(tasks.values()),
    };

    const json = JSON.stringify(data, null, 2);
    const uri = vscode.Uri.file(filePath);

    try {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(json, "utf8"));
    } catch (error) {
      throw new Error(`Ошибка при сохранении задач в JSON: ${error}`);
    }
  }

  /**
   * Загрузить задачи из JSON файла
   */
  public static async loadTasks(filePath: string): Promise<Map<string, Task>> {
    const uri = vscode.Uri.file(filePath);
    const tasks = new Map<string, Task>();

    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const json = Buffer.from(content).toString("utf8");
      const data: TasksData = JSON.parse(json);

      // Проверка версии
      if (data.version !== this.STORAGE_VERSION) {
        console.warn(
          `Версия хранилища ${data.version} не соответствует текущей ${this.STORAGE_VERSION}`
        );
      }

      // Преобразовать массив в Map
      for (const task of data.tasks) {
        // Преобразовать строковые даты обратно в Date объекты
        tasks.set(task.id, {
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        });
      }

      return tasks;
    } catch (error) {
      // Файл не существует или поврежден
      console.log("JSON файл не найден или поврежден, возвращаем пустую Map");
      return new Map<string, Task>();
    }
  }

  /**
   * Проверить существование JSON файла
   */
  public static async exists(filePath: string): Promise<boolean> {
    const uri = vscode.Uri.file(filePath);
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить информацию о последнем изменении
   */
  public static async getLastModified(filePath: string): Promise<Date | null> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const json = Buffer.from(content).toString("utf8");
      const data: TasksData = JSON.parse(json);
      return new Date(data.lastModified);
    } catch {
      return null;
    }
  }
}
