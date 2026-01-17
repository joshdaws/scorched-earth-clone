# Ralph Loop - Issue Processing Iteration

## CRITICAL: ONE ISSUE ONLY

**You MUST complete exactly ONE issue, then STOP.**

Do NOT:
- Work on multiple issues
- Start a second issue after completing one
- Try to be "efficient" by doing more
- Run `bd ready` again after closing an issue

The loop will restart you for the next issue. Your job is ONE issue per iteration.

---

## Current Scope

{{SCOPE_DESCRIPTION}}

**Filter command:** `{{READY_CMD}}`
{{EPIC_CONTEXT}}

---

## STEP 1: Fetch Your Issue (MANDATORY FIRST STEP)

Run the ready command to get your next issue:
```bash
{{READY_CMD}}
```

Select the **top issue** from the list.

**IF AND ONLY IF the list is empty** (no issues returned), output this exact line on its own and stop:

RALPH_SIGNAL::SCOPE_COMPLETE

**OTHERWISE** (if there ARE issues), continue to the next step. **NEVER output the signal after completing work - the loop handles iteration.**

**IMMEDIATELY** mark it in progress:
```bash
bd update <issue-id> --status in_progress
```

Do NOT proceed to any other step until you have marked the issue in progress.

**EPIC HANDLING:**
- If an **epic** (type: epic) appears in the ready list, **DO NOT work on the epic directly**
- Instead: Read the epic with `bd show <epic-id>` to understand context
- Then: Look at its children (shown at bottom of `bd show` output)
- Pick the first OPEN child issue (type: task, bug, or feature) and mark THAT as in_progress instead
- Epics are containers for organizing work - the real work is in the child issues

---

## STEP 2: Understand the Issue (READ ALL FIELDS)

Read the full issue details:
```bash
bd show <issue-id>
```

**IMPORTANT: Beads issues have multiple fields. Read and understand ALL of them:**

| Field | Purpose |
|-------|---------|
| **DESCRIPTION** | Overview of what needs to be done, background context, deliverables |
| **DESIGN** | Technical approach, implementation details, structure/architecture |
| **ACCEPTANCE CRITERIA** | Checkable criteria that MUST all be `[x]` before closing |
| **NOTES** | Additional context, implementation notes from previous work |

Also check for comments - the `bd show` output includes a Comments section at the bottom. Comments may contain:
- Design references and mockups
- Additional requirements not in the main description
- Clarifications from the issue creator
- Links to spec files or images

**Do NOT skip the comments section.** If there are comments, read them carefully.

**Before proceeding, ensure you understand:**
- What is the goal? (from DESCRIPTION)
- How should it be built? (from DESIGN)
- What defines "done"? (from ACCEPTANCE CRITERIA)
- Any additional context? (from NOTES and comments)

---

## STEP 3: Evaluate Issue Size (MANDATORY)

After reading the issue, evaluate its scope before starting work:

### 1. Analyze Scope

List the files that will likely need changes and count distinct logical changes:

```bash
# Think through:
# - Which files need to be modified?
# - How many separate, distinct changes are required?
# - Are there multiple independent concerns?
```

### 2. Assign Size

| Size | Files | Distinct Changes | Action |
|------|-------|------------------|--------|
| **S** | 1-2 | 1-2 | Work directly |
| **M** | 3-5 | 2-4 | Work directly |
| **L** | 6-10 | 5-8 | **Decompose first** |
| **XL** | 10+ | 8+ | **Must decompose** |

### 3. If Size is L or XL: Decompose

**STOP** - Do not start coding. Decompose into smaller sub-issues first:

```bash
# Create sub-issues linked to parent
bd create --title "Sub-task 1: <specific piece>" --type task --parent <issue-id>
bd create --title "Sub-task 2: <specific piece>" --type task --parent <issue-id>
# ... continue for each logical piece
```

**Decomposition Rules:**
- Each sub-issue should be S or M sized
- Each sub-issue should be independently testable
- Each sub-issue should be independently committable
- Use `--blocked-by` if sub-issues have dependencies
- First sub-issue should be the foundation others build on

