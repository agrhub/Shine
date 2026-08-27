FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PORT=8080

WORKDIR /app

# Install system dependencies for Playwright, Google Chrome, and FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    curl \
    ffmpeg \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable (Includes licensed AAC mp4a.40.2 & H.264 WebCodecs encoders)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && apt-get install -y --no-install-recommends google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json ./

# Install npm dependencies
RUN npm install

# Copy @openvideo/engine-pixi directory structure for @openvideo/video-renderer (avoids symlink loop)
RUN rm -rf /app/node_modules/@openvideo/video-renderer/node_modules/@openvideo/engine-pixi && \
    mkdir -p /app/node_modules/@openvideo/video-renderer/node_modules/@openvideo && \
    cp -r /app/node_modules/@openvideo/engine-pixi /app/node_modules/@openvideo/video-renderer/node_modules/@openvideo/ && \
    node -e "const fs=require('fs');const f='/app/node_modules/@openvideo/video-renderer/dist/renderer.js';if(fs.existsSync(f)){let c=fs.readFileSync(f,'utf8');if(!c.includes('--disable-web-security')){c=c.replace('\"--no-sandbox\",','\"--no-sandbox\",\n                \"--disable-web-security\",\n                \"--disable-features=IsolateOrigins,site-per-process\",\n                \"--allow-running-insecure-content\",');}if(!c.includes('channel:')){c=c.replace('headless: true,','headless: true,\n            channel: \"chrome\",');}fs.writeFileSync(f,c,'utf8');console.log('Patched renderer.js with chrome channel and web-security bypass');}"

# Install Playwright Chromium with system dependencies
RUN npx playwright install --with-deps chromium

# Copy source code and build TypeScript
COPY src ./src
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/server.js"]
