import * as vscode from "vscode";
import { Task, TaskStatus } from "../models/task";
import { TaskManager } from "../managers/taskManager";
import { TaskTreeItem, CategoryTreeItem } from "./taskTreeProvider";

/**
 * Провайдер дерева для выполненных задач с группировкой по категориям
 */
export class CompletedTasksTreeProvider
  implements vscode.TreeDataProvider<TaskTreeItem | CategoryTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskTreeItem | CategoryTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private taskManager: TaskManager) {
    // Подписка на изменения задач
    this.taskManager.onTasksChanged(() => {
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
  getTreeItem(
    element: TaskTreeItem | CategoryTreeItem
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  /**
   * Получение дочерних элементов
   */
  async getChildren(
    element?: TaskTreeItem | CategoryTreeItem
  ): Promise<(TaskTreeItem | CategoryTreeItem)[]> {
    if (!element) {
      // Корневой уровень - показываем категории с выполненными задачами
      return this.getCategoryItems();
    }

    if (element instanceof CategoryTreeItem) {
      // Дочерние элементы категории - выполненные задачи в этой категории
      return this.getCompletedTaskItemsByCategory(element.category);
    }

    if (element instanceof TaskTreeItem) {
      // Дочерние элементы задачи - подзадачи
      if (element.task.subtasks && element.task.subtasks.length > 0) {
        return element.task.subtasks.map(
          (subtask) =>
            new TaskTreeItem(
              {
                ...element.task,
                id: subtask.id,
                title: subtask.title,
                status: subtask.completed
                  ? TaskStatus.Completed
                  : TaskStatus.Pending,
                subtasks: [],
              },
              vscode.TreeItemCollapsibleState.None,
              this.taskManager
            )
        );
      }
    }

    return [];
  }

  /**
   * Получение категорий с выполненными задачами
   */
  private getCategoryItems(): CategoryTreeItem[] {
    const completedTasks = this.taskManager
      .getTasks()
      .filter((task: Task) => task.status === TaskStatus.Completed);

    if (completedTasks.length === 0) {
      return [];
    }

    // Группировка задач по категориям
    const categories = new Map<string, Task[]>();

    for (const task of completedTasks) {
      const category = task.category || "Без категории";
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(task);
    }

    // Создание элементов категорий
    const categoryItems: CategoryTreeItem[] = [];

    for (const [category, tasks] of categories.entries()) {
      categoryItems.push(
        new CategoryTreeItem(
          category,
          tasks.length,
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    }

    // Сортировка категорий по алфавиту, "Без категории" в конце
    return categoryItems.sort((a, b) => {
      if (a.category === "Без категории") return 1;
      if (b.category === "Без категории") return -1;
      return a.category.localeCompare(b.category, "ru");
    });
  }

  /**
   * Получение выполненных задач определенной категории
   */
  private getCompletedTaskItemsByCategory(category: string): TaskTreeItem[] {
    const completedTasks = this.taskManager.getTasks().filter((task: Task) => {
      const taskCategory = task.category || "Без категории";
      return task.status === TaskStatus.Completed && taskCategory === category;
    });

    return completedTasks.map((task: Task) => {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      const collapsibleState = hasSubtasks
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

      return new TaskTreeItem(task, collapsibleState, this.taskManager);
    });
  }

  /**
   * Получение всех выполненных задач (для статистики)
   */
  public getCompletedTasksCount(): number {
    return this.taskManager
      .getTasks()
      .filter((task: Task) => task.status === TaskStatus.Completed).length;
  }
}
