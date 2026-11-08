#!/usr/bin/env bash
# Restart the website services and report whether each one came back up.
# Usage: sudo ./restart-services.sh [service ...]   (no args = all services below)
set -uo pipefail

SERVICES=(
    webler-website-new-backend.service
    webler-website-new-coderunner.service
    webler-website-new-cron.service
    nginx.service
)

# How long a service must stay active after restart to count as healthy
SETTLE_SECONDS=3

if [ "$(id -u)" -ne 0 ]; then
    echo "run with sudo" >&2
    exit 1
fi

[ $# -gt 0 ] && SERVICES=("$@")

if [ -t 1 ]; then
    GREEN=$'\e[32m'; RED=$'\e[31m'; YELLOW=$'\e[33m'; RESET=$'\e[0m'
else
    GREEN=""; RED=""; YELLOW=""; RESET=""
fi

restarted=()
failed=()

for svc in "${SERVICES[@]}"; do
    if ! systemctl cat "$svc" >/dev/null 2>&1; then
        echo "${RED}✗ $svc: unit not found${RESET}"
        failed+=("$svc")
        continue
    fi

    # A broken nginx config would take the site down on restart, so test it first
    if [ "$svc" = "nginx.service" ] && ! nginx -t >/dev/null 2>&1; then
        echo "${RED}✗ $svc: config test failed, not restarting (still running the old config)${RESET}"
        nginx -t 2>&1 | sed 's/^/    /'
        failed+=("$svc")
        continue
    fi

    echo "${YELLOW}↻ restarting $svc${RESET}"
    if systemctl restart "$svc"; then
        restarted+=("$svc")
    else
        failed+=("$svc")
    fi
done

# Give services time to crash on startup before checking (a failed start can still look "active" at first)
[ ${#restarted[@]} -gt 0 ] && sleep "$SETTLE_SECONDS"

echo
for svc in "${restarted[@]}"; do
    state=$(systemctl is-active "$svc")
    if [ "$state" = "active" ]; then
        since=$(systemctl show "$svc" --property=ActiveEnterTimestamp --value)
        echo "${GREEN}✓ $svc: active (since $since)${RESET}"
    else
        echo "${RED}✗ $svc: $state${RESET}"
        journalctl -u "$svc" -n 15 --no-pager 2>/dev/null | sed 's/^/    /'
        failed+=("$svc")
    fi
done

echo
if [ ${#failed[@]} -eq 0 ]; then
    echo "${GREEN}All ${#SERVICES[@]} services are running.${RESET}"
else
    echo "${RED}Failed: ${failed[*]}${RESET}"
    exit 1
fi
