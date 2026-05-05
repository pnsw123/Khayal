#!/usr/bin/env bash
# Sets up a daily cron job to run daily_sync.py at 3 AM every day.
# Run once: bash scripts/setup_cron.sh
# Remove:   crontab -e  then delete the KHAYAL line

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$(cd "$SCRIPT_DIR/.." && source .venv/bin/activate 2>/dev/null; which python3)"
LOG="$SCRIPT_DIR/../.sync.log"

CRON_LINE="0 3 * * * cd \"$SCRIPT_DIR/..\" && $PYTHON $SCRIPT_DIR/daily_sync.py >> \"$LOG\" 2>&1  # KHAYAL daily sync"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "KHAYAL daily sync"; then
  echo "✅  Cron job already installed."
  crontab -l | grep "KHAYAL"
  exit 0
fi

# Install
( crontab -l 2>/dev/null; echo "$CRON_LINE" ) | crontab -
echo "✅  Cron job installed — runs every day at 3 AM."
echo "    Log: $LOG"
echo "    Remove with: crontab -e (delete the KHAYAL line)"
