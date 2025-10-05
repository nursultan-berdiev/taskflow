# 🔍 Анализ: Как отследить запуск и завершение GitHub Copilot Chat

## 📋 Текущая ситуация

### Что мы делаем сейчас

```typescript
// 1. Открываем панель Copilot Chat
await vscode.commands.executeCommand("workbench.panel.chat.view.copilot.focus");

// 2. Отправляем промпт
await vscode.commands.executeCommand("workbench.action.chat.open", {
  query: prompt,
});

// 3. Показываем уведомление
vscode.window.showInformationMessage(
  `Запрос отправлен в Copilot для задачи: ${task.title}`
);
```

### ❓ Вопросы

1. **Что возвращает `executeCommand("workbench.action.chat.open")`?**
2. **Можем ли мы узнать, что запрос реально отправлен?**
3. **Можем ли мы узнать, когда Copilot начал генерацию?**
4. **Можем ли мы узнать, когда Copilot закончил генерацию?**
5. **Есть ли события (events) для отслеживания состояния?**

---

## 🔬 Что говорит документация VS Code

### 1. Команда `workbench.action.chat.open`

**Найдено в документации**: ❌ НЕТ официальной документации

**Статус**: Это **internal command** (внутренняя команда VS Code)

**Проблемы**:

- ❌ Не задокументирована в VS Code API
- ❌ Может измениться в любой момент
- ❌ Нет описания параметров
- ❌ Нет описания возвращаемого значения
- ❌ Нет гарантий работы

**Что мы знаем** (из практики):

```typescript
await vscode.commands.executeCommand("workbench.action.chat.open", {
  query: string, // Текст промпта
  // Другие параметры неизвестны
});
```

**Что возвращает**: `Promise<unknown>`

- Скорее всего, `undefined` или `void`
- Возвращается **сразу после открытия чата**
- **НЕ** ждет завершения генерации

---

### 2. Команда `workbench.panel.chat.view.copilot.focus`

**Найдено в документации**: ❌ НЕТ официальной документации

**Статус**: Внутренняя команда для фокусировки панели Copilot Chat

**Что делает**:

- Открывает/фокусирует панель Copilot Chat
- Возвращает `Promise<void>`
- Завершается **мгновенно**

---

### 3. Команда `vscode.editorChat.start`

**Найдено в документации**: ✅ ДА (встроенная команда)

```typescript
`vscode.editorChat.start` - Invoke a new editor chat session
* Run arguments - (нет)
* Returns - no result
```

**Проблема**: Это для **Inline Chat** (в редакторе), а не для **Chat Panel**!

**Не подходит** для нашей задачи.

---

### 4. Chat Participant API

**Найдено в документации**: ✅ ДА (полная документация)

```typescript
// Создание своего Chat Participant
const participant = vscode.chat.createChatParticipant(
  "myapp.assistant",
  handler
);

const handler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => {
  // Получаем запрос от пользователя
  const userPrompt = request.prompt;

  // Отправляем в Language Model
  const chatResponse = await request.model.sendRequest(messages, {}, token);

  // Стримим ответ
  for await (const fragment of chatResponse.text) {
    stream.markdown(fragment);
  }

  // ✅ Здесь мы ЗНАЕМ, что генерация завершена!
};
```

**Преимущества**:

- ✅ Полный контроль над процессом генерации
- ✅ Знаем, когда запрос начался
- ✅ Знаем, когда генерация завершилась
- ✅ Получаем результат генерации
- ✅ Можем обрабатывать ошибки

**Недостатки**:

- ❌ Это **наш** participant, а не встроенный Copilot Chat
- ❌ Нет контекста проекта, который есть у Copilot Chat
- ❌ Нужно реализовать всю логику самим

---

### 5. Language Model API

**Найдено в документации**: ✅ ДА (полная документация)

```typescript
// Прямой доступ к модели
const [model] = await vscode.lm.selectChatModels({
  vendor: "copilot",
  family: "gpt-4o",
});

const messages = [vscode.LanguageModelChatMessage.User(prompt)];

// Отправляем запрос
const response = await model.sendRequest(messages, {}, token);

// ✅ Знаем, когда начали
console.log("Генерация началась...");

// Стримим ответ
for await (const fragment of response.text) {
  console.log("Получен фрагмент:", fragment);
}

// ✅ Знаем, когда закончили!
console.log("Генерация завершена!");
```

