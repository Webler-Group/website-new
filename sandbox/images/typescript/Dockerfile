FROM node:24-trixie-slim
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    NODE_ENV=production

COPY typescript/package.json /opt/runner/package.json
RUN cd /opt/runner && npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --chmod=755 typescript/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 typescript/run /usr/local/bin/run-program
WORKDIR /box
