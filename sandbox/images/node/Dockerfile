FROM node:24-trixie-slim
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    NODE_ENV=production

COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 node/run /usr/local/bin/run-program
WORKDIR /box
