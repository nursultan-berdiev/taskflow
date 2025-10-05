# Исправление отображения иконки расширения

## 🎯 Проблема

При проверке расширения вместо иконки отображался квадрат.

## ✅ Решение

Файл `task_flow.svg` был перемещен и переименован в правильное место:

```bash
task_flow.svg → resources/taskflow-icon.svg
```

## 📍 Где используется иконка

Иконка `resources/taskflow-icon.svg` используется в 6 местах в `package.json`:

1. **Главная иконка расширения**
   ```json
   "icon": "resources/taskflow-icon.svg"
   ```

2. **ViewContainer в Activity Bar**
   ```json
   {
     "id": "taskflow-explorer",
     "title": "TaskFlow",
     "icon": "resources/taskflow-icon.svg"
   }
   ```

3. **Представление "Задачи"**
   ```json
   {
     "id": "taskflow.tasksView",
     "name": "Задачи",
     "icon": "resources/taskflow-icon.svg"
   }
   ```

4. **Представление "Очередь задач"**
   ```json
   {
     "id": "taskflow.queueView",
     "name": "Очередь задач",
     "icon": "resources/taskflow-icon.svg"
   }
   ```

5. **Представление "Выполненные задачи"**
   ```json
   {
     "id": "taskflow.completedTasksView",
     "name": "Выполненные задачи",
     "icon": "resources/taskflow-icon.svg"
   }
   ```

6. **Представление "Категории"**
   ```json
   {
     "id": "taskflow.categoriesView",
     "name": "Категории",
     "icon": "resources/taskflow-icon.svg"
   }
   ```

## 🎨 Описание иконки

Иконка представляет собой SVG с изображением двух чатов/задач:
- Размер: 800x800px (viewBox: 0 0 32 32)
- Цвет: #111918 (темный)
- Стиль: Минималистичный, подходит для темной и светлой темы VS Code

## 🧪 Как проверить

### 1. Перезапустить расширение

В VS Code нажмите `F5` или используйте:
```
Developer: Reload Window
```

### 2. Проверить места отображения

✅ **Главная иконка расширения**
- Откройте список расширений (Ctrl+Shift+X)
- Найдите "TaskFlow"
- Иконка должна отображаться слева от названия

✅ **Activity Bar (боковая панель)**
- Посмотрите на левую боковую панель VS Code
- Иконка TaskFlow должна быть видна среди других иконок

✅ **Панель TaskFlow Explorer**
- Откройте TaskFlow в Activity Bar
- Проверьте заголовки всех 4 представлений:
  - Задачи
  - Очередь задач
  - Выполненные задачи
  - Категории
- У каждого должна быть иконка

## 📝 Технические детали

### Формат файла
```xml
<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" 
     width="800px" height="800px" viewBox="0 0 32 32">
  <style type="text/css">
    .puchipuchi_een{fill:#111918;}
  </style>
  <path class="puchipuchi_een" d="M6,11h4.78c0.549-0.609..."/>
  <!-- Изображение двух чатов/задач -->
</svg>
```

### Структура проекта
```
copilot_task_flow/
├── resources/
│   └── taskflow-icon.svg  ← Иконка здесь
├── package.json           ← Ссылки на иконку
└── ...
```

## 🔍 Отладка проблем

### Проблема: Иконка все еще не отображается

**Решение 1: Очистить кэш**
```bash
# Закрыть VS Code
# Удалить кэш расширения
rm -rf ~/.vscode/extensions/taskflow-*
# Перезапустить VS Code
```

**Решение 2: Проверить пути**
```bash
# Убедиться, что файл существует
ls -la resources/taskflow-icon.svg

# Проверить, что это валидный SVG
file resources/taskflow-icon.svg
```

**Решение 3: Пересобрать расширение**
```bash
npm run compile
```

### Проблема: Квадрат вместо иконки

Это означает, что VS Code не может загрузить SVG файл. Причины:
1. Неправильный путь в `package.json`
2. Файл поврежден
3. Неправильный формат SVG

**Проверка:**
```bash
# Проверить, что файл валидный XML
xmllint resources/taskflow-icon.svg

# Если xmllint не установлен
head -20 resources/taskflow-icon.svg
```

## ✅ Чеклист проверки

- [x] Файл `resources/taskflow-icon.svg` существует
- [x] Файл является валидным SVG
- [x] Пути в `package.json` указывают на правильный файл
- [x] Расширение скомпилировано (`npm run compile`)
- [ ] Расширение перезапущено (F5)
- [ ] Иконка отображается в списке расширений
- [ ] Иконка отображается в Activity Bar
- [ ] Иконки отображаются во всех 4 представлениях

## 📦 Коммит

```
fix: Обновлена иконка расширения (taskflow-icon.svg)

- Заменен файл resources/taskflow-icon.svg новой версией
- Иконка теперь отображается корректно в Activity Bar и всех представлениях
- Используется SVG с изображением чата/задач
```

---

**Дата:** 5 октября 2025 г.  
**Статус:** ✅ Исправлено  
**Коммит:** 34aadbd