**Преимущества**:

- ✅ Программный доступ к модели
- ✅ Знаем, когда запрос начался
- ✅ Знаем, когда генерация завершилась
- ✅ Получаем полный результат

**Недостатки**:

- ❌ Нет контекста проекта (файлы, workspace)
- ❌ Нет @workspace, @file и других capabilities
- ❌ Качество хуже, чем у Copilot Chat
- ❌ Требует consent (согласие пользователя)
- ❌ Квоты на запросы

---

## 🎯 Ответы на вопросы

### ❓ Q1: Что возвращает `executeCommand("workbench.action.chat.open")`?

**Ответ**: `Promise<unknown>`, скорее всего `undefined`

**Детали**:

```typescript
const result = await vscode.commands.executeCommand(
  "workbench.action.chat.open",
  { query: prompt }
);

console.log(result); // undefined или void
```

**Проблема**:

- Команда возвращается **СРАЗУ** после открытия чата
- **НЕ** ждет отправки промпта
- **НЕ** ждет начала генерации
- **НЕ** ждет завершения генерации

---

### ❓ Q2: Можем ли мы узнать, что запрос реально отправлен?

**Ответ**: ❌ **НЕТ** с текущим подходом

**Причины**:

1. `workbench.action.chat.open` - недокументированная команда
2. Нет возвращаемого значения, указывающего на успех
3. Нет событий (events) об отправке запроса
4. Нет API для отслеживания состояния чата

**Что мы можем** (с ограничениями):

```typescript
try {
  await vscode.commands.executeCommand("workbench.action.chat.open", {
    query: prompt,
  });

  // ✅ Команда выполнилась без ошибки
  // ⚠️ НО это НЕ значит, что промпт реально отправлен!
  // Возможно, только открылся чат
} catch (error) {
  // ❌ Команда выполнилась с ошибкой
  // Точно НЕ отправлено
}
```

---

### ❓ Q3: Можем ли мы узнать, когда Copilot начал генерацию?

**Ответ**: ❌ **НЕТ** с встроенным Copilot Chat

**Почему**:

- Copilot Chat - это **UI компонент**, а не API
- Нет событий (events) о начале генерации
- Нет способа подписаться на изменения состояния
- Нет доступа к внутреннему состоянию чата

**Альтернативы**:

1. ✅ Использовать **свой Chat Participant** - будем знать точно
2. ✅ Использовать **Language Model API** - будем знать точно
3. ❌ Парсить UI (не рекомендуется и невозможно через API)

---

### ❓ Q4: Можем ли мы узнать, когда Copilot закончил генерацию?

**Ответ**: ❌ **НЕТ** с встроенным Copilot Chat

**Почему**:

- Те же причины, что и для Q3
- Нет событий о завершении
- Нет колбэков
- Нет Promise, который резолвится после генерации

**Что мы НЕ можем**:

```typescript
// ❌ Это НЕ работает так:
const result = await vscode.commands.executeCommand(
  "workbench.action.chat.open",
  { query: prompt }
);

// result НЕ содержит информации о завершении генерации!
```

**Альтернативы**:

1. ✅ **Свой Chat Participant** + `for await (const fragment of response.text)`
2. ✅ **Language Model API** + стриминг
3. ⚠️ **Спрашивать пользователя** (текущий подход) - надежно, но требует участия

---

### ❓ Q5: Есть ли события (events) для отслеживания состояния Copilot Chat?

**Ответ**: ❌ **НЕТ** для встроенного Copilot Chat

**Поиск в VS Code API**:

```typescript
// Поиск событий, связанных с чатом:
vscode.chat.* // Есть API для создания своих participants
vscode.window.onDidChangeActiveTextEditor // Нет связи с чатом
vscode.workspace.onDidChangeTextDocument // Не относится к чату
vscode.commands.onDidExecuteCommand // Не существует такого события!
```

**Что ЕСТЬ в API**:

