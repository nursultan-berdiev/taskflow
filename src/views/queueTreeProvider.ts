import * as vscode from "vscode";
import { TaskStatus } from "../models/task";
import { TaskManager } from "../managers/taskManager";
import { TaskTreeItem } from "./taskTreeProvider";

/**
 * Провайдер дерева для очереди задач с поддержкой Drag & Drop
 */
export class QueueTreeProvider
  implements
    vscode.TreeDataProvider<TaskTreeItem>,
    vscode.TreeDragAndDropController<TaskTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Настройка Drag & Drop - принимаем задачи из другой панели
  dropMimeTypes = ["application/vnd.code.tree.taskflow"];
  dragMimeTypes = ["application/vnd.code.tree.taskflow"];

  constructor(private taskManager: TaskManager) {
    // Подписка на изменения задач
    this.taskManager.onTasksChanged(() => {
      this.refresh();
    });
  }

  /**
   * Обработка начала перетаскивания (из очереди)
   */
  public async handleDrag(
    source: readonly TaskTreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const taskIds = source.map((item) => item.task.id);
    dataTransfer.set(
      "application/vnd.code.tree.taskflow",
      new vscode.DataTransferItem(taskIds)
    );
  }

  /**
   * Обработка drop - добавление задачи в очередь или изменение порядка
   */
  public async handleDrop(
    target: TaskTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const transferItem = dataTransfer.get("application/vnd.code.tree.taskflow");
    if (!transferItem) {
      return;
    }

    const taskIds = transferItem.value as string[];
    if (!taskIds || taskIds.length === 0) {
      return;
    }

    // Обработка перемещения только одной задачи за раз
    if (taskIds.length > 1) {
      vscode.window.showWarningMessage(
        "Перемещение нескольких задач одновременно не поддерживается"
      );
      return;
    }

    const taskId = taskIds[0];
    const draggedTask = this.taskManager.getTaskById(taskId);

    if (!draggedTask) {
      return;
    }

    // Сценарий 1: Задача уже в очереди - изменяем порядок
    if (
      draggedTask.queuePosition !== null &&
      draggedTask.queuePosition !== undefined
    ) {
      const queuedTasks = this.taskManager.getQueuedTasks();
      let newPosition: number;

      if (
        target &&
        target.task.queuePosition !== null &&
        target.task.queuePosition !== undefined
      ) {
        // Бросили на конкретную задачу - вставляем перед ней
        newPosition = target.task.queuePosition;
      } else {
        // Бросили в пустое место - добавляем в конец
        newPosition = queuedTasks.length;
      }

      try {
        await this.taskManager.moveInQueue(taskId, newPosition);
        vscode.window.showInformationMessage(
          `✅ Задача "${draggedTask.title}" перемещена на позицию ${newPosition}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Не удалось переместить задачу: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return;
    }

    // Сценарий 2: Задача не в очереди - добавляем в очередь
    if (
      draggedTask.queuePosition === null ||
      draggedTask.queuePosition === undefined
    ) {
      try {
        await this.taskManager.addToQueue(taskId);
        vscode.window.showInformationMessage(
          `✅ Задача "${draggedTask.title}" добавлена в очередь`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Не удалось добавить задачу в очередь: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
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
