// Эксперимент: Проверить возвращаемое значение команды workbench.action.chat.open

import * as vscode from "vscode";

export async function experimentChatCommand() {
  console.log("=== Эксперимент: workbench.action.chat.open ===");

  try {
    console.log("1. Выполняем команду...");
    const startTime = Date.now();

    const result = await vscode.commands.executeCommand(
      "workbench.action.chat.open",
      { query: "Привет! Это тестовый промпт." }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("2. Команда выполнена за:", duration, "ms");
    console.log("3. Type результата:", typeof result);
    console.log("4. Value результата:", result);
    console.log("5. JSON результата:", JSON.stringify(result));
    console.log("6. result === undefined:", result === undefined);
    console.log("7. result === void 0:", result === void 0);

    // Проверяем, что команда вернулась быстро (не ждала генерации)
    if (duration < 1000) {
      console.log("✅ Команда вернулась быстро (<1сек) - НЕ ждала генерации");
    } else {
      console.log("⚠️ Команда выполнялась долго (>1сек)");
    }
  } catch (error) {
    console.error("❌ Ошибка:", error);
  }

  console.log("=== Конец эксперимента ===");
}

export async function experimentListChatCommands() {
  console.log("=== Эксперимент: Список команд чата ===");

  const commands = await vscode.commands.getCommands();

  const chatCommands = commands.filter(
    (cmd) =>
      cmd.toLowerCase().includes("chat") ||
      cmd.toLowerCase().includes("copilot")
  );

  console.log("Найдено команд:", chatCommands.length);
  console.log("Команды:");
  chatCommands.forEach((cmd) => console.log("  -", cmd));

  console.log("=== Конец эксперимента ===");
}

// Чтобы запустить эксперименты, добавьте в extension.ts:
//
// context.subscriptions.push(
//   vscode.commands.registerCommand(
//     'taskflow.experiment.chatCommand',
//     experimentChatCommand
//   )
// );
//
// context.subscriptions.push(
//   vscode.commands.registerCommand(
//     'taskflow.experiment.listCommands',
//     experimentListChatCommands
//   )
// );
