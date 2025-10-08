# Instruction Templates

This folder contains multilingual instruction templates for TaskFlow.

## Structure

```
instructions/
├── ru/                 # Russian templates
│   ├── JS.md
│   ├── Python.md
│   └── Research.md
└── en/                 # English templates
    ├── JS.md
    ├── Python.md
    └── Research.md
```

## Usage

These templates are automatically copied to the user's workspace on first initialization:

- From: `resources/templates/instructions/{locale}/`
- To: `.github/.task_flow/.templates/.instructions/{locale}/`

## Adding a New Language

1. Create a new folder for the language code (e.g., `fr/` for French)
2. Copy and translate all `.md` files from an existing language folder
3. Update `InstructionManager.detectLocale()` to recognize the new locale
4. Add the locale to the `templates` array in `InstructionManager.copyDefaultTemplates()`

## Template Format

Each template should follow this format:

```markdown
# Template Name

> Brief description

## Section 1

...

## Section 2

...
```

## Editing Templates

### For Users

Edit templates in your workspace:
`.github/.task_flow/.templates/.instructions/{locale}/`

### For Developers

Edit templates in this folder and rebuild the extension.
Changes will be applied to new workspaces on next initialization.

## Currently Included Templates

### JS.md

JavaScript/TypeScript clean code guidelines

- Code principles
- Naming conventions
- TypeScript specifics
- Terminal rules
- Examples

### Python.md

Python clean code guidelines

- PEP 8 compliance
- Type hints
- Django specifics
- Terminal rules
- Testing

### Research.md

Research mode instructions

- Code modification prohibitions
- Information verification
- Documentation rules
- Terminal rules
- Preventing AI hallucinations

## Terminal Rules (in all templates)

All templates include strict terminal and file operation rules:

1. No `.md` files outside `docs/`
2. No `.sh` or bash scripts
3. No `echo` commands for text output
4. No complex commands with `&&`
5. No `sudo` usage

---

**Version**: 2.10.0
**Date**: October 5, 2025
