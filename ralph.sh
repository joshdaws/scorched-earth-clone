#!/bin/bash
#
# Ralph - Autonomous Issue Processor
#
# Loops through Beads issues, passing each to Claude Code for processing.
#
# Usage:
#   ./ralph.sh --all                  Process all open issues
#   ./ralph.sh --epic <id>            Process issues in an epic
#   ./ralph.sh --type <type>          Process issues of a type (bug, task, feature)
#   ./ralph.sh --max <n>              Max iterations (default: 50)
#

# Don't use set -e - it causes issues with arithmetic and optional commands

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DIR="$SCRIPT_DIR/.ralph"
PROMPT_TEMPLATE="$RALPH_DIR/PROMPT.md"
LOG_FILE="$RALPH_DIR/ralph.log"
OUTPUT_FILE="$RALPH_DIR/output.tmp"

MAX_ITERATIONS=50
EPIC_ID=""
ISSUE_TYPE=""
SCOPE_ALL=false

# ============================================================================
# Argument Parsing
# ============================================================================

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
        --all|-a)
            SCOPE_ALL=true
            shift
            ;;
        --max|-m)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Ralph - Autonomous Issue Processor"
            echo ""
            echo "Usage:"
            echo "  ./ralph.sh --all              Process all open issues"
            echo "  ./ralph.sh --epic <id>        Process issues in an epic"
            echo "  ./ralph.sh --type <type>      Process by type (bug, task, feature)"
            echo "  ./ralph.sh --max <n>          Max iterations (default: 50)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Require at least one scope
if [[ -z "$EPIC_ID" && -z "$ISSUE_TYPE" && "$SCOPE_ALL" == false ]]; then
    echo "Error: Specify --all, --epic <id>, or --type <type>"
    echo "Use --help for usage"
    exit 1
fi

# ============================================================================
# Build Commands
# ============================================================================

READY_CMD="bd ready"
SCOPE_DESC=""
PARENT_FLAG=""

if [[ -n "$EPIC_ID" ]]; then
    READY_CMD="$READY_CMD --parent $EPIC_ID"
    SCOPE_DESC="epic $EPIC_ID"
    PARENT_FLAG=" --parent $EPIC_ID"

    # Validate epic exists
    if ! bd show "$EPIC_ID" &>/dev/null; then
        echo "Error: Epic '$EPIC_ID' not found"
        exit 1
    fi
fi

if [[ -n "$ISSUE_TYPE" ]]; then
    READY_CMD="$READY_CMD --type $ISSUE_TYPE"
    [[ -n "$SCOPE_DESC" ]] && SCOPE_DESC="$SCOPE_DESC, "
    SCOPE_DESC="${SCOPE_DESC}type=$ISSUE_TYPE"
fi

if [[ "$SCOPE_ALL" == true ]]; then
    SCOPE_DESC="all open issues"
fi

# ============================================================================
# Generate Prompt
# ============================================================================

generate_prompt() {
    sed -e "s|{{SCOPE_DESCRIPTION}}|$SCOPE_DESC|g" \
        -e "s|{{READY_CMD}}|$READY_CMD|g" \
        -e "s|{{PARENT_FLAG}}|$PARENT_FLAG|g" \
        "$PROMPT_TEMPLATE"
}

# ============================================================================
# Logging
# ============================================================================

log() {
    local msg="[$(date '+%H:%M:%S')] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

# ============================================================================
# Cleanup
# ============================================================================

cleanup() {
    rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT

# ============================================================================
# Main Loop
# ============================================================================

echo "========================================"
echo "Ralph - Autonomous Issue Processor"
echo "========================================"
echo "Scope: $SCOPE_DESC"
echo "Command: $READY_CMD"
echo "Max iterations: $MAX_ITERATIONS"
echo "Press Ctrl+C to stop"
echo ""

# Initialize log
echo "" >> "$LOG_FILE"
echo "=== Session started $(date) ===" >> "$LOG_FILE"
echo "Scope: $SCOPE_DESC" >> "$LOG_FILE"

iteration=0

while [[ $iteration -lt $MAX_ITERATIONS ]]; do
    # Safe increment (won't fail with set -e)
    iteration=$((iteration + 1))

    echo ""
    echo "========================================"
    echo "Iteration $iteration / $MAX_ITERATIONS"
    echo "========================================"

    log "Starting iteration $iteration"

    # Check remaining issues - count lines starting with a number
    remaining=$($READY_CMD 2>/dev/null | grep -cE '^[0-9]+\.' || true)
    remaining=${remaining:-0}
    log "Issues remaining: $remaining"

    if [[ "$remaining" -eq 0 ]]; then
        echo ""
        echo "All issues complete!"
        log "All issues complete - exiting"
        break
    fi

    # Show what's next
    echo ""
    echo "Next issues:"
    $READY_CMD 2>/dev/null | head -5
    echo ""

    # Generate prompt to temp file to avoid huge variable
    prompt=$(generate_prompt)

    # Run Claude with retries
    max_retries=3
    retry=0
    success=false

    while [[ $retry -lt $max_retries ]]; do
        log "Running Claude (attempt $((retry + 1))/$max_retries)..."

        # Run Claude with timeout, output to file then display
        # Using timeout to prevent hanging forever
        if timeout 600 claude --dangerously-skip-permissions -- "$prompt" > "$OUTPUT_FILE" 2>&1; then
            # Check output file has content
            if [[ -s "$OUTPUT_FILE" ]] && ! grep -q "No messages returned" "$OUTPUT_FILE"; then
                cat "$OUTPUT_FILE"
                success=true

                # Check for completion signals
                if grep -q "RALPH_DONE" "$OUTPUT_FILE"; then
                    log "Iteration complete"

                    # Check if scope is done
                    if grep -q "No issues remaining" "$OUTPUT_FILE"; then
                        echo ""
                        echo "All issues in scope complete!"
                        log "Scope complete - exiting"
                        exit 0
                    fi
                fi
                break
            fi
        fi

        # Increment retry counter safely
        retry=$((retry + 1))
        if [[ $retry -lt $max_retries ]]; then
            wait_time=$((retry * 5))
            log "Failed or empty response - retrying in ${wait_time}s..."
            sleep "$wait_time"
        fi
    done

    if [[ "$success" == false ]]; then
        log "Failed after $max_retries attempts - continuing to next iteration"
        # Show what we got if anything
        if [[ -s "$OUTPUT_FILE" ]]; then
            echo "Last output:"
            tail -20 "$OUTPUT_FILE"
        fi
        sleep 3
    fi

    # Brief pause between iterations
    sleep 2
done

echo ""
echo "========================================"
echo "Finished after $iteration iterations"
echo "========================================"
log "Session ended after $iteration iterations"

# Show final status
echo ""
bd stats 2>/dev/null || true
