#!/bin/bash

# Debug commands for schema failure triage
# Usage: ./debug-schema-failures.sh [command] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
elif [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
fi

# Function to check if required tools are available
check_dependencies() {
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}Error: psql is required but not installed.${NC}"
        exit 1
    fi
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed.${NC}"
        exit 1
    fi
}

# Function to get recent schema failures
show_recent_failures() {
    local limit=${1:-10}
    echo -e "${BLUE}Recent Schema Failures (Last $limit):${NC}"

    psql "$SUPABASE_DB_URL" -c "
        SELECT
            id,
            created_at,
            request_id,
            substring(payload_preview, 1, 100) as preview,
            validation_errors,
            status,
            first_seen
        FROM schema_failures
        ORDER BY created_at DESC
        LIMIT $limit;
    " 2>/dev/null || echo -e "${RED}Failed to connect to database. Check SUPABASE_DB_URL${NC}"
}

# Function to show failure statistics
show_stats() {
    echo -e "${BLUE}Schema Failure Statistics:${NC}"

    psql "$SUPABASE_DB_URL" -c "
        SELECT
            status,
            COUNT(*) as count,
            MIN(created_at) as first_occurred,
            MAX(created_at) as last_occurred
        FROM schema_failures
        GROUP BY status
        ORDER BY count DESC;
    " 2>/dev/null || echo -e "${RED}Failed to connect to database. Check SUPABASE_DB_URL${NC}"
}

# Function to show most common validation errors
show_common_errors() {
    echo -e "${BLUE}Most Common Validation Errors:${NC}"

    psql "$SUPABASE_DB_URL" -c "
        SELECT
            substring(validation_errors, 1, 200) as error_pattern,
            COUNT(*) as occurrences,
            MIN(created_at) as first_seen,
            MAX(created_at) as last_seen
        FROM schema_failures
        WHERE validation_errors IS NOT NULL
        GROUP BY substring(validation_errors, 1, 200)
        ORDER BY occurrences DESC
        LIMIT 10;
    " 2>/dev/null || echo -e "${RED}Failed to connect to database. Check SUPABASE_DB_URL${NC}"
}

# Function to set failure status
update_status() {
    local failure_id=$1
    local new_status=$2

    if [ -z "$failure_id" ] || [ -z "$new_status" ]; then
        echo -e "${RED}Usage: $0 update-status <failure_id> <status>${NC}"
        echo -e "${YELLOW}Valid statuses: active, resolved, ignored${NC}"
        exit 1
    fi

    if [[ ! "$new_status" =~ ^(active|resolved|ignored)$ ]]; then
        echo -e "${RED}Invalid status. Use: active, resolved, or ignored${NC}"
        exit 1
    fi

    echo -e "${BLUE}Updating failure $failure_id to status: $new_status${NC}"

    psql "$SUPABASE_DB_URL" -c "
        UPDATE schema_failures
        SET status = '$new_status'
        WHERE id = '$failure_id';
    " 2>/dev/null || echo -e "${RED}Failed to update. Check failure ID and database connection.${NC}"
}

# Function to show failure details
show_details() {
    local failure_id=$1

    if [ -z "$failure_id" ]; then
        echo -e "${RED}Usage: $0 details <failure_id>${NC}"
        exit 1
    fi

    echo -e "${BLUE}Schema Failure Details (ID: $failure_id):${NC}"

    psql "$SUPABASE_DB_URL" -c "
        SELECT
            id,
            created_at,
            request_id,
            payload_preview,
            validation_errors,
            status,
            first_seen
        FROM schema_failures
        WHERE id = '$failure_id';
    " 2>/dev/null || echo -e "${RED}Failed to fetch details. Check failure ID and database connection.${NC}"
}

# Function to clean up old resolved failures
cleanup_resolved() {
    local days=${1:-30}
    echo -e "${BLUE}Cleaning up resolved failures older than $days days...${NC}"

    psql "$SUPABASE_DB_URL" -c "
        DELETE FROM schema_failures
        WHERE status = 'resolved'
        AND created_at < NOW() - INTERVAL '$days days';
    " 2>/dev/null || echo -e "${RED}Failed to cleanup. Check database connection.${NC}"

    echo -e "${GREEN}Cleanup completed.${NC}"
}

# Function to show help
show_help() {
    echo -e "${GREEN}Schema Failure Debug Commands${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  recent [limit]          Show recent failures (default: 10)"
    echo "  stats                   Show failure statistics"
    echo "  common                  Show most common validation errors"
    echo "  details <id>            Show detailed information for a specific failure"
    echo "  update-status <id> <status>  Update failure status (active|resolved|ignored)"
    echo "  cleanup [days]          Remove resolved failures older than N days (default: 30)"
    echo "  help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 recent 5"
    echo "  $0 stats"
    echo "  $0 details abc-123-def"
    echo "  $0 update-status abc-123-def resolved"
    echo "  $0 cleanup 7"
}

# Main command dispatcher
main() {
    check_dependencies

    case "${1:-help}" in
        "recent")
            show_recent_failures "${2:-10}"
            ;;
        "stats")
            show_stats
            ;;
        "common")
            show_common_errors
            ;;
        "details")
            show_details "$2"
            ;;
        "update-status")
            update_status "$2" "$3"
            ;;
        "cleanup")
            cleanup_resolved "${2:-30}"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

main "$@"