# FreeSWITCH ローカル開発用
# SignalWire PAT (Personal Access Token) が必要 (無料)
# 取得方法: https://id.signalwire.com/personal_access_tokens
FROM debian:bullseye-slim

ARG SIGNALWIRE_TOKEN
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg2 wget ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# SignalWire リポジトリ追加
RUN test -n "$SIGNALWIRE_TOKEN" || (echo "ERROR: SIGNALWIRE_TOKEN が必要です" && exit 1) \
    && wget --http-user=signalwire --http-password=$SIGNALWIRE_TOKEN \
       -O /usr/share/keyrings/signalwire-freeswitch-repo.gpg \
       https://freeswitch.signalwire.com/repo/deb/debian-release/signalwire-freeswitch-repo.gpg \
    && echo "machine freeswitch.signalwire.com login signalwire password $SIGNALWIRE_TOKEN" \
       > /etc/apt/auth.conf \
    && echo "deb [signed-by=/usr/share/keyrings/signalwire-freeswitch-repo.gpg] \
       https://freeswitch.signalwire.com/repo/deb/debian-release/ bullseye main" \
       > /etc/apt/sources.list.d/freeswitch.list

# FreeSWITCH インストール (必要最低限のモジュール)
RUN apt-get update && apt-get install -y --no-install-recommends \
    freeswitch \
    freeswitch-mod-commands \
    freeswitch-mod-console \
    freeswitch-mod-dialplan-xml \
    freeswitch-mod-dptools \
    freeswitch-mod-event-socket \
    freeswitch-mod-sofia \
    freeswitch-mod-loopback \
    freeswitch-mod-say-en \
    freeswitch-mod-tone-stream \
    freeswitch-mod-sndfile \
    freeswitch-mod-local-stream \
    freeswitch-mod-native-file \
    freeswitch-mod-opus \
    freeswitch-sounds-en-us-callie-8000 \
    freeswitch-music-default \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/apt/auth.conf

# 録音ディレクトリ
RUN mkdir -p /var/lib/freeswitch/recordings

EXPOSE 8021 5060/udp 5060/tcp 5066 5080/udp 5080/tcp 7443 16384-16484/udp

CMD ["freeswitch", "-nonat", "-nf"]
