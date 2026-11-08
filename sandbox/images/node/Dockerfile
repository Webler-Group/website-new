FROM node:24-trixie-slim
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    NODE_ENV=production

COPY --chmod=755 run /usr/local/bin/run
WORKDIR /box
