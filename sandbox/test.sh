#!/usr/bin/env bash
# Smoke-test runner images with the production security flags.
# Usage: ./test.sh [lang ...]   (no args = every test in tests/)
# RUNTIME=runsc ./test.sh  to run under gVisor (default: Docker's default runtime, runc).
set -uo pipefail
cd "$(dirname "$0")"

PREFIX="${IMAGE_PREFIX:-ghcr.io/webler-group/website-new-runner}"
TAG="${IMAGE_TAG:-latest}"
RUNTIME="${RUNTIME:-}"

COMMON=(--rm -i --network=none --read-only
        --cap-drop=ALL --security-opt=no-new-privileges --user 65534
        --ulimit core=0 --ulimit nofile=256 --ulimit fsize=67108864
        --label website-new-runner)
[ -n "$RUNTIME" ] && COMMON+=(--runtime="$RUNTIME")

tests=("$@")
[ ${#tests[@]} -eq 0 ] && tests=($(ls tests | sed 's/\..*//' | sort -u))

fail=0
for t in "${tests[@]}"; do
    src=$(ls tests/"$t".* 2>/dev/null | head -n1)
    [ -z "$src" ] && { echo "no test for $t"; fail=1; continue; }
    img="$PREFIX-$t:$TAG"
    ext="${src##*.}"
    name=main; [ "$t" = java ] && name=Main

    job=$(mktemp -d)
    chmod 777 "$job"
    cp "$src" "$job/$name.$ext"

    echo "==> $t ($img)"
    start=$(date +%s.%N)

    # Compile: /box writable, more memory/pids, bigger /tmp (Go copies its build cache there)
    if docker run "${COMMON[@]}" --memory=1g --memory-swap=1g --cpus=1 --pids-limit=256 \
            --tmpfs /tmp:size=256m,exec -v "$job":/box -w /box \
            "$img" sh -c '[ ! -x /usr/local/bin/compile ] || compile'; then
        # Run: /box read-only, scratch space only in a small /tmp
        out=$(echo "website-new" | docker run "${COMMON[@]}" --memory=512m --memory-swap=512m --cpus=1 --pids-limit=128 \
                --tmpfs /tmp:size=64m -v "$job":/box:ro -w /tmp \
                "$img" run)
        end=$(date +%s.%N)
        echo "$out"
        if echo "$out" | grep -q "hello website-new"; then
            awk -v s="$start" -v e="$end" 'BEGIN { printf "OK (%.2fs)\n", e - s }'
        else
            echo "FAIL: unexpected output"; fail=1
        fi
    else
        echo "FAIL: compile"; fail=1
    fi
    rm -rf "$job"
done
exit $fail
