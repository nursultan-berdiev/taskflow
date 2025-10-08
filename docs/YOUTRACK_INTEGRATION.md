# Интеграция с YouTrack API

## Описание

Реализована полноценная интеграция с YouTrack REST API для импорта задач из YouTrack в локальное хранилище TaskFlow. Функционал позволяет автоматически синхронизировать задачи, обновлять существующие и добавлять новые.

## Реализованный функционал

### 1. Типы данных YouTrack (`src/models/youtrackTypes.ts`)

**Созданы интерфейсы:**
- `YouTrackIssue` - структура задачи из YouTrack API
- `YouTrackCustomField` - кастомные поля задачи
- `YouTrackIssuesResponse` - ответ API со списком задач
- `YouTrackConfig` - конфигурация подключения
- `YouTrackConfigValidation` - результат валидации настроек

### 2. Сервис интеграции (`src/integrations/youtrackIntegration.ts`)

**Класс `YouTrackIntegration`** включает:

#### Основные методы:

```typescript
// Инициализация подключения
public async initialize(): Promise<boolean>

// Импорт задач из YouTrack
public async importIssues(): Promise<Task[]>

// Проверка подключения
public async testConnection(): Promise<boolean>
```

#### Вспомогательные методы:

```typescript
// Загрузка конфигурации из VS Code
private async loadConfiguration(): Promise<YouTrackConfigValidation>

// Построение запроса для фильтрации
private buildQuery(): string

// Маппинг YouTrack задачи в локальный формат
private mapYouTrackIssueToTask(issue: YouTrackIssue): Task

// Маппинг статуса задачи
private mapStatus(customFields?: YouTrackCustomField[]): TaskStatus

// Маппинг приоритета задачи
private mapPriority(customFields?: YouTrackCustomField[]): Priority

// Извлечение категории из полей
private extractCategory(customFields?: YouTrackCustomField[]): string | undefined

// Обработка ошибок API
private handleError(error: unknown): void
```

### 3. Настройки VS Code (`package.json`)

**Добавлены настройки:**
- `taskflow.youtrack.baseUrl` - URL сервера YouTrack
- `taskflow.youtrack.token` - токен авторизации
- `taskflow.youtrack.projectId` - ID проекта (опционально)
- `taskflow.youtrack.query` - дополнительная фильтрация (опционально)

### 4. Команда импорта (`extension.ts`)

**Обновлена команда `taskflow.importTasksFromApi`:**
- Автоопределение источника (YouTrack или Generic API)
- Проверка подключения перед импортом
- Обновление существующих задач
- Добавление новых задач
- Подробная статистика импорта

## Использование

### Шаг 1: Настройка YouTrack

1. Откройте настройки VS Code (`Ctrl+,`)
2. Найдите "TaskFlow: YouTrack"
3. Укажите параметры:
   - **Base URL**: `https://youtrack.your-company.com`
   - **Token**: создайте в профиле YouTrack (Settings → Authentication → New Token)
   - **Project ID** (опционально): например, `PROJECT`
   - **Query** (опционально): например, `State: Open`

### Шаг 2: Импорт задач

**Способ 1: Через Command Palette**
1. `Ctrl+Shift+P`
2. Введите: `TaskFlow: Импортировать задачи из API`
3. Выберите "Импортировать задачи"

**Способ 2: Через контекстное меню**
- Правый клик в панели "Задачи"
- Выберите "Импортировать задачи из API"

### Шаг 3: Проверка подключения

Перед импортом можно проверить подключение:
1. Выполните команду импорта
2. Выберите "Проверить подключение"
3. Получите результат проверки

## Маппинг полей

### Из YouTrack в Task

| YouTrack | TaskFlow | Описание |
|----------|----------|----------|
| `idReadable` | `id` (prefixed) | `youtrack-PROJECT-123` |
| `summary` | `title` | `[PROJECT-123] Название задачи` |
| `description` | `description` | Описание задачи |
| `customFields[State]` | `status` | Маппинг статуса |
| `customFields[Priority]` | `priority` | Маппинг приоритета |
| `customFields[Type]` | `category` | Тип задачи |
| `idReadable` | `tag` | Используется как тег |
| `created` | `createdAt` | Дата создания |
| `updated` | `updatedAt` | Дата обновления |
| `reporter` | `assignee` | Автор задачи |

### Маппинг статусов

| YouTrack State | TaskFlow Status |
|----------------|-----------------|
| "В работе", "In Progress" | `InProgress` |
| "Завершен", "Closed", "Done", "Fixed" | `Completed` |
| Остальные | `Pending` |

### Маппинг приоритетов

| YouTrack Priority | TaskFlow Priority |
|-------------------|-------------------|
| "Критический", "Высокий", "Critical", "High" | `High` |
| "Низкий", "Minor", "Low" | `Low` |
| Остальные | `Medium` |

## Обработка ошибок

### Типы ошибок и решения:

#### 1. Ошибка 401 (Unauthorized)
**Причина:** Неверный токен авторизации  
**Решение:** Проверьте токен в настройках, создайте новый в YouTrack

#### 2. Ошибка 403 (Forbidden)
**Причина:** Недостаточно прав доступа  
**Решение:** Убедитесь, что токен имеет права на чтение задач

#### 3. Ошибка 404 (Not Found)
**Причина:** Неверный URL или API endpoint  
**Решение:** Проверьте корректность Base URL

#### 4. Network Error
**Причина:** Нет подключения к интернету или сервер недоступен  
**Решение:** Проверьте подключение и доступность сервера

#### 5. Timeout Error
**Причина:** Сервер не отвечает (таймаут 30 секунд)  
**Решение:** Проверьте производительность сервера, уменьшите количество задач

## Примеры использования