- `vscode.chat.createChatParticipant()` - создание своего participant
- `ChatRequestHandler` - обработчик запросов **нашего** participant
- `ChatResponseStream` - стрим ответа **нашего** participant

**Что ОТСУТСТВУЕТ**:

- ❌ События для встроенного Copilot Chat
- ❌ API для мониторинга состояния Copilot Chat
- ❌ Способ подписаться на изменения в панели Copilot

---

## 📊 Сравнительная таблица подходов

| Подход                                   | Знаем о запуске | Знаем о завершении | Контекст проекта  | Сложность     |
| ---------------------------------------- | --------------- | ------------------ | ----------------- | ------------- |
| **Текущий** (workbench.action.chat.open) | ❌ НЕТ          | ❌ НЕТ             | ✅ Да (у Copilot) | ✅ Легко      |
| **Спрашивать пользователя**              | ⚠️ Косвенно     | ✅ ДА              | ✅ Да (у Copilot) | ✅ Легко      |
| **Свой Chat Participant**                | ✅ ДА           | ✅ ДА              | ❌ Нет            | ⚠️ Средне     |
| **Language Model API**                   | ✅ ДА           | ✅ ДА              | ❌ Нет            | ⚠️ Средне     |
| **Парсинг UI**                           | ❌ Невозможно   | ❌ Невозможно      | -                 | ❌ Невозможно |

---

## 🎯 Рекомендации

### Для текущей версии (2.0.1)

**✅ Текущее решение оптимально**:

```typescript
// 1. Отправляем в Copilot Chat (используем полный контекст проекта)
await vscode.commands.executeCommand("workbench.action.chat.open", {
  query: prompt,
});

// 2. Спрашиваем пользователя о завершении (persistent уведомление)
let userChoice: string | undefined;
while (!userChoice) {
  userChoice = await vscode.window.showInformationMessage(
    `✅ Код сгенерирован для задачи: "${task.title}"...`,
    { modal: false },
    "✅ Завершить задачу",
    "⏭️ Пропустить задачу"
  );
  if (!userChoice) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
```

**Почему это хорошо**:

- ✅ Используем **полный контекст** Copilot Chat (@workspace, @file, etc.)
- ✅ **Надежно** - пользователь сам подтверждает завершение
- ✅ **Безопасно** - пользователь проверяет код
- ✅ **Просто** - не нужно реализовывать сложную логику

---

### Для версии 3.0.0 (будущее)

**Создать свой Chat Participant с интеграцией TaskFlow**:

```typescript
const participant = vscode.chat.createChatParticipant(
  "taskflow.codeGenerator",
  async (request, context, stream, token) => {
    // ✅ ЗНАЕМ, что запрос начался
    console.log("Генерация началась для задачи:", task.title);

    // Отправляем в модель
    const response = await request.model.sendRequest(messages, {}, token);

    // Стримим результат
    for await (const fragment of response.text) {
      stream.markdown(fragment);
    }

    // ✅ ЗНАЕМ, что генерация завершена!
    console.log("Генерация завершена!");

    // Можем автоматически отметить задачу как выполненную
    await taskManager.completeTask(task.id);

    // Или показать кнопку в чате
    stream.button({
      command: "taskflow.completeTask",
      arguments: [task.id],
      title: "✅ Отметить задачу выполненной",
    });
  }
);
```

**Преимущества**:

- ✅ Полный контроль над процессом
- ✅ Знаем о запуске и завершении
- ✅ Можем добавить кнопки в чат
- ✅ Интеграция TaskFlow напрямую в чат

**Недостатки**:

- ❌ Нет контекста проекта (нужно передавать вручную)
- ❌ Качество может быть хуже встроенного Copilot
- ❌ Больше кода для реализации

---

## 🔍 Эксперименты, которые можно провести

### Эксперимент 1: Проверить возвращаемое значение

```typescript
const result = await vscode.commands.executeCommand(
  "workbench.action.chat.open",
  { query: "Test prompt" }
);

console.log("Type:", typeof result);
console.log("Value:", result);
console.log("JSON:", JSON.stringify(result));
```

**Ожидаемый результат**: `undefined` или `void`

