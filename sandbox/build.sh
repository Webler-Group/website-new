#!/usr/bin/env bash
# Build runner images locally.  Usage: ./build.sh [lang ...]   (no args = all)
set -euo pipefail
cd "$(dirname "$0")"

PREFIX="${IMAGE_PREFIX:-ghcr.io/webler-group/website-new-runner}"
TAG="${IMAGE_TAG:-latest}"

langs=("$@")
[ ${#langs[@]} -eq 0 ] && langs=($(ls images | grep -v '^common$'))

for lang in "${langs[@]}"; do
    echo "==> building $PREFIX-$lang:$TAG"
    # Context is images/ so every image can include the shared common/run wrapper
    docker build -t "$PREFIX-$lang:$TAG" -f "images/$lang/Dockerfile" images
done
