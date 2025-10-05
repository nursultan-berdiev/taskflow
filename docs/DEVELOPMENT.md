# Руководство разработчика TaskFlow

Это руководство поможет вам начать разработку расширения TaskFlow для VS Code.

## Структура проекта

```
copilot_task_flow/
├── src/                          # Исходный код TypeScript
│   ├── extension.ts              # Точка входа расширения
│   ├── models/                   # Модели данных
│   │   └── task.ts              # Интерфейсы задач
│   ├── managers/                 # Бизнес-логика
│   │   └── taskManager.ts       # Управление задачами
│   ├── parsers/                  # Парсеры
│   │   └── markdownParser.ts    # Парсинг Markdown
│   ├── views/                    # UI компоненты
│   │   └── taskTreeProvider.ts  # TreeView провайдер
│   └── integrations/             # Интеграции
│       └── copilotIntegration.ts # Copilot интеграция
├── resources/                    # Ресурсы (иконки, изображения)
│   └── taskflow-icon.svg        # Иконка расширения
├── out/                          # Скомпилированный JavaScript (генерируется)
├── .vscode/                      # Конфигурация VS Code
│   ├── launch.json              # Конфигурация отладки
│   ├── tasks.json               # Задачи сборки
│   └── extensions.json          # Рекомендуемые расширения
├── package.json                  # Манифест расширения
├── tsconfig.json                 # Конфигурация TypeScript
├── .eslintrc.js                 # Конфигурация ESLint
└── README.md                     # Документация

```

## Архитектура

### Основные компоненты

#### 1. TaskManager (`managers/taskManager.ts`)

Центральный компонент для управления состоянием задач:

- Загрузка и сохранение задач из/в Markdown файл
- CRUD операции над задачами
- EventEmitter для уведомления об изменениях
- FileSystemWatcher для синхронизации с файлом

#### 2. MarkdownParser (`parsers/markdownParser.ts`)

Парсинг и сериализация задач:

- Преобразование Markdown в структурированные данные
- Извлечение метаданных (приоритет, срок, исполнитель)
- Обратная конвертация в Markdown формат

#### 3. TaskTreeProvider (`views/taskTreeProvider.ts`)

Провайдер данных для TreeView:

- Иерархическое отображение задач
- Группировка по категориям
- Фильтрация и сортировка
- Визуальные индикаторы

#### 4. CopilotIntegration (`integrations/copilotIntegration.ts`)

Интеграция с GitHub Copilot:

- Формирование структурированных промптов
- Отправка задач в Copilot Chat
- Декомпозиция и анализ задач

### Поток данных

```
tasks.md → MarkdownParser → TaskManager → TaskTreeProvider → UI
                ↑                ↓
         FileSystemWatcher    EventEmitter
```

## Настройка окружения разработки

### Требования

- Node.js 14.x или выше
- VS Code 1.80.0 или выше
- npm или yarn

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# Установка зависимостей
npm install

# Компиляция
npm run compile
```

### Запуск в режиме разработки

1. Откройте проект в VS Code
2. Нажмите F5 или запустите "Run Extension" из панели отладки
3. Откроется новое окно VS Code с активированным расширением

### Режим watch

Для автоматической перекомпиляции при изменениях:

```bash
npm run watch
```

## Разработка новых функций

### Добавление новой команды

1. **Зарегистрируйте команду в `package.json`:**

```json
{
  "contributes": {
    "commands": [
      {
        "command": "taskflow.myNewCommand",
        "title": "Моя новая команда",
        "category": "TaskFlow"
      }
    ]
  }
}
```

2. **Реализуйте обработчик в `extension.ts`:**

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("taskflow.myNewCommand", async () => {
    // Ваша логика здесь
    vscode.window.showInformationMessage("Команда выполнена!");
  })
);
```

### Добавление нового поля в Task

1. **Обновите интерфейс в `models/task.ts`:**

```typescript
export interface Task {
  // ...существующие поля
  myNewField?: string;
}
```

2. **Обновите парсер в `parsers/markdownParser.ts`:**

```typescript
// В методе parseTaskContent
const myFieldMatch = content.match(/MyField:\s*(.+)/);
if (myFieldMatch) {
  myNewField = myFieldMatch[1];
  title = title.replace(myFieldMatch[0], "").trim();
}
```

3. **Обновите сериализацию:**

```typescript
// В методе tasksToMarkdown
if (task.myNewField) {
  taskLine += ` MyField: ${task.myNewField}`;
}
```

### Добавление фильтра

1. **Добавьте состояние в `TaskTreeProvider`:**

