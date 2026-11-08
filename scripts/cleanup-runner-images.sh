#!/usr/bin/env bash
# Delete old code runner images, keeping only the given tag.
# Every RUNNER_IMAGE_TAG change downloads new images and leaves the old ones on disk.
#
# Usage: ./cleanup-runner-images.sh <tag-to-keep> [--dry-run]
#   <tag-to-keep>  the tag the backend uses now (RUNNER_IMAGE_TAG), e.g. 5846cc9d5161763f061d868c4f72542490bfda6c
#   --dry-run      only list what would be deleted
#
# Don't use `docker image prune -a` instead: sandbox containers only exist for a moment, so it
# would also delete the current runner images, and code runs fail until the worker restarts.
set -euo pipefail

usage() { sed -n '2,7p' "$0"; }

KEEP=""
DRY_RUN=false
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "unknown option: $arg" >&2; usage >&2; exit 1 ;;
        *)
            if [ -n "$KEEP" ]; then echo "only one tag can be kept" >&2; exit 1; fi
            KEEP="$arg"
            ;;
    esac
done

if [ -z "$KEEP" ]; then
    usage >&2
    exit 1
fi

# The images to keep must exist, so a typo can't delete every runner image
if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep 'website-new-runner-' | grep -q ":$KEEP\$"; then
    echo "No runner images with tag '$KEEP' are downloaded. Check the tag. Nothing deleted." >&2
    exit 1
fi

# Don't delete the images the backend is configured to use
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/backend/.env"
if [ -f "$ENV_FILE" ]; then
    CONFIGURED=$( { grep -E '^[[:space:]]*RUNNER_IMAGE_TAG=' "$ENV_FILE" || true; } | tail -n1 | cut -d= -f2- \
        | tr -d '"'"'"'\r' | xargs)
    if [ -n "$CONFIGURED" ] && [ "$CONFIGURED" != "$KEEP" ]; then
        echo "backend/.env uses RUNNER_IMAGE_TAG=$CONFIGURED, not $KEEP." >&2
        echo "Deleting the images the backend uses would break code runs. Nothing deleted." >&2
        exit 1
    fi
fi

echo "Keeping tag: $KEEP"

mapfile -t OLD < <(docker images --format '{{.Repository}}:{{.Tag}}' \
    | grep 'website-new-runner-' \
    | grep -v ":$KEEP\$" || true)

if [ ${#OLD[@]} -eq 0 ]; then
    echo "No old runner images to delete."
    exit 0
fi

echo "Old runner images (${#OLD[@]}):"
printf '  %s\n' "${OLD[@]}"

if $DRY_RUN; then
    echo "Dry run: nothing deleted."
    exit 0
fi

docker rmi "${OLD[@]}"
# Untagged leftovers only (safe, unlike prune -a)
docker image prune -f >/dev/null

echo
docker system df
