FROM golang:1.25-trixie
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    GOPATH=/tmp/go \
    GOTOOLCHAIN=local \
    GOFLAGS=-buildvcs=false \
    CGO_ENABLED=0

# Go no longer ships a precompiled stdlib, so a cold build of "fmt" takes seconds.
# Warm a build cache for common packages; `compile` copies it into /tmp (GOCACHE must be writable).
COPY go/warm.go /opt/runner/warm.go
RUN GOCACHE=/opt/runner/gocache go build -o /dev/null /opt/runner/warm.go \
 && chmod -R a+rX /opt/runner/gocache

COPY --chmod=755 go/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 go/run /usr/local/bin/run-program
WORKDIR /box
