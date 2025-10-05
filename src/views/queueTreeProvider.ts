import * as vscode from "vscode";
import { Task, TaskStatus } from "../models/task";
import { TaskManager } from "../managers/taskManager";
import { TaskTreeItem } from "./taskTreeProvider";

/**
 * Провайдер дерева для очереди задач
 */
export class QueueTreeProvider
  implements vscode.TreeDataProvider<TaskTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskTreeItem | undefined | null | void
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
  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Получение дочерних элементов
   */
  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    if (!element) {
      // Корневой уровень - показываем задачи в очереди
      return this.getQueuedTaskItems();
    }

    // Дочерние элементы (подзадачи)
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

    return [];
  }

  /**
   * Получение задач из очереди как элементов дерева
   */
  private getQueuedTaskItems(): TaskTreeItem[] {
    const queuedTasks = this.taskManager.getQueuedTasks();

    if (queuedTasks.length === 0) {
      return [];
    }

    return queuedTasks.map((task) => {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      const collapsibleState = hasSubtasks
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

      return new TaskTreeItem(task, collapsibleState, this.taskManager);
    });
  }
}
