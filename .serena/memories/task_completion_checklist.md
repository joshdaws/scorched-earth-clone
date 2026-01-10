# Task Completion Checklist

When completing a task, follow this checklist:

## 1. Visual Validation (REQUIRED)
- Start local server: `python3 -m http.server 8000`
- Open browser to http://localhost:8000
- Check browser console for errors
- Verify visual elements render correctly
- Test any new functionality

## 2. Acceptance Criteria
- Review ALL acceptance criteria with `bd show <issue-id>`
- Verify each criterion is met
- Update issue with checked criteria using `bd update <issue-id> --acceptance "..."`

## 3. Code Quality
- Follow ES6+ patterns
- Document complex logic with comments
- No placeholder implementations
- Ensure mobile compatibility considered

## 4. Git Commit
```bash
git add -A
git commit -m "feat|fix|docs: description

Implements <issue-id>"
```

## 5. Close Issue
```bash
bd close <issue-id>
```

## Note
- No automated tests exist - validation is via browser testing
- No linting/formatting tools configured - follow existing code patterns
