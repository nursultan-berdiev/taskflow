# TaskFlow - Установка и запуск

## 📦 Для пользователей

### Установка из VS Code Marketplace (после публикации)

1. Откройте VS Code
2. Перейдите в раздел Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Найдите "TaskFlow"
4. Нажмите "Install"
5. Перезагрузите VS Code при необходимости

### Установка из .vsix файла

Если у вас есть файл .vsix:

```bash
code --install-extension taskflow-0.1.0.vsix
```

Или через UI:

1. Extensions → ⋯ (меню) → Install from VSIX...
2. Выберите .vsix файл
3. Перезагрузите VS Code

## 🛠️ Для разработчиков

### Требования

- **Node.js**: >= 14.x (рекомендуется 18.x LTS)
- **npm**: >= 6.x
- **VS Code**: >= 1.80.0
- **Git**: для клонирования репозитория

Проверка версий:

```bash
node --version   # v18.16.0 или выше
npm --version    # 9.x или выше
code --version   # 1.80.0 или выше
```

### Клонирование репозитория

```bash
# HTTPS
git clone https://github.com/yourusername/taskflow.git

# SSH
git clone git@github.com:yourusername/taskflow.git

# Переход в директорию
cd taskflow
```

### Установка зависимостей

```bash
npm install
```

Это установит:

- TypeScript
- VS Code Extension API types
- ESLint и плагины
- Mocha для тестирования
- uuid для генерации ID
- и другие зависимости

### Компиляция

```bash
# Однократная компиляция
npm run compile

# Компиляция с отслеживанием изменений
npm run watch
```

Скомпилированные файлы будут в папке `out/`.

### Запуск в режиме разработки

#### Способ 1: Через VS Code

1. Откройте проект в VS Code
2. Нажмите **F5** (или Run → Start Debugging)
3. Откроется новое окно "Extension Development Host" с активированным расширением
4. Откройте любой проект в этом окне
5. Используйте TaskFlow

#### Способ 2: Через команду

```bash
# В терминале VS Code
npm run watch  # в одном терминале

# В другом терминале или через F5
```

### Отладка

#### Точки останова

1. Установите breakpoint в TypeScript коде
2. Запустите расширение (F5)
3. Выполните действие, которое триггерит код
4. Отладчик остановится на breakpoint

#### Логирование

```typescript
// В Development Mode
console.log("Debug info:", data);

// Output Channel (видно пользователям)
const outputChannel = vscode.window.createOutputChannel("TaskFlow");
outputChannel.appendLine("Info message");
outputChannel.show();
```

#### Developer Tools

В окне Extension Development Host:

- **Ctrl+Shift+I** (Windows/Linux) или **Cmd+Option+I** (macOS) - открыть DevTools
- Во вкладке Console увидите console.log()
- Network, Performance, Memory для профилирования

### Тестирование

```bash
# Запуск всех тестов
npm test

# Только компиляция тестов
npm run compile

# Линтинг
npm run lint
```

### Упаковка расширения

#### Установка vsce

```bash
npm install -g @vscode/vsce
```

#### Создание .vsix файла

```bash
# Убедитесь что проект скомпилирован
npm run compile

# Создание пакета
vsce package

# Результат: taskflow-0.1.0.vsix
```

#### Установка локального .vsix

```bash
code --install-extension taskflow-0.1.0.vsix
```

### Публикация в Marketplace

#### Подготовка

1. **Создайте Azure DevOps организацию**

   - Перейдите на https://dev.azure.com
   - Создайте новую организацию

2. **Создайте Personal Access Token**

   - User Settings → Personal Access Tokens
   - New Token
   - Name: "VS Code Marketplace"
   - Organization: All accessible organizations
   - Scopes: Marketplace → Manage
   - Скопируйте токен (покажется только раз!)

3. **Зарегистрируйте publisher**
   - Перейдите на https://marketplace.visualstudio.com/manage
   - Create publisher
   - ID: уникальное имя (например, yourname-taskflow)

#### Вход в vsce

```bash
vsce login <publisher-name>
# Вставьте Personal Access Token
```

#### Публикация

```bash
# Первая публикация
vsce publish

# Обновление версии
vsce publish patch  # 0.1.0 -> 0.1.1
vsce publish minor  # 0.1.0 -> 0.2.0
vsce publish major  # 0.1.0 -> 1.0.0

# Конкретная версия
vsce publish 1.0.0
```

## 🔧 Конфигурация разработки

### VS Code Settings для разработки

Создайте `.vscode/settings.json` (уже есть в проекте):

