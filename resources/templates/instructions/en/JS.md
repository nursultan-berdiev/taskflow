# JS

> Professional Clean Code Guidelines

## Clean Code Principles

### 1. Readability and Clarity

- Code should be easily readable and self-documenting
- Use clear and descriptive names for variables, functions, and classes
- Avoid abbreviations unless they are widely accepted
- One level of abstraction per function

### 2. Structure and Organization

- Follow the Single Responsibility Principle
- Functions should be short and perform one task
- Classes should be compact and focus on one concept
- Logically group related code

### 3. Naming Conventions

- **Variables**: use nouns (`userName`, `taskCount`)
- **Functions**: use verbs (`getUserData`, `calculateTotal`, `isValid`)
- **Classes**: use nouns in PascalCase (`TaskManager`, `UserService`)
- **Constants**: use UPPERCASE_SNAKE_CASE (`MAX_RETRY_COUNT`)

### 4. Comments

- Code explains "what" and "how", comments explain "why"
- Avoid obvious comments
- Use JSDoc/TSDoc to document public APIs
- Update comments when code changes

### 5. Error Handling

- Always handle possible errors
- Use specific error types
- Don't ignore caught exceptions
- Log errors with context

### 6. TypeScript Specifics

- Use strict typing (`strict: true`)
- Avoid `any`, prefer `unknown` or specific types
- Define interfaces for data structures
- Use enum for sets of constant values

### 7. Formatting

- Follow consistent formatting style (use ESLint/Prettier)
- Use proper indentation (2 or 4 spaces)
- Limit line length (80-120 characters)
- Separate logical blocks with blank lines

### 8. DRY (Don't Repeat Yourself)

- Avoid code duplication
- Extract repeating logic into separate functions
- Use utilities and helpers

### 9. Unnecessary Files and Dependencies

- Remove unused code and files
- Don't create unnecessary .md documentation files

### 10. Terminal and File Rules

#### 🚫 STRICTLY PROHIBITED:

1. **Creating .md files outside the `docs/` folder**

   - ✅ Create documentation ONLY in `docs/`
   - ❌ DO NOT create `.md` files in project root or other folders

2. **Creating .sh or bash scripts**

   - ✅ Run commands directly in the terminal
   - ❌ DO NOT create `.sh`, `.bash` or any shell script files

3. **Commands that just output text**

   - ❌ DO NOT use `echo "Text"` to display messages
   - ✅ Use real commands to perform tasks

4. **Complex commands with &&**

   - ❌ DO NOT: `command1 && command2 && command3`
   - ✅ Run commands sequentially, waiting for each to complete

5. **Using sudo**
   - ❌ NEVER use `sudo` in commands
   - ✅ Work only as the current user

### 11. Performance

- Avoid premature optimization
- Use asynchronous operations where necessary
- Release resources (dispose patterns)
- Cache results of heavy computations where appropriate

## Examples

### ❌ Bad

```typescript
function f(x: any) {
  let r = 0;
  for (let i = 0; i < x.length; i++) {
    r += x[i];
  }
  return r;
}
```

### ✅ Good

```typescript
function calculateSum(numbers: number[]): number {
  return numbers.reduce((sum, number) => sum + number, 0);
}
```

## Pre-commit Checklist

- [ ] Code meets project standards
- [ ] All tests pass
- [ ] No linter warnings
- [ ] Documentation added for public APIs
- [ ] Code self-reviewed
- [ ] No commented-out code
- [ ] No console.log and debug statements
