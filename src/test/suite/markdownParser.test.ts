import * as assert from "assert";
import { Priority, TaskStatus } from "../../models/task";
import { MarkdownParser } from "../../parsers/markdownParser";

suite("MarkdownParser Test Suite", () => {
  let parser: MarkdownParser;

  setup(() => {
    parser = new MarkdownParser();
  });

  test("Parse simple task", () => {
    const markdown = "- [ ] Test task";
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].title, "Test task");
    assert.strictEqual(tasks[0].status, TaskStatus.Pending);
  });

  test("Parse completed task", () => {
    const markdown = "- [x] Completed task";
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].title, "Completed task");
    assert.strictEqual(tasks[0].status, TaskStatus.Completed);
  });

  test("Parse task with priority", () => {
    const markdown = "- [ ] Important task [Высокий]";
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].title, "Important task");
    assert.strictEqual(tasks[0].priority, Priority.High);
  });

  test("Parse task with due date", () => {
    const markdown = "- [ ] Task with deadline Срок: 2025-12-31";
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].title, "Task with deadline");
    assert.ok(tasks[0].dueDate);
    assert.strictEqual(tasks[0].dueDate!.getFullYear(), 2025);
  });

  test("Parse task with assignee", () => {
    const markdown = "- [ ] Task for user @john";
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].title, "Task for user");
    assert.strictEqual(tasks[0].assignee, "john");
  });

  test("Parse task with category", () => {
    const markdown = `## Backend
- [ ] Backend task`;
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].category, "Backend");
  });

  test("Parse task with subtasks", () => {
    const markdown = `- [ ] Main task
  - [ ] Subtask 1
  - [x] Subtask 2`;
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].subtasks?.length, 2);
    assert.strictEqual(tasks[0].subtasks![0].title, "Subtask 1");
    assert.strictEqual(tasks[0].subtasks![0].completed, false);
    assert.strictEqual(tasks[0].subtasks![1].completed, true);
  });

  test("Parse multiple tasks", () => {
    const markdown = `- [ ] Task 1
- [x] Task 2
- [ ] Task 3`;
    const tasks = parser.parseTasksFromMarkdown(markdown);

    assert.strictEqual(tasks.length, 3);
  });

  test("Convert tasks to markdown", () => {
    const markdown = `- [ ] Test task [Высокий]
  - [ ] Subtask`;
    const tasks = parser.parseTasksFromMarkdown(markdown);
    const converted = parser.convertTasksToMarkdown(tasks);

    assert.ok(converted.includes("Test task"));
    assert.ok(converted.includes("[Высокий]"));
    assert.ok(converted.includes("Subtask"));
  });

  test("Validate task line", () => {
    assert.ok(parser.isValidTaskLine("- [ ] Valid task"));
    assert.ok(parser.isValidTaskLine("- [x] Valid completed"));
    assert.ok(!parser.isValidTaskLine("Not a task"));
    assert.ok(!parser.isValidTaskLine("## Header"));
  });
});
