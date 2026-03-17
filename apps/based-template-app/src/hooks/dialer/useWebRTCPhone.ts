/**
 * useWebRTCPhone - SIP.js を用いた FreeSWITCH WebRTC ソフトフォン
 *
 * FreeSWITCH に WSS 経由で SIP レジストし、着信に応答する。
 * プログレッシブダイヤラーのオペレーター側として動作:
 *   1. FreeSWITCH に SIP REGISTER
 *   2. 外線通話が繋がると FreeSWITCH から INVITE を受信
 *   3. 自動応答 (autoAnswer=true) またはマニュアル応答
 *   4. WebRTC (DTLS-SRTP) で音声通話
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Invitation,
  Inviter,
  Registerer,
  RegistererState,
  Session,
  SessionState,
  UserAgent,
  UserAgentOptions,
} from "sip.js";
import type { SessionDescriptionHandlerOptions } from "sip.js/lib/platform/web";

// ── 型定義 ─────────────────────────────────────────────

/** SIPアカウント設定 */
export interface SipConfig {
  /** FreeSWITCH WSS URL (例: "wss://fs.example.com:7443") */
  wssUrl: string;
  /** SIP内線番号 (例: "1001") */
  extension: string;
  /** SIPパスワード */
  password: string;
  /** SIPドメイン (例: "fs.example.com") */
  domain: string;
  /** 着信時に自動応答するか */
  autoAnswer?: boolean;
  /** STUN/TURNサーバー */
  iceServers?: RTCIceServer[];
}

/** フォンの状態 */
export type PhoneStatus =
  | "disconnected"
  | "connecting"
  | "registered"
  | "unregistered"
  | "ringing"
  | "in_call"
  | "on_hold"
  | "error";

/** フックの戻り値 */
export interface WebRTCPhoneState {
  /** 現在の電話ステータス */
  status: PhoneStatus;
  /** 着信中のセッション情報 */
  incomingCallFrom: string | null;
  /** 通話中かどうか */
  isOnCall: boolean;
  /** ミュート状態 */
  isMuted: boolean;
  /** 保留状態 */
  isOnHold: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** SIP登録する */
  register: () => Promise<void>;
  /** SIP登録解除 */
  unregister: () => Promise<void>;
  /** 着信に応答する */
  answer: () => void;
  /** 着信を拒否する / 通話を切断する */
  hangup: () => void;
  /** マイクをミュート/アンミュート */
  toggleMute: () => void;
  /** 通話を保留/再開 */
  toggleHold: () => void;
  /** DTMF送信 */
  sendDtmf: (tone: string) => void;
}

// ── カスタムフック ────────────────────────────────────────

