#!/usr/bin/env bash
# Install Docker Engine + gVisor (runsc) on an Ubuntu/Debian host (also works in WSL2 with systemd).
# Usage: sudo ./setup-host.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "run with sudo" >&2
    exit 1
fi

TARGET_USER="${SUDO_USER:-}"
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

if [ -n "$TARGET_USER" ]; then
    usermod -aG docker "$TARGET_USER"
    echo "==> added $TARGET_USER to the docker group (log out/in, or run: wsl --shutdown, to apply)"
fi

echo "==> check"
docker info --format 'runtimes: {{range $k, $v := .Runtimes}}{{$k}} {{end}}'
docker run --rm --runtime=runsc hello-world >/dev/null && echo "gVisor OK"
