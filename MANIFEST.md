# TaskFlow Extension - Манифест проекта

## 🎯 Основная информация

**Название:** TaskFlow - AI-Powered Task Management  
**Версия:** 0.1.0  
**Дата создания:** 4 октября 2025 г.  
**Статус:** В разработке (Beta)  
**Лицензия:** MIT

## 📂 Файловая структура

```
copilot_task_flow/
├── 📄 Конфигурация
│   ├── package.json              # Манифест расширения и зависимости
│   ├── tsconfig.json            # Конфигурация TypeScript
│   ├── .eslintrc.js             # Правила линтинга
│   ├── .gitignore               # Игнорируемые файлы Git
│   └── .vscodeignore            # Игнорируемые файлы при публикации
│
├── 📁 Исходный код (src/)
│   ├── extension.ts             # Точка входа расширения
│   ├── models/                  # Модели данных
│   │   └── task.ts             # Task, SubTask, Enums
│   ├── managers/                # Бизнес-логика
│   │   └── taskManager.ts      # Управление задачами
│   ├── parsers/                 # Обработка данных
│   │   └── markdownParser.ts   # Markdown ↔ JSON
│   ├── views/                   # UI компоненты
│   │   └── taskTreeProvider.ts # TreeView провайдер
│   ├── integrations/            # Внешние интеграции
│   │   └── copilotIntegration.ts # GitHub Copilot
│   └── test/                    # Тесты
│       ├── runTest.ts          # Test runner
│       └── suite/              # Тестовые наборы
│           ├── index.ts        # Test suite entry
│           └── markdownParser.test.ts
│
├── 📁 Ресурсы (resources/)
│   └── taskflow-icon.svg       # Иконка расширения
│
├── 📁 Примеры (examples/)
│   └── tasks.md                 # Пример файла задач
│
├── 📁 Сборка (out/)             # Скомпилированный JavaScript
│   └── [генерируется автоматически]
│
├── 📁 VS Code (.vscode/)
│   ├── launch.json             # Конфигурация отладки
│   ├── tasks.json              # Задачи сборки
│   ├── extensions.json         # Рекомендуемые расширения
│   └── settings.json           # Настройки рабочей области
│
└── 📚 Документация
    ├── README.md               # Основная документация
    ├── QUICK_START.md          # Быстрое руководство
    ├── INSTALLATION.md         # Установка и запуск
    ├── DEVELOPMENT.md          # Руководство разработчика
    ├── ARCHITECTURE.md         # Техническая архитектура
    ├── CONTRIBUTING.md         # Гайд по вкладу
    ├── PROJECT_SUMMARY.md      # Сводка проекта
    ├── CHANGELOG.md            # История изменений
    └── LICENSE                 # MIT лицензия
```

## 🔧 Технологический стек

### Основные технологии

- **TypeScript 5.1.6** - язык разработки
- **VS Code Extension API 1.80+** - платформа
- **Node.js 14+** - runtime

### Зависимости

```json
{
  "dependencies": {
    "uuid": "^9.0.0", // Генерация ID
    "marked": "^7.0.4" // Markdown парсинг (опционально)
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@types/node": "20.x",
    "@types/uuid": "^9.0.2",
    "typescript": "^5.1.6",
    "@typescript-eslint/eslint-plugin": "^6.4.1",
    "@typescript-eslint/parser": "^6.4.1",
    "eslint": "^8.47.0",
    "@vscode/test-electron": "^2.3.4",
    "mocha": "^10.2.0",
    "glob": "^10.3.3"
  }
}
```

## 📋 Ключевые компоненты

### 1. Extension Entry (extension.ts)

- **Роль:** Точка входа, координация компонентов
- **Функции:** Регистрация команд, инициализация, обработка событий
- **Экспорты:** `activate()`, `deactivate()`

### 2. TaskManager

- **Роль:** Центральное управление состоянием
- **Ответственность:** CRUD операции, синхронизация с файлом
- **События:** `onTasksChanged`

### 3. MarkdownParser

- **Роль:** Преобразование форматов
- **Функции:** Markdown → JSON, JSON → Markdown
- **Особенности:** Извлечение метаданных, подзадачи

### 4. TaskTreeProvider

- **Роль:** UI отображение
- **Интерфейс:** `vscode.TreeDataProvider<T>`
- **Функции:** Группировка, фильтрация, иконки

### 5. CopilotIntegration

- **Роль:** AI интеграция
- **Функции:** Формирование промптов, отправка в Copilot
- **API:** VS Code commands, буфер обмена

## 🎨 Команды расширения

