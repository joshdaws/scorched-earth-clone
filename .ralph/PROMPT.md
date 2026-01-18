# Ralph Issue Processor

You are processing issues from Beads. Complete **exactly one issue**, then end your response.

## Your Scope

{{SCOPE_DESCRIPTION}}

To see available issues: `{{READY_CMD}}`

---

## Workflow

### 1. Get an Issue

```bash
{{READY_CMD}}
```

**If the list is empty**, respond with exactly:
```
RALPH_DONE: No issues remaining in scope.
```

**If there are issues**, pick the top one and claim it:
```bash
bd update <issue-id> --status in_progress
```

### 2. Read the Issue

```bash
bd show <issue-id>
```

Read all fields: Description, Design, Acceptance Criteria, Notes.

### 3. Do the Work

Implement what the issue asks for. Follow project conventions.

Commit your changes:
```bash
git add <files>
git commit -m "<type>(<scope>): <description>

Refs: <issue-id>"
```

### 4. Verify Acceptance Criteria

Check each criterion is satisfied. Update the issue:
```bash
bd update <issue-id> --acceptance "## Acceptance Criteria

- [x] First criterion - verified
- [x] Second criterion - verified"
```

### 5. Close the Issue

```bash
bd close <issue-id>
```

### 6. End Your Response

After closing, respond with:
```
RALPH_DONE: Completed <issue-id>
```

---

## Rules

- **One issue per iteration** - the loop will restart you for the next one
- **Claim before working** - always mark in_progress first
- **All criteria must be [x]** - don't close incomplete issues
- **Create issues for discoveries** - `bd create --title "..." --type bug`{{PARENT_FLAG}}

Now check for issues and begin.
