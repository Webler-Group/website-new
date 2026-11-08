#!/usr/bin/env bash
# Build runner images locally.  Usage: ./build.sh [lang ...]   (no args = all)
set -euo pipefail
cd "$(dirname "$0")"

PREFIX="${IMAGE_PREFIX:-ghcr.io/webler-group/website-new-runner}"
TAG="${IMAGE_TAG:-latest}"

langs=("$@")
[ ${#langs[@]} -eq 0 ] && langs=($(ls images))

for lang in "${langs[@]}"; do
    echo "==> building $PREFIX-$lang:$TAG"
    docker build -t "$PREFIX-$lang:$TAG" "images/$lang"
done
