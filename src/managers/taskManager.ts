import * as vscode from "vscode";
import * as path from "path";
import { Task, Priority, TaskStatus, ProgressStats } from "../models/task";
import { MarkdownParser } from "../parsers/markdownParser";
import { JsonStorage } from "../storage/jsonStorage";
import { v4 as uuidv4 } from "uuid";

/**
 * Менеджер для управления задачами
 * Использует гибридный подход:
 * - JSON файл (.task_flow_state.json) как источник правды
 * - Markdown файл (.md) генерируется автоматически для чтения
 * - Map<ID, Task> для быстрого доступа O(1)
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private parser: MarkdownParser;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private jsonFilePath: string | undefined;
  private markdownFilePath: string | undefined;
  private isSavingInternally: boolean = false;

  private readonly _onTasksChanged = new vscode.EventEmitter<Task[]>();
  public readonly onTasksChanged = this._onTasksChanged.event;

  constructor(private context: vscode.ExtensionContext) {
    this.parser = new MarkdownParser();
  }

  /**
   * Инициализация менеджера задач
   */
  public async initialize(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage(
        "Откройте рабочую область для использования TaskFlow"
      );
      return;
    }

    const tasksFileName = vscode.workspace
      .getConfiguration("taskflow")
      .get<string>("tasksFile", ".github/.task_flow/tasks.md");

    // Пути к файлам
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const dirPath = path.dirname(path.join(workspacePath, tasksFileName));

    this.jsonFilePath = path.join(dirPath, ".task_flow_state.json");
    this.markdownFilePath = path.join(workspacePath, tasksFileName);

    // Загрузка задач из JSON файла
    await this.loadTasks();

    // Настройка наблюдателя за JSON файлом
    this.setupFileWatcher();
  }

  /**
   * Создание файла tasks.md, если он не существует
   */
  public async initializeTasksFile(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage(
        "Откройте рабочую область для инициализации задач"
      );
      return;
    }

    const tasksFileName = vscode.workspace
      .getConfiguration("taskflow")
      .get<string>("tasksFile", ".github/.task_flow/tasks.md");
    const tasksFilePath = path.join(
      workspaceFolders[0].uri.fsPath,
      tasksFileName
    );
    const uri = vscode.Uri.file(tasksFilePath);

    // Создание папки .github/.task_flow если её нет
    const dirPath = path.dirname(tasksFilePath);
    const dirUri = vscode.Uri.file(dirPath);

    try {
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      // Создаем директорию если не существует
      await vscode.workspace.fs.createDirectory(dirUri);
    }

    try {
      // Проверка существования файла
      await vscode.workspace.fs.stat(uri);
      vscode.window.showInformationMessage(
        `Файл ${tasksFileName} уже существует`
      );
    } catch {
      // Создание нового файла с шаблоном
      const template = `# Задачи

## Начало работы

- [ ] Создайте свою первую задачу [Высокий]
  Используйте палитру команд (Ctrl+Shift+P) и выберите "TaskFlow: Добавить новую задачу"
  
- [ ] Изучите возможности TaskFlow
  - [ ] Попробуйте отметить задачу как выполненную
  - [ ] Добавьте новую категорию
  - [ ] Используйте интеграцию с Copilot

## Примеры

- [ ] Пример задачи с высоким приоритетом [Высокий] Срок: 2025-12-31
  Это описание задачи. Вы можете добавить любые детали здесь.
  
- [x] Пример завершенной задачи [Средний]
  Завершенные задачи отмечены галочкой.
`;

      await vscode.workspace.fs.writeFile(uri, Buffer.from(template, "utf8"));
      vscode.window.showInformationMessage(
        `Файл ${tasksFileName} успешно создан!`
      );

      // Открыть файл
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);

      // Загрузить задачи
      await this.loadTasks();
    }
  }

  /**
   * Загрузка задач из JSON файла
   */
  private async loadTasks(): Promise<void> {
    if (!this.jsonFilePath) {
      return;
    }

    try {
      // Загрузить задачи из JSON (источник правды)
      this.tasks = await JsonStorage.loadTasks(this.jsonFilePath);
      this._onTasksChanged.fire(Array.from(this.tasks.values()));

      // Если JSON файл существует, синхронизировать Markdown
      if (this.tasks.size > 0) {
        await this.generateMarkdown();
      }
    } catch (error) {
      console.log("Ошибка загрузки задач из JSON:", error);
      this.tasks = new Map<string, Task>();
    }
  }

  /**
   * Сохранение задач в файлы
   */
  public async saveTasks(): Promise<void> {
    if (!this.jsonFilePath) {
      return;
    }

    const autoSave = vscode.workspace
      .getConfiguration("taskflow")
      .get<boolean>("autoSave", true);
    if (!autoSave) {
      return;
    }

    try {
      // Установить флаг, чтобы FileWatcher не перезагружал задачи
      this.isSavingInternally = true;

      // 1. Сохранить в JSON (источник правды)
      await JsonStorage.saveTasks(this.jsonFilePath, this.tasks);

      // 2. Сгенерировать Markdown для чтения человеком
      await this.generateMarkdown();

      // Подождать немного, чтобы FileWatcher успел среагировать и быть проигнорированным
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      vscode.window.showErrorMessage(`Ошибка при сохранении задач: ${error}`);
    } finally {
      this.isSavingInternally = false;
    }
  }

  /**
   * Генерация Markdown файла из задач (для чтения человеком)
   */
  private async generateMarkdown(): Promise<void> {
    if (!this.markdownFilePath) {
      return;
    }

    try {
      const tasksArray = Array.from(this.tasks.values());
      const markdown = this.parser.convertTasksToMarkdown(tasksArray);
      const uri = vscode.Uri.file(this.markdownFilePath);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, "utf8"));
    } catch (error) {
      console.error("Ошибка генерации Markdown:", error);
    }
  }

  /**
   * Настройка наблюдателя за JSON файлом задач
   * FileWatcher следит только за внешними изменениями
   */
  private setupFileWatcher(): void {
    if (!this.jsonFilePath) {
      return;
    }

    const pattern = new vscode.RelativePattern(
      path.dirname(this.jsonFilePath),
      path.basename(this.jsonFilePath)
    );

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.fileWatcher.onDidChange(async () => {
      // Игнорировать изменения, которые мы сами делаем
      if (this.isSavingInternally) {
        return;
      }

      // Загрузить задачи только при внешних изменениях
      await this.loadTasks();
    });

    this.fileWatcher.onDidDelete(() => {
      this.tasks.clear();
      this._onTasksChanged.fire([]);
    });
  }

  /**
   * Получение всех задач как массива
   */
  public getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Получение задачи по ID (O(1) - мгновенно!)
   */
  public getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Добавление новой задачи
   */
  public async addTask(
    task: Omit<Task, "id" | "createdAt" | "updatedAt">
  ): Promise<Task> {
    const now = new Date();
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(newTask.id, newTask);
    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));

    return newTask;
  }

  /**
   * Обновление задачи
   */
  public async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      id: task.id, // ID не изменяется
      createdAt: task.createdAt, // Дата создания не изменяется
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));
  }

  /**
   * Удаление задачи
   */
  public async deleteTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }

    this.tasks.delete(id);
    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));
  }

  /**
   * Переключение статуса задачи
   */
  public async toggleTask(id: string): Promise<void> {
    const task = this.getTaskById(id);
    if (!task) {
      throw new Error(`Задача с ID ${id} не найдена`);
    }

    const newStatus =
      task.status === TaskStatus.Completed
        ? TaskStatus.Pending
        : TaskStatus.Completed;

    await this.updateTask(id, { status: newStatus });
  }

  /**
   * Получение задач по категории
   */
  public getTasksByCategory(category: string): Task[] {
    const tasks: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.category === category) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Получение всех категорий
   */
  public getCategories(): string[] {
    const categories = new Set<string>();
    for (const task of this.tasks.values()) {
      if (task.category) {
        categories.add(task.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Получение задач по приоритету
   */
  public getTasksByPriority(priority: Priority): Task[] {
    const tasks: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.priority === priority) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Получение задач по статусу
   */
  public getTasksByStatus(status: TaskStatus): Task[] {
    const tasks: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.status === status) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Получение просроченных задач
   */
  public getOverdueTasks(): Task[] {
    const now = new Date();
    const tasks: Task[] = [];
    for (const task of this.tasks.values()) {
      if (
        task.dueDate &&
        task.dueDate < now &&
        task.status !== TaskStatus.Completed
      ) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Вычисление прогресса по всем задачам
   */
  public calculateProgress(): ProgressStats {
    const total = this.tasks.size;
    let completed = 0;
    for (const task of this.tasks.values()) {
      if (task.status === TaskStatus.Completed) {
        completed++;
      }
    }
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      percentage,
    };
  }

  /**
   * Вычисление прогресса для конкретной задачи (по подзадачам)
   */
  public calculateTaskProgress(task: Task): ProgressStats {
    if (!task.subtasks || task.subtasks.length === 0) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        percentage: task.status === TaskStatus.Completed ? 100 : 0,
      };
    }

    const total = task.subtasks.length;
    const completed = task.subtasks.filter((st) => st.completed).length;
    const pending = total - completed;
    const percentage = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      pending,
      percentage,
    };
  }

  /**
   * Получение задач в очереди, отсортированных по позиции
   */
  public getQueuedTasks(): Task[] {
    const queuedTasks: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.queuePosition !== undefined && task.queuePosition !== null) {
        queuedTasks.push(task);
      }
    }
    return queuedTasks.sort(
      (a, b) => (a.queuePosition || 0) - (b.queuePosition || 0)
    );
  }

  /**
   * Добавление задачи в очередь
   */
  public async addToQueue(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Задача не найдена");
    }

    if (task.queuePosition !== undefined && task.queuePosition !== null) {
      vscode.window.showInformationMessage("Задача уже в очереди");
      return;
    }

    // Добавляем задачу в очередь с временной позицией
    const updatedTask: Task = {
      ...task,
      queuePosition: 0, // Временное значение, будет пересчитано
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, updatedTask);

    // Пересортировываем всю очередь по приоритету
    await this.reorderQueueByPriority();

    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));
  }

  /**
   * Пересортировка очереди по приоритету
   * Порядок: Высокий -> Средний -> Низкий
   * При одинаковом приоритете сохраняется текущий порядок
   */
  private async reorderQueueByPriority(): Promise<void> {
    const queuedTasks = Array.from(this.tasks.values()).filter(
      (task) => task.queuePosition !== undefined && task.queuePosition !== null
    );

    // Сортируем по приоритету (Высокий = 0, Средний = 1, Низкий = 2)
    // При одинаковом приоритете сохраняем текущий порядок (стабильная сортировка)
    const priorityOrder = {
      [Priority.High]: 0,
      [Priority.Medium]: 1,
      [Priority.Low]: 2,
    };

    queuedTasks.sort((a, b) => {
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // При одинаковом приоритете сохраняем старый порядок
      return (a.queuePosition || 0) - (b.queuePosition || 0);
    });

    // Переназначаем позиции в очереди
    queuedTasks.forEach((task, index) => {
      const updatedTask: Task = {
        ...task,
        queuePosition: index + 1,
        updatedAt: new Date(),
      };
      this.tasks.set(task.id, updatedTask);
    });
  }

  /**
   * Удаление задачи из очереди
   */
  public async removeFromQueue(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Задача не найдена");
    }

    if (task.queuePosition === undefined || task.queuePosition === null) {
      vscode.window.showInformationMessage("Задача не находится в очереди");
      return;
    }

    const oldPosition = task.queuePosition;
    const updatedTask: Task = {
      ...task,
      queuePosition: undefined,
      updatedAt: new Date(),
    };
    this.tasks.set(taskId, updatedTask);

    // Сдвинуть все задачи после удалённой
    for (const [id, t] of this.tasks.entries()) {
      if (t.queuePosition && t.queuePosition > oldPosition) {
        this.tasks.set(id, {
          ...t,
          queuePosition: t.queuePosition - 1,
        });
      }
    }

    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));
  }

  /**
   * Перемещение задачи в очереди
   */
  public async moveInQueue(taskId: string, newPosition: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (
      !task ||
      task.queuePosition === undefined ||
      task.queuePosition === null
    ) {
      throw new Error("Задача не найдена в очереди");
    }

    const queuedTasks = this.getQueuedTasks();
    if (newPosition < 1 || newPosition > queuedTasks.length) {
      throw new Error("Неверная позиция в очереди");
    }

    const oldPosition = task.queuePosition;

    if (oldPosition === newPosition) {
      return;
    }

    // Обновить позиции задач между старой и новой позицией
    for (const [id, t] of this.tasks.entries()) {
      if (t.queuePosition === undefined || t.queuePosition === null) {
        continue;
      }

      let newPos = t.queuePosition;

      if (oldPosition < newPosition) {
        // Перемещение вниз
        if (t.queuePosition > oldPosition && t.queuePosition <= newPosition) {
          newPos--;
        }
      } else {
        // Перемещение вверх
        if (t.queuePosition >= newPosition && t.queuePosition < oldPosition) {
          newPos++;
        }
      }

      if (newPos !== t.queuePosition) {
        this.tasks.set(id, {
          ...t,
          queuePosition: newPos,
        });
      }
    }

    // Установить новую позицию для перемещаемой задачи
    this.tasks.set(taskId, {
      ...task,
      queuePosition: newPosition,
      updatedAt: new Date(),
    });

    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));
  }

  /**
   * Начать следующую задачу из очереди
   */
  public async startNextInQueue(): Promise<Task | null> {
    const queuedTasks = this.getQueuedTasks();

    if (queuedTasks.length === 0) {
      vscode.window.showInformationMessage("Очередь задач пуста");
      return null;
    }

    // Найти первую задачу, которая не в процессе
    const nextTask = queuedTasks.find(
      (t) => t.status !== TaskStatus.InProgress
    );

    if (!nextTask) {
      vscode.window.showInformationMessage(
        "Все задачи в очереди уже в процессе выполнения"
      );
      return null;
    }

    // Обновить статус на "в процессе"
    const updatedTask: Task = {
      ...nextTask,
      status: TaskStatus.InProgress,
      updatedAt: new Date(),
    };

    this.tasks.set(nextTask.id, updatedTask);
    await this.saveTasks();
    this._onTasksChanged.fire(Array.from(this.tasks.values()));

    return updatedTask;
  }

  /**
   * Завершить текущую задачу и начать следующую
   */
  public async completeAndStartNext(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Задача не найдена");
    }

    // Завершить текущую задачу
    const completedTask: Task = {
      ...task,
      status: TaskStatus.Completed,
      updatedAt: new Date(),
    };
    this.tasks.set(taskId, completedTask);

    // Удалить из очереди
    if (task.queuePosition !== undefined && task.queuePosition !== null) {
      await this.removeFromQueue(taskId);
    }

    // Начать следующую
    return await this.startNextInQueue();
  }

  /**
   * Очистка ресурсов
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
    this._onTasksChanged.dispose();
  }
}
