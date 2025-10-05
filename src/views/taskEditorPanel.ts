import * as vscode from "vscode";
import { Task, TaskStatus, Priority } from "../models/task";
import { TaskManager } from "../managers/taskManager";
import { InstructionManager } from "../managers/instructionManager";

/**
 * WebView панель для редактирования задач
 */
export class TaskEditorPanel {
  private static currentPanel: TaskEditorPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private task: Task;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly taskManager: TaskManager,
    private readonly instructionManager: InstructionManager,
    task: Task
  ) {
    this.task = task;
    this.panel = panel;
    this.panel.webview.html = this.getWebviewContent();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "save":
            await this.saveTask(message.data);
            break;
          case "cancel":
            this.panel.dispose();
            break;
          case "loadInstructions":
            await this.sendInstructions();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Создание или показ панели редактирования
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    taskManager: TaskManager,
    instructionManager: InstructionManager,
    task: Task
  ): void {
    const column = vscode.ViewColumn.One;

    // Если панель уже открыта, обновляем её содержимое
    if (TaskEditorPanel.currentPanel) {
      TaskEditorPanel.currentPanel.task = task;
      TaskEditorPanel.currentPanel.panel.webview.html =
        TaskEditorPanel.currentPanel.getWebviewContent();
      TaskEditorPanel.currentPanel.panel.reveal(column);
      return;
    }

    // Создаём новую панель
    const panel = vscode.window.createWebviewPanel(
      "taskflowEditor",
      `Редактирование: ${task.title}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    TaskEditorPanel.currentPanel = new TaskEditorPanel(
      panel,
      taskManager,
      instructionManager,
      task
    );
  }

  /**
   * Сохранение изменений задачи
   */
  private async saveTask(data: Partial<Task>): Promise<void> {
    try {
      const updates: Partial<Task> = {
        title: data.title,
        description: data.description,
        status: data.status as TaskStatus,
        priority: data.priority as Priority,
        category: data.category,
        assignee: data.assignee,
        instructionId: data.instructionId,
        executionDuration: data.executionDuration,
      };

      // Обработка даты
      if (data.dueDate) {
        updates.dueDate = new Date(data.dueDate);
      }

      // Обработка подзадач
      if (data.subtasks) {
        updates.subtasks = data.subtasks;
      }

      await this.taskManager.updateTask(this.task.id, updates);

      vscode.window.showInformationMessage(
        `Задача "${updates.title}" успешно обновлена`
      );

      this.panel.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Ошибка сохранения задачи: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Отправка списка инструкций в WebView
   */
  private async sendInstructions(): Promise<void> {
    const instructions = this.instructionManager.getAllInstructions();
    const instructionsData = instructions.map(
      (inst: { id: string; name: string }) => ({
        id: inst.id,
        name: inst.name,
      })
    );

    this.panel.webview.postMessage({
      command: "instructionsLoaded",
      data: instructionsData,
    });
  }

  /**
   * Генерация HTML содержимого для WebView
   */
  private getWebviewContent(): string {
    const task = this.task;
    const dueDateValue = task.dueDate
      ? task.dueDate.toISOString().split("T")[0]
      : "";

    const subtasksHtml = (task.subtasks || [])
      .map(
        (subtask, index) => `
      <div class="subtask-item" data-index="${index}">
        <input type="checkbox" 
               id="subtask-${index}" 
               ${subtask.completed ? "checked" : ""}
               onchange="toggleSubtask(${index})">
        <input type="text" 
               value="${this.escapeHtml(subtask.title)}"
               onchange="updateSubtaskTitle(${index}, this.value)">
        <button type="button" onclick="removeSubtask(${index})" class="btn-remove">✕</button>
      </div>
    `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Редактирование задачи</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 30px;
      color: var(--vscode-foreground);
      font-size: 24px;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    input[type="text"],
    input[type="date"],
    input[type="number"],
    select,
    textarea {
      width: 100%;
      padding: 8px 12px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    input[type="text"]:focus,
    input[type="date"]:focus,
    input[type="number"]:focus,
    select:focus,
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }

    textarea {
      min-height: 120px;
      resize: vertical;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .subtasks-section {
      margin-top: 10px;
      padding: 15px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    .subtask-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding: 8px;
      background-color: var(--vscode-input-background);
      border-radius: 4px;
    }

    .subtask-item input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .subtask-item input[type="text"] {
      flex: 1;
      margin-bottom: 0;
    }

    .btn-remove {
      padding: 4px 8px;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 16px;
    }

    .btn-remove:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .btn-add-subtask {
      margin-top: 10px;
      padding: 8px 16px;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-add-subtask:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .actions {
      display: flex;
      gap: 15px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    button[type="submit"],
    button[type="button"] {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    button[type="submit"] {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    button[type="submit"]:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    button[type="button"] {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button[type="button"]:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .info-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✏️ Редактирование задачи</h1>
    
    <form id="taskForm">
      <div class="form-group">
        <label for="title">Название задачи *</label>
        <input type="text" id="title" name="title" value="${this.escapeHtml(
          task.title
        )}" required>
      </div>

      <div class="form-group">
        <label for="description">Описание</label>
        <textarea id="description" name="description">${this.escapeHtml(
          task.description || ""
        )}</textarea>
      </div>

      <div class="row">
        <div class="form-group">
          <label for="status">Статус</label>
          <select id="status" name="status">
            <option value="${TaskStatus.Pending}" ${
      task.status === TaskStatus.Pending ? "selected" : ""
    }>Ожидает</option>
            <option value="${TaskStatus.InProgress}" ${
      task.status === TaskStatus.InProgress ? "selected" : ""
    }>В процессе</option>
            <option value="${TaskStatus.Completed}" ${
      task.status === TaskStatus.Completed ? "selected" : ""
    }>Завершено</option>
          </select>
        </div>

        <div class="form-group">
          <label for="priority">Приоритет</label>
          <select id="priority" name="priority">
            <option value="${Priority.High}" ${
      task.priority === Priority.High ? "selected" : ""
    }>Высокий</option>
            <option value="${Priority.Medium}" ${
      task.priority === Priority.Medium ? "selected" : ""
    }>Средний</option>
            <option value="${Priority.Low}" ${
      task.priority === Priority.Low ? "selected" : ""
    }>Низкий</option>
          </select>
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label for="category">Категория</label>
          <input type="text" id="category" name="category" value="${this.escapeHtml(
            task.category || ""
          )}">
        </div>

        <div class="form-group">
          <label for="dueDate">Срок выполнения</label>
          <input type="date" id="dueDate" name="dueDate" value="${dueDateValue}">
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label for="assignee">Исполнитель</label>
          <input type="text" id="assignee" name="assignee" value="${this.escapeHtml(
            task.assignee || ""
          )}" placeholder="@username">
        </div>

        <div class="form-group">
          <label for="instructionId">Инструкция Copilot</label>
          <select id="instructionId" name="instructionId">
            <option value="">По умолчанию</option>
          </select>
          <p class="info-text">Будет загружена автоматически</p>
        </div>
      </div>

      <div class="form-group">
        <label for="executionDuration">⏱️ Время выполнения (минуты)</label>
        <input type="number" 
               id="executionDuration" 
               name="executionDuration" 
               value="${task.executionDuration || ""}"
               min="1" 
               max="480"
               placeholder="30 (оставьте пустым для значения по умолчанию)">
        <p class="info-text">Для автоматического режима выполнения. Если не указано, используется значение из настроек (по умолчанию 30 минут).</p>
      </div>

      <div class="form-group">
        <label>Подзадачи</label>
        <div class="subtasks-section">
          <div id="subtasksList">
            ${subtasksHtml}
          </div>
          <button type="button" class="btn-add-subtask" onclick="addSubtask()">
            ➕ Добавить подзадачу
          </button>
        </div>
      </div>

      <div class="actions">
        <button type="submit">💾 Сохранить</button>
        <button type="button" onclick="cancel()">❌ Отмена</button>
      </div>
    </form>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let subtasks = ${JSON.stringify(task.subtasks || [])};

    // Загрузка инструкций при инициализации
    window.addEventListener('load', () => {
      vscode.postMessage({ command: 'loadInstructions' });
    });

    // Получение инструкций от расширения
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'instructionsLoaded') {
        const select = document.getElementById('instructionId');
        message.data.forEach(instruction => {
          const option = document.createElement('option');
          option.value = instruction.id;
          option.textContent = instruction.name;
          if (instruction.id === '${task.instructionId || ""}') {
            option.selected = true;
          }
          select.appendChild(option);
        });
      }
    });

    // Обработка отправки формы
    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const executionDurationValue = formData.get('executionDuration');
      const executionDuration = executionDurationValue ? parseInt(executionDurationValue, 10) : undefined;
      
      const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        status: formData.get('status'),
        priority: formData.get('priority'),
        category: formData.get('category'),
        dueDate: formData.get('dueDate') || null,
        assignee: formData.get('assignee'),
        instructionId: formData.get('instructionId') || undefined,
        executionDuration: executionDuration,
        subtasks: subtasks
      };

      vscode.postMessage({ command: 'save', data: data });
    });

    function cancel() {
      vscode.postMessage({ command: 'cancel' });
    }

    function addSubtask() {
      const newSubtask = {
        id: Date.now().toString(),
        title: '',
        completed: false
      };
      subtasks.push(newSubtask);
      renderSubtasks();
    }

    function removeSubtask(index) {
      subtasks.splice(index, 1);
      renderSubtasks();
    }

    function toggleSubtask(index) {
      subtasks[index].completed = !subtasks[index].completed;
    }

    function updateSubtaskTitle(index, title) {
      subtasks[index].title = title;
    }

    function renderSubtasks() {
      const container = document.getElementById('subtasksList');
      container.innerHTML = subtasks.map((subtask, index) => \`
        <div class="subtask-item" data-index="\${index}">
          <input type="checkbox" 
                 id="subtask-\${index}" 
                 \${subtask.completed ? 'checked' : ''}
                 onchange="toggleSubtask(\${index})">
          <input type="text" 
                 value="\${escapeHtml(subtask.title)}"
                 onchange="updateSubtaskTitle(\${index}, this.value)">
          <button type="button" onclick="removeSubtask(\${index})" class="btn-remove">✕</button>
        </div>
      \`).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
  }

  /**
   * Экранирование HTML
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Очистка ресурсов
   */
  private dispose(): void {
    TaskEditorPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
