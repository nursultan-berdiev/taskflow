import * as vscode from "vscode";
import { TaskManager } from "./managers/taskManager";
import { InstructionManager } from "./managers/instructionManager";
import { TaskTreeProvider } from "./views/taskTreeProvider";
import { QueueTreeProvider } from "./views/queueTreeProvider";
import { CompletedTasksTreeProvider } from "./views/completedTasksTreeProvider";
import { InstructionTreeProvider } from "./views/instructionTreeProvider";
import { CopilotIntegration } from "./integrations/copilotIntegration";
import { Task, Priority, TaskStatus } from "./models/task";

/**
 * Активация расширения
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    console.log("TaskFlow расширение активируется...");

    // Инициализация менеджера задач
    const taskManager = new TaskManager(context);
    taskManager.initialize();
    console.log("TaskManager инициализирован");

    // Инициализация менеджера инструкций
    const instructionManager = new InstructionManager(context);
    instructionManager.initialize();
    console.log("InstructionManager инициализирован");

    // Инициализация провайдера TreeView для задач
    console.log("Создание TaskTreeProvider...");
    const taskTreeProvider = new TaskTreeProvider(taskManager);
    const tasksView = vscode.window.createTreeView("taskflow.tasksView", {
      treeDataProvider: taskTreeProvider,
      showCollapseAll: true,
      canSelectMany: false,
    });
    console.log("TaskTreeProvider создан");

    // Инициализация провайдера TreeView для очереди
    console.log("Создание QueueTreeProvider...");
    const queueTreeProvider = new QueueTreeProvider(taskManager);
    const queueView = vscode.window.createTreeView("taskflow.queueView", {
      treeDataProvider: queueTreeProvider,
      showCollapseAll: true,
      canSelectMany: false,
    });
    console.log("QueueTreeProvider создан");

    // Инициализация провайдера TreeView для выполненных задач
    console.log("Создание CompletedTasksTreeProvider...");
    const completedTasksTreeProvider = new CompletedTasksTreeProvider(
      taskManager
    );
    const completedTasksView = vscode.window.createTreeView(
      "taskflow.completedTasksView",
      {
        treeDataProvider: completedTasksTreeProvider,
        showCollapseAll: true,
        canSelectMany: false,
      }
    );
    console.log("CompletedTasksTreeProvider создан");

    // Инициализация провайдера TreeView для инструкций
    console.log("Создание InstructionTreeProvider...");
    const instructionTreeProvider = new InstructionTreeProvider(
      instructionManager
    );
    const instructionsView = vscode.window.createTreeView(
      "taskflow.instructionsView",
      {
        treeDataProvider: instructionTreeProvider,
        showCollapseAll: false,
        canSelectMany: false,
      }
    );
    console.log("InstructionTreeProvider создан");

    // Инициализация интеграции с Copilot
    console.log("Создание CopilotIntegration...");
    const copilotIntegration = new CopilotIntegration(
      context,
      instructionManager
    );
    console.log("CopilotIntegration создан");

    // Регистрация команд
    console.log("Регистрация команд...");
    registerCommands(
      context,
      taskManager,
      instructionManager,
      taskTreeProvider,
      copilotIntegration
    );
    console.log("Команды зарегистрированы");

    // Добавление в подписки для очистки
    console.log("Добавление в subscriptions...");
    context.subscriptions.push(
      tasksView,
      queueView,
      completedTasksView,
      instructionsView,
      taskManager,
      instructionManager
    );

    // Показать приветственное сообщение при первом запуске
    showWelcomeMessage(context);

    console.log("TaskFlow расширение успешно активировано!");
  } catch (error) {
    console.error("ОШИБКА активации TaskFlow:", error);
    vscode.window.showErrorMessage(
      `Ошибка активации TaskFlow: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error; // Пробрасываем ошибку дальше
  }
}

/**
 * Регистрация команд расширения
 */
