#!/bin/bash
#
# Ralph Wiggum Loop - Autonomous Issue Processing
# "I'm helping!" - Ralph Wiggum
#
# This script automates working through Beads issues by piping a templated
# prompt to Claude Code in a loop. Each iteration handles exactly one issue.
#
# Usage:
#   ./ralph.sh --epic <epic-id>     Work on issues in a specific epic
#   ./ralph.sh --type <type>        Work on issues of a specific type (task, bug, feature)
#   ./ralph.sh --label <label>      Work on issues with a specific label
#   ./ralph.sh --priority <n>       Work on issues with priority <= n
#   ./ralph.sh --all                Work on all open issues
#   ./ralph.sh --max <n>            Set max iterations (default: 50)
#   ./ralph.sh --help               Show this help message
#
# Multiple filters can be combined:
#   ./ralph.sh --epic beads-abc --type task --max 20

set -e

# Configuration
RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.ralph" && pwd)"
PROJECT_ROOT="$(dirname "$RALPH_DIR")"
PROMPT_TEMPLATE="$RALPH_DIR/PROMPT.md"
GENERATED_PROMPT="$RALPH_DIR/generated_prompt.md"
LOG_FILE="$RALPH_DIR/ralph.log"
PROGRESS_FILE="$RALPH_DIR/progress.txt"
OUTPUT_FILE="$RALPH_DIR/output.tmp"
MAX_ITERATIONS=50
MAX_RETRIES=3
INITIAL_RETRY_DELAY=5
ITERATION_PAUSE=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Scope variables
EPIC_ID=""
ISSUE_TYPE=""
LABEL=""
PRIORITY=""
SCOPE_ALL=false

# Logging function with timestamp and color
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" >> "$LOG_FILE"
    echo -e "${BLUE}[$timestamp]${NC} $1"
}

# Error handling
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Show help
show_help() {
    cat << 'EOF'
Ralph Wiggum Loop - Autonomous Issue Processing

Usage:
  ./ralph.sh [OPTIONS]

Options:
  --epic <id>       Work on issues in a specific epic (uses --parent filter)
  --type <type>     Work on issues of a specific type (task, bug, feature)
  --label <label>   Work on issues with a specific label
  --priority <n>    Work on issues with priority <= n (0=critical, 4=backlog)
  --all             Work on all open issues (use with caution!)
  --max <n>         Set maximum iterations (default: 50)
  --help            Show this help message

Examples:
  ./ralph.sh --epic scorched-earth-abc123 --max 20
  ./ralph.sh --type bug
  ./ralph.sh --label frontend --type task
  ./ralph.sh --priority 1 --max 30
  ./ralph.sh --all --max 100

Notes:
  - At least one scope filter is required (--epic, --type, --label, --priority, or --all)
  - Multiple filters can be combined to narrow the scope
  - The loop stops when: all issues complete, max iterations reached, or completion signal detected
EOF
    exit 0
}

# Parse command line arguments
parse_args() {
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
            --priority|-p)
                PRIORITY="$2"
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
                show_help
                ;;
            *)
                error "Unknown option: $1. Use --help for usage."
                ;;
        esac
    done
}

# Validate that at least one scope is specified
validate_scope() {
    if [[ -z "$EPIC_ID" && -z "$ISSUE_TYPE" && -z "$LABEL" && -z "$PRIORITY" && "$SCOPE_ALL" == false ]]; then
        error "No scope specified. Use --epic, --type, --label, --priority, or --all. Use --help for usage."
    fi
}

# Validate epic exists if specified
validate_epic() {
    if [[ -n "$EPIC_ID" ]]; then
        if ! bd show "$EPIC_ID" &>/dev/null; then
            error "Epic '$EPIC_ID' not found. Check the ID and try again."
        fi
        log "Validated epic: $EPIC_ID"
    fi
}