| ID команды                         | Название                | Описание                  |
| ---------------------------------- | ----------------------- | ------------------------- |
| `taskflow.initializeTasks`         | Инициализировать задачи | Создает tasks.md          |
| `taskflow.addTask`                 | Добавить задачу         | Диалог создания           |
| `taskflow.editTask`                | Редактировать задачу    | Диалог редактирования     |
| `taskflow.deleteTask`              | Удалить задачу          | Удаление с подтверждением |
| `taskflow.toggleTask`              | Переключить статус      | Завершить/возобновить     |
| `taskflow.generateCodeWithCopilot` | Сгенерировать код       | Отправка в Copilot        |
| `taskflow.refreshTasks`            | Обновить                | Перезагрузка списка       |
| `taskflow.filterByPriority`        | Фильтр по приоритету    | QuickPick фильтр          |
| `taskflow.filterByStatus`          | Фильтр по статусу       | QuickPick фильтр          |
| `taskflow.showProgress`            | Показать прогресс       | Статистика                |

## ⚙️ Конфигурация

```json
{
  "taskflow.tasksFile": "tasks.md", // Имя файла
  "taskflow.autoSave": true, // Автосохранение
  "taskflow.showCompletedTasks": true, // Показывать завершенные
  "taskflow.defaultPriority": "Средний", // Приоритет по умолчанию
  "taskflow.copilotIntegration": true // Интеграция с Copilot
}
```

## 🧪 Тестирование

### Типы тестов

- ✅ Unit тесты (MarkdownParser, TaskManager)
- ✅ Integration тесты (полный flow)
- ⏳ E2E тесты (планируется)

### Команды

```bash
npm test           # Запуск тестов
npm run compile    # Компиляция
npm run lint       # Линтинг
npm run watch      # Watch mode
```

## 📊 Метрики кода

**Текущее состояние (v0.1.0):**

- Файлов TypeScript: 10
- Строк кода: ~2000
- Тестов: 15+
- Покрытие: ~60% (цель: 80%)
- Сложность: Low-Medium
- Техдолг: Минимальный

## 🚀 Lifecycle

### Development

```bash
git clone → npm install → npm run watch → F5
```

### Build

```bash
npm run compile → npm run lint → npm test
```

### Package

```bash
vsce package → taskflow-0.1.0.vsix
```

### Publish

```bash
vsce login → vsce publish
```

## 📦 Deliverables

### Код

- ✅ Исходники TypeScript
- ✅ Скомпилированный JavaScript
- ✅ Type definitions
- ✅ Source maps

### Документация

- ✅ README (пользовательская)
- ✅ QUICK_START (быстрый старт)
- ✅ DEVELOPMENT (для разработчиков)
- ✅ ARCHITECTURE (техническая)
- ✅ CONTRIBUTING (вклад)
- ✅ API docs (в коде через JSDoc)

### Тесты

- ✅ Unit test suite
- ✅ Test fixtures
- ✅ Test documentation

### Ресурсы

- ✅ Иконка расширения
- ✅ Примеры использования
- ✅ Шаблоны задач

## 🎯 Статус реализации

### ✅ Завершено (v0.1.0)

- Базовая функциональность CRUD
- TreeView UI
- Markdown парсинг
- Copilot интеграция (базовая)
- Фильтрация и сортировка
- FileSystemWatcher
- Webview панель деталей
- Документация

### 🔄 В процессе

- Улучшение тестов
- Performance оптимизация
- UI/UX полировка

### 📅 Запланировано (v0.2.0+)

- Drag & drop
- Множественные файлы
- Поиск
- Теги
- Экспорт
- Внешние интеграции

## 🐛 Известные ограничения

1. Один файл tasks.md на workspace
2. Copilot API ограничен (fallback через clipboard)
3. Нет drag & drop переупорядочивания
4. Базовая поддержка конфликтов слияния

## 🔗 Ссылки

- **Repository:** https://github.com/yourusername/taskflow
- **Issues:** https://github.com/yourusername/taskflow/issues
- **Marketplace:** [после публикации]
- **Documentation:** В репозитории

## 👥 Команда

- **Author:** [Your Name]
- **Contributors:** Open Source Community
- **License:** MIT

## 📅 Timeline

- **2025-10-04:** Инициализация проекта
- **2025-10-04:** v0.1.0 - Базовая версия
- **2025-11-XX:** v0.2.0 - Расширенные функции (план)
- **2026-Q2:** v1.0.0 - Stable release (план)

---

**Статус:** ✅ Ready for Development  
**Последнее обновление:** 4 октября 2025 г.
