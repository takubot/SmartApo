"use client";

import React, {
  useCallback,
  useState,
  useMemo,
  useRef,
  useEffect,
} from "react";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import { Bot } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  headerColor?: string;
  headerTextColor?: string;
  placeholder?: string;
  onInputChange?: (value: string) => void;
  showBotSelect?: boolean;
  selectedBot?: BotResponseSchemaType | null;
  botIconSrc?: string | null;
  onBotSelect?: () => void;
  selectedLanguage?: string;
  isWidgetOpen?: boolean;
}

// 言語コードからプレースホルダーテキストを取得するマッピング
const PLACEHOLDER_BY_LANGUAGE: Record<string, string> = {
  ja: "メッセージを入力 (Ctrl+Enter / Cmd+Enterで送信)",
  en: "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-us": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-gb": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-au": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-ca": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-nz": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-ph": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  "en-za": "Type a message (Ctrl+Enter / Cmd+Enter to send)",
  zh: "输入消息 (Ctrl+Enter / Cmd+Enter 发送)",
  "zh-cn": "输入消息 (Ctrl+Enter / Cmd+Enter 发送)",
  "zh-hans": "输入消息 (Ctrl+Enter / Cmd+Enter 发送)",
  "zh-tw": "輸入訊息 (Ctrl+Enter / Cmd+Enter 發送)",
  "zh-hant": "輸入訊息 (Ctrl+Enter / Cmd+Enter 發送)",
  "zh-hk": "輸入訊息 (Ctrl+Enter / Cmd+Enter 發送)",
  ko: "메시지 입력 (Ctrl+Enter / Cmd+Enter로 전송)",
  es: "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  "es-es": "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  "es-mx": "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  "es-ar": "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  "es-cl": "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  "es-co": "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  "es-419": "Escribe un mensaje (Ctrl+Enter / Cmd+Enter para enviar)",
  fr: "Tapez un message (Ctrl+Entrée / Cmd+Entrée pour envoyer)",
  "fr-ca": "Tapez un message (Ctrl+Entrée / Cmd+Entrée pour envoyer)",
  "fr-ch": "Tapez un message (Ctrl+Entrée / Cmd+Entrée pour envoyer)",
  de: "Nachricht eingeben (Ctrl+Enter / Cmd+Enter zum Senden)",
  it: "Scrivi un messaggio (Ctrl+Invio / Cmd+Invio per inviare)",
  pt: "Digite uma mensagem (Ctrl+Enter / Cmd+Enter para enviar)",
  "pt-br": "Digite uma mensagem (Ctrl+Enter / Cmd+Enter para enviar)",
  "pt-pt": "Digite uma mensagem (Ctrl+Enter / Cmd+Enter para enviar)",
  ru: "Введите сообщение (Ctrl+Enter / Cmd+Enter для отправки)",
  ar: "اكتب رسالة (Ctrl+Enter / Cmd+Enter للإرسال)",
  "ar-sa": "اكتب رسالة (Ctrl+Enter / Cmd+Enter للإرسال)",
  hi: "संदेश लिखें (Ctrl+Enter / Cmd+Enter भेजने के लिए)",
  bn: "বার্তা লিখুন (Ctrl+Enter / Cmd+Enter পাঠাতে)",
  "bn-in": "বার্তা লিখুন (Ctrl+Enter / Cmd+Enter পাঠাতে)",
  pa: "ਸੁਨੇਹਾ ਲਿਖੋ (Ctrl+Enter / Cmd+Enter ਭੇਜਣ ਲਈ)",
  "pa-pk": "پیغام لکھیں (Ctrl+Enter / Cmd+Enter بھیجنے کے لیے)",
  ur: "پیغام لکھیں (Ctrl+Enter / Cmd+Enter بھیجنے کے لیے)",
  fa: "پیام بنویسید (Ctrl+Enter / Cmd+Enter برای ارسال)",
  tr: "Mesaj yazın (Ctrl+Enter / Cmd+Enter ile gönder)",
  vi: "Nhập tin nhắn (Ctrl+Enter / Cmd+Enter để gửi)",
  th: "พิมพ์ข้อความ (Ctrl+Enter / Cmd+Enter เพื่อส่ง)",
  id: "Ketik pesan (Ctrl+Enter / Cmd+Enter untuk mengirim)",
  ms: "Taip mesej (Ctrl+Enter / Cmd+Enter untuk hantar)",
  fil: "Mag-type ng mensahe (Ctrl+Enter / Cmd+Enter para ipadala)",
  tl: "Mag-type ng mensahe (Ctrl+Enter / Cmd+Enter para ipadala)",
  sw: "Andika ujumbe (Ctrl+Enter / Cmd+Enter kutuma)",
  zu: "Faka umlayezo (Ctrl+Enter / Cmd+Enter ukuthumela)",
  ln: "Koma nkombo (Ctrl+Enter / Cmd+Enter kotinda)",
  ne: "सन्देश लेख्नुहोस् (Ctrl+Enter / Cmd+Enter पठाउन)",
  ta: "செய்தியை உள்ளிடவும் (Ctrl+Enter / Cmd+Enter அனுப்ப)",
  te: "సందేశం టైప్ చేయండి (Ctrl+Enter / Cmd+Enter పంపడానికి)",
  mr: "संदेश टाइप करा (Ctrl+Enter / Cmd+Enter पाठवण्यासाठी)",
  gu: "સંદેશ લખો (Ctrl+Enter / Cmd+Enter મોકલવા માટે)",
  kn: "ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ (Ctrl+Enter / Cmd+Enter ಕಳುಹಿಸಲು)",
  ml: "സന്ദേശം ടൈപ്പ് ചെയ്യുക (Ctrl+Enter / Cmd+Enter അയയ്ക്കാൻ)",
  my: "မက်ဆေ့ချ်ရိုက်ပါ (Ctrl+Enter / Cmd+Enter ပို့ရန်)",
  km: "បញ្ចូលសារ (Ctrl+Enter / Cmd+Enter ដើម្បីផ្ញើ)",
  lo: "ພິມຂໍ້ຄວາມ (Ctrl+Enter / Cmd+Enter ເພື່ອສົ່ງ)",
  uz: "Xabar kiriting (Ctrl+Enter / Cmd+Enter yuborish uchun)",
  ky: "Билдирүү киргизиңиз (Ctrl+Enter / Cmd+Enter жөнөтүү үчүн)",
  he: "הקלד הודעה (Ctrl+Enter / Cmd+Enter לשליחה)",
  el: "Πληκτρολογήστε μήνυμα (Ctrl+Enter / Cmd+Enter για αποστολή)",
  nl: "Typ een bericht (Ctrl+Enter / Cmd+Enter om te verzenden)",
  "nl-be": "Typ een bericht (Ctrl+Enter / Cmd+Enter om te verzenden)",
  sv: "Skriv ett meddelande (Ctrl+Enter / Cmd+Enter för att skicka)",
  nb: "Skriv en melding (Ctrl+Enter / Cmd+Enter for å sende)",
  no: "Skriv en melding (Ctrl+Enter / Cmd+Enter for å sende)",
  da: "Skriv en besked (Ctrl+Enter / Cmd+Enter for at sende)",
  fi: "Kirjoita viesti (Ctrl+Enter / Cmd+Enter lähettääksesi)",
  pl: "Wpisz wiadomość (Ctrl+Enter / Cmd+Enter aby wysłać)",
  cs: "Napište zprávu (Ctrl+Enter / Cmd+Enter pro odeslání)",
  sk: "Napíšte správu (Ctrl+Enter / Cmd+Enter na odoslanie)",
  hu: "Írjon üzenetet (Ctrl+Enter / Cmd+Enter küldéshez)",
  ro: "Scrieți un mesaj (Ctrl+Enter / Cmd+Enter pentru a trimite)",
  bg: "Въведете съобщение (Ctrl+Enter / Cmd+Enter за изпращане)",
  uk: "Введіть повідомлення (Ctrl+Enter / Cmd+Enter для відправки)",
  hr: "Upišite poruku (Ctrl+Enter / Cmd+Enter za slanje)",
  sl: "Vnesite sporočilo (Ctrl+Enter / Cmd+Enter za pošiljanje)",
  lt: "Įveskite žinutę (Ctrl+Enter / Cmd+Enter siųsti)",
  lv: "Ievadiet ziņojumu (Ctrl+Enter / Cmd+Enter nosūtīšanai)",
  et: "Sisestage sõnum (Ctrl+Enter / Cmd+Enter saatmiseks)",
  af: "Tik 'n boodskap (Ctrl+Enter / Cmd+Enter om te stuur)",
  sq: "Shkruani një mesazh (Ctrl+Enter / Cmd+Enter për të dërguar)",
  az: "Mesaj yazın (Ctrl+Enter / Cmd+Enter göndərmək üçün)",
  be: "Увядзіце паведамленне (Ctrl+Enter / Cmd+Enter для адпраўкі)",
  bs: "Upišite poruku (Ctrl+Enter / Cmd+Enter za slanje)",
  ca: "Escriviu un missatge (Ctrl+Enter / Cmd+Enter per enviar)",
  cy: "Teipiwch neges (Ctrl+Enter / Cmd+Enter i anfon)",
  fy: "Typ in berjocht (Ctrl+Enter / Cmd+Enter om te ferstjoeren)",
  gl: "Escribe unha mensaxe (Ctrl+Enter / Cmd+Enter para enviar)",
  gn: "Ehai peteĩ ñe'ẽ (Ctrl+Enter / Cmd+Enter oñeñe'ẽvo)",
  is: "Sláðu inn skilaboð (Ctrl+Enter / Cmd+Enter til að senda)",
  ka: "შეიყვანეთ შეტყობინება (Ctrl+Enter / Cmd+Enter გასაგზავნად)",
  mk: "Внесете порака (Ctrl+Enter / Cmd+Enter за испраќање)",
};