```typescript
private filterMyField: string | null = null;

public setFilterMyField(value: string | null): void {
  this.filterMyField = value;
  this.refresh();
}
```

2. **Примените фильтр в `getFilteredTasks`:**

```typescript
if (this.filterMyField) {
  tasks = tasks.filter((t) => t.myNewField === this.filterMyField);
}
```

## Тестирование

### Структура тестов

```
src/test/
├── suite/
│   ├── extension.test.ts
│   ├── taskManager.test.ts
│   └── markdownParser.test.ts
└── runTest.ts
```

### Запуск тестов

```bash
npm test
```

### Написание тестов

```typescript
import * as assert from "assert";
import { MarkdownParser } from "../../parsers/markdownParser";

suite("MarkdownParser Test Suite", () => {
  test("Parse simple task", () => {
    const parser = new MarkdownParser();
    const markdown = "- [ ] Test task";
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].title, "Test task");
  });
});
```

## Отладка

### Точки останова

Устанавливайте точки останова в TypeScript коде - они будут работать благодаря source maps.

### Логирование

```typescript
// Вывод в консоль разработчика
console.log("Debug info:", data);

// Вывод пользователю
vscode.window.showInformationMessage("Info message");
```

### Developer Tools

В окне Extension Development Host:

- Ctrl+Shift+I - открыть Developer Tools
- Ctrl+R - перезагрузить окно

## Лучшие практики

### Код

1. **Используйте TypeScript строго**

   ```typescript
   // Избегайте any
   function process(data: any) {} // ❌
   function process(data: Task) {} // ✅
   ```

2. **Асинхронность**

   ```typescript
   // Всегда используйте async/await для асинхронных операций
   async function loadTasks(): Promise<Task[]> {
     const content = await vscode.workspace.fs.readFile(uri);
     return parser.parse(content);
   }
   ```

3. **Обработка ошибок**

   ```typescript
   try {
     await riskyOperation();
   } catch (error) {
     vscode.window.showErrorMessage(`Ошибка: ${error}`);
     console.error(error);
   }
   ```

4. **Cleanup**
   ```typescript
   // Всегда добавляйте подписки в context.subscriptions
   context.subscriptions.push(
     vscode.commands.registerCommand(...)
   );
   ```

### UI/UX

1. **Feedback**: Всегда показывайте пользователю результат действия
2. **Валидация**: Проверяйте ввод пользователя
3. **Confirmation**: Запрашивайте подтверждение для деструктивных действий
4. **Progress**: Показывайте прогресс для длительных операций

### Performance

1. **Ленивая загрузка**: Загружайте данные по требованию
2. **Кэширование**: Кэшируйте часто используемые данные
3. **Debouncing**: Используйте debounce для частых событий
4. **Оптимизация**: Профилируйте и оптимизируйте узкие места

## API VS Code

### Полезные API

- **Commands**: `vscode.commands.executeCommand`
- **File System**: `vscode.workspace.fs`
- **Configuration**: `vscode.workspace.getConfiguration`
- **UI**: `vscode.window.showQuickPick`, `showInputBox`
- **Events**: `vscode.workspace.onDidChangeConfiguration`

### Документация

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Публикация

### Подготовка

1. Обновите версию в `package.json`
2. Обновите `CHANGELOG.md`
3. Проверьте README.md
4. Запустите тесты: `npm test`
5. Проверьте ESLint: `npm run lint`

### Упаковка

```bash
# Установка vsce
npm install -g @vscode/vsce

# Создание .vsix файла
vsce package
```

### Публикация в Marketplace

```bash
# Получите Publisher Access Token на https://dev.azure.com
vsce login <publisher-name>

# Публикация
vsce publish
```

## Полезные ресурсы

- [VS Code Extension Examples](https://github.com/microsoft/vscode-extension-samples)
- [VS Code API Documentation](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Markdown Guide](https://www.markdownguide.org/)

## Troubleshooting

### Проблема: Расширение не активируется

**Решение**: Проверьте activationEvents в package.json

### Проблема: Изменения не применяются

**Решение**: Перезагрузите окно Extension Development Host (Ctrl+R)

### Проблема: Ошибки компиляции

**Решение**: Проверьте типы и импорты, запустите `npm run compile`

### Проблема: Тесты не проходят

**Решение**: Проверьте пути к модулям, убедитесь, что код скомпилирован

## Контакты

- GitHub Issues: [Репозиторий проекта]
- Email: dev@taskflow.dev
- Дискуссии: GitHub Discussions

---

Счастливого кодирования! 🚀
