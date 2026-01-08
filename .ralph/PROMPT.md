# Ralph Loop - Autonomous Issue Processing

## Scope

{{SCOPE_DESCRIPTION}}

**Filter command:** `{{READY_CMD}}`
{{EPIC_CONTEXT}}

## Your Task (ONE issue per iteration)

**IMPORTANT: Complete exactly ONE issue per iteration, then STOP.**

### STEP 0: CLAIM THE ISSUE FIRST (MANDATORY)

Before doing ANY other work, you MUST claim the issue:

```bash
# 1. Find the next issue - USE THIS EXACT COMMAND (includes scope filter!)
{{READY_CMD}}

# 2. IMMEDIATELY claim it (this is required - do not skip!)
bd update <issue-id> --claim
```

**CRITICAL SCOPE RULES:**

- ONLY work on issues returned by `{{READY_CMD}}`
- NEVER run `bd ready` without the filter flags shown above
- If `{{READY_CMD}}` returns no issues, output `<promise>SCOPE COMPLETE</promise>` and STOP
- Do NOT work on issues outside this scope, even if you see them

**DO NOT proceed to any other step until you have run `bd update --claim`.**

### STEP 1: Understand the Issue

Use `bd show <issue-id>` to see full details and acceptance criteria.

### STEP 2: Research

Before making changes, search the codebase to verify the item needs work (don't assume).

### STEP 3: Implement

Implement the solution following project standards (see AGENT.md).

### STEP 4: Validate with Chrome Extension (REQUIRED)

**You MUST use the Chrome browser extension to validate ALL changes:**

```
1. Start local server: python3 -m http.server 8000
2. Navigate: mcp__claude-in-chrome__navigate to http://localhost:8000
3. Take screenshot: mcp__claude-in-chrome__computer action=screenshot
4. Check console: mcp__claude-in-chrome__read_console_messages
5. Test interactions if applicable
```

**Validation checklist:**
- [ ] Game loads without console errors
- [ ] Visual elements render correctly
- [ ] Any new functionality works as expected
- [ ] Take screenshots as evidence

**DO NOT close an issue until you have visually verified it works in the browser.**

### STEP 5: Verify Acceptance Criteria

Before closing ANY issue:

1. Re-read the acceptance criteria from `bd show <issue-id>`
2. Verify EACH criterion is met - not just "mostly done"
3. If ANY criterion is not met, keep working
4. Only proceed to close when ALL criteria pass

### STEP 6: Create New Issues for Discoveries

When you discover a bug or new task, create it in beads:

```bash
bd create --title "..." --type bug --priority P2{{PARENT_FLAG}}
```

### STEP 7: Update Issue with Results

Before closing, update the issue with what was done:

1. **Review acceptance criteria** from `bd show <issue-id>`
2. **Update acceptance criteria** - check off completed items:

   ```bash
   bd update <issue-id> --acceptance "## Acceptance Criteria

   - [x] First item that was completed
   - [x] Second item that was completed
   - [ ] Any items NOT completed (explain why in notes)
   ..."
   ```

3. **Add notes** describing what was implemented:

   ```bash
   bd update <issue-id> --notes "## Implementation Summary

   <Describe what was done, key decisions made, any issues encountered>

   ### Files Modified
   - path/to/file1.js - description
   - path/to/file2.js - description

   ### Testing Done
   - <what was tested and verified>"
   ```

### STEP 8: Complete and Close

When the task is complete and tests pass:

1. Close the issue: `bd close <issue-id>`
2. Append to progress log:
   ```bash
   cat >> .ralph/progress.txt << 'EOF'
   ## <issue-id> - <issue-title>
   **Status:** Completed
   **Changes:** <brief summary of what was implemented>
   **Files:** <list of key files created/modified>
   **Commit:** <commit hash>
   ---
   EOF
   ```
3. Run `git add -A`
4. Run `git commit` referencing the issue ID
5. **STOP HERE** - The loop will restart for the next issue.

## Critical Rules

1. **ONE ISSUE PER ITERATION.** Complete one issue, commit, then STOP.

2. **ACCEPTANCE CRITERIA ARE LAW.** Do not close an issue until EVERY acceptance criterion is met and verified. Re-read them before closing.

3. **CHROME EXTENSION VALIDATION REQUIRED.** You must visually verify changes work in the browser using the Chrome extension. Take screenshots. Check console for errors.

4. When authoring code, capture WHY in comments for complex logic.

5. Single sources of truth - check existing patterns first.

6. If unrelated tests fail, resolve them as part of your change.

7. FULL IMPLEMENTATIONS ONLY. No placeholders or stubs.

8. Before creating new files, search to ensure they don't already exist.

9. Beads is the ONLY source of truth for task status:
   - Starting work: `bd update <issue-id> --claim`
   - Completing work: `bd close <issue-id>`
   - Finding bugs: `bd create --title "..." --type bug{{PARENT_FLAG}}`
   - New tasks: `bd create --title "..." --type task{{PARENT_FLAG}}`

8. Reference the beads issue ID in git commits:

   ```
   git commit -m "feat: Description of change

   Implements <issue-id>
   ..."
   ```

9. When ALL issues in scope are complete (`{{READY_CMD}}` returns nothing), output:
   ```
   <promise>SCOPE COMPLETE</promise>
   ```
   ONLY output this when genuinely finished.
