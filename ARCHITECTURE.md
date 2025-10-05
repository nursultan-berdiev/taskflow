# TaskFlow - Архитектура и техническая документация

## Обзор архитектуры

TaskFlow построен на модульной архитектуре с четким разделением ответственности между компонентами.

```
┌─────────────────────────────────────────────────────────────┐
│                        VS Code UI                            │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Activity Bar    │  │ Tree View    │  │  Webview      │ │
│  │  (TaskFlow Icon) │  │  (Tasks)     │  │  (Details)    │ │
│  └────────┬─────────┘  └──────┬───────┘  └───────┬───────┘ │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     Extension Core                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              extension.ts (Entry Point)               │   │
│  │  - Command Registration                               │   │
│  │  - Component Initialization                           │   │
│  │  - Event Handling                                     │   │
│  └───────────────┬──────────────────────────────────────┘   │
│                  │                                           │
│  ┌───────────────┼───────────────────────────────────────┐  │
│  │               ▼                                        │  │
│  │   ┌───────────────────────┐   ┌──────────────────┐   │  │
│  │   │   TaskTreeProvider    │◄──┤   TaskManager    │   │  │
│  │   │  - TreeView Logic     │   │  - State Mgmt    │   │  │
│  │   │  - UI Rendering       │   │  - CRUD Ops      │   │  │
│  │   │  - Filtering/Sorting  │   │  - Events        │   │  │
│  │   └───────────────────────┘   └────────┬─────────┘   │  │
│  │                                         │             │  │
│  │   ┌───────────────────────┐            ▼             │  │
│  │   │  CopilotIntegration   │   ┌──────────────────┐  │  │
│  │   │  - Prompt Generation  │   │ MarkdownParser   │  │  │
│  │   │  - Copilot Chat API   │   │  - MD → JSON     │  │  │
│  │   │  - Task Analysis      │   │  - JSON → MD     │  │  │
│  │   └───────────────────────┘   └────────┬─────────┘  │  │
│  │                                         │             │  │
│  └─────────────────────────────────────────┼─────────────┘  │
└────────────────────────────────────────────┼────────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │   File System            │
                              │   tasks.md               │
                              │  - Storage               │
                              │  - Version Control (Git) │
                              └──────────────────────────┘
```

## Компоненты

### 1. Extension Core (extension.ts)

**Роль**: Точка входа расширения, управляет жизненным циклом

**Ответственность**:

- Регистрация команд VS Code
- Инициализация компонентов
- Обработка событий активации/деактивации
- Координация между компонентами

**Ключевые функции**:

```typescript
activate(context: vscode.ExtensionContext)
deactivate()
registerCommands()
showAddTaskDialog()
showEditTaskDialog()
```

### 2. TaskManager (managers/taskManager.ts)

**Роль**: Центральный менеджер состояния задач

**Ответственность**:

- Управление массивом задач в памяти
- CRUD операции
- Синхронизация с файловой системой
- Уведомление подписчиков об изменениях

**Поток данных**:

```
User Action → Command → TaskManager → Update State → Notify → UI Update
                                    ↓
                                Save to File
```

**Ключевые методы**:

```typescript
getTasks(): Task[]
addTask(task): Promise<Task>
updateTask(id, updates): Promise<void>
deleteTask(id): Promise<void>
toggleTask(id): Promise<void>
calculateProgress(): ProgressStats
```

**События**:

```typescript
onTasksChanged: Event<Task[]>;
```

### 3. MarkdownParser (parsers/markdownParser.ts)

**Роль**: Преобразование между Markdown и структурированными данными

**Ответственность**:

- Парсинг Markdown синтаксиса задач
- Извлечение метаданных (приоритет, срок, исполнитель)
- Обработка подзадач
- Сериализация обратно в Markdown

**Формат задачи**:

```markdown
- [ ] Название задачи [Приоритет] Срок: ГГГГ-ММ-ДД @username
      Описание задачи (опционально)
  - [ ] Подзадача 1
  - [x] Подзадача 2
```

