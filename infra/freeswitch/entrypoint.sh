#!/bin/bash
# FreeSWITCH 起動前に環境変数をXML設定ファイルに注入する
#
# envsubst は ${VAR} 形式のみ置換し、FreeSWITCH の $${var} 形式は影響しない。
# テンプレートXML (/etc/freeswitch/templates/) → 実XML (/etc/freeswitch/) にコピー。

set -e

TEMPLATE_DIR="/etc/freeswitch/templates"
CONFIG_DIR="/etc/freeswitch"

# 置換対象の環境変数リスト (これ以外は置換しない)
ENVSUBST_VARS='${BRASTEL_SIP_ID} ${BRASTEL_SIP_PASSWORD} ${FREESWITCH_ESL_PASSWORD} ${AGENT_SIP_PASSWORD}'

# デフォルト値の設定
: "${FREESWITCH_ESL_PASSWORD:=ClueCon}"
: "${AGENT_SIP_PASSWORD:=agent1001pass}"

export FREESWITCH_ESL_PASSWORD AGENT_SIP_PASSWORD

# テンプレートから実設定ファイルを生成
for tpl in \
  "autoload_configs/event_socket.conf.xml" \
  "sip_profiles/external.xml" \
  "directory/default/agent_template.xml"
do
  if [ -f "${TEMPLATE_DIR}/${tpl}" ]; then
    mkdir -p "$(dirname "${CONFIG_DIR}/${tpl}")"
    envsubst "${ENVSUBST_VARS}" < "${TEMPLATE_DIR}/${tpl}" > "${CONFIG_DIR}/${tpl}"
    echo "[entrypoint] ${tpl} に環境変数を注入しました"
  fi
done

echo "[entrypoint] FreeSWITCH を起動します"
exec /usr/local/freeswitch/bin/freeswitch -nonat -nf "$@"
