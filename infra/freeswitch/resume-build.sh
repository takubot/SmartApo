#!/bin/bash
# FreeSWITCH ビルド再開スクリプト
# 依存ライブラリはインストール済みの前提で、
# modules.conf修正 → make → install → 設定配置 を実行する
set -e

PREFIX="/usr/local/freeswitch"
CONF_DIR="/usr/local/freeswitch/etc/freeswitch"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="/usr/src/freeswitch"

echo "========================================"
echo " FreeSWITCH ビルド再開"
echo "========================================"

# ── 1. modules.conf を必要最小限に上書き ──
echo ""
echo "[1/4] modules.conf を書き込み中..."
cat > "$SRC_DIR/modules.conf" << 'MODULES'
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
echo "  modules.conf 書き込み完了"

# ── 2. make (ビルド) ──
echo ""
echo "[2/4] FreeSWITCH をビルド中 (数分かかります)..."
cd "$SRC_DIR"
make -j$(nproc)
echo "  ビルド完了"

# ── 3. make install ──
echo ""
echo "[3/4] FreeSWITCH をインストール中..."
sudo make install
echo "  インストール完了"

# ── 4. カスタム設定ファイルを配置 ──
echo ""
echo "[4/4] カスタム設定ファイルを配置中..."

sudo cp "$SCRIPT_DIR/conf/autoload_configs/event_socket.conf.xml" "$CONF_DIR/autoload_configs/event_socket.conf.xml"
sudo cp "$SCRIPT_DIR/conf/sip_profiles/internal.xml" "$CONF_DIR/sip_profiles/internal.xml"
sudo cp "$SCRIPT_DIR/conf/sip_profiles/external.xml" "$CONF_DIR/sip_profiles/external.xml"
sudo cp "$SCRIPT_DIR/conf/dialplan/default.xml" "$CONF_DIR/dialplan/default.xml"
sudo cp "$SCRIPT_DIR/conf/dialplan/public.xml" "$CONF_DIR/dialplan/public.xml"
sudo mkdir -p "$CONF_DIR/directory/default"
sudo cp "$SCRIPT_DIR/conf/directory/default/agent_template.xml" "$CONF_DIR/directory/default/agent_template.xml"

sudo mkdir -p /var/lib/freeswitch/recordings

echo "  設定配置完了"

# ── 完了 ──
echo ""
echo "========================================"
echo " セットアップ完了!"
echo "========================================"
echo ""
echo "起動:  sudo $PREFIX/bin/freeswitch -nonat -nc"
echo "停止:  sudo $PREFIX/bin/freeswitch -stop"
echo "CLI:   $PREFIX/bin/fs_cli"
echo "状態:  $PREFIX/bin/fs_cli -x 'status'"
echo ""
echo "バックエンドの .env に以下を追加してください:"
echo "  FREESWITCH_ESL_HOST=127.0.0.1"
echo "  FREESWITCH_ESL_PORT=8021"
echo "  FREESWITCH_ESL_PASSWORD=ClueCon"
echo "  FREESWITCH_SIP_GATEWAY=brastel"
echo "  FREESWITCH_WSS_URL=ws://localhost:5066"
