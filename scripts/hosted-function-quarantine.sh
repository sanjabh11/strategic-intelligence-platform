#!/bin/bash

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-jxdihzqoaxtydolmltdr}"
MODE="${MODE:-dry-run}"
ALLOWLIST="${ALLOWLIST:-}"
ALLOWLIST_FILE="${ALLOWLIST_FILE:-}"
ARTIFACT_DIR="${ARTIFACT_DIR:-}"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node is required"
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ supabase CLI is required"
  exit 1
fi

REPORT_JSON="$(node scripts/hosted-function-drift.mjs)"

if [ -z "$ARTIFACT_DIR" ] && [ "$MODE" = "execute" ]; then
  ARTIFACT_DIR=".ops-backups/hosted-function-quarantine-$(date +%Y%m%d-%H%M%S)"
fi

if [ -n "$ARTIFACT_DIR" ]; then
  mkdir -p "$ARTIFACT_DIR"
  printf '%s\n' "$REPORT_JSON" > "$ARTIFACT_DIR/drift-before.json"
  supabase functions list --project-ref "$PROJECT_REF" --output json > "$ARTIFACT_DIR/functions-before.json"
fi

CANDIDATES_RAW="$(printf '%s\n' "$REPORT_JSON" | node -e '
let data = "";
process.stdin.on("data", (chunk) => data += chunk);
process.stdin.on("end", () => {
  const report = JSON.parse(data);
  for (const item of report.quarantine_candidates || []) {
    console.log(item.name);
  }
});
')" 

CANDIDATES=()
while IFS= read -r line; do
  [ -n "$line" ] && CANDIDATES+=("$line")
done <<EOF
$CANDIDATES_RAW
EOF

if [ "${#CANDIDATES[@]}" -eq 0 ]; then
  echo "✅ No hosted quarantine candidates found."
  exit 0
fi

REQUESTED=()
if [ -n "$ALLOWLIST_FILE" ]; then
  if [ ! -f "$ALLOWLIST_FILE" ]; then
    echo "❌ ALLOWLIST_FILE not found: $ALLOWLIST_FILE"
    exit 1
  fi
  while IFS= read -r line; do
    trimmed="${line%%#*}"
    trimmed="$(printf '%s' "$trimmed" | tr -d '[:space:]')"
    [ -n "$trimmed" ] && REQUESTED+=("$trimmed")
  done < "$ALLOWLIST_FILE"
fi

if [ -n "$ALLOWLIST" ]; then
  while IFS= read -r item; do
    trimmed="$(printf '%s' "$item" | tr -d '[:space:]')"
    [ -n "$trimmed" ] && REQUESTED+=("$trimmed")
  done <<EOF
$(printf '%s' "$ALLOWLIST" | tr ',' '\n')
EOF
fi

SELECTED_CANDIDATES=("${CANDIDATES[@]}")
if [ "${#REQUESTED[@]}" -gt 0 ]; then
  VALIDATED=()
  for requested in "${REQUESTED[@]}"; do
    found=false
    for candidate in "${CANDIDATES[@]}"; do
      if [ "$candidate" = "$requested" ]; then
        VALIDATED+=("$requested")
        found=true
        break
      fi
    done
    if [ "$found" = false ]; then
      echo "❌ Requested allowlist entry is not a current quarantine candidate: $requested"
      exit 1
    fi
  done
  SELECTED_CANDIDATES=("${VALIDATED[@]}")
fi

echo "🔎 Hosted quarantine candidates for project $PROJECT_REF:"
for name in "${SELECTED_CANDIDATES[@]}"; do
  echo "  - $name"
done
echo ""

if [ "$MODE" != "execute" ]; then
  echo "Dry run only. No remote functions were deleted."
  echo ""
  echo "If you intentionally want to remove these remote-only functions, run:"
  echo "  MODE=execute bash scripts/hosted-function-quarantine.sh"
  echo ""
  echo "Equivalent delete commands:"
  for name in "${SELECTED_CANDIDATES[@]}"; do
    echo "  supabase functions delete $name --project-ref $PROJECT_REF"
  done
  exit 0
fi

if [ "${#REQUESTED[@]}" -eq 0 ]; then
  echo "❌ Execute mode requires ALLOWLIST or ALLOWLIST_FILE."
  echo "   Example:"
  echo "   MODE=execute ALLOWLIST_FILE=scripts/hosted-function-quarantine.stage-a.txt bash scripts/hosted-function-quarantine.sh"
  exit 1
fi

echo "⚠️  Executing remote-only function deletion."
for name in "${SELECTED_CANDIDATES[@]}"; do
  echo "Deleting $name..."
  supabase functions delete "$name" --project-ref "$PROJECT_REF"
done

if [ -n "$ARTIFACT_DIR" ]; then
  supabase functions list --project-ref "$PROJECT_REF" --output json > "$ARTIFACT_DIR/functions-after.json"
  node scripts/hosted-function-drift.mjs > "$ARTIFACT_DIR/drift-after.json"
fi

echo ""
echo "✅ Remote-only quarantine candidate deletion finished."
