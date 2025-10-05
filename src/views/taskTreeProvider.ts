import * as vscode from "vscode";
import { Task, TaskStatus, Priority } from "../models/task";
import { TaskManager } from "../managers/taskManager";

/**
 * Элемент дерева задач
 */
export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    private taskManager: TaskManager
  ) {
    super(task.title, collapsibleState);

    this.tooltip = this.createTooltip();
    this.description = this.createDescription();
    this.iconPath = this.getIcon();
    this.contextValue = "task";
    this.command = {
      command: "taskflow.showTaskDetails",
      title: "Показать детали задачи",
      arguments: [task],
    };
  }

  private createTooltip(): string {
    const progress = this.taskManager.calculateTaskProgress(this.task);
    let tooltip = `${this.task.title}\n\n`;

    tooltip += `Статус: ${this.task.status}\n`;
    tooltip += `Приоритет: ${this.task.priority}\n`;

    if (this.task.category) {
      tooltip += `Категория: ${this.task.category}\n`;
    }

    if (
      this.task.queuePosition !== undefined &&
      this.task.queuePosition !== null
    ) {
      tooltip += `Позиция в очереди: ${this.task.queuePosition}\n`;
    }

    if (this.task.dueDate) {
      tooltip += `Срок: ${this.task.dueDate.toLocaleDateString("ru-RU")}\n`;
    }

    if (this.task.assignee) {
      tooltip += `Исполнитель: @${this.task.assignee}\n`;
    }

    if (this.task.subtasks && this.task.subtasks.length > 0) {
      tooltip += `\nПрогресс: ${progress.completed}/${progress.total} (${progress.percentage}%)\n`;
    }

    if (this.task.description) {
      tooltip += `\nОписание:\n${this.task.description}`;
    }

    return tooltip;
  }

  private createDescription(): string {
    const parts: string[] = [];

    // Позиция в очереди
    if (
      this.task.queuePosition !== undefined &&
      this.task.queuePosition !== null
    ) {
      parts.push(`📋 #${this.task.queuePosition}`);
    }

    // Прогресс подзадач
    if (this.task.subtasks && this.task.subtasks.length > 0) {
      const progress = this.taskManager.calculateTaskProgress(this.task);
      parts.push(`${progress.completed}/${progress.total}`);
    }

    // Приоритет
    if (this.task.priority === Priority.High) {
      parts.push("🔴");
    } else if (this.task.priority === Priority.Low) {
      parts.push("🟢");
    }

    // Срок
    if (this.task.dueDate) {
      const now = new Date();
      const isOverdue =
        this.task.dueDate < now && this.task.status !== TaskStatus.Completed;
      if (isOverdue) {
        parts.push("⚠️ Просрочено");
      } else {
        parts.push(`📅 ${this.task.dueDate.toLocaleDateString("ru-RU")}`);
      }
    }

    return parts.join(" ");
  }

  private getIcon(): vscode.ThemeIcon {
    if (this.task.status === TaskStatus.Completed) {
      return new vscode.ThemeIcon(
        "check",
        new vscode.ThemeColor("testing.iconPassed")
      );
    } else if (this.task.status === TaskStatus.InProgress) {
      return new vscode.ThemeIcon(
        "sync~spin",
        new vscode.ThemeColor("testing.iconQueued")
      );
    } else {
      // Проверка на просроченные задачи
      if (this.task.dueDate && this.task.dueDate < new Date()) {
        return new vscode.ThemeIcon(
          "circle-outline",
          new vscode.ThemeColor("testing.iconFailed")
        );
      }

      // Приоритет
      if (this.task.priority === Priority.High) {
        return new vscode.ThemeIcon(
          "circle-outline",
          new vscode.ThemeColor("charts.red")
        );
      } else if (this.task.priority === Priority.Low) {
        return new vscode.ThemeIcon(
          "circle-outline",
          new vscode.ThemeColor("charts.green")
        );
      }

      return new vscode.ThemeIcon("circle-outline");
    }
  }
}

/**
 * Элемент категории в дереве
 */
export class CategoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly category: string,
    public readonly taskCount: number,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(category, collapsibleState);

    this.description = `${taskCount} задач${
      taskCount === 1 ? "а" : taskCount < 5 ? "и" : ""
    }`;
    this.iconPath = new vscode.ThemeIcon("folder");
    this.contextValue = "category";
  }
}

/**
 * Провайдер данных для TreeView задач
 */