**Алгоритм парсинга**:

```
1. Разбить на строки
2. Определить категории (## Заголовки)
3. Найти задачи (- [ ] или - [x])
4. Извлечь метаданные (regex)
5. Связать подзадачи с родителями
6. Собрать в структуру Task[]
```

### 4. TaskTreeProvider (views/taskTreeProvider.ts)

**Роль**: Провайдер данных для TreeView UI

**Ответственность**:

- Реализация vscode.TreeDataProvider<T>
- Преобразование Task в TreeItem
- Иерархическая организация
- Фильтрация и сортировка
- Визуальные индикаторы

**Иерархия элементов**:

```
CategoryTreeItem (Категория)
└── TaskTreeItem (Задача)
    └── (подзадачи не отображаются как отдельные элементы)
```

**Логика рендеринга**:

```typescript
getTreeItem(element) → vscode.TreeItem
getChildren(element?) → TreeItem[]
  if !element: return categories
  if CategoryTreeItem: return tasks in category
  if TaskTreeItem: return []
```

### 5. CopilotIntegration (integrations/copilotIntegration.ts)

**Роль**: Мост между TaskFlow и GitHub Copilot

**Ответственность**:

- Проверка доступности Copilot
- Формирование структурированных промптов
- Отправка запросов в Copilot Chat
- Обработка fallback (буфер обмена)

**Формат промпта**:

```
# Задача: [title]

## Описание
[description]

## Метаданные
- Приоритет: [priority]
- Категория: [category]
- Срок: [dueDate]

## Подзадачи
- [ ] [subtask 1]
- [x] [subtask 2]

## Инструкции
[Структурированные инструкции для Copilot]
```

## Модели данных

### Task Interface

```typescript
interface Task {
  id: string; // UUID
  title: string; // Название
  description?: string; // Описание
  status: TaskStatus; // pending | completed | inprogress
  priority: Priority; // Высокий | Средний | Низкий
  category?: string; // Категория
  dueDate?: Date; // Срок выполнения
  subtasks?: SubTask[]; // Подзадачи
  createdAt: Date; // Дата создания
  updatedAt: Date; // Дата обновления
  assignee?: string; // Исполнитель (@username)
}
```

### SubTask Interface

```typescript
interface SubTask {
  id: string; // UUID
  title: string; // Название
  completed: boolean; // Завершена
}
```

## Потоки данных

### Загрузка задач при старте

```
Extension Activate
    ↓
TaskManager.initialize()
    ↓
Read tasks.md from File System
    ↓
MarkdownParser.parseTasksFromMarkdown()
    ↓
Store in TaskManager.tasks[]
    ↓
Emit onTasksChanged event
    ↓
TaskTreeProvider.refresh()
    ↓
UI updates
```

### Добавление новой задачи

```
User clicks "Add Task"
    ↓
Command: taskflow.addTask
    ↓
showAddTaskDialog() - collect input
    ↓
TaskManager.addTask(taskData)
    ↓
Generate UUID, timestamps
    ↓
Add to tasks[] array
    ↓
MarkdownParser.convertTasksToMarkdown()
    ↓
Write to tasks.md
    ↓
Emit onTasksChanged
    ↓
UI updates
```

### Синхронизация с файловой системой

```
User edits tasks.md directly
    ↓
FileSystemWatcher detects change
    ↓
onDidChange event
    ↓
TaskManager.loadTasks()
    ↓
Parse new content
    ↓
Update tasks[] array
    ↓
Emit onTasksChanged
    ↓
UI updates
```

### Генерация кода с Copilot

```
User right-clicks task → "Generate Code with Copilot"
    ↓
Command: taskflow.generateCodeWithCopilot
    ↓
CopilotIntegration.generateCodeForTask(task)
    ↓
Check if Copilot available
    ↓
CopilotIntegration.createPromptFromTask(task)
    ↓
Format structured prompt
    ↓
Try: Open Copilot Chat + send prompt
    ↓
Catch: Copy to clipboard + notify user
    ↓
User pastes in Copilot Chat
```