After decomposing:
1. Update parent issue notes explaining the decomposition
2. Mark the parent issue as `blocked` (it's now just a container)
3. Start work on the first sub-issue

### 4. If Size is S or M: Proceed

Continue to the next step.

---

## STEP 4: Research

Before implementing, verify the work actually needs doing:
- Check if the problem still exists
- Check if someone else already did the work
- Check if the approach makes sense

If the issue is no longer relevant, close it with a note explaining why.

---

## STEP 5: Implement

Do the actual work. Follow project patterns and conventions.

**Keep commits atomic.** Commit related changes together with the issue ID:
```bash
git add <files>
git commit -m "<type>(<scope>): <description>

Refs: <issue-id>"
```

---

## STEP 6: Validate

Verify your implementation works:
- Run relevant tests if available
- Check for lint/type errors
- Manually verify if needed
- For UI changes, test in browser

If validation fails, fix the issues before proceeding.

---

## STEP 7: Check Acceptance Criteria (MANDATORY)

**You MUST verify and check off EACH criterion before closing. This is NOT optional.**

1. Run `bd show <issue-id>` to see the acceptance criteria
2. Go through EACH criterion one by one:
   - Did you actually do this? Verify it.
   - If YES: Mark it `[x]`
   - If NO: Go back and do it. Do not proceed.

3. Update the issue with ALL criteria checked:

```bash
bd update <issue-id> --acceptance "## Acceptance Criteria

- [x] First criterion - VERIFIED: <how you verified it>
- [x] Second criterion - VERIFIED: <how you verified it>
- [x] Third criterion - VERIFIED: <how you verified it>
..."
```

**CRITICAL: If ANY criterion shows `[ ]` (unchecked), you are NOT DONE. Go back and complete it.**

**CRITICAL: You must actually RUN the `bd update --acceptance` command to check things off.**

---

## STEP 8: Handle Discoveries

During your work, you may discover bugs, missing functionality, or follow-up tasks.

**DO NOT get blocked by these.** File new issues:
```bash
bd create --title "<title>" --type <bug|task|feature> --priority P2{{PARENT_FLAG}}
```

Add any relevant context to the new issue description.

---

## STEP 9: Add Implementation Notes

Before closing, add notes documenting what you did:
```bash
bd update <issue-id> --notes "## Implementation Summary

- What was done
- Key decisions made
- Any caveats or limitations
- Files modified"
```

---

## STEP 10: Final Check Before Close

Before running `bd close`:

1. Run `bd show <issue-id>` one more time
2. Confirm ALL acceptance criteria show `[x]`
3. If ANY show `[ ]`, STOP and go complete them
4. Only proceed if everything is checked

---

## STEP 11: Close the Issue

Once everything is validated:

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

Then check if the parent epic (if any) is now complete:
- If issue had a parent epic, check `bd show <parent-epic-id>`
- If ALL children are closed, close the epic too

---

## COMPLETION - STOP HERE

After closing the issue:

1. **STOP IMMEDIATELY** - Do not start another issue
2. **Do not run `bd ready` again** - The loop handles this
3. **Do not "peek" at what's next** - Just stop

The loop will restart you for the next issue automatically.

**DO NOT output any completion signal here.** The signal is ONLY for Step 1 when the list is empty.

If you completed an issue successfully, just stop. The loop will restart you.

**YOUR ITERATION IS DONE. STOP NOW.**

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `{{READY_CMD}}` | List issues ready to work (scoped) |
| `bd show <id>` | View issue details |
| `bd update <id> --status in_progress` | Claim an issue |
| `bd update <id> --acceptance "<text>"` | Update acceptance criteria |
| `bd update <id> --notes "<text>"` | Add implementation notes |
| `bd create --title "..." --type task{{PARENT_FLAG}}` | Create new issue |
| `bd close <id>` | Close completed issue |

---

## Critical Rules Summary

1. **ONE ISSUE, THEN STOP** - This is the most important rule
2. **Mark in progress FIRST** - Before any other work
3. **Read ALL fields** - Description, Design, Acceptance Criteria, Notes, Comments
4. **All acceptance criteria must be `[x]`** - Every single one
5. **File issues for discoveries** - Don't get blocked, create new issues
6. **Commit with issue ID** - Include the beads ID in commit message
7. **Progress over perfection** - A closed issue with notes beats a stuck issue

---

Now begin with Step 1. Complete ONE issue, then STOP.
