import * as vscode from "vscode";
import { Task, TaskStatus, Priority, validateTag } from "../models/task";
import { TaskManager } from "../managers/taskManager";
import { InstructionManager } from "../managers/instructionManager";
import { CopilotIntegration } from "../integrations/copilotIntegration";

/**
 * WebView панель для редактирования задач
 */
export class TaskEditorPanel {
  private static currentPanel: TaskEditorPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private task: Task;

  /**
   * Генерация nonce для CSP
   */
  private static getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly taskManager: TaskManager,
    private readonly instructionManager: InstructionManager,
    private readonly copilotIntegration: CopilotIntegration,
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
          case "generateAI":
            await this.handleAIGeneration(
              message.prompt,
              message.currentDescription
            );
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
    copilotIntegration: CopilotIntegration,
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
        localResourceRoots: [
          extensionUri,
          vscode.Uri.joinPath(extensionUri, "node_modules"),
        ],
      }
    );

    TaskEditorPanel.currentPanel = new TaskEditorPanel(
      panel,
      extensionUri,
      taskManager,
      instructionManager,
      copilotIntegration,
      task
    );
  }

  /**
   * Сохранение изменений задачи
   */
  private async saveTask(data: Partial<Task>): Promise<void> {
    try {
      // Валидация тега
      const tagValidation = validateTag(data.tag);
      if (!tagValidation.isValid) {
        vscode.window.showErrorMessage(
          `Ошибка валидации тега: ${tagValidation.error}`
        );
        return;
      }

      const updates: Partial<Task> = {
        title: data.title,
        description: data.description,
        status: data.status as TaskStatus,
        priority: data.priority as Priority,
        category: data.category,
        tag: data.tag?.trim() || undefined, // Сохраняем тег или undefined если пустой
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
   * Обработка генерации описания задачи через AI
   */
  private async handleAIGeneration(
    userPrompt: string,
    currentDescription?: string
  ): Promise<void> {
    if (!userPrompt || userPrompt.trim().length === 0) {
      this.panel.webview.postMessage({
        command: "aiError",
        error: "Промпт не может быть пустым",
      });
      return;
    }

    try {
      const generatedDescription =
        await this.copilotIntegration.generateTaskDescriptionFromPrompt(
          userPrompt,
          currentDescription
        );

      if (generatedDescription) {
        this.panel.webview.postMessage({
          command: "aiGenerated",
          description: generatedDescription,
        });
      } else {
        this.panel.webview.postMessage({
          command: "aiError",
          error: "Не удалось сгенерировать описание. Попробуйте снова.",
        });
      }
    } catch (error) {
      this.panel.webview.postMessage({
        command: "aiError",
        error: `Ошибка при генерации: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }

  /**
   * Генерация HTML содержимого для WebView
   */
  private getWebviewContent(): string {
    const task = this.task;
    const dueDateValue = task.dueDate
      ? task.dueDate.toISOString().split("T")[0]
      : "";

    const webview = this.panel.webview;
    const nonce = TaskEditorPanel.getNonce();
    const easymdeCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "easymde",
        "dist",
        "easymde.min.css"
      )
    );
    const easymdeJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "easymde",
        "dist",
        "easymde.min.js"
      )
    );
    const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} https://cdnjs.cloudflare.com 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} https://cdnjs.cloudflare.com;`;

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

    return (
      `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Редактирование задачи</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="${easymdeCssUri}">
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
      min-height: 200px;
      resize: vertical;
      font-family: "Courier New", Courier, monospace;
      font-size: 14px;
      line-height: 1.6;
    }

    .editor-hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 6px;
      font-style: italic;
    }

    .EasyMDEContainer {
      border-radius: 4px;
      overflow: hidden;
    }

    .EasyMDEContainer .CodeMirror {
      background-color: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      min-height: 260px;
    }

    .EasyMDEContainer .CodeMirror-cursor {
      border-left: 1px solid var(--vscode-editorCursor-foreground, #ffffff);
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

    .actions button[type="submit"],
    .actions button[type="button"] {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    .actions button[type="submit"] {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .actions button[type="submit"]:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .actions button[type="button"] {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .actions button[type="button"]:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .info-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 5px;
    }

    .ai-section {
      padding: 15px;
      background-color: var(--vscode-editor-background);
      border: 2px solid var(--vscode-panel-border);
      border-radius: 6px;
      margin: 20px 0;
    }

    .ai-input-container {
      display: flex;
      gap: 10px;
      align-items: stretch;
    }

    .ai-input-container input[type="text"] {
      flex: 1;
    }

    .btn-ai-generate {
      padding: 8px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .btn-ai-generate:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-ai-generate:active {
      transform: translateY(0);
    }

    .btn-ai-generate:disabled {
      background: var(--vscode-button-secondaryBackground);
      cursor: not-allowed;
      transform: none;
    }

    .ai-status {
      margin-top: 10px;
      padding: 10px;
      border-radius: 4px;
      font-size: 13px;
      display: none;
    }

    .ai-status.loading {
      display: block;
      background-color: var(--vscode-inputValidation-infoBorder);
      color: var(--vscode-foreground);
    }

    .ai-status.success {
      display: block;
      background-color: var(--vscode-inputValidation-infoBackground);
      color: var(--vscode-foreground);
    }

    .ai-status.error {
      display: block;
      background-color: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
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
        <p class="editor-hint">💡 Используйте панель EasyMDE сверху для форматирования Markdown</p>
      </div>

      <div class="form-group ai-section">
        <label for="aiPrompt">🤖 AI Генерация описания</label>
        <div class="ai-input-container">
          <input type="text" 
                 id="aiPrompt" 
                 placeholder="Опишите что нужно сделать, AI сгенерирует техническое задание...">
          <button type="button" class="btn-ai-generate">
            ✨ Генерировать
          </button>
        </div>
        <p class="editor-hint">
          💡 AI проанализирует проект и создаст структурированное техническое задание
        </p>
        <div id="aiStatus" class="ai-status"></div>
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
          <label for="tag">🏷️ Тег</label>
          <input type="text" 
                 id="tag" 
                 name="tag" 
                 value="${this.escapeHtml(task.tag || "")}"
                 maxlength="50"
                 placeholder="например: feature, bugfix"
                 pattern="[a-zA-Zа-яА-ЯёЁ0-9_-]+"
                 title="Только буквы, цифры, дефис и подчеркивание">
          <p class="info-text">Необязательное поле. Максимум 50 символов.</p>
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label for="dueDate">Срок выполнения</label>
          <input type="date" id="dueDate" name="dueDate" value="${dueDateValue}">
        </div>

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

  <script nonce="${nonce}" src="${easymdeJsUri}"></` +
      `script>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let easyMDE;
    let subtasks = ${JSON.stringify(task.subtasks || [])};

    window.addEventListener('load', () => {
      easyMDE = new EasyMDE({
        element: document.getElementById('description'),
        autoDownloadFontAwesome: false,
        spellChecker: false,
        forceSync: true,
        minHeight: "260px",
        status: ["lines", "words"],
        toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen", "|", "guide"]
      });

      // Add event listener for AI generate button
      const aiGenerateBtn = document.querySelector('.btn-ai-generate');
      if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', generateWithAI);
      }

      vscode.postMessage({ command: 'loadInstructions' });
    });

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
      } else if (message.command === 'aiGenerated') {
        handleAISuccess(message.description);
      } else if (message.command === 'aiError') {
        handleAIError(message.error);
      }
    });

    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();

      if (easyMDE) {
        easyMDE.codemirror.save();
      }

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
      container.innerHTML = subtasks.map((subtask, index) => {
        const checked = subtask.completed ? 'checked' : '';
        return '<div class="subtask-item" data-index="' + index + '">' +
          '<input type="checkbox" id="subtask-' + index + '" ' + checked + ' onchange="toggleSubtask(' + index + ')">' +
          '<input type="text" value="' + escapeHtml(subtask.title) + '" onchange="updateSubtaskTitle(' + index + ', this.value)">' +
          '<button type="button" onclick="removeSubtask(' + index + ')" class="btn-remove">✕</button>' +
          '</div>';
      }).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text ?? '';
      return div.innerHTML;
    }

    function generateWithAI() {
      const promptInput = document.getElementById('aiPrompt');
      const generateBtn = document.querySelector('.btn-ai-generate');
      const statusDiv = document.getElementById('aiStatus');
      const prompt = promptInput.value.trim();

      if (!prompt) {
        statusDiv.className = 'ai-status error';
        statusDiv.textContent = '⚠️ Пожалуйста, введите описание для генерации';
        return;
      }

      // Получаем текущее описание задачи из редактора
      const currentDescription = easyMDE ? easyMDE.value() : '';

      statusDiv.className = 'ai-status loading';
      statusDiv.textContent = '🤖 AI анализирует проект и генерирует техническое задание...';
      generateBtn.disabled = true;

      vscode.postMessage({
        command: 'generateAI',
        prompt: prompt,
        currentDescription: currentDescription
      });
    }

    function handleAISuccess(description) {
      const statusDiv = document.getElementById('aiStatus');
      const generateBtn = document.querySelector('.btn-ai-generate');
      
      statusDiv.className = 'ai-status success';
      statusDiv.textContent = '✅ Описание успешно сгенерировано и вставлено!';
      
      if (easyMDE) {
        easyMDE.value(description);
      }
      
      generateBtn.disabled = false;
      
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }

    function handleAIError(error) {
      const statusDiv = document.getElementById('aiStatus');
      const generateBtn = document.querySelector('.btn-ai-generate');
      
      statusDiv.className = 'ai-status error';
      statusDiv.textContent = '❌ ' + error;
      
      generateBtn.disabled = false;
    }
  </` +
      `script>
</body>
</html>`
    );
  }

  /**
   * Экранирование HTML
   */
  private escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (m) => {
      if (m === "&") {
        return "&amp;";
      }
      if (m === "<") {
        return "&lt;";
      }
      if (m === ">") {
        return "&gt;";
      }
      if (m === '"') {
        return "&quot;";
      }
      if (m === "'") {
        return "&#039;";
      }
      return m;
    });
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
