#!/bin/bash
# FreeSWITCH ローカル開発用セットアップスクリプト (Ubuntu 24.04 / WSL2)
# SignalWireトークン不要 - ソースからビルド
#
# 使い方:
#   chmod +x infra/freeswitch/setup-local.sh
#   ./infra/freeswitch/setup-local.sh
#
# 所要時間: 初回ビルド 10-20分程度（以降は不要）

set -e

PREFIX="/usr/local/freeswitch"
CONF_DIR="/etc/freeswitch"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="/usr/src/freeswitch"
FS_VERSION="v1.10.12"

echo "========================================"
echo " FreeSWITCH ローカルセットアップ"
echo " バージョン: $FS_VERSION"
echo " インストール先: $PREFIX"
echo " 設定ディレクトリ: $CONF_DIR"
echo "========================================"

# ── 1. ビルド依存パッケージ ──
echo ""
echo "[1/5] ビルド依存パッケージをインストール中..."
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    build-essential cmake automake autoconf libtool pkg-config \
    git ca-certificates wget \
    libssl-dev libcurl4-openssl-dev libpcre3-dev libspeex-dev libspeexdsp-dev \
    libedit-dev libsqlite3-dev libldns-dev libsndfile1-dev liblua5.4-dev \
    libtiff-dev libopus-dev uuid-dev zlib1g-dev libjpeg-dev \
    yasm

# ── 2. ソース取得 ──
if [ -d "$SRC_DIR" ] && [ -f "$PREFIX/bin/freeswitch" ]; then
    echo ""
    echo "[2/5] FreeSWITCH は既にビルド済みです。スキップします。"
    echo "      再ビルドする場合: sudo rm -rf $SRC_DIR $PREFIX"
else
    echo ""
    echo "[2/5] ソースコードを取得中..."
    sudo rm -rf "$SRC_DIR"
    sudo mkdir -p "$SRC_DIR"
    sudo chown "$USER" "$SRC_DIR"

    git clone --depth 1 -b "$FS_VERSION" https://github.com/signalwire/freeswitch.git "$SRC_DIR"
    cd "$SRC_DIR"
    git clone --depth 1 https://github.com/freeswitch/sofia-sip.git libs/sofia-sip
    git clone --depth 1 https://github.com/freeswitch/spandsp.git libs/spandsp
    git clone --depth 1 https://github.com/signalwire/libks.git libs/libks
    git clone --depth 1 https://github.com/signalwire/signalwire-c.git libs/signalwire-c

    # ── 3. 依存ライブラリをビルド ──
    echo ""
    echo "[3/5] 依存ライブラリをビルド中..."

    cd "$SRC_DIR/libs/libks"
    # shallow cloneではchangelog/copyright生成が失敗するためダミー作成
    sed -i '/Detecting last git tag/,/unset(CHANGELOG_FOOTER)/d' CMakeLists.txt
    touch copyright
    cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local
    cmake --build build -j$(nproc)
    sudo cmake --install build

    cd "$SRC_DIR/libs/sofia-sip"
    ./bootstrap.sh
    ./configure
    make -j$(nproc)
    sudo make install

    cd "$SRC_DIR/libs/spandsp"
    ./bootstrap.sh
    ./configure
    make -j$(nproc)
    sudo make install

    cd "$SRC_DIR/libs/signalwire-c"
    sed -i '/Detecting last git tag/,/unset(CHANGELOG_FOOTER)/d' CMakeLists.txt
    touch copyright
    mkdir -p build && touch build/copyright
    cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local
    cmake --build build -j$(nproc)
    sudo cmake --install build

    sudo ldconfig

    # ── 4. FreeSWITCH 本体をビルド ──
    echo ""
    echo "[4/5] FreeSWITCH をビルド中 (数分かかります)..."
    cd "$SRC_DIR"
    ./bootstrap.sh -j

    # 必要なモジュールのみ有効化
    cat > modules.conf << 'MODULES'
applications/mod_commands
applications/mod_dptools
applications/mod_park
codecs/mod_opus
codecs/mod_amr
dialplans/mod_dialplan_xml
endpoints/mod_sofia
endpoints/mod_loopback
event_handlers/mod_event_socket
formats/mod_sndfile
formats/mod_native_file
formats/mod_local_stream
formats/mod_tone_stream
loggers/mod_console
loggers/mod_logfile
say/mod_say_en
MODULES

    ./configure --prefix="$PREFIX" --disable-dependency-tracking
    make -j$(nproc)
    sudo make install

    echo ""
    echo "FreeSWITCH ビルド完了!"
fi

# ── 5. カスタム設定を配置 ──
echo ""
echo "[5/5] 設定ファイルを配置中..."

# デフォルト設定をコピー（初回のみ）
if [ ! -d "$CONF_DIR" ]; then
    sudo mkdir -p "$CONF_DIR"
    sudo cp -a "$PREFIX/conf/"* "$CONF_DIR/"
fi

# カスタム設定を上書き
sudo cp "$SCRIPT_DIR/conf/autoload_configs/event_socket.conf.xml" "$CONF_DIR/autoload_configs/event_socket.conf.xml"
sudo cp "$SCRIPT_DIR/conf/sip_profiles/internal.xml" "$CONF_DIR/sip_profiles/internal.xml"
sudo cp "$SCRIPT_DIR/conf/sip_profiles/external.xml" "$CONF_DIR/sip_profiles/external.xml"
sudo cp "$SCRIPT_DIR/conf/dialplan/default.xml" "$CONF_DIR/dialplan/default.xml"
sudo cp "$SCRIPT_DIR/conf/dialplan/public.xml" "$CONF_DIR/dialplan/public.xml"
sudo mkdir -p "$CONF_DIR/directory/default"
sudo cp "$SCRIPT_DIR/conf/directory/default/agent_template.xml" "$CONF_DIR/directory/default/agent_template.xml"

# 録音ディレクトリ
sudo mkdir -p /var/lib/freeswitch/recordings

echo ""
echo "========================================"
echo " セットアップ完了!"
echo "========================================"
echo ""
echo "起動:   sudo $PREFIX/bin/freeswitch -nonat -nc -conf $CONF_DIR"
echo "停止:   sudo $PREFIX/bin/freeswitch -stop"
echo "CLI:    $PREFIX/bin/fs_cli"
echo "状態:   $PREFIX/bin/fs_cli -x 'status'"
echo ""
echo "バックエンドの .env に以下を追加:"
echo "  FREESWITCH_ESL_HOST=127.0.0.1"
echo "  FREESWITCH_ESL_PORT=8021"
echo "  FREESWITCH_ESL_PASSWORD=ClueCon"
echo "  FREESWITCH_SIP_GATEWAY=brastel"
echo "  FREESWITCH_WSS_URL=ws://localhost:5066"