export class TaskTreeProvider
  implements vscode.TreeDataProvider<TaskTreeItem | CategoryTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskTreeItem | CategoryTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private groupByCategory = true;
  private filterStatus: TaskStatus | null = null;
  private filterPriority: Priority | null = null;

  constructor(private taskManager: TaskManager) {
    // Подписка на изменения задач
    taskManager.onTasksChanged(() => {
      this.refresh();
    });
  }

  /**
   * Обновление дерева
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Получение элемента дерева
   */
  getTreeItem(element: TaskTreeItem | CategoryTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Получение дочерних элементов
   */
  getChildren(
    element?: TaskTreeItem | CategoryTreeItem
  ): Thenable<(TaskTreeItem | CategoryTreeItem)[]> {
    if (!element) {
      // Корневой уровень
      if (this.groupByCategory) {
        return Promise.resolve(this.getCategoryItems());
      } else {
        return Promise.resolve(this.getTaskItems());
      }
    } else if (element instanceof CategoryTreeItem) {
      // Задачи в категории
      return Promise.resolve(this.getTaskItemsForCategory(element.category));
    } else if (
      element instanceof TaskTreeItem &&
      element.task.subtasks &&
      element.task.subtasks.length > 0
    ) {
      // Подзадачи
      return Promise.resolve([]);
    }

    return Promise.resolve([]);
  }

  /**
   * Получение категорий
   */
  private getCategoryItems(): CategoryTreeItem[] {
    const categories = this.taskManager.getCategories();
    const items: CategoryTreeItem[] = [];

    for (const category of categories) {
      const tasks = this.getFilteredTasks().filter(
        (t) => t.category === category
      );
      if (tasks.length > 0) {
        items.push(
          new CategoryTreeItem(
            category,
            tasks.length,
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }
    }

    // Задачи без категории
    const uncategorizedTasks = this.getFilteredTasks().filter(
      (t) => !t.category
    );
    if (uncategorizedTasks.length > 0) {
      items.push(
        new CategoryTreeItem(
          "Без категории",
          uncategorizedTasks.length,
          vscode.TreeItemCollapsibleState.Expanded
        )
      );
    }

    return items;
  }

  /**
   * Получение задач для категории
   */
  private getTaskItemsForCategory(category: string): TaskTreeItem[] {
    const tasks =
      category === "Без категории"
        ? this.getFilteredTasks().filter((t) => !t.category)
        : this.getFilteredTasks().filter((t) => t.category === category);

    return this.sortTasks(tasks).map(
      (task) =>
        new TaskTreeItem(
          task,
          task.subtasks && task.subtasks.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          this.taskManager
        )
    );
  }

  /**
   * Получение всех задач (без группировки)
   */
  private getTaskItems(): TaskTreeItem[] {
    const tasks = this.getFilteredTasks();
    return this.sortTasks(tasks).map(
      (task) =>
        new TaskTreeItem(
          task,
          task.subtasks && task.subtasks.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          this.taskManager
        )
    );
  }

  /**
   * Получение отфильтрованных задач
   */
  private getFilteredTasks(): Task[] {
    let tasks = this.taskManager.getTasks();

    // Фильтр по конфигурации
    const showCompleted = vscode.workspace
      .getConfiguration("taskflow")
      .get<boolean>("showCompletedTasks", true);
    if (!showCompleted) {
      tasks = tasks.filter((t) => t.status !== TaskStatus.Completed);
    }

    // Фильтр по статусу
    if (this.filterStatus) {
      tasks = tasks.filter((t) => t.status === this.filterStatus);
    }

    // Фильтр по приоритету
    if (this.filterPriority) {
      tasks = tasks.filter((t) => t.priority === this.filterPriority);
    }

    return tasks;
  }

  /**
   * Сортировка задач
   */
  private sortTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      // Сначала незавершенные
      if (a.status !== b.status) {
        return a.status === TaskStatus.Completed ? 1 : -1;
      }

      // Затем по приоритету
      const priorityOrder = {
        [Priority.High]: 0,
        [Priority.Medium]: 1,
        [Priority.Low]: 2,
      };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // Затем по сроку (просроченные первыми)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) {
        return -1;
      }
      if (b.dueDate) {
        return 1;
      }

      // Затем по дате создания
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Установка группировки по категориям
   */
  public setGroupByCategory(value: boolean): void {
    this.groupByCategory = value;
    this.refresh();
  }

  /**
   * Установка фильтра по статусу
   */
  public setFilterStatus(status: TaskStatus | null): void {
    this.filterStatus = status;
    this.refresh();
  }

  /**
   * Установка фильтра по приоритету
   */
  public setFilterPriority(priority: Priority | null): void {
    this.filterPriority = priority;
    this.refresh();
  }
}