# Build the bd ready command with filters
build_ready_cmd() {
    local cmd="bd ready"

    if [[ -n "$EPIC_ID" ]]; then
        cmd="$cmd --parent $EPIC_ID"
    fi

    if [[ -n "$ISSUE_TYPE" ]]; then
        cmd="$cmd --type $ISSUE_TYPE"
    fi

    if [[ -n "$LABEL" ]]; then
        cmd="$cmd --label $LABEL"
    fi

    if [[ -n "$PRIORITY" ]]; then
        cmd="$cmd --priority $PRIORITY"
    fi

    echo "$cmd"
}

# Build human-readable scope description
build_scope_description() {
    local parts=()

    if [[ -n "$EPIC_ID" ]]; then
        parts+=("epic **$EPIC_ID**")
    fi

    if [[ -n "$ISSUE_TYPE" ]]; then
        parts+=("type=**$ISSUE_TYPE**")
    fi

    if [[ -n "$LABEL" ]]; then
        parts+=("label=**$LABEL**")
    fi

    if [[ -n "$PRIORITY" ]]; then
        parts+=("priority<=**$PRIORITY**")
    fi

    if [[ "$SCOPE_ALL" == true ]]; then
        parts+=("**all open issues**")
    fi

    local IFS=", "
    echo "Working on: ${parts[*]}"
}

# Get epic context if working on an epic
get_epic_context() {
    if [[ -n "$EPIC_ID" ]]; then
        echo "\\n**Epic:** \`$EPIC_ID\`\\nWhen creating new issues, always link them to this epic with \`--parent $EPIC_ID\`"
    else
        echo ""
    fi
}

# Get parent flag for issue creation
get_parent_flag() {
    if [[ -n "$EPIC_ID" ]]; then
        echo " --parent $EPIC_ID"
    else
        echo ""
    fi
}

# Count remaining issues
count_remaining() {
    local ready_cmd="$1"
    # Count lines that start with a number (numbered list items like "1.", "2.", etc.)
    local count
    count=$($ready_cmd 2>/dev/null | grep -c '^\s*[0-9]\+\. \[' || true)
    echo "${count:-0}"
}