function registerCommands(
  context: vscode.ExtensionContext,
  taskManager: TaskManager,
  instructionManager: InstructionManager,
  taskTreeProvider: TaskTreeProvider,
  copilotIntegration: CopilotIntegration
) {
  // Инициализация файла задач
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.initializeTasks", async () => {
      await taskManager.initializeTasksFile();
    })
  );

  // Добавление новой задачи
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.addTask", async () => {
      await showAddTaskDialog(taskManager, instructionManager);
    })
  );

  // Редактирование задачи
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.editTask", async (item) => {
      if (item && item.task) {
        await showEditTaskDialog(taskManager, item.task);
      }
    })
  );

  // Удаление задачи
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.deleteTask", async (item) => {
      if (item && item.task) {
        const result = await vscode.window.showWarningMessage(
          `Удалить задачу "${item.task.title}"?`,
          { modal: true },
          "Удалить"
        );

        if (result === "Удалить") {
          await taskManager.deleteTask(item.task.id);
          // Уведомление убрано - не мешает работе
        }
      }
    })
  );

  // Переключение статуса задачи
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.toggleTask", async (item) => {
      if (item && item.task) {
        await taskManager.toggleTask(item.task.id);
        // Уведомление убрано - статус виден в UI
      }
    })
  );

  // Генерация кода с Copilot
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.generateCodeWithCopilot",
      async (item) => {
        if (item && item.task) {
          await copilotIntegration.generateCodeForTask(item.task);
        } else {
          vscode.window.showWarningMessage(
            "Выберите задачу для генерации кода"
          );
        }
      }
    )
  );

  // Обновление списка задач
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.refreshTasks", () => {
      taskTreeProvider.refresh();
      // Уведомление убрано - обновление видно сразу в UI
    })
  );

  // Фильтрация по приоритету
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.filterByPriority", async () => {
      const priority = await vscode.window.showQuickPick(
        [
          { label: "Все", value: null },
          { label: "🔴 Высокий", value: Priority.High },
          { label: "🟡 Средний", value: Priority.Medium },
          { label: "🟢 Низкий", value: Priority.Low },
        ],
        { placeHolder: "Выберите приоритет для фильтрации" }
      );

      if (priority) {
        taskTreeProvider.setFilterPriority(priority.value);
      }
    })
  );

  // Фильтрация по статусу
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.filterByStatus", async () => {
      const status = await vscode.window.showQuickPick(
        [
          { label: "Все", value: null },
          { label: "⏳ Ожидает", value: TaskStatus.Pending },
          { label: "🔄 В процессе", value: TaskStatus.InProgress },
          { label: "✅ Завершено", value: TaskStatus.Completed },
        ],
        { placeHolder: "Выберите статус для фильтрации" }
      );

      if (status) {
        taskTreeProvider.setFilterStatus(status.value);
      }
    })
  );

  // Показать прогресс
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.showProgress", () => {
      const stats = taskManager.calculateProgress();
      const message = `Прогресс: ${stats.completed}/${stats.total} задач (${stats.percentage}%)`;
      vscode.window.showInformationMessage(message);
    })
  );

  // Добавить задачу в очередь
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.addToQueue", async (item) => {
      if (item && item.task) {
        try {
          await taskManager.addToQueue(item.task.id);
          // Уведомление убрано - задача появится в очереди
        } catch (error: any) {
          vscode.window.showErrorMessage(error.message);
        }
      }
    })
  );

  // Удалить задачу из очереди
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.removeFromQueue",
      async (item) => {
        if (item && item.task) {
          try {
            await taskManager.removeFromQueue(item.task.id);
            // Уведомление убрано - задача исчезнет из очереди
          } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
          }
        }
      }
    )
  );

  // Переместить задачу в очереди
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.moveInQueue", async (item) => {
      if (item && item.task && item.task.queuePosition) {
        const queuedTasks = taskManager.getQueuedTasks();
        const newPosition = await vscode.window.showInputBox({
          prompt: `Введите новую позицию (1-${queuedTasks.length})`,
          value: item.task.queuePosition.toString(),
          validateInput: (value) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > queuedTasks.length) {
              return `Позиция должна быть от 1 до ${queuedTasks.length}`;
            }
            return null;
          },
        });

        if (newPosition) {
          try {
            await taskManager.moveInQueue(item.task.id, parseInt(newPosition));
            // Уведомление убрано - новая позиция видна в очереди
          } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
          }
        }
      }
    })
  );

  // Начать следующую задачу из очереди
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.startNextInQueue", async () => {
      try {
        const nextTask = await taskManager.startNextInQueue();
        if (nextTask) {
          const taskId = nextTask.id;
          const taskTitle = nextTask.title;

          // Уведомление убрано - Copilot откроется автоматически

          // Автоматически запустить генерацию кода через Copilot
          const shouldComplete = await copilotIntegration.generateCodeForTask(
            nextTask
          );

          // Если пользователь подтвердил завершение, автоматически завершить задачу
          if (shouldComplete) {
            // Получаем свежий объект задачи
            const currentTask = taskManager.getTaskById(taskId);
            if (currentTask) {
              await taskManager.updateTask(taskId, {
                ...currentTask,
                status: TaskStatus.Completed,
              });
              // Уведомление убрано - статус виден в UI
            }
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(error.message);
      }
    })
  );

  // Завершить текущую и начать следующую
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.completeAndStartNext",
      async (item) => {
        if (item && item.task) {
          try {
            const nextTask = await taskManager.completeAndStartNext(
              item.task.id
            );
            if (nextTask) {
              const nextTaskId = nextTask.id;
              const nextTaskTitle = nextTask.title;

              // Уведомление убрано - следующая задача откроется в Copilot

              // Автоматически запустить генерацию кода через Copilot для следующей задачи
              const shouldComplete =
                await copilotIntegration.generateCodeForTask(nextTask);

              // Если пользователь подтвердил завершение, автоматически завершить следующую задачу
              if (shouldComplete) {
                // Получаем свежий объект задачи
                const currentTask = taskManager.getTaskById(nextTaskId);
                if (currentTask) {
                  await taskManager.updateTask(nextTaskId, {
                    ...currentTask,
                    status: TaskStatus.Completed,
                  });
                  // Уведомление убрано - статус виден в UI
                }
              }
            } else {
              // Уведомление убрано - завершение видно в UI
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
          }
        }
      }
    )
  );

  // Выполнить задачу с Copilot (из очереди)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.executeTaskWithCopilot",
      async (item) => {
        if (item && item.task) {
          try {
            const task = item.task;
            const taskId = task.id;
            const taskTitle = task.title;

            // Запустить генерацию кода через Copilot
            const shouldComplete = await copilotIntegration.generateCodeForTask(
              task
            );

            // Если пользователь подтвердил завершение, отметить задачу как выполненную
            if (shouldComplete) {
              // Получаем свежий объект задачи
              const currentTask = taskManager.getTaskById(taskId);
              if (currentTask) {
                await taskManager.updateTask(taskId, {
                  ...currentTask,
                  status: TaskStatus.Completed,
                });
                // Уведомление убрано - завершение видно в UI
              }
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
          }
        }
      }
    )
  );

  // Показать очередь задач
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.showQueue", async () => {
      const queuedTasks = taskManager.getQueuedTasks();

      if (queuedTasks.length === 0) {
        vscode.window.showInformationMessage("Очередь задач пуста");
        return;
      }

      const items = queuedTasks.map((task) => ({
        label: `${task.queuePosition}. ${task.title}`,
        description: `${task.priority} | ${task.status}`,
        task: task,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Выберите задачу из очереди",
      });

      if (selected) {
        await showTaskDetailsPanel(selected.task, taskManager);
      }
    })
  );

  // Запустить автоматическое выполнение всей очереди
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.runQueueAutomatically",
      async () => {
        const queuedTasks = taskManager.getQueuedTasks();

        if (queuedTasks.length === 0) {
          vscode.window.showInformationMessage("Очередь задач пуста");
          return;
        }

        const result = await vscode.window.showInformationMessage(
          `Запустить автоматическое выполнение очереди из ${queuedTasks.length} задач через Copilot?`,
          { modal: true },
          "Запустить"
        );

        if (result !== "Запустить") {
          return;
        }

        vscode.window.showInformationMessage(
          `Запуск автоматического выполнения очереди из ${queuedTasks.length} задач. Генерация кода через Copilot...`
        );

        // Последовательное выполнение всех задач в очереди
        const totalTasks = queuedTasks.length; // Запомним начальное количество
        let completedCount = 0;
        let errorCount = 0;

        try {
          // Пока в очереди есть задачи
          while (taskManager.getQueuedTasks().length > 0) {
            let taskId: string | undefined;
            let taskTitle: string | undefined;

            try {
              // Запустить следующую задачу из очереди
              const task = await taskManager.startNextInQueue();
              if (!task) {
                break; // Очередь пуста
              }

              // Сохраняем ID и название задачи для использования после асинхронных операций
              taskId = task.id;
              taskTitle = task.title;

              // Уведомление убрано - прогресс виден в Copilot Chat

              // Генерация кода и ожидание подтверждения от пользователя
              // autoComplete=false означает, что будет показан диалог подтверждения
              const userConfirmed =
                await copilotIntegration.generateCodeForTask(task, false);

              // Получаем свежий объект задачи по ID из текущего состояния
              const currentTask = taskManager.getTaskById(taskId);
              if (!currentTask) {
                throw new Error(
                  `Задача с ID ${taskId} не найдена в текущем состоянии`
                );
              }

              if (userConfirmed) {
                // Пользователь подтвердил завершение задачи
                await taskManager.updateTask(taskId, {
                  ...currentTask,
                  status: TaskStatus.Completed,
                });

                // Удалить из очереди
                await taskManager.removeFromQueue(taskId);

                completedCount++;

                // Уведомление убрано - прогресс виден в UI
              } else {
                // Пользователь пропустил задачу
                // Уведомление убрано - пользователь уже видел persistent notification

                // Удаляем из очереди, но НЕ отмечаем как completed
                await taskManager.removeFromQueue(taskId);

                errorCount++;
              }

              // Небольшая задержка между задачами
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (taskError: any) {
              errorCount++;
              const errorMsg = taskTitle
                ? `Ошибка при выполнении задачи "${taskTitle}": ${taskError.message}`
                : `Ошибка при выполнении задачи: ${taskError.message}`;
              vscode.window.showErrorMessage(errorMsg);
              // Продолжаем выполнение остальных задач
              continue;
            }
          }

          // Итоговое сообщение
          if (errorCount === 0) {
            vscode.window.showInformationMessage(
              `🎉 Автоматическое выполнение очереди завершено! Выполнено задач: ${completedCount}/${totalTasks}`
            );
          } else {
            vscode.window.showWarningMessage(
              `Выполнение очереди завершено с ошибками. Выполнено: ${completedCount}, ошибок: ${errorCount}`
            );
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Критическая ошибка при выполнении очереди: ${error.message}`
          );
        }
      }
    )
  );

  // Показать детали задачи
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.showTaskDetails",
      async (task: Task) => {
        await showTaskDetailsPanel(task, taskManager);
      }
    )
  );

  // === Команды для управления инструкциями ===

  // Создать новую инструкцию
  context.subscriptions.push(
    vscode.commands.registerCommand("taskflow.createInstruction", async () => {
      const name = await vscode.window.showInputBox({
        prompt: "Введите название инструкции",
        placeHolder: "Например: Создание REST API",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Название не может быть пустым";
          }
          return null;
        },
      });

      if (!name) {
        return;
      }

      const description = await vscode.window.showInputBox({
        prompt: "Введите описание инструкции (необязательно)",
        placeHolder: "Краткое описание того, для чего используется инструкция",
      });

      const content = await vscode.window.showInputBox({
        prompt: "Введите текст инструкции для Copilot",
        placeHolder: "Пожалуйста, сгенерируй код следуя правилам...",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Инструкция не может быть пустой";
          }
          return null;
        },
      });

      if (!content) {
        return;
      }

      try {
        const instruction = await instructionManager.createInstruction(
          name,
          content,
          description
        );
        vscode.window.showInformationMessage(
          `Инструкция "${instruction.name}" создана`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Ошибка при создании инструкции: ${error.message}`
        );
      }
    })
  );

  // Просмотр инструкции
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.viewInstruction",
      async (instruction) => {
        if (!instruction) {
          return;
        }

        const instructionData = instruction.instruction || instruction;

        const panel = vscode.window.createWebviewPanel(
          "instructionView",
          instructionData.name,
          vscode.ViewColumn.One,
          { enableScripts: false }
        );

        panel.webview.html = getInstructionWebviewContent(instructionData);
      }
    )
  );

  // Редактировать инструкцию
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.editInstruction",
      async (item) => {
        if (!item || !item.instruction) {
          return;
        }

        const instruction = item.instruction;

        if (instruction.isDefault) {
          vscode.window.showWarningMessage(
            "Инструкцию по умолчанию нельзя редактировать"
          );
          return;
        }

        try {
          await instructionManager.openInstruction(instruction.id);
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Ошибка при открытии инструкции: ${error.message}`
          );
        }
      }
    )
  );

  // Удалить инструкцию
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.deleteInstruction",
      async (item) => {
        if (!item || !item.instruction) {
          return;
        }

        const instruction = item.instruction;

        if (instruction.isDefault) {
          vscode.window.showWarningMessage(
            "Инструкцию по умолчанию нельзя удалить"
          );
          return;
        }

        const result = await vscode.window.showWarningMessage(
          `Удалить инструкцию "${instruction.name}"?`,
          { modal: true },
          "Удалить"
        );

        if (result !== "Удалить") {
          return;
        }

        try {
          await instructionManager.deleteInstruction(instruction.id);
          vscode.window.showInformationMessage(
            `Инструкция "${instruction.name}" удалена`
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Ошибка при удалении инструкции: ${error.message}`
          );
        }
      }
    )
  );

  // Назначить инструкцию задаче
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.assignInstructionToTask",
      async (item) => {
        if (!item || !item.task) {
          return;
        }

        const task = item.task;
        const instructions = instructionManager.getAllInstructions();

        const items = instructions.map((inst) => ({
          label: inst.name,
          description: inst.isDefault ? "По умолчанию" : inst.description,
          instruction: inst,
          picked: task.instructionId === inst.id,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Выберите инструкцию для задачи",
        });

        if (!selected) {
          return;
        }

        try {
          const instructionId =
            selected.instruction.id === "default"
              ? undefined
              : selected.instruction.id;

          await taskManager.updateTask(task.id, {
            ...task,
            instructionId,
          });

          vscode.window.showInformationMessage(
            `Инструкция "${selected.instruction.name}" назначена задаче "${task.title}"`
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Ошибка при назначении инструкции: ${error.message}`
          );
        }
      }
    )
  );

  // Обновить список инструкций
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "taskflow.refreshInstructions",
      async () => {
        await instructionManager.initialize();
      }
    )
  );
}

/**
 * Диалог добавления новой задачи
 */
async function showAddTaskDialog(
  taskManager: TaskManager,
  instructionManager: InstructionManager
): Promise<void> {
  // Название задачи
  const title = await vscode.window.showInputBox({
    prompt: "Введите название задачи",
    placeHolder: "Например: Реализовать API авторизации",
    validateInput: (value) => {
      return value.trim() ? null : "Название задачи не может быть пустым";
    },
  });

  if (!title) {
    return;
  }

  // Описание задачи
  const description = await vscode.window.showInputBox({
    prompt: "Введите описание задачи (необязательно)",
    placeHolder: "Подробное описание задачи",
  });

  // Категория
  const categories = taskManager.getCategories();
  const categoryItems = [
    { label: "$(add) Создать новую категорию", value: "__new__" },
    ...categories.map((cat) => ({ label: cat, value: cat })),
  ];

  const selectedCategory = await vscode.window.showQuickPick(categoryItems, {
    placeHolder: "Выберите категорию (необязательно)",
  });

  let category: string | undefined;
  if (selectedCategory) {
    if (selectedCategory.value === "__new__") {
      category = await vscode.window.showInputBox({
        prompt: "Введите название новой категории",
        placeHolder: "Например: Бэкенд",
      });
    } else {
      category = selectedCategory.value;
    }
  }

  // Приоритет
  const priorityItem = await vscode.window.showQuickPick(
    [
      { label: "🔴 Высокий", value: Priority.High },
      { label: "🟡 Средний", value: Priority.Medium },
      { label: "🟢 Низкий", value: Priority.Low },
    ],
    { placeHolder: "Выберите приоритет" }
  );

  const priority = priorityItem?.value || Priority.Medium;

  // Срок выполнения
  const dueDateStr = await vscode.window.showInputBox({
    prompt: "Введите срок выполнения (необязательно)",
    placeHolder: "ГГГГ-ММ-ДД, например: 2025-12-31",
    validateInput: (value) => {
      if (!value) {
        return null;
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return dateRegex.test(value) ? null : "Используйте формат ГГГГ-ММ-ДД";
    },
  });

  const dueDate = dueDateStr ? new Date(dueDateStr) : undefined;

  // Выбор инструкции для Copilot
  const instructions = instructionManager.getAllInstructions();
  const instructionItems = instructions.map((inst) => ({
    label: inst.name,
    description: inst.isDefault ? "По умолчанию" : inst.description,
    value: inst.id,
  }));

  const selectedInstruction = await vscode.window.showQuickPick(
    instructionItems,
    {
      placeHolder:
        "Выберите инструкцию для Copilot (необязательно, по умолчанию будет стандартная)",
    }
  );

  const instructionId =
    selectedInstruction && selectedInstruction.value !== "default"
      ? selectedInstruction.value
      : undefined;

  // Создание задачи
  const task = await taskManager.addTask({
    title,
    description,
    category,
    priority,
    dueDate,
    status: TaskStatus.Pending,
    instructionId,
  });

  // Уведомление убрано - задача появится в списке
}

/**
 * Диалог редактирования задачи
 */
async function showEditTaskDialog(
  taskManager: TaskManager,
  task: Task
): Promise<void> {
  const action = await vscode.window.showQuickPick(
    [
      { label: "📝 Изменить название", value: "title" },
      { label: "📄 Изменить описание", value: "description" },
      { label: "📁 Изменить категорию", value: "category" },
      { label: "⚡ Изменить приоритет", value: "priority" },
      { label: "📅 Изменить срок", value: "dueDate" },
      { label: "🔄 Изменить статус", value: "status" },
    ],
    { placeHolder: "Что вы хотите изменить?" }
  );

  if (!action) {
    return;
  }

  switch (action.value) {
    case "title":
      const newTitle = await vscode.window.showInputBox({
        prompt: "Введите новое название",
        value: task.title,
      });
      if (newTitle) {
        await taskManager.updateTask(task.id, { title: newTitle });
      }
      break;

    case "description":
      const newDescription = await vscode.window.showInputBox({
        prompt: "Введите новое описание",
        value: task.description,
      });
      if (newDescription !== undefined) {
        await taskManager.updateTask(task.id, { description: newDescription });
      }
      break;

    case "category":
      const categories = taskManager.getCategories();
      const categoryItem = await vscode.window.showQuickPick(
        [
          { label: "$(add) Создать новую", value: "__new__" },
          { label: "$(close) Убрать категорию", value: "__none__" },
          ...categories.map((cat) => ({ label: cat, value: cat })),
        ],
        { placeHolder: "Выберите категорию" }
      );

      if (categoryItem) {
        if (categoryItem.value === "__new__") {
          const newCategory = await vscode.window.showInputBox({
            prompt: "Введите название категории",
          });
          if (newCategory) {
            await taskManager.updateTask(task.id, { category: newCategory });
          }
        } else if (categoryItem.value === "__none__") {
          await taskManager.updateTask(task.id, { category: undefined });
        } else {
          await taskManager.updateTask(task.id, {
            category: categoryItem.value,
          });
        }
      }
      break;

    case "priority":
      const priorityItem = await vscode.window.showQuickPick(
        [
          { label: "🔴 Высокий", value: Priority.High },
          { label: "🟡 Средний", value: Priority.Medium },
          { label: "🟢 Низкий", value: Priority.Low },
        ],
        { placeHolder: "Выберите приоритет" }
      );
      if (priorityItem) {
        await taskManager.updateTask(task.id, { priority: priorityItem.value });
      }
      break;

    case "dueDate":
      const dueDateStr = await vscode.window.showInputBox({
        prompt: "Введите срок выполнения",
        placeHolder: "ГГГГ-ММ-ДД",
        value: task.dueDate?.toISOString().split("T")[0],
      });
      if (dueDateStr) {
        await taskManager.updateTask(task.id, {
          dueDate: new Date(dueDateStr),
        });
      }
      break;

    case "status":
      const statusItem = await vscode.window.showQuickPick(
        [
          { label: "⏳ Ожидает", value: TaskStatus.Pending },
          { label: "🔄 В процессе", value: TaskStatus.InProgress },
          { label: "✅ Завершено", value: TaskStatus.Completed },
        ],
        { placeHolder: "Выберите статус" }
      );
      if (statusItem) {
        await taskManager.updateTask(task.id, { status: statusItem.value });
      }
      break;
  }

  vscode.window.showInformationMessage("Задача обновлена");
}

/**
 * Показать панель с деталями задачи
 */
async function showTaskDetailsPanel(
  task: Task,
  taskManager: TaskManager
): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "taskDetails",
    `Задача: ${task.title}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const progress = taskManager.calculateTaskProgress(task);

  panel.webview.html = getTaskDetailsHtml(task, progress);
}

/**
 * Генерация HTML для панели деталей задачи
 */
function getTaskDetailsHtml(task: Task, progress: any): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Детали задачи</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .metadata {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      margin: 20px 0;
    }
    .label {
      font-weight: bold;
      color: var(--vscode-descriptionForeground);
    }
    .priority-high { color: #f14c4c; }
    .priority-medium { color: #cca700; }
    .priority-low { color: #89d185; }
    .status-completed { color: #89d185; }
    .status-pending { color: #cca700; }
    .status-inprogress { color: #3794ff; }
    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: var(--vscode-progressBar-background);
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background-color: var(--vscode-progressBar-background);
      transition: width 0.3s;
    }
    .subtasks {
      margin-top: 20px;
    }
    .subtask {
      padding: 5px 0;
    }
    .description {
      margin-top: 20px;
      padding: 15px;
      background-color: var(--vscode-textBlockQuote-background);
      border-left: 4px solid var(--vscode-textBlockQuote-border);
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <h1>${task.title}</h1>
  
  <div class="metadata">
    <span class="label">Статус:</span>
    <span class="status-${task.status}">${task.status}</span>
    
    <span class="label">Приоритет:</span>
    <span class="priority-${task.priority.toLowerCase()}">${
    task.priority
  }</span>
    
    ${
      task.category
        ? `
      <span class="label">Категория:</span>
      <span>${task.category}</span>
    `
        : ""
    }
    
    ${
      task.dueDate
        ? `
      <span class="label">Срок выполнения:</span>
      <span>${task.dueDate.toLocaleDateString("ru-RU")}</span>
    `
        : ""
    }
    
    ${
      task.assignee
        ? `
      <span class="label">Исполнитель:</span>
      <span>@${task.assignee}</span>
    `
        : ""
    }
    
    <span class="label">Создана:</span>
    <span>${task.createdAt.toLocaleString("ru-RU")}</span>
    
    <span class="label">Обновлена:</span>
    <span>${task.updatedAt.toLocaleString("ru-RU")}</span>
  </div>
  
  ${
    task.subtasks && task.subtasks.length > 0
      ? `
    <div class="subtasks">
      <h2>Прогресс: ${progress.percentage}%</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress.percentage}%"></div>
      </div>
      <p>${progress.completed} из ${progress.total} подзадач выполнено</p>
      
      <h3>Подзадачи:</h3>
      ${task.subtasks
        .map(
          (st) => `
        <div class="subtask">
          ${st.completed ? "✅" : "⬜"} ${st.title}
        </div>
      `
        )
        .join("")}
    </div>
  `
      : ""
  }
  
  ${
    task.description
      ? `
    <div class="description">
      <h3>Описание:</h3>
      ${task.description}
    </div>
  `
      : ""
  }
</body>
</html>
  `;
}

/**
 * Показать приветственное сообщение
 */
function showWelcomeMessage(context: vscode.ExtensionContext): void {
  const hasShownWelcome = context.globalState.get<boolean>(
    "taskflow.hasShownWelcome"
  );

  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        "Добро пожаловать в TaskFlow! Создайте файл задач для начала работы.",
        "Создать файл задач",
        "Позже"
      )
      .then((selection) => {
        if (selection === "Создать файл задач") {
          vscode.commands.executeCommand("taskflow.initializeTasks");
        }
      });

    context.globalState.update("taskflow.hasShownWelcome", true);
  }
}

/**
 * Деактивация расширения
 */
/**
 * Генерация HTML для webview просмотра инструкции
 */
function getInstructionWebviewContent(instruction: any): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${instruction.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            color: var(--vscode-editor-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .description {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-bottom: 20px;
        }
        .content {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 5px;
            border: 1px solid var(--vscode-panel-border);
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .metadata {
            margin-top: 20px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 0.85em;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <h1>${instruction.name}</h1>
    ${
      instruction.description
        ? `<p class="description">${instruction.description}</p>`
        : ""
    }
    ${instruction.isDefault ? '<span class="badge">По умолчанию</span>' : ""}
    <div class="content">${instruction.content}</div>
    <div class="metadata">
        <p>ID: <code>${instruction.id}</code></p>
        ${
          instruction.createdAt
            ? `<p>Создано: ${new Date(instruction.createdAt).toLocaleString(
                "ru-RU"
              )}</p>`
            : ""
        }
        ${
          instruction.updatedAt
            ? `<p>Обновлено: ${new Date(instruction.updatedAt).toLocaleString(
                "ru-RU"
              )}</p>`
            : ""
        }
    </div>
</body>
</html>`;
}

export function deactivate() {
  console.log("TaskFlow расширение деактивировано");
}