## Обработка событий

### Event Flow

```typescript
// TaskManager уведомляет подписчиков
private _onTasksChanged = new EventEmitter<Task[]>();
public readonly onTasksChanged = this._onTasksChanged.event;

// TaskTreeProvider подписывается
taskManager.onTasksChanged(() => {
  this.refresh();
});

// Refresh обновляет UI
public refresh(): void {
  this._onDidChangeTreeData.fire();
}
```

## Управление состоянием

### In-Memory State

```typescript
// TaskManager хранит текущее состояние
private tasks: Task[] = [];

// Все операции работают с этим массивом
// Изменения синхронизируются с tasks.md
```

### Persistence

```typescript
// Автоматическое сохранение после каждого изменения
private async saveTasks(): Promise<void> {
  const markdown = this.parser.convertTasksToMarkdown(this.tasks);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown));
}
```

## Оптимизация производительности

### Кэширование

- Parsed tasks кэшируются в TaskManager
- TreeView использует lazy loading
- Markdown файл читается только при изменениях

### Debouncing

- FileSystemWatcher изменения дебаунсятся
- UI обновления батчируются

### Ленивая загрузка

- TreeView элементы создаются по требованию
- Webview панели создаются только при открытии

## Безопасность

### Валидация входных данных

```typescript
// Проверка при создании задачи
validateInput: (value) => {
  return value.trim() ? null : "Название не может быть пустым";
};
```

### Санитизация Markdown

- Экранирование специальных символов
- Проверка на injection атаки в Webview

### Обработка ошибок

```typescript
try {
  await riskyOperation();
} catch (error) {
  vscode.window.showErrorMessage(`Ошибка: ${error}`);
  console.error(error); // Логирование для отладки
}
```

## Расширяемость

### Добавление новых полей в Task

1. Обновить интерфейс Task
2. Обновить парсер (парсинг + сериализация)
3. Обновить UI (отображение)
4. Обновить диалоги (ввод)

### Добавление новых интеграций

```typescript
// Создать новый класс в integrations/
export class NewIntegration {
  constructor(private context: vscode.ExtensionContext) {}

  public async integrate(task: Task): Promise<void> {
    // Логика интеграции
  }
}

// Зарегистрировать в extension.ts
const newIntegration = new NewIntegration(context);
```

## Зависимости

### Основные

- `vscode`: VS Code Extension API
- `marked`: Markdown парсер (если нужна продвинутая обработка)
- `uuid`: Генерация уникальных ID

### Dev зависимости

- `typescript`: Компилятор
- `@types/vscode`: Типы VS Code API
- `@types/node`: Типы Node.js
- `eslint`: Линтер
- `@typescript-eslint/*`: ESLint плагины для TS

## Тестирование

### Unit тесты

```typescript
// Изолированное тестирование компонентов
suite("MarkdownParser", () => {
  test("Parse simple task", () => {
    // ...
  });
});
```

### Integration тесты

```typescript
// Тестирование взаимодействия компонентов
suite("TaskManager Integration", () => {
  test("Add task and save to file", async () => {
    // ...
  });
});
```

## Отладка

### VS Code Debugger

- Точки останова работают в TypeScript коде
- Source maps автоматически используются
- F5 запускает Extension Development Host

### Логирование

```typescript
// Development
console.log("Debug info:", data);

// Production (Output Channel)
const outputChannel = vscode.window.createOutputChannel("TaskFlow");
outputChannel.appendLine("Log message");
```

---

Эта архитектура обеспечивает:

- ✅ Модульность и разделение ответственности
- ✅ Простоту тестирования
- ✅ Легкость расширения
- ✅ Производительность
- ✅ Надежность