# Run Claude with retry logic and exponential backoff
run_claude_with_retry() {
    local prompt_file="$1"
    local output_file="$2"
    local attempt=1
    local delay=$INITIAL_RETRY_DELAY
    local debug_dir="$RALPH_DIR/debug"

    # Create debug directory if it doesn't exist
    mkdir -p "$debug_dir"

    while [[ $attempt -le $MAX_RETRIES ]]; do
        log "Claude attempt $attempt of $MAX_RETRIES..."

        # Pre-flight diagnostics
        local prompt_size=$(wc -c < "$prompt_file" 2>/dev/null || echo "0")
        local prompt_lines=$(wc -l < "$prompt_file" 2>/dev/null || echo "0")
        log "  Prompt: $prompt_lines lines, $prompt_size bytes"

        if [[ ! -s "$prompt_file" ]]; then
            log "ERROR: Prompt file is empty or missing!"
            return 1
        fi

        # Run Claude and capture exit code
        local exit_code=0
        local timestamp=$(date '+%Y%m%d_%H%M%S')
        cat "$prompt_file" | claude --dangerously-skip-permissions 2>&1 | tee "$output_file" || exit_code=$?

        # Check if output contains the "No messages returned" error
        if grep -q "No messages returned" "$output_file" 2>/dev/null; then
            log "Transient error detected: No messages returned"

            # Save debug info for analysis
            local debug_file="$debug_dir/error_${timestamp}_attempt${attempt}.txt"
            {
                echo "=== ERROR DEBUG INFO ==="
                echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
                echo "Attempt: $attempt of $MAX_RETRIES"
                echo "Prompt file: $prompt_file"
                echo "Prompt size: $prompt_size bytes, $prompt_lines lines"
                echo "Exit code: $exit_code"
                echo ""
                echo "=== ENVIRONMENT ==="
                echo "Node version: $(node --version 2>/dev/null || echo 'unknown')"
                echo "Claude version: $(claude --version 2>/dev/null || echo 'unknown')"
                echo "PWD: $(pwd)"
                echo ""
                echo "=== OUTPUT ==="
                cat "$output_file"
                echo ""
                echo "=== PROMPT FIRST 50 LINES ==="
                head -50 "$prompt_file"
            } > "$debug_file"
            log "  Debug info saved to: $debug_file"

            if [[ $attempt -lt $MAX_RETRIES ]]; then
                echo -e "${YELLOW}Transient error detected. Retrying in ${delay}s... (attempt $attempt of $MAX_RETRIES)${NC}"
                sleep $delay
                # Exponential backoff: double the delay for next attempt
                delay=$((delay * 2))
                ((attempt++))
                continue
            else
                log "Max retries reached. Giving up on this iteration."
                echo -e "${RED}Max retries reached. Skipping this iteration.${NC}"
                echo -e "${YELLOW}Debug files saved in: $debug_dir${NC}"
                return 1
            fi
        fi

        # Check for other unhandled promise rejections (transient errors)
        if grep -q "unhandledRejection\|promise.*rejected" "$output_file" 2>/dev/null; then
            log "Transient error detected: Unhandled rejection"
            if [[ $attempt -lt $MAX_RETRIES ]]; then
                echo -e "${YELLOW}Transient error detected. Retrying in ${delay}s... (attempt $attempt of $MAX_RETRIES)${NC}"
                sleep $delay
                delay=$((delay * 2))
                ((attempt++))
                continue
            else
                log "Max retries reached. Giving up on this iteration."
                echo -e "${RED}Max retries reached. Skipping this iteration.${NC}"
                return 1
            fi
        fi

        # Success or non-transient error
        if [[ $exit_code -eq 0 ]]; then
            log "Claude completed successfully"
            return 0
        else
            log "Claude exited with code $exit_code (non-transient)"
            return $exit_code
        fi
    done

    return 1
}

# Generate prompt from template
generate_prompt() {
    local ready_cmd="$1"
    local scope_desc="$2"
    local epic_context="$3"
    local parent_flag="$4"

    if [[ ! -f "$PROMPT_TEMPLATE" ]]; then
        error "Prompt template not found: $PROMPT_TEMPLATE"
    fi

    # Read template and substitute placeholders
    sed -e "s|{{READY_CMD}}|$ready_cmd|g" \
        -e "s|{{SCOPE_DESCRIPTION}}|$scope_desc|g" \
        -e "s|{{PARENT_FLAG}}|$parent_flag|g" \
        -e "s|{{EPIC_CONTEXT}}|$epic_context|g" \
        "$PROMPT_TEMPLATE" | sed 's/\\n/\
/g' > "$GENERATED_PROMPT"
}

# Cleanup on exit
cleanup() {
    echo ""
    log "Ralph loop interrupted. Cleaning up..."
    rm -f "$OUTPUT_FILE" "$GENERATED_PROMPT"
    # Show final stats
    echo ""
    echo -e "${YELLOW}=== Final Status ===${NC}"
    bd stats 2>/dev/null || true
    echo ""
    if [[ -f "$PROGRESS_FILE" ]]; then
        local completed=$(grep -c "^## " "$PROGRESS_FILE" 2>/dev/null || echo "0")
        echo -e "${GREEN}Issues completed this session: $completed${NC}"
    fi
}

trap cleanup SIGINT SIGTERM

