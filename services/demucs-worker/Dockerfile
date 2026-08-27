FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8080

# Install ffmpeg & system build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install wheel
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch CPU build using extra-index-url so PyPI dependencies can resolve
RUN pip install --no-cache-dir torch torchaudio --extra-index-url https://download.pytorch.org/whl/cpu

# Copy requirements & install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download default Demucs v4 model into image layer (reduces container cold-start delay)
RUN python -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')"

# Copy application source
COPY main.py .

EXPOSE 8080

# Run FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
