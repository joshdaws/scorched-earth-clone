#!/bin/bash
#
# Ralph Wiggum Loop - Autonomous Issue Processing
# Based on https://ghuntley.com/ralph/
#
# Usage:
#   ./ralph.sh --epic <epic-id>       Work on issues in a specific epic
#   ./ralph.sh --type bug             Work on all bugs
#   ./ralph.sh --type feature         Work on all features
#   ./ralph.sh --label <label>        Work on issues with a label
#   ./ralph.sh --all                  Work on all open issues
#   ./ralph.sh --max 20               Set max iterations (default: 50)
#
# Examples:
#   ./ralph.sh --epic scorched-earth-abc --max 30
#   ./ralph.sh --type bug
#   ./ralph.sh --label frontend --type task
#

set -e

# Defaults
MAX_ITERATIONS=50
EPIC_ID=""
ISSUE_TYPE=""
LABEL=""
SCOPE_ALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --epic|-e)
            EPIC_ID="$2"
            shift 2
            ;;
        --type|-t)
            ISSUE_TYPE="$2"
            shift 2
            ;;
        --label|-l)
            LABEL="$2"
            shift 2
            ;;
        --all|-a)
            SCOPE_ALL=true
            shift
            ;;
        --max|-m)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Ralph Wiggum Loop - Autonomous Issue Processing"
            echo ""
            echo "Usage:"
            echo "  ./ralph.sh --epic <epic-id>    Work on issues in a specific epic"
            echo "  ./ralph.sh --type <type>       Work on issues of a type (bug, feature, task)"
            echo "  ./ralph.sh --label <label>     Work on issues with a label"
            echo "  ./ralph.sh --all               Work on all open issues"
            echo "  ./ralph.sh --max <n>           Max iterations (default: 50)"
            echo ""
            echo "Examples:"
            echo "  ./ralph.sh --epic scorched-earth-abc"
            echo "  ./ralph.sh --type bug --max 20"
            echo "  ./ralph.sh --label gameplay"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate: must specify a scope
if [ -z "$EPIC_ID" ] && [ -z "$ISSUE_TYPE" ] && [ -z "$LABEL" ] && [ "$SCOPE_ALL" = false ]; then
    echo "ERROR: You must specify a scope. Use one of:"
    echo "  --epic <epic-id>    Work on a specific epic"
    echo "  --type <type>       Work on a type (bug, feature, task)"
    echo "  --label <label>     Work on issues with a label"
    echo "  --all               Work on all open issues"
    echo ""
    echo "Use --help for more information"
    exit 1
fi

# Build the bd ready command and scope description
READY_CMD="bd ready"
SCOPE_DESC=""
PARENT_FLAG=""

if [ -n "$EPIC_ID" ]; then
    READY_CMD="$READY_CMD --parent $EPIC_ID"
    SCOPE_DESC="Working on epic: **$EPIC_ID**"
    PARENT_FLAG=" --parent $EPIC_ID"

    # Validate epic exists
    if ! bd show "$EPIC_ID" > /dev/null 2>&1; then
        echo "ERROR: Epic '$EPIC_ID' not found"
        exit 1
    fi
fi

if [ -n "$ISSUE_TYPE" ]; then
    READY_CMD="$READY_CMD --type $ISSUE_TYPE"
    if [ -n "$SCOPE_DESC" ]; then
        SCOPE_DESC="$SCOPE_DESC, type: **$ISSUE_TYPE**"
    else
        SCOPE_DESC="Working on type: **$ISSUE_TYPE**"
    fi
fi

if [ -n "$LABEL" ]; then
    READY_CMD="$READY_CMD --label $LABEL"
    if [ -n "$SCOPE_DESC" ]; then
        SCOPE_DESC="$SCOPE_DESC, label: **$LABEL**"
    else
        SCOPE_DESC="Working on label: **$LABEL**"
    fi
fi

if [ "$SCOPE_ALL" = true ]; then
    SCOPE_DESC="Working on: **all open issues**"
fi

# Build epic context section (single line to avoid sed issues)
EPIC_CONTEXT=""
if [ -n "$EPIC_ID" ]; then
    EPIC_CONTEXT="\\n**Epic:** \`$EPIC_ID\`\\nWhen creating new issues, always link them to this epic with \`--parent $EPIC_ID\`"
fi

# Ensure we're in the project root
cd "$(dirname "$0")"

# Check required files
if [ ! -f ".ralph/PROMPT.md" ]; then
    echo "ERROR: .ralph/PROMPT.md not found"
    exit 1
fi

# Setup
LOG_FILE=".ralph/ralph.log"
OUTPUT_FILE=".ralph/output.tmp"
GENERATED_PROMPT=".ralph/generated_prompt.md"
PROGRESS_FILE=".ralph/progress.txt"
PROMISE_TAG="<promise>SCOPE COMPLETE</promise>"
ITERATION=0

# Clear logs for fresh session
echo "Clearing previous session logs..."
> "$LOG_FILE"
> "$PROGRESS_FILE"