```json
{
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": ["typescript"]
}
```

### Рекомендуемые расширения

В `.vscode/extensions.json` (уже настроено):

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "github.copilot",
    "github.copilot-chat"
  ]
}
```

## 🔄 Рабочий процесс разработки

### Типичный workflow

```bash
# 1. Создать ветку для функции
git checkout -b feature/my-feature

# 2. Запустить watch mode
npm run watch

# 3. Запустить Extension Development Host (F5)

# 4. Разработка + тестирование
# Редактировать код → сохранить → перезагрузить окно (Ctrl+R)

# 5. Commit изменений
git add .
git commit -m "feat: add my feature"

# 6. Запустить тесты
npm test

# 7. Проверить линтинг
npm run lint

# 8. Push и создать PR
git push origin feature/my-feature
```

### Hot Reload

При изменении кода:

1. Файлы автоматически перекомпилируются (если запущен `npm run watch`)
2. В Extension Development Host нажмите **Ctrl+R** (или Cmd+R)
3. Расширение перезагрузится с новым кодом

## 🐛 Troubleshooting

### Проблема: "Cannot find module 'vscode'"

**Решение:**

```bash
npm install
npm run compile
```

### Проблема: Изменения не применяются

**Решение:**

1. Убедитесь, что `npm run watch` запущен
2. Перезагрузите Extension Development Host (Ctrl+R)
3. Проверьте консоль на ошибки компиляции

### Проблема: Тесты не запускаются

**Решение:**

```bash
# Очистить и переустановить
rm -rf node_modules out
npm install
npm run compile
npm test
```

### Проблема: ESLint ошибки

**Решение:**

```bash
# Автоматическое исправление
npm run lint -- --fix

# Или вручную исправить ошибки
```

### Проблема: Extension не активируется

**Решение:**

1. Проверьте `activationEvents` в package.json
2. Проверьте консоль на ошибки (Ctrl+Shift+I)
3. Убедитесь что extension.ts экспортирует `activate()`

## 📁 Структура после установки

```
taskflow/
├── node_modules/          # Зависимости (не коммитить)
├── out/                   # Скомпилированный JS (не коммитить)
│   ├── extension.js
│   ├── models/
│   ├── managers/
│   └── ...
├── src/                   # Исходники TypeScript
│   ├── extension.ts
│   └── ...
├── resources/             # Иконки и ресурсы
├── .vscode/              # VS Code конфигурация
├── package.json          # Манифест
├── tsconfig.json         # TypeScript конфиг
└── README.md             # Документация
```

## 🎯 Проверка установки

После установки проверьте:

```bash
# 1. Компиляция
npm run compile
# Должно завершиться без ошибок

# 2. Линтинг
npm run lint
# Должно быть 0 ошибок

# 3. Расширение в VS Code
code .
# F5 → новое окно должно открыться
# Ctrl+Shift+P → "TaskFlow" должен быть в списке

# 4. Тесты (опционально)
npm test
```

## 📚 Следующие шаги

После успешной установки:

1. 📖 Читайте [QUICK_START.md](QUICK_START.md) для быстрого начала
2. 🏗️ Изучите [ARCHITECTURE.md](ARCHITECTURE.md) для понимания структуры
3. 👨‍💻 Следуйте [DEVELOPMENT.md](DEVELOPMENT.md) для разработки
4. 🤝 Читайте [CONTRIBUTING.md](CONTRIBUTING.md) перед созданием PR

## 💡 Полезные команды

```bash
# Разработка
npm run watch              # Автокомпиляция
npm run compile            # Разовая компиляция
npm run lint               # Проверка кода
npm run lint -- --fix      # Авто-исправление
npm test                   # Запуск тестов

# Упаковка
vsce package              # Создать .vsix
vsce publish              # Опубликовать

# Git
git status                # Статус изменений
git log --oneline         # История коммитов
git checkout -b <branch>  # Новая ветка

# VS Code
code .                    # Открыть в VS Code
code --list-extensions    # Установленные расширения
```

## 🆘 Получение помощи

Если возникли проблемы:

1. 🔍 Проверьте [TROUBLESHOOTING.md](#) (если есть)
2. 💬 Создайте [GitHub Issue](https://github.com/yourusername/taskflow/issues)
3. 📧 Напишите на support@taskflow.dev
4. 💭 Спросите в [Discussions](https://github.com/yourusername/taskflow/discussions)

---

**Готово! Теперь вы можете разрабатывать и использовать TaskFlow! 🚀**
