# Ralph Loop - Autonomous Issue Processing

## Scope

{{SCOPE_DESCRIPTION}}

**Filter command:** `{{READY_CMD}}`
{{EPIC_CONTEXT}}

## Your Task (ONE issue per iteration)

**IMPORTANT: Complete exactly ONE issue per iteration, then STOP.**

**KEY MINDSET:** Your job is to make PROGRESS, not achieve perfection. For each issue:
- Implement what you can
- File new issues for bugs, gaps, or blockers you discover
- Close the issue when you've done what was asked (validation = went through criteria, filed issues for problems)
- Don't get stuck waiting - file an issue and move on

### STEP 0: MARK ISSUE IN PROGRESS (MANDATORY)

Before doing ANY other work, you MUST mark the issue as in progress:

```bash
# 1. Find the next issue - USE THIS EXACT COMMAND (includes scope filter!)
{{READY_CMD}}

# 2. IMMEDIATELY mark it in progress (this is required - do not skip!)
bd update <issue-id> --status in_progress
```

**CRITICAL SCOPE RULES:**

- ONLY work on issues returned by `{{READY_CMD}}`
- NEVER run `bd ready` without the filter flags shown above
- If `{{READY_CMD}}` returns no issues, output `<promise>SCOPE COMPLETE</promise>` and STOP
- Do NOT work on issues outside this scope, even if you see them

**EPIC HANDLING:**
- If an **epic** (type: epic) appears in the ready list, **DO NOT work on the epic directly**
- Instead: Read the epic with `bd show <epic-id>` to understand context
- Then: Look at its children (shown at bottom of `bd show` output)
- Pick the first OPEN child issue (type: task, bug, or feature) and mark THAT as in_progress instead
- Epics are containers for organizing work - the real work is in the child issues

**DO NOT proceed to any other step until you have run `bd update --status in_progress` on an actionable issue (not an epic).**

### STEP 1: Understand the Issue

Use `bd show <issue-id>` to see full details and acceptance criteria.

**IMPORTANT: READ THE COMMENTS!** The `bd show` output includes a Comments section at the bottom. Comments often contain:
- Design references and mockups
- Additional requirements not in the main description
- Clarifications from the issue creator
- Links to spec files or images

**Do NOT skip the comments section.** If there are comments, read them carefully - they may contain critical information for completing the issue correctly.

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

### STEP 5: Verify and Check Off EACH Acceptance Criterion (MANDATORY)

**You MUST verify and check off EACH criterion before closing. This is NOT optional.**

1. Run `bd show <issue-id>` to see the acceptance criteria
2. Go through EACH criterion one by one:
   - Did you actually do this? Verify it.
   - If YES: Mark it `[x]`
   - If NO: Go back and do it. Do not proceed.

**FOR VALIDATION/QA TASKS:**
- Each criterion should be marked with a result: PASS, FAIL, or BLOCKED
- PASS = verified working as specified → mark `[x]`
- FAIL = doesn't work as specified → create a **bug issue**, then mark `[x]` (you validated it, found a bug)
- BLOCKED = can't test due to missing feature → create a **task issue**, then mark `[x]` (you validated scope, filed gap)
- After going through ALL criteria (filing bugs/tasks as needed), the validation issue is COMPLETE
- Don't leave validation issues open waiting for fixes - that's what the new bug issues are for

3. Update the issue with ALL criteria checked:

```bash
bd update <issue-id> --acceptance "## Acceptance Criteria

- [x] First criterion - VERIFIED: <how you verified it>
- [x] Second criterion - VERIFIED: <how you verified it>
- [x] Third criterion - VERIFIED: <how you verified it>
..."
```

**CRITICAL: If ANY criterion shows `[ ]` (unchecked), you are NOT DONE. Go back and complete it.**

**CRITICAL: You must actually RUN the `bd update --acceptance` command to check things off. Do not just say you did it.**

### STEP 6: Create New Issues for Discoveries

When you discover a bug or new task, create it in beads:

```bash
bd create --title "..." --type bug --priority P2{{PARENT_FLAG}}
```

### STEP 7: Add Implementation Notes

After ALL acceptance criteria are checked off, add notes:

```bash
bd update <issue-id> --notes "## Implementation Summary

<Describe what was done, key decisions made, any issues encountered>

### Files Modified
- path/to/file1.js - description
- path/to/file2.js - description

### Verification
- <How each acceptance criterion was verified>"
```

### STEP 8: Final Check Before Close

Before running `bd close`:

1. Run `bd show <issue-id>` one more time
2. Confirm ALL acceptance criteria show `[x]`
3. If ANY show `[ ]`, STOP and go complete them
4. Only proceed if everything is checked

### STEP 9: Complete and Close

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

### STEP 10: Check if Parent Epic is Complete

After closing an issue that has a parent epic:

1. Check if issue had a parent: look at the output of `bd show <issue-id>` for "Parent:"
2. If it has a parent epic, check the epic: `bd show <parent-epic-id>`
3. Look at its children - are ALL of them closed?
4. If ALL children are closed, close the epic too: `bd close <parent-epic-id>`
5. If some children are still open, leave the epic open

**Epics should be closed when all their child issues are complete.**

6. **STOP HERE** - The loop will restart for the next issue.

## Critical Rules

1. **ONE ISSUE PER ITERATION.** Complete one issue, commit, then STOP.

2. **CHECK OFF EVERY ACCEPTANCE CRITERION.** Before closing ANY issue, you MUST run `bd update --acceptance` to mark each criterion as `[x]`. If you don't run this command, you haven't done it. Verify the checkboxes are updated by running `bd show` again.

3. **CHROME EXTENSION VALIDATION FOR CODE.** For implementation tasks, visually verify changes work in the browser. Skip for research/spec/planning tasks where there's no code to test.

4. When authoring code, capture WHY in comments for complex logic.

5. Single sources of truth - check existing patterns first.

6. If unrelated tests fail, resolve them as part of your change.

7. FULL IMPLEMENTATIONS ONLY. No placeholders or stubs.

8. Before creating new files, search to ensure they don't already exist.

9. Beads is the ONLY source of truth for task status:
   - Starting work: `bd update <issue-id> --status in_progress`
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
