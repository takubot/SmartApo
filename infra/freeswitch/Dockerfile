# FreeSWITCH ソースビルド (SignalWire トークン不要)
# マルチステージビルドで最終イメージを軽量化
#
# ビルド:
#   cd infra/freeswitch && docker compose build
#
# ビルド時間: 初回 15-30分 (キャッシュ有効時は高速)

ARG FS_VERSION=v1.10.12

# ============================================================
# Stage 1: ビルド環境
# ============================================================
FROM debian:bookworm-slim AS builder

ARG FS_VERSION
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake automake autoconf libtool pkg-config \
    git ca-certificates wget \
    libssl-dev libcurl4-openssl-dev libpcre3-dev libspeex-dev libspeexdsp-dev \
    libedit-dev libsqlite3-dev libldns-dev libsndfile1-dev liblua5.4-dev \
    libtiff-dev libopus-dev uuid-dev zlib1g-dev libjpeg-dev \
    yasm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src

# ── 依存ライブラリ: libks ──
RUN git clone --depth 1 https://github.com/signalwire/libks.git
WORKDIR /usr/src/libks
RUN sed -i '/Detecting last git tag/,/unset(CHANGELOG_FOOTER)/d' CMakeLists.txt \
    && touch copyright \
    && cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local \
    && cmake --build build -j$(nproc) \
    && cmake --install build

# ── 依存ライブラリ: sofia-sip ──
WORKDIR /usr/src
RUN git clone --depth 1 https://github.com/freeswitch/sofia-sip.git
WORKDIR /usr/src/sofia-sip
RUN ./bootstrap.sh && ./configure && make -j$(nproc) && make install

# ── 依存ライブラリ: spandsp ──
WORKDIR /usr/src
RUN git clone --depth 1 https://github.com/freeswitch/spandsp.git
WORKDIR /usr/src/spandsp
RUN ./bootstrap.sh && ./configure && make -j$(nproc) && make install

# ── 依存ライブラリ: signalwire-c ──
WORKDIR /usr/src
RUN git clone --depth 1 https://github.com/signalwire/signalwire-c.git
WORKDIR /usr/src/signalwire-c
RUN sed -i '/Detecting last git tag/,/unset(CHANGELOG_FOOTER)/d' CMakeLists.txt \
    && touch copyright \
    && mkdir -p build && touch build/copyright \
    && cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local \
    && cmake --build build -j$(nproc) \
    && cmake --install build

RUN ldconfig

# ── FreeSWITCH 本体 ──
WORKDIR /usr/src
RUN git clone --depth 1 -b ${FS_VERSION} https://github.com/signalwire/freeswitch.git
WORKDIR /usr/src/freeswitch

# 必要なモジュールのみ有効化
RUN cat > modules.conf << 'MODULES'\napplications/mod_commands\napplications/mod_dptools\napplications/mod_park\ncodecs/mod_opus\ncodecs/mod_amr\ndialplans/mod_dialplan_xml\nendpoints/mod_sofia\nendpoints/mod_loopback\nevent_handlers/mod_event_socket\nformats/mod_sndfile\nformats/mod_native_file\nformats/mod_local_stream\nformats/mod_tone_stream\nloggers/mod_console\nloggers/mod_logfile\nsay/mod_say_en\nMODULES

RUN ./bootstrap.sh -j \
    && ./configure --prefix=/usr/local/freeswitch --disable-dependency-tracking \
    && make -j$(nproc) \
    && make install

# ============================================================
# Stage 2: ランタイム (軽量)
# ============================================================
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates gettext-base \
    libssl3 libcurl4 libpcre3 libspeex1 libspeexdsp1 \
    libedit2 libsqlite3-0 libldns3 libsndfile1 liblua5.4-0 \
    libtiff6 libopus0 uuid-runtime zlib1g libjpeg62-turbo \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ビルド成果物をコピー
COPY --from=builder /usr/local/freeswitch /usr/local/freeswitch
COPY --from=builder /usr/local/lib /usr/local/lib
COPY --from=builder /usr/local/include /usr/local/include

RUN ldconfig

# デフォルト設定をコピー
RUN mkdir -p /etc/freeswitch \
    && cp -a /usr/local/freeswitch/conf/* /etc/freeswitch/

# 録音ディレクトリ
RUN mkdir -p /var/lib/freeswitch/recordings

# パスを通す
ENV PATH="/usr/local/freeswitch/bin:${PATH}"

# エントリーポイント (envsubst でXMLに環境変数を注入)
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8021 5060/udp 5060/tcp 5066 5080/udp 5080/tcp 7443 16384-16484/udp

ENTRYPOINT ["entrypoint.sh"]
