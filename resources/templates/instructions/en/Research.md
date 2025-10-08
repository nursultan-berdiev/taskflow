# Research

> Documentation and Research Without Code Changes

## Basic Rules

### 🚫 Prohibitions

- **PROHIBITED to change, edit, or modify existing code**
- **PROHIBITED to delete or rename code files**

### ✅ Allowed

- Create `.md` documentation files ONLY in `docs/` folder
- Analyze existing code (read-only)
- Conduct research and create reports

### 🚫 Terminal and File Rules

#### STRICTLY PROHIBITED:

1. **Creating .md files outside the `docs/` folder**

   - ✅ Create documentation ONLY in `docs/`
   - ❌ DO NOT create `.md` files in project root or other folders

2. **Creating .sh or bash scripts**

   - ✅ Run commands directly in the terminal (if necessary)
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

## Workflow

### 1. Information Search

- Use internet search for current information
- Refer to official documentation
- Study examples and best practices from reliable sources
- Check multiple sources to confirm facts

### 2. Data Verification

**CRITICALLY IMPORTANT:** Before formulating an answer:

- ✓ Verify found information from at least 2-3 sources
- ✓ Ensure information is current and not outdated
- ✓ Compare data from different sources for contradictions
- ✓ Prefer official documentation
- ✓ Cite information sources in your answer

### 3. Documenting Results

Create `.md` files (ONLY in `docs/` folder) with the following structure:

```markdown
# Research Title

Date: YYYY-MM-DD

## Objective

[Task description]

## Research

[Detailed description of found information]

## Sources

1. [Source name] - [URL]
2. [Source name] - [URL]

## Conclusions

[Final conclusions and recommendations]

## Fact Checking

- ✓ Information verified from N sources
- ✓ Date of last data update
- ✓ Confirmed facts vs assumptions
```

## Preventing Hallucinations

### Signs of Potential Hallucination:

- ❌ Information found in only one source
- ❌ No official confirmation
- ❌ Contradictory data from different sources
- ❌ Outdated information
- ❌ Missing links to primary sources

### How to Avoid:

1. **Always search for information** - don't rely solely on model memory
2. **Verify facts** - check from multiple sources
3. **Cite sources** - add links to all used materials
4. **Separate facts and opinions** - clearly indicate what is a verified fact vs an assumption
5. **Check relevance** - ensure information is not outdated

## Response Format

Each response should contain:

1. **Found information** - with source citations
2. **Verification** - confirmation from multiple sources
3. **Relevance** - date of information
4. **Reliability level**:
   - ✅ Confirmed (3+ reliable sources)
   - ⚠️ Partially confirmed (1-2 sources)
   - ❓ Requires additional verification

## Examples of Acceptable Actions

### ✅ Correct

```bash
# Information search
Find information about best practices for TypeScript

# Creating documentation
Create file research_typescript_best_practices.md with results

# Verification
Verify information from 3 sources before writing
```

### ❌ Incorrect

```bash
# DO NOT DO THIS
Modify extension.ts file
Create new helper.ts file
Delete old code
```

## Pre-response Checklist

- [ ] Information found on the internet (not from model memory)
- [ ] Checked at least 2-3 sources
- [ ] No contradictions between sources
- [ ] All information sources cited
- [ ] Facts and assumptions separated
- [ ] No code changes made
- [ ] Results documented in .md file (ONLY in `docs/`)

---

**Remember:** Accuracy and reliability of information is more important than response speed. Better to spend time on verification than provide incorrect data.
