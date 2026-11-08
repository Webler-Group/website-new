#!/usr/bin/env bash
# Install Docker Engine + gVisor (runsc) on an Ubuntu/Debian host (also works in WSL2 with systemd).
# Usage: sudo ./setup-host.sh [user ...]
#   Each user is added to the docker group: pass the user the code runner service runs as
#   (e.g. `sudo ./setup-host.sh webler`). Defaults to the user who ran sudo.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "run with sudo" >&2
    exit 1
fi

TARGET_USERS=("$@")
[ ${#TARGET_USERS[@]} -eq 0 ] && [ -n "${SUDO_USER:-}" ] && TARGET_USERS=("$SUDO_USER")

for u in "${TARGET_USERS[@]}"; do
    if ! id "$u" >/dev/null 2>&1; then
        echo "user '$u' does not exist" >&2
        exit 1
    fi
done
. /etc/os-release
DISTRO="$ID"                # ubuntu | debian
CODENAME="$VERSION_CODENAME"
ARCH="$(dpkg --print-architecture)"

echo "==> base packages"
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings

echo "==> Docker Engine"
if ! command -v dockerd >/dev/null 2>&1; then
    curl -fsSL "https://download.docker.com/linux/$DISTRO/gpg" -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$DISTRO $CODENAME stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
fi

echo "==> gVisor (runsc)"
if ! command -v runsc >/dev/null 2>&1; then
    curl -fsSL https://gvisor.dev/archive.key | gpg --dearmor --yes -o /usr/share/keyrings/gvisor-archive-keyring.gpg
    echo "deb [arch=$ARCH signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" \
        > /etc/apt/sources.list.d/gvisor.list
    apt-get update
    apt-get install -y runsc
fi

# Registers the "runsc" runtime in /etc/docker/daemon.json (keeps existing settings)
runsc install
systemctl enable --now docker
systemctl restart docker

for u in "${TARGET_USERS[@]}"; do
    usermod -aG docker "$u"
    echo "==> added $u to the docker group"
done
if [ ${#TARGET_USERS[@]} -gt 0 ]; then
    echo "    Groups apply to new sessions only: restart services running as these users"
    echo "    (e.g. systemctl restart <code runner service>), and log out/in for shells (WSL: wsl --shutdown)."
fi

echo "==> check"
docker info --format 'runtimes: {{range $k, $v := .Runtimes}}{{$k}} {{end}}'
docker run --rm --runtime=runsc hello-world >/dev/null && echo "gVisor OK"
