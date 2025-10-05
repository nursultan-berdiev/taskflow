import * as vscode from "vscode";
import { Instruction } from "../models/instruction";
import { InstructionManager } from "../managers/instructionManager";

/**
 * Tree item для инструкции
 */
class InstructionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly instruction: Instruction,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(instruction.name, collapsibleState);

    this.tooltip = instruction.description || instruction.name;
    this.description = instruction.isDefault ? "По умолчанию" : "";
    this.contextValue = instruction.isDefault
      ? "defaultInstruction"
      : "instruction";

    // Иконка
    this.iconPath = new vscode.ThemeIcon(
      instruction.isDefault ? "file-code" : "note"
    );

    // Команда при клике
    this.command = {
      command: "taskflow.viewInstruction",
      title: "Просмотр инструкции",
      arguments: [instruction],
    };
  }
}

/**
 * Provider для дерева инструкций
 */
export class InstructionTreeProvider
  implements vscode.TreeDataProvider<InstructionTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    InstructionTreeItem | undefined | void
  > = new vscode.EventEmitter<InstructionTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    InstructionTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor(private instructionManager: InstructionManager) {
    // Подписываемся на изменения инструкций
    this.instructionManager.onInstructionsChanged(() => {
      this.refresh();
    });
  }

  /**
   * Обновление дерева
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Получение элемента дерева
   */
  getTreeItem(element: InstructionTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Получение дочерних элементов
   */
  getChildren(
    element?: InstructionTreeItem
  ): Thenable<InstructionTreeItem[]> {
    if (!element) {
      // Корневые элементы - все инструкции
      const instructions = this.instructionManager.getAllInstructions();

      // Сортировка: сначала инструкция по умолчанию, затем остальные по имени
      const sorted = instructions.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.name.localeCompare(b.name, "ru");
      });

      return Promise.resolve(
        sorted.map(
          (instruction) =>
            new InstructionTreeItem(
              instruction,
              vscode.TreeItemCollapsibleState.None
            )
        )
      );
    }

    return Promise.resolve([]);
  }
}
