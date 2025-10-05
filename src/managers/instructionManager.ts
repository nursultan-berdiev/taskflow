import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { Instruction, DEFAULT_INSTRUCTION } from "../models/instruction";
import { v4 as uuidv4 } from "uuid";

/**
 * Менеджер для управления инструкциями
 */
export class InstructionManager {
  private instructions: Map<string, Instruction> = new Map();
  private instructionsDir: string | undefined;
  private fileWatcher: vscode.FileSystemWatcher | undefined;

  private readonly _onInstructionsChanged = new vscode.EventEmitter<
    Instruction[]
  >();
  public readonly onInstructionsChanged = this._onInstructionsChanged.event;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Инициализация менеджера инструкций
   */
  public async initialize(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    this.instructionsDir = path.join(
      workspacePath,
      ".github",
      ".task_flow",
      ".instructions"
    );

    // Создание директории для инструкций если её нет
    try {
      await fs.mkdir(this.instructionsDir, { recursive: true });
    } catch (error) {
      console.error("Ошибка при создании директории для инструкций:", error);
    }

    // Загрузка инструкций
    await this.loadInstructions();

    // Настройка наблюдателя за изменениями
    this.setupFileWatcher();
  }

  /**
   * Загрузка всех инструкций из файлов
   */
  private async loadInstructions(): Promise<void> {
    if (!this.instructionsDir) {
      return;
    }

    this.instructions.clear();

    // Добавляем инструкцию по умолчанию
    this.instructions.set(DEFAULT_INSTRUCTION.id, DEFAULT_INSTRUCTION);

    try {
      const files = await fs.readdir(this.instructionsDir);
      const mdFiles = files.filter((f) => f.endsWith(".md"));

      for (const file of mdFiles) {
        const filePath = path.join(this.instructionsDir, file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const instruction = this.parseInstructionFile(file, content);
          if (instruction) {
            this.instructions.set(instruction.id, instruction);
          }
        } catch (error) {
          console.error(`Ошибка при чтении файла инструкции ${file}:`, error);
        }
      }

      this._onInstructionsChanged.fire(this.getAllInstructions());
    } catch (error) {
      console.error("Ошибка при загрузке инструкций:", error);
    }
  }

  /**
   * Парсинг файла инструкции
   */
  private parseInstructionFile(
    fileName: string,
    content: string
  ): Instruction | null {
    try {
      // Формат файла:
      // # Название инструкции
      // > Описание (опционально)
      //
      // Содержимое инструкции...

      const lines = content.split("\n");
      let name = fileName.replace(".md", "");
      let description: string | undefined;
      let instructionContent = "";
      let parsingContent = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (i === 0 && line.startsWith("# ")) {
          name = line.substring(2).trim();
        } else if (line.startsWith("> ") && !parsingContent) {
          description = line.substring(2).trim();
        } else if (line.trim() === "" && !parsingContent) {
          // Пустая строка означает начало содержимого
          parsingContent = true;
        } else if (parsingContent) {
          instructionContent += line + "\n";
        }
      }

      const id = fileName.replace(".md", "");

      return {
        id,
        name,
        description,
        content: instructionContent.trim(),
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Ошибка при парсинге инструкции:", error);
      return null;
    }
  }

  /**
   * Настройка наблюдателя за изменениями файлов инструкций
   */
  private setupFileWatcher(): void {
    if (!this.instructionsDir) {
      return;
    }

    const pattern = new vscode.RelativePattern(this.instructionsDir, "**/*.md");
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.fileWatcher.onDidCreate(() => this.loadInstructions());
    this.fileWatcher.onDidChange(() => this.loadInstructions());
    this.fileWatcher.onDidDelete(() => this.loadInstructions());
  }

  /**
   * Создание новой инструкции
   */
  public async createInstruction(
    name: string,
    content: string,
    description?: string
  ): Promise<Instruction> {
    if (!this.instructionsDir) {
      throw new Error("Директория инструкций не инициализирована");
    }

    const id = this.generateFileName(name);
    const instruction: Instruction = {
      id,
      name,
      description,
      content,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Сохранение в файл
    await this.saveInstructionToFile(instruction);

    this.instructions.set(id, instruction);
    this._onInstructionsChanged.fire(this.getAllInstructions());

    return instruction;
  }

  /**
   * Обновление существующей инструкции
   */
  public async updateInstruction(
    id: string,
    updates: Partial<Omit<Instruction, "id" | "createdAt">>
  ): Promise<void> {
    if (id === DEFAULT_INSTRUCTION.id) {
      throw new Error("Нельзя изменить инструкцию по умолчанию");
    }

    const instruction = this.instructions.get(id);
    if (!instruction) {
      throw new Error(`Инструкция с ID ${id} не найдена`);
    }

    const updatedInstruction: Instruction = {
      ...instruction,
      ...updates,
      id,
      createdAt: instruction.createdAt,
      updatedAt: new Date(),
    };

    await this.saveInstructionToFile(updatedInstruction);

    this.instructions.set(id, updatedInstruction);
    this._onInstructionsChanged.fire(this.getAllInstructions());
  }

  /**
   * Удаление инструкции
   */
  public async deleteInstruction(id: string): Promise<void> {
    if (id === DEFAULT_INSTRUCTION.id) {
      throw new Error("Нельзя удалить инструкцию по умолчанию");
    }

    if (!this.instructionsDir) {
      throw new Error("Директория инструкций не инициализирована");
    }

    const instruction = this.instructions.get(id);
    if (!instruction) {
      throw new Error(`Инструкция с ID ${id} не найдена`);
    }

    const filePath = path.join(this.instructionsDir, `${id}.md`);
    try {
      await fs.unlink(filePath);
      this.instructions.delete(id);
      this._onInstructionsChanged.fire(this.getAllInstructions());
    } catch (error) {
      throw new Error(`Ошибка при удалении файла инструкции: ${error}`);
    }
  }

  /**
   * Сохранение инструкции в файл
   */
  private async saveInstructionToFile(instruction: Instruction): Promise<void> {
    if (!this.instructionsDir) {
      throw new Error("Директория инструкций не инициализирована");
    }

    const filePath = path.join(this.instructionsDir, `${instruction.id}.md`);

    let content = `# ${instruction.name}\n`;
    if (instruction.description) {
      content += `> ${instruction.description}\n`;
    }
    content += `\n${instruction.content}\n`;

    try {
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new Error(`Ошибка при сохранении файла инструкции: ${error}`);
    }
  }

  /**
   * Генерация имени файла из названия инструкции
   */
  private generateFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zа-я0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Получение инструкции по ID
   */
  public getInstruction(id: string): Instruction | undefined {
    return this.instructions.get(id);
  }

  /**
   * Получение всех инструкций
   */
  public getAllInstructions(): Instruction[] {
    return Array.from(this.instructions.values());
  }

  /**
   * Получение инструкции по умолчанию
   */
  public getDefaultInstruction(): Instruction {
    return DEFAULT_INSTRUCTION;
  }

  /**
   * Открытие файла инструкции в редакторе
   */
  public async openInstruction(id: string): Promise<void> {
    if (id === DEFAULT_INSTRUCTION.id) {
      vscode.window.showInformationMessage(
        "Инструкция по умолчанию не может быть отредактирована напрямую"
      );
      return;
    }

    if (!this.instructionsDir) {
      throw new Error("Директория инструкций не инициализирована");
    }

    const filePath = path.join(this.instructionsDir, `${id}.md`);
    const uri = vscode.Uri.file(filePath);

    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      throw new Error(`Ошибка при открытии файла инструкции: ${error}`);
    }
  }

  /**
   * Очистка ресурсов
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