**Реализация**: См. `src/experiments/chatCommandExperiment.ts` → `experimentChatCommand()`

---

### Эксперимент 2: Проверить доступные команды

```typescript
const commands = await vscode.commands.getCommands();
const chatCommands = commands.filter(
  (cmd) => cmd.includes("chat") || cmd.includes("copilot")
);

console.log("Chat-related commands:", chatCommands);
```

**Ожидаемый результат**: Список всех команд, связанных с чатом

**Реализация**: См. `src/experiments/chatCommandExperiment.ts` → `experimentListChatCommands()`

---

### Эксперимент 3: Проверить параметры команды

```typescript
// Попробовать разные параметры
await vscode.commands.executeCommand("workbench.action.chat.open", {
  query: "Test",
  participant: "@workspace",
  command: "explain",
  // Какие еще параметры принимает?
});
```

**Цель**: Узнать, какие параметры поддерживаются

**Примечание**: Реализовано в `experimentChatCommand()` с замером времени выполнения

---

## 🧪 Как запустить эксперименты

Эксперименты реализованы в файле `src/experiments/chatCommandExperiment.ts`:

```typescript
// Функция 1: Тестирует возвращаемое значение команды
export async function experimentChatCommand(context: vscode.ExtensionContext) {
  // Замеряет время выполнения команды
  // Выводит тип и значение результата
  // Показывает, когда Promise резолвится
}

// Функция 2: Выводит список всех chat-команд
export async function experimentListChatCommands() {
  // Получает список всех команд VS Code
  // Фильтрует по ключевым словам "chat", "copilot"
  // Выводит результат в Output channel
}
```

**Чтобы запустить эксперименты**:

1. Добавьте команды в `src/extension.ts`:

```typescript
import { experimentChatCommand, experimentListChatCommands } from './experiments/chatCommandExperiment';

export function activate(context: vscode.ExtensionContext) {
  // Существующий код...
  
  // Регистрируем экспериментальные команды
  context.subscriptions.push(
    vscode.commands.registerCommand('taskflow.experiment.chatCommand', () => {
      experimentChatCommand(context);
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('taskflow.experiment.listChatCommands', () => {
      experimentListChatCommands();
    })
  );
}
```

2. Добавьте команды в `package.json`:

```json
"contributes": {
  "commands": [
    // Существующие команды...
    {
      "command": "taskflow.experiment.chatCommand",
      "title": "🧪 TaskFlow: Test Chat Command"
    },
    {
      "command": "taskflow.experiment.listChatCommands",
      "title": "🧪 TaskFlow: List Chat Commands"
    }
  ]
}
```

3. Запустите через Command Palette:
   - `F5` → открыть Extension Development Host
   - `Ctrl+Shift+P` → `TaskFlow: Test Chat Command`
   - `Ctrl+Shift+P` → `TaskFlow: List Chat Commands`

---

## 📚 Итоговые выводы

### ❌ Что мы НЕ можем узнать программно

1. **Отправлен ли запрос** в Copilot Chat
2. **Начал ли Copilot** генерацию кода
3. **Завершил ли Copilot** генерацию кода
4. **Какой результат** сгенерировал Copilot

### ✅ Что мы МОЖЕМ узнать

1. **Выполнилась ли команда** без ошибок (try/catch)
2. **Подтверждение пользователя** через persistent уведомление
3. **Применил ли пользователь** код (косвенно, через подтверждение)

### 🎯 Оптимальная стратегия

**Для текущей версии**:

- ✅ Использовать **встроенный Copilot Chat** (полный контекст)
- ✅ **Спрашивать пользователя** о завершении (persistent notification)
- ✅ **Надежно и безопасно**

**Для будущего (v3.0.0)**:

- ✅ Создать **свой Chat Participant** `@taskflow`
- ✅ Полный контроль над процессом генерации
- ✅ Интеграция кнопок в чат
- ✅ Автоматическое отслеживание состояния

---

**Вывод**: С текущим API VS Code **нет способа** программно отследить запуск и завершение встроенного Copilot Chat. Лучшее решение - **спрашивать пользователя** (что мы и делаем в v2.0.1)! 🎯