echo "=========================================="
echo "Ralph Wiggum Loop"
echo "=========================================="
echo "Scope: $SCOPE_DESC"
echo "Filter: $READY_CMD"
echo "Max iterations: $MAX_ITERATIONS"
echo "Progress file: $PROGRESS_FILE"
echo "Press Ctrl+C to stop"
echo ""

# Generate the prompt with substitutions
generate_prompt() {
    sed -e "s|{{SCOPE_DESCRIPTION}}|$SCOPE_DESC|g" \
        -e "s|{{READY_CMD}}|$READY_CMD|g" \
        -e "s|{{EPIC_CONTEXT}}|$EPIC_CONTEXT|g" \
        -e "s|{{PARENT_FLAG}}|$PARENT_FLAG|g" \
        .ralph/PROMPT.md | sed 's/\\n/\
/g' > "$GENERATED_PROMPT"
}

# Clean up temp files on exit
trap "rm -f $OUTPUT_FILE $GENERATED_PROMPT" EXIT

# Log start
echo "$(date): Ralph loop started - $SCOPE_DESC" >> "$LOG_FILE"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))

    echo ""
    echo "=========================================="
    echo "ITERATION $ITERATION of $MAX_ITERATIONS"
    echo "$(date)"
    echo "=========================================="
    echo ""

    # Log iteration
    echo "$(date): Starting iteration $ITERATION" >> "$LOG_FILE"

    # Check for remaining issues in scope (count lines starting with issue numbers)
    REMAINING=$($READY_CMD 2>/dev/null | grep -c '^\s*[0-9]\+\. \[' || echo "0")
    REMAINING=${REMAINING:-0}
    echo "Remaining issues in scope: $REMAINING"

    if [ "$REMAINING" = "0" ]; then
        echo ""
        echo "=========================================="
        echo "ALL ISSUES IN SCOPE COMPLETE!"
        echo "=========================================="
        echo "$(date): All issues complete, exiting loop" >> "$LOG_FILE"
        break
    fi

    # Show what's ready
    echo ""
    echo "Ready issues:"
    $READY_CMD --limit 5 2>/dev/null || true
    echo ""

    # Generate prompt with current context
    generate_prompt

    echo "$(date): Running Claude for iteration $ITERATION..." >> "$LOG_FILE"

    # Run Claude with retry logic for transient errors
    # Key fix: pass prompt as argument (--) instead of piping via stdin
    PROMPT_CONTENT=$(cat "$GENERATED_PROMPT")
    MAX_RETRIES=3
    RETRY_COUNT=0
    CLAUDE_SUCCESS=false

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        # Run claude in a subshell to isolate crashes
        # Write to file first (no pipe), then display
        (
            exec 2>&1
            claude --dangerously-skip-permissions -- "$PROMPT_CONTENT"
        ) > "$OUTPUT_FILE" 2>&1 || true

        # Check if output looks successful (has content and no fatal errors)
        if [ -s "$OUTPUT_FILE" ] && ! grep -q "No messages returned" "$OUTPUT_FILE"; then
            cat "$OUTPUT_FILE"
            echo "$(date): Claude iteration $ITERATION completed" >> "$LOG_FILE"
            CLAUDE_SUCCESS=true
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                BACKOFF=$((RETRY_COUNT * 5))
                echo "Claude failed or returned no messages. Retry $RETRY_COUNT/$MAX_RETRIES in ${BACKOFF}s..."
                echo "$(date): Claude failed. Retry $RETRY_COUNT/$MAX_RETRIES in ${BACKOFF}s..." >> "$LOG_FILE"
                sleep "$BACKOFF"
            else
                echo "$(date): Claude iteration $ITERATION failed after $MAX_RETRIES retries" >> "$LOG_FILE"
                cat "$OUTPUT_FILE"  # Show what we got
            fi
        fi
    done

    # If Claude completely failed, skip to next iteration
    if [ "$CLAUDE_SUCCESS" = false ]; then
        echo "$(date): Skipping to next iteration due to Claude failure" >> "$LOG_FILE"
        sleep 5
        continue
    fi

    # Check for completion promise
    if grep -q "$PROMISE_TAG" "$OUTPUT_FILE" 2>/dev/null; then
        echo ""
        echo "=========================================="
        echo "SCOPE COMPLETE!"
        echo "=========================================="
        echo "$(date): Completion promise detected, exiting loop" >> "$LOG_FILE"
        break
    fi

    # Log completion
    echo "$(date): Completed iteration $ITERATION" >> "$LOG_FILE"

    # Brief pause between iterations
    sleep 2
done

echo ""
echo "=========================================="
echo "Ralph loop finished after $ITERATION iterations"
echo "=========================================="
echo "$(date): Ralph loop finished after $ITERATION iterations" >> "$LOG_FILE"

# Show final status
echo ""
echo "Beads status:"
bd stats 2>/dev/null || echo "Unable to get beads stats"

# Show progress summary
if [ -f "$PROGRESS_FILE" ]; then
    echo ""
    echo "Progress log: $PROGRESS_FILE"
    TOTAL_COMPLETED=$(grep -c "^## " "$PROGRESS_FILE" 2>/dev/null || echo "0")
    echo "Total issues completed: $TOTAL_COMPLETED"
fi