# Main loop
main() {
    parse_args "$@"
    validate_scope
    validate_epic

    local ready_cmd=$(build_ready_cmd)
    local scope_desc=$(build_scope_description)
    local epic_context=$(get_epic_context)
    local parent_flag=$(get_parent_flag)

    # Initialize log
    log "=========================================="
    log "Ralph Wiggum Loop Starting"
    log "Scope: $scope_desc"
    log "Ready command: $ready_cmd"
    log "Max iterations: $MAX_ITERATIONS"
    log "=========================================="

    # Initialize progress file for this session
    echo "" >> "$PROGRESS_FILE"
    echo "# Ralph Session $(date '+%Y-%m-%d %H:%M:%S')" >> "$PROGRESS_FILE"
    echo "# Scope: $scope_desc" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"

    # Print startup banner
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}Ralph Wiggum Loop${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo "Scope: $scope_desc"
    echo "Filter: $ready_cmd"
    echo "Max iterations: $MAX_ITERATIONS"
    echo "Progress file: $PROGRESS_FILE"
    echo "Press Ctrl+C to stop"
    echo ""

    local iteration=0

    while [[ $iteration -lt $MAX_ITERATIONS ]]; do
        ((iteration++))

        echo ""
        echo -e "${YELLOW}==========================================${NC}"
        echo -e "${YELLOW}ITERATION $iteration of $MAX_ITERATIONS${NC}"
        echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo -e "${YELLOW}==========================================${NC}"

        # Check remaining issues
        local remaining=$(count_remaining "$ready_cmd")
        log "Iteration $iteration: $remaining issues remaining"

        if [[ "$remaining" -eq 0 ]]; then
            echo ""
            echo -e "${GREEN}==========================================${NC}"
            echo -e "${GREEN}ALL ISSUES IN SCOPE COMPLETE!${NC}"
            echo -e "${GREEN}==========================================${NC}"
            log "All issues complete. Exiting loop."
            break
        fi

        # Show next ready issues
        echo ""
        echo -e "${BLUE}Next ready issues:${NC}"
        $ready_cmd 2>/dev/null | head -5
        echo ""

        # Generate the prompt
        generate_prompt "$ready_cmd" "$scope_desc" "$epic_context" "$parent_flag"

        log "Running Claude for iteration $iteration..."

        # Run Claude with retry logic
        if run_claude_with_retry "$GENERATED_PROMPT" "$OUTPUT_FILE"; then
            log "Claude iteration $iteration completed successfully"
        else
            log "Claude iteration $iteration failed after retries"
            echo -e "${RED}Iteration $iteration failed. Continuing to next iteration...${NC}"
        fi

        # Check for completion signal (must be exact match on its own line)
        if grep -q "^RALPH_SIGNAL::SCOPE_COMPLETE$" "$OUTPUT_FILE" 2>/dev/null; then
            echo ""
            echo -e "${GREEN}==========================================${NC}"
            echo -e "${GREEN}SCOPE COMPLETE SIGNAL DETECTED!${NC}"
            echo -e "${GREEN}==========================================${NC}"
            log "Completion signal detected. Exiting loop."
            rm -f "$OUTPUT_FILE"
            break
        fi

        rm -f "$OUTPUT_FILE"

        # Brief pause between iterations to avoid rate limiting
        log "Pausing ${ITERATION_PAUSE}s before next iteration..."
        sleep $ITERATION_PAUSE
    done

    if [[ $iteration -ge $MAX_ITERATIONS ]]; then
        echo ""
        echo -e "${YELLOW}==========================================${NC}"
        echo -e "${YELLOW}MAX ITERATIONS ($MAX_ITERATIONS) REACHED${NC}"
        echo -e "${YELLOW}==========================================${NC}"
        log "Max iterations reached. Stopping loop."
    fi

    # Final summary
    echo ""
    echo -e "${BLUE}=== Final Summary ===${NC}"
    bd stats 2>/dev/null || true
    echo ""
    if [[ -f "$PROGRESS_FILE" ]]; then
        local completed=$(grep -c "^## " "$PROGRESS_FILE" 2>/dev/null || echo "0")
        echo -e "${GREEN}Issues completed this session: $completed${NC}"
    fi
    log "Ralph loop finished after $iteration iterations"
}

# Run main
main "$@"
