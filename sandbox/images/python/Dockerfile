FROM python:3.13-slim-trixie
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    OPENBLAS_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1

COPY requirements.txt /opt/runner/requirements.txt
RUN pip install --no-cache-dir -r /opt/runner/requirements.txt

# Build matplotlib's font cache once at image build time; `run` copies it to /tmp
# because matplotlib ignores a read-only MPLCONFIGDIR and would rebuild it every run.
RUN MPLCONFIGDIR=/opt/runner/mpl python3 -c "import matplotlib.pyplot" \
 && chmod -R a+rX /opt/runner/mpl

COPY --chmod=755 run /usr/local/bin/run
WORKDIR /box
