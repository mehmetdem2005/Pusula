FROM node:20-slim

# Sistem bağımlılıkları
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Piper TTS binary
ENV PIPER_VERSION=2023.11.14-2
RUN curl -L -o /tmp/piper.tar.gz \
    https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz \
    && mkdir -p /opt && tar -xzf /tmp/piper.tar.gz -C /opt \
    && rm /tmp/piper.tar.gz

# Piper voice modellerini indir
ENV PIPER_MODELS_PATH=/opt/piper/models
ENV PIPER_BIN=/opt/piper/piper/piper
RUN mkdir -p ${PIPER_MODELS_PATH}

# Türkçe (öncelikli)
RUN curl -L -o ${PIPER_MODELS_PATH}/tr_TR-dfki-medium.onnx \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx \
    && curl -L -o ${PIPER_MODELS_PATH}/tr_TR-dfki-medium.onnx.json \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json

# İngilizce
RUN curl -L -o ${PIPER_MODELS_PATH}/en_US-lessac-medium.onnx \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
    && curl -L -o ${PIPER_MODELS_PATH}/en_US-lessac-medium.onnx.json \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

# Almanca
RUN curl -L -o ${PIPER_MODELS_PATH}/de_DE-thorsten-medium.onnx \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx \
    && curl -L -o ${PIPER_MODELS_PATH}/de_DE-thorsten-medium.onnx.json \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json

# İspanyolca, Fransızca, İtalyanca
RUN for lang in "es_ES/mls" "fr_FR/siwis" "it_IT/paola"; do \
    voice_code=$(echo $lang | sed 's|/|-|')-medium; \
    curl -L -o ${PIPER_MODELS_PATH}/${voice_code}.onnx \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/$(echo $lang | cut -d'_' -f1 | tr A-Z a-z)/$lang/medium/${voice_code}.onnx || true; \
    curl -L -o ${PIPER_MODELS_PATH}/${voice_code}.onnx.json \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/$(echo $lang | cut -d'_' -f1 | tr A-Z a-z)/$lang/medium/${voice_code}.onnx.json || true; \
    done

ENV PIPER_BIN=/opt/piper/piper

# pnpm + workspace
RUN npm install -g pnpm@9.12.0

WORKDIR /app

# Monorepo root dosyaları
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages packages
COPY apps/worker-voice apps/worker-voice

RUN pnpm install --frozen-lockfile --filter @kavra/worker-voice...

WORKDIR /app/apps/worker-voice
RUN pnpm build

EXPOSE 4002
ENV NODE_ENV=production
ENV PORT=4002

CMD ["node", "dist/server.js"]