### Пример 1: Базовая конфигурация

```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4="
}
```

Результат: Импортируются все задачи, доступные токену.

### Пример 2: Фильтрация по проекту

```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4=",
  "taskflow.youtrack.projectId": "MYPROJECT"
}
```

Результат: Импортируются только задачи из проекта `MYPROJECT`.

### Пример 3: Сложная фильтрация

```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4=",
  "taskflow.youtrack.projectId": "MYPROJECT",
  "taskflow.youtrack.query": "State: Open Assignee: me"
}
```

Результат: Импортируются только открытые задачи проекта `MYPROJECT`, назначенные на текущего пользователя.

## Архитектура

### Диаграмма потока данных

```
┌─────────────────┐
│   VS Code UI    │
│  (Command)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  extension.ts   │
│  (Handler)      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ YouTrackIntegration     │
│ ┌─────────────────────┐ │
│ │ initialize()        │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ importIssues()      │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   YouTrack REST API     │
│   /api/issues           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Маппинг данных        │
│   YouTrack → Task       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   TaskManager           │
│   addTask()             │
│   updateTask()          │
└─────────────────────────┘
```

### Последовательность импорта

1. **Инициализация**
   - Загрузка конфигурации из VS Code
   - Валидация параметров
   - Создание Axios instance

2. **Построение запроса**
   - Формирование query string
   - Определение полей для запроса
   - Установка лимитов

3. **API запрос**
   - GET /api/issues
   - Обработка ответа
   - Обработка ошибок

4. **Маппинг данных**
   - Преобразование каждой задачи
   - Маппинг статусов и приоритетов
   - Извлечение кастомных полей

5. **Сохранение**
   - Проверка существующих задач
   - Добавление новых
   - Обновление существующих

6. **Уведомление**
   - Статистика импорта
   - Количество новых/обновлённых

## Технические детали

### Зависимости

```json
{
  "axios": "^1.12.2"
}
```

### HTTP заголовки

```typescript
{
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
  "Content-Type": "application/json"
}
```

### API endpoints

- `GET /api/issues` - получение списка задач
- `GET /api/admin/timeTrackingSettings` - проверка подключения

### Параметры запроса

- `fields` - список полей для получения
- `query` - YouTrack Query Language
- `$top` - максимальное количество задач (100)

### Таймауты

- **Connection timeout**: 30 секунд
- **Read timeout**: 30 секунд

## Ограничения

1. **Максимум задач за запрос**: 100
   - Для больших проектов потребуется пагинация (будет добавлено в будущем)

2. **Поддерживаемые поля**:
   - State (статус)
   - Priority (приоритет)
   - Type (категория)
   - Остальные кастомные поля игнорируются

3. **Направление синхронизации**: Только YouTrack → TaskFlow
   - Изменения в TaskFlow не синхронизируются обратно в YouTrack

## Безопасность

### Хранение токена

- Токен хранится в настройках VS Code
- Не логируется в консоль
- Передаётся только через HTTPS

### Рекомендации

1. Используйте персональные токены (не пароли)
2. Создавайте токены с минимальными правами (только чтение задач)
3. Регулярно обновляйте токены
4. Не публикуйте токены в репозитории

## Тестирование

### Проверка подключения

```typescript
const integration = new YouTrackIntegration();
await integration.initialize();
const isConnected = await integration.testConnection();
```

### Тестовый импорт

1. Настройте YouTrack в тестовом проекте
2. Выполните команду импорта
3. Проверьте:
   - Количество импортированных задач
   - Корректность маппинга полей
   - Обработку дубликатов

### Отладка

Включите Developer Tools в VS Code:
- `Help` → `Toggle Developer Tools`
- Вкладка `Console`
- Смотрите логи с префиксом "YouTrack"

## Будущие улучшения

### Запланировано

1. **Пагинация**
   - Импорт более 100 задач
   - Автоматическая подгрузка следующей страницы

2. **Двусторонняя синхронизация**
   - Обновление задач в YouTrack из TaskFlow
   - Синхронизация статусов

3. **Инкрементальная синхронизация**
   - Импорт только изменённых задач
   - Использование поля `updated` для фильтрации

4. **Маппинг дополнительных полей**
   - Assignee (исполнитель)
   - Due Date (срок выполнения)
   - Subtasks (подзадачи)

5. **Webhook интеграция**
   - Автоматический импорт при изменениях в YouTrack
   - Real-time синхронизация

## Примеры кода

### Создание токена в YouTrack

1. Откройте YouTrack
2. Перейдите в Profile → Authentication
3. Нажмите "New Token"
4. Укажите параметры:
   - Name: `TaskFlow Integration`
   - Scope: `YouTrack` (read-only)
5. Скопируйте токен

### Настройка через settings.json

```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4=",
  "taskflow.youtrack.projectId": "PROJ",
  "taskflow.youtrack.query": "State: -{Won't fix} -{Duplicate}"
}
```

### Программный импорт

```typescript
import { YouTrackIntegration } from "./integrations/youtrackIntegration";
import { TaskManager } from "./managers/taskManager";

const integration = new YouTrackIntegration();
const initialized = await integration.initialize();

if (initialized) {
  const tasks = await integration.importIssues();
  
  for (const task of tasks) {
    taskManager.addTask(task);
  }
  
  console.log(`Imported ${tasks.length} tasks`);
}
```

## Заключение

Интеграция с YouTrack API полностью функциональна и готова к использованию. Реализованы все основные требования:

- ✅ Импорт задач через REST API
- ✅ Маппинг в локальный формат Task
- ✅ Настройки через VS Code
- ✅ Обработка ошибок
- ✅ Обновление существующих задач
- ✅ Проверка подключения

Функционал протестирован и скомпилирован без ошибок.
