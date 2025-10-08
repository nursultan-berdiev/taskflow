# Быстрый старт: YouTrack интеграция

## Настройка за 3 шага

### 1. Получите токен YouTrack

1. Откройте ваш YouTrack: `https://youtrack.company.com`
2. Перейдите в **Profile** → **Authentication**
3. Нажмите **New Token**
4. Параметры токена:
   - **Name**: `TaskFlow Integration`
   - **Scope**: выберите `YouTrack` с правами на чтение
5. **Скопируйте токен** (он больше не будет показан!)

### 2. Настройте VS Code

1. Откройте настройки: `Ctrl+,` (или `Cmd+,` на Mac)
2. Найдите: `TaskFlow: YouTrack`
3. Заполните поля:
   ```
   Base URL: https://youtrack.company.com
   Token: [вставьте скопированный токен]
   ```

**Опционально:**
```
Project ID: MYPROJECT
Query: State: Open
```

### 3. Импортируйте задачи

**Способ 1:** Command Palette
- `Ctrl+Shift+P`
- Введите: `TaskFlow: Импортировать задачи из API`
- Выберите: **Импортировать задачи**

**Способ 2:** Контекстное меню
- Правый клик в панели **Задачи**
- Выберите: **Импортировать задачи из API**

## Проверка подключения

Перед импортом проверьте настройки:
1. Выполните команду импорта
2. Выберите: **Проверить подключение**
3. Ждите уведомления: `✅ Подключение к YouTrack успешно!`

## Примеры настроек

### Базовая конфигурация
```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4="
}
```

### Импорт из конкретного проекта
```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4=",
  "taskflow.youtrack.projectId": "MYPROJECT"
}
```

### Импорт только открытых задач
```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4=",
  "taskflow.youtrack.query": "State: Open"
}
```

### Импорт моих задач
```json
{
  "taskflow.youtrack.baseUrl": "https://youtrack.company.com",
  "taskflow.youtrack.token": "perm:dXNlcm5hbWU=.VG9rZW4=",
  "taskflow.youtrack.query": "Assignee: me State: -{Fixed}"
}
```

## Что импортируется?

| Из YouTrack | В TaskFlow |
|-------------|------------|
| ID (например, PROJECT-123) | Тег задачи |
| Название | Заголовок с префиксом `[PROJECT-123]` |
| Описание | Описание задачи |
| State | Статус (Pending/InProgress/Completed) |
| Priority | Приоритет (Высокий/Средний/Низкий) |
| Type | Категория |
| Reporter | Assignee (исполнитель) |

## Решение проблем

### ❌ Ошибка: "Неверный токен авторизации"
**Решение:** Создайте новый токен в YouTrack и обновите настройки

### ❌ Ошибка: "API endpoint не найден"
**Решение:** Проверьте Base URL (должен быть без `/api` в конце)

### ❌ Ошибка: "YouTrack API недоступен"
**Решение:** Проверьте подключение к интернету и доступность сервера

### ⚠️ Импортируется 0 задач
**Решение:** 
- Проверьте фильтры в настройках
- Убедитесь, что токен имеет доступ к проекту
- Попробуйте без `projectId` и `query`

## Повторный импорт

При повторном импорте:
- ✅ Новые задачи будут добавлены
- ✅ Существующие задачи будут обновлены
- ✅ Показывается статистика: "Импортировано: X, Обновлено: Y"

## Полная документация

Подробная документация: [YOUTRACK_INTEGRATION.md](./YOUTRACK_INTEGRATION.md)