// 言語コードを正規化（小文字化、基本コードの取得）
const normalizeLanguageCode = (code: string): string => {
  if (!code) return "ja";
  const normalized = code.trim().toLowerCase();
  return normalized;
};

// 言語コードからプレースホルダーを取得
const getPlaceholderByLanguage = (languageCode?: string): string => {
  if (!languageCode) {
    return (
      PLACEHOLDER_BY_LANGUAGE["ja"] ||
      "メッセージを入力 (Ctrl+Enter / Cmd+Enterで送信)"
    );
  }
  const normalized = normalizeLanguageCode(languageCode);
  // まず完全一致を試す
  if (normalized && PLACEHOLDER_BY_LANGUAGE[normalized]) {
    return PLACEHOLDER_BY_LANGUAGE[normalized];
  }
  // フォールバック: 基本コードで検索
  const baseCode = normalized.split("-")[0];
  if (baseCode && PLACEHOLDER_BY_LANGUAGE[baseCode]) {
    return PLACEHOLDER_BY_LANGUAGE[baseCode];
  }
  // デフォルトは日本語
  return (
    PLACEHOLDER_BY_LANGUAGE["ja"] ||
    "メッセージを入力 (Ctrl+Enter / Cmd+Enterで送信)"
  );
};

export default function ChatInput({
  onSendMessage,
  isLoading,
  disabled = false,
  headerColor,
  headerTextColor,
  placeholder,
  onInputChange,
  showBotSelect = false,
  selectedBot,
  botIconSrc,
  onBotSelect,
  selectedLanguage,
  isWidgetOpen = true,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // 選択された言語に応じたプレースホルダーを取得
  const localizedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return getPlaceholderByLanguage(selectedLanguage);
  }, [placeholder, selectedLanguage]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim() && !isLoading && !disabled) {
        try {
          onSendMessage(inputValue.trim());
          setInputValue("");
        } catch (error) {
          console.error("Failed to send message:", error);
        }
      }
    },
    [inputValue, onSendMessage, isLoading, disabled],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
      // 通常のEnterは改行として扱う（何もしない）
    },
    [handleSubmit],
  );

  // テキストエリアの高さを自動調整（最大3行まで）
  useEffect(() => {
    // 非表示（またはアニメーション中）のときは計算しないか、
    // isOpenがtrueになった直後に計算し直す
    if (!isWidgetOpen) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // 高さをリセットしてからscrollHeightを取得
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;

    // 1行の高さを計算（line-heightを考慮）
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * 3; // 最大3行

    // 3行を超えているかどうかを判定
    const overflowing = scrollHeight > maxHeight;
    setIsOverflowing(overflowing);

    // 高さを設定（最大3行まで）
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [inputValue, isWidgetOpen]);

  const isSubmitDisabled = !inputValue.trim() || isLoading || disabled;
  // 回答中でも入力は可能にする（送信のみ無効）
  const isInputDisabled = disabled && !isLoading;
  const isBotSelectDisabled = disabled || isLoading || !onBotSelect;

  return (
    <div className="w-full h-full">
      {/* Webkit系ブラウザのスクロールバーを非表示にするスタイル */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .chat-textarea-hidden-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `,
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 h-full py-2"
        // iOS のキーボード開閉時の viewport 再計算の揺れを抑止
        style={{
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {showBotSelect ? (
          <button
            type="button"
            onClick={onBotSelect}
            disabled={isBotSelectDisabled}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 transition-all duration-200 hover:bg-gray-200 hover:border-gray-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-sm"
            aria-label="ボットを選択"
            title={
              selectedBot?.botName
                ? `ボット: ${selectedBot.botName}`
                : "ボットを選択"
            }
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-10"
              style={{ backgroundColor: headerColor || "#3b82f6" }}
            />
            {botIconSrc || selectedBot?.botIconImgGcsPath ? (
              <img
                src={botIconSrc || selectedBot?.botIconImgGcsPath || ""}
                alt={selectedBot?.botName || "bot"}
                className="relative z-10 h-8 w-8 rounded-lg border-2 border-gray-300 object-cover shadow-sm transition-transform duration-200 group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`relative z-10 items-center justify-center ${
                botIconSrc || selectedBot?.botIconImgGcsPath ? "hidden" : "flex"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 border border-gray-300 transition-all duration-200 group-hover:scale-110 group-hover:bg-gray-300 group-hover:shadow-inner">
                <Bot className="h-5 w-5 text-gray-700" />
              </div>
            </div>
          </button>
        ) : null}

        <div className="flex-1 relative flex items-center min-h-[48px]">
          <textarea
            ref={textareaRef}
            placeholder={localizedPlaceholder}
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setInputValue(newValue);
              onInputChange?.(newValue);
            }}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            className={`w-full min-h-[48px] max-h-[72px] px-4 py-3 pr-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all duration-200 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-[16px] sm:text-[16px] resize-none ${
              isOverflowing
                ? "overflow-y-auto"
                : "overflow-y-hidden chat-textarea-hidden-scrollbar"
            }`}
            autoComplete="on"
            autoCorrect="on"
            autoCapitalize="sentences"
            rows={1}
            style={{
              fontSize: "16px", // iOS Safariの自動ズーム抑止 (16px以上)
              WebkitTextSizeAdjust: "100%",
              color: "#000000",
              lineHeight: "24px",
              // スクロールバーのスタイル（3行以下の場合は非表示）
              ...(isOverflowing
                ? {}
                : {
                    scrollbarWidth: "none" as const, // Firefox
                    msOverflowStyle: "none" as const, // IE/Edge
                  }),
            }}
            // onFocus 時にスクロール位置が飛ぶのを抑制
            onFocus={() => {
              // iOS Safari等での不自然なスクロールを抑制するため、自動スクロールはブラウザに任せる
              // (fixed要素内でのフォーカスはブラウザが適切にハンドリングする)
            }}
          />

          {/* LINE風にフッター全体を入力エリアとして使うため、余計なインジケータは非表示 */}
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`
            flex items-center justify-center w-12 h-12 rounded-2xl shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0
            ${isLoading ? "animate-pulse" : ""}
          `}
          style={{
            backgroundColor: headerColor || "#3b82f6",
            color: headerTextColor || "#ffffff",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {isLoading ? (
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: headerTextColor || "#ffffff",
                borderTopColor: "transparent",
              }}
            ></div>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