export function useWebRTCPhone(config: SipConfig): WebRTCPhoneState {
  const [status, setStatus] = useState<PhoneStatus>("disconnected");
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const isOnCall = status === "in_call" || status === "on_hold";

  // ── リモートオーディオ要素の準備 ──

  useEffect(() => {
    if (!remoteAudioRef.current) {
      const audio = document.createElement("audio");
      audio.id = "sip-remote-audio";
      audio.autoplay = true;
      // ブラウザの autoplay ポリシー対策
      audio.setAttribute("playsinline", "");
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
        remoteAudioRef.current = null;
      }
    };
  }, []);

  // ── セッションのメディアをオーディオ要素に接続 ──

  const attachMedia = useCallback((session: Session) => {
    const sdh = session.sessionDescriptionHandler;
    if (!sdh) return;

    // SIP.js v0.21+ では peerConnection を直接取得
    const pc = (sdh as unknown as { peerConnection?: RTCPeerConnection })
      .peerConnection;
    if (!pc) return;

    const remoteStream = new MediaStream();
    pc.getReceivers().forEach((receiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {
        // autoplay blocked - ユーザー操作が必要
      });
    }
  }, []);

  // ── セッションの状態監視 ──

  const setupSessionListeners = useCallback(
    (session: Session) => {
      session.stateChange.addListener((state: SessionState) => {
        switch (state) {
          case SessionState.Establishing:
            setStatus("ringing");
            break;
          case SessionState.Established:
            setStatus("in_call");
            setIncomingCallFrom(null);
            attachMedia(session);
            break;
          case SessionState.Terminating:
          case SessionState.Terminated:
            setStatus("registered");
            setIncomingCallFrom(null);
            setIsMuted(false);
            setIsOnHold(false);
            sessionRef.current = null;
            break;
        }
      });
    },
    [attachMedia],
  );

  // ── 着信ハンドラ ──

  const handleInvite = useCallback(
    (invitation: Invitation) => {
      sessionRef.current = invitation;
      setupSessionListeners(invitation);

      // 発信者情報の取得
      const from =
        invitation.remoteIdentity?.uri?.user ??
        invitation.remoteIdentity?.displayName ??
        "不明";
      setIncomingCallFrom(from);
      setStatus("ringing");

      if (config.autoAnswer) {
        // プログレッシブダイヤラー: 自動応答
        const options: SessionDescriptionHandlerOptions = {
          constraints: { audio: true, video: false },
        };
        invitation
          .accept({
            sessionDescriptionHandlerOptions: options,
          })
          .catch((err) => {
            setError(`自動応答失敗: ${err}`);
            setStatus("registered");
          });
      }
    },
    [config.autoAnswer, setupSessionListeners],
  );

  // ── SIP UserAgent 作成・レジスト ──

  const register = useCallback(async () => {
    try {
      setError(null);
      setStatus("connecting");

      const uri = UserAgent.makeURI(`sip:${config.extension}@${config.domain}`);
      if (!uri) {
        throw new Error(`無効なSIP URI: ${config.extension}@${config.domain}`);
      }

      const transportOptions = {
        server: config.wssUrl,
        // WebSocket接続のキープアライブ
        keepAliveInterval: 30,
      };

      const uaOptions: UserAgentOptions = {
        uri,
        transportOptions,
        authorizationUsername: config.extension,
        authorizationPassword: config.password,
        // WebRTC 設定
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: config.iceServers ?? [
              { urls: "stun:stun.l.google.com:19302" },
            ],
          },
        },
        // 着信ハンドラ
        delegate: {
          onInvite: handleInvite,
        },
        // ログレベル
        logLevel: "warn",
      };

      const ua = new UserAgent(uaOptions);
      userAgentRef.current = ua;

      // UserAgent 起動
      await ua.start();

      // REGISTER
      const registerer = new Registerer(ua, {
        expires: 300, // 5分ごとに再登録
      });
      registererRef.current = registerer;

      registerer.stateChange.addListener((state: RegistererState) => {
        switch (state) {
          case RegistererState.Registered:
            setStatus("registered");
            setError(null);
            break;
          case RegistererState.Unregistered:
            setStatus("unregistered");
            break;
          case RegistererState.Terminated:
            setStatus("disconnected");
            break;
        }
      });

      await registerer.register();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`SIP登録失敗: ${message}`);
      setStatus("error");
    }
  }, [config, handleInvite]);

  // ── SIP 登録解除 ──

  const unregister = useCallback(async () => {
    try {
      if (sessionRef.current) {
        if (
          sessionRef.current.state === SessionState.Established ||
          sessionRef.current.state === SessionState.Establishing
        ) {
          sessionRef.current.bye?.();
        }
        sessionRef.current = null;
      }

      if (registererRef.current) {
        await registererRef.current.unregister();
        registererRef.current = null;
      }

      if (userAgentRef.current) {
        await userAgentRef.current.stop();
        userAgentRef.current = null;
      }

      setStatus("disconnected");
      setIsMuted(false);
      setIsOnHold(false);
      setIncomingCallFrom(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`SIP登録解除失敗: ${message}`);
    }
  }, []);

  // ── 着信応答 ──

  const answer = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !(session instanceof Invitation)) return;

    const options: SessionDescriptionHandlerOptions = {
      constraints: { audio: true, video: false },
    };

    (session as Invitation)
      .accept({
        sessionDescriptionHandlerOptions: options,
      })
      .catch((err) => {
        setError(`応答失敗: ${err}`);
      });
  }, []);

  // ── 通話終了 / 着信拒否 ──

  const hangup = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    switch (session.state) {
      case SessionState.Initial:
      case SessionState.Establishing:
        // 着信中 → 拒否
        if (session instanceof Invitation) {
          session.reject().catch(() => {});
        } else if (session instanceof Inviter) {
          session.cancel().catch(() => {});
        }
        break;
      case SessionState.Established:
        // 通話中 → BYE
        session.bye().catch(() => {});
        break;
    }

    setStatus("registered");
    setIncomingCallFrom(null);
    sessionRef.current = null;
  }, []);

  // ── ミュート ──

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) return;

    const sdh = session.sessionDescriptionHandler;
    if (!sdh) return;

    const pc = (sdh as unknown as { peerConnection?: RTCPeerConnection })
      .peerConnection;
    if (!pc) return;

    const newMuted = !isMuted;
    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === "audio") {
        sender.track.enabled = !newMuted;
      }
    });

    setIsMuted(newMuted);
  }, [isMuted]);

  // ── 保留 ──

  const toggleHold = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) return;

    const sdh = session.sessionDescriptionHandler;
    if (!sdh) return;

    const pc = (sdh as unknown as { peerConnection?: RTCPeerConnection })
      .peerConnection;
    if (!pc) return;

    if (!isOnHold) {
      // 保留: direction を inactive にする
      pc.getSenders().forEach((sender) => {
        if (sender.track) sender.track.enabled = false;
      });
      pc.getReceivers().forEach((receiver) => {
        if (receiver.track) receiver.track.enabled = false;
      });
      setIsOnHold(true);
      setStatus("on_hold");
    } else {
      // 解除: direction を sendrecv に戻す
      pc.getSenders().forEach((sender) => {
        if (sender.track) sender.track.enabled = true;
      });
      pc.getReceivers().forEach((receiver) => {
        if (receiver.track) receiver.track.enabled = true;
      });
      setIsOnHold(false);
      setStatus("in_call");
    }
  }, [isOnHold]);

  // ── DTMF ──

  const sendDtmf = useCallback((tone: string) => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) return;

    // RFC 2833 INFO method
    const options = {
      requestOptions: {
        body: {
          contentDisposition: "render",
          contentType: "application/dtmf-relay",
          content: `Signal=${tone}\r\nDuration=160\r\n`,
        },
      },
    };
    session.info(options).catch(() => {});
  }, []);

  // ── クリーンアップ ──

  useEffect(() => {
    return () => {
      // アンマウント時に切断
      if (sessionRef.current) {
        try {
          if (sessionRef.current.state === SessionState.Established) {
            sessionRef.current.bye().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
      if (registererRef.current) {
        registererRef.current.unregister().catch(() => {});
      }
      if (userAgentRef.current) {
        userAgentRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return {
    status,
    incomingCallFrom,
    isOnCall,
    isMuted,
    isOnHold,
    error,
    register,
    unregister,
    answer,
    hangup,
    toggleMute,
    toggleHold,
    sendDtmf,
  };
}
