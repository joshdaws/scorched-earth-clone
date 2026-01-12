# Suggested Commands

## Development Server
```bash
# Start local dev server
python3 -m http.server 8000
# Or use npm script
npm run serve
```

## Build Commands
```bash
# Build for web (copies to www/)
npm run build:web

# Build for iOS
npm run build:ios

# Open iOS project in Xcode
npm run open:ios
```

## Task Management (Beads)
```bash
# See what's ready to work on
bd ready

# View issue details
bd show <issue-id>

# Claim an issue before starting
bd update <issue-id> --claim

# Mark issue in progress
bd update <issue-id> --status in_progress

# Update acceptance criteria
bd update <issue-id> --acceptance "..."

# Close when done
bd close <issue-id>

# Create new issue
bd create --title "..." --type bug --priority P2
```

## Git Commands
```bash
git status
git add -A
git commit -m "feat: description"
git push
```

## System Utilities (Darwin/macOS)
```bash
ls -la         # List files
cd <dir>       # Change directory
grep -r "pattern" .  # Search
find . -name "*.js"  # Find files
```
