(function () {
  "use strict";

  function init() {
    var script =
      document.currentScript ||
      document.querySelector('script[src*="embed.js"]') ||
      document.scripts[document.scripts.length - 1];

    var entryUuid = script && script.dataset ? script.dataset.entryUuid : null;
    if (!entryUuid) {
      var scripts = document.querySelectorAll('script[src*="embed.js"]');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].dataset && scripts[i].dataset.entryUuid) {
          entryUuid = scripts[i].dataset.entryUuid;
          script = scripts[i];
          break;
        }
      }
    }

    if (!entryUuid) {
      console.error("DoppelChat: data-entry-uuid is required on script tag.");
      return;
    }

    var externalAuthToken =
      (script.dataset ? script.dataset.externalAuthToken : "") || 
      window.doppelExternalAuthToken || 
      "";

    // プレースホルダーのままの場合は、空文字として扱う（バックエンドでのエラー防止）
    if (externalAuthToken === "YOUR_USER_JWT_HERE") {
      externalAuthToken = "";
    }

    var baseUrl = window.location.origin;
    if (script && script.src) {
      try {
        baseUrl = new URL(script.src).origin;
      } catch (e) {}
    }

    checkVisibilityAndInit(entryUuid, baseUrl, externalAuthToken);
  }

  function checkVisibilityAndInit(entryUuid, baseUrl, externalAuthToken) {
    var configUrl = baseUrl.replace(/\/$/, "") + "/api/" + entryUuid + "/config";

    fetch(configUrl)
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to fetch config: " + response.status);
        return response.json();
      })
      .then(function (configResponse) {
        var config = configResponse.data || configResponse;
        if (config && config.isVisible === false) return;

        var isMobile =
          window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        var themeConfig = config && config.themeConfig;
        var positionConfig = {};

        if (themeConfig) {
          if (isMobile) {
            positionConfig = {
              anchor: themeConfig.chatPositionAnchorMobile || "bottom-right",
              buttonHorizontalPercent:
                themeConfig.chatButtonHorizontalPositionPercentageMobile ?? 0,
              buttonVerticalPercent:
                themeConfig.chatButtonVerticalPositionPercentageMobile ?? 0,
            };
          } else {
            positionConfig = {
              anchor: themeConfig.chatPositionAnchorDesktop || "bottom-right",
              buttonHorizontalPercent:
                themeConfig.chatButtonHorizontalPositionPercentageDesktop ?? 0,
              buttonVerticalPercent:
                themeConfig.chatButtonVerticalPositionPercentageDesktop ?? 0,
              widgetHorizontalPercent:
                themeConfig.chatWidgetHorizontalPositionPercentageDesktop ?? 0,
              widgetVerticalPercent:
                themeConfig.chatWidgetVerticalPositionPercentageDesktop ?? 0,
            };
          }
        } else {
          positionConfig = {
            anchor: "bottom-right",
            buttonHorizontalPercent: 0,
            buttonVerticalPercent: 0,
            widgetHorizontalPercent: 0,
            widgetVerticalPercent: 0,
          };
        }

        initializeWidget(
          entryUuid,
          baseUrl,
          positionConfig,
          isMobile,
          externalAuthToken
        );
      })
      .catch(function (error) {
        console.warn("DoppelChat: widget will not be displayed:", error);
      });
  }

  function initializeWidget(
    entryUuid,
    baseUrl,
    positionConfig,
    isMobile,
    externalAuthToken
  ) {
    var previousIsWidgetOpen = false;
    var currentIsWidgetOpen = false;
    var currentIsMobile = !!isMobile;

    // overlay（背面操作を塞ぐ）
    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:1000000;pointer-events:none;background:transparent;touch-action:none;";

    // wrapper（位置・サイズ担当）
    var wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position:absolute;width:20px;height:20px;pointer-events:auto;background:transparent;overflow:visible;box-sizing:border-box;margin:0;padding:0;";

    // host（アニメ担当）
    var host = document.createElement("div");
    host.style.cssText =
      "width:100%;height:100%;pointer-events:auto;background:transparent;overflow:hidden;box-sizing:border-box;margin:0;padding:0;";

    // スクロールロック（body fixed は使わない：キーボードでズレる最大原因）
    var scrollLocked = false;
    var prevHtmlOverflow = "";
    var prevBodyOverflow = "";

    function preventScrollEvent(e) {
      try {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
      } catch (_) {}
    }

    function lockPageScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      var html = document.documentElement;
      var body = document.body;

      prevHtmlOverflow = html.style.overflow;
      prevBodyOverflow = body.style.overflow;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";

      // iOS対策：touchmoveを止める（スクロール自体を発生させない）
      document.addEventListener("touchmove", preventScrollEvent, { passive: false });
      document.addEventListener("wheel", preventScrollEvent, { passive: false });
    }

    function unlockPageScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;

      var html = document.documentElement;
      var body = document.body;

      html.style.overflow = prevHtmlOverflow || "";
      body.style.overflow = prevBodyOverflow || "";

      document.removeEventListener("touchmove", preventScrollEvent, { passive: false });
      document.removeEventListener("wheel", preventScrollEvent, { passive: false });
    }

    function setOverlayInteractivityForState() {
      // モバイル全画面 open 中のみ overlay を有効化（背面タップ/スクロール遮断）
      if (currentIsMobile && currentIsWidgetOpen) {
        overlay.style.pointerEvents = "auto";
      } else {
        overlay.style.pointerEvents = "none";
      }
    }

    function applyPosition(hOffset, vOffset) {
      var anchor = positionConfig.anchor || "bottom-right";
      var hPercent =
        hOffset !== undefined ? hOffset : positionConfig.buttonHorizontalPercent || 0;
      var vPercent =
        vOffset !== undefined ? vOffset : positionConfig.buttonVerticalPercent || 0;

      var overlayRect = overlay.getBoundingClientRect();
      var viewportWidth = overlayRect.width || window.innerWidth;
      var viewportHeight = overlayRect.height || window.innerHeight;

      var hPx = (viewportWidth * hPercent) / 100;
      var vPx = (viewportHeight * vPercent) / 100;

      wrapper.style.position = "absolute";
      wrapper.style.inset = "auto";
      wrapper.style.top = "auto";
      wrapper.style.right = "auto";
      wrapper.style.bottom = "auto";
      wrapper.style.left = "auto";

      // 横方向
      if (anchor === "bottom-right" || anchor === "top-right") {
        wrapper.style.right = hPx + "px";
      } else {
        wrapper.style.left = hPx + "px";
      }

      // 縦方向
      if (anchor === "bottom-right" || anchor === "bottom-left") {
        wrapper.style.bottom = vPx + "px";
      } else {
        wrapper.style.top = vPx + "px";
      }
    }

    // ✅ モバイル全画面：JSでvisualViewport補正しない。CSS(dvh)に任せる。
    function setFullscreenMobileCss() {
      wrapper.style.position = "fixed";
      wrapper.style.inset = "0";
      wrapper.style.left = "0";
      wrapper.style.right = "0";
      wrapper.style.top = "0";
      wrapper.style.bottom = "0";
      wrapper.style.width = "100vw";
      // dvh対応ブラウザはキーボード込みで“見えている高さ”になる
      wrapper.style.height = "100vh";
      wrapper.style.height = "100dvh";
    }

    // 初期位置
    applyPosition();

    // リサイズ時
    function handleResize() {
      // モバイル全画面 open 中は CSS に任せる（何もしない）
      if (currentIsMobile && currentIsWidgetOpen) {
        setFullscreenMobileCss();
        setOverlayInteractivityForState();
        return;
      }
      applyPosition();
      setOverlayInteractivityForState();
    }

    window.addEventListener("resize", handleResize);

    // 初回メトリクスが来るまで非表示
    wrapper.style.display = "none";

    var iframe = document.createElement("iframe");
    iframe.style.cssText =
      "width:100%;height:100%;border:0;background:transparent;display:block;box-sizing:border-box;margin:0;padding:0;";
    iframe.setAttribute("allow", "clipboard-write; microphone; fullscreen");
    iframe.setAttribute("allowtransparency", "true");

    var chatScriptUrl =
      baseUrl.replace(/\/$/, "") + "/" + entryUuid + "/chatScript";
    var urlObj;
    try {
      urlObj = new URL(chatScriptUrl);
    } catch (_) {
      urlObj = new URL(chatScriptUrl, window.location.href);
    }
    urlObj.searchParams.set("t", String(Date.now()));
    if (externalAuthToken) {
      urlObj.searchParams.set("externalAuthToken", externalAuthToken);
    }
    var url = urlObj.toString();

    iframe.src = url;

    host.appendChild(iframe);
    wrapper.appendChild(host);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    function sendViewport() {
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "PARENT_VIEWPORT",
              payload: { width: window.innerWidth, height: window.innerHeight },
            },
            "*"
          );
        }
      } catch (_) {}
    }

    sendViewport();
    window.addEventListener("resize", sendViewport);

    var handler = function (e) {
      var isAllowedOrigin = false;
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === ""
      ) {
        isAllowedOrigin = true;
      } else {
        isAllowedOrigin =
          e.origin === baseUrl || e.origin === window.location.origin;
      }
      if (!isAllowedOrigin) return;

      if (e.data && e.data.type === "WIDGET_METRICS" && e.data.payload) {
        var p = e.data.payload || {};
        var width = Math.max(0, Number(p.width) || 0);
        var height = Math.max(0, Number(p.height) || 0);
        var isPercent = p.isPercent !== false; // 明示的に false でない限りパーセント（互換性のため）
        var isWidgetOpen = Boolean(p.isWidgetOpen);

        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;

        var computedIsMobile = viewportWidth <= 768;
        currentIsMobile = computedIsMobile;
        currentIsWidgetOpen = isWidgetOpen;

        // サイズ反映
        var resolvedWidth, resolvedHeight;
        if (isPercent) {
          resolvedWidth = (viewportWidth * width) / 100;
          resolvedHeight = (viewportHeight * height) / 100;
        } else {
          resolvedWidth = Math.min(width, viewportWidth);
          resolvedHeight = Math.min(height, viewportHeight);
        }

        wrapper.style.width = resolvedWidth + "px";
        wrapper.style.height = resolvedHeight + "px";

        var buttonHOffset =
          p.buttonHorizontalPosition !== undefined
            ? p.buttonHorizontalPosition
            : positionConfig.buttonHorizontalPercent || 0;
        var buttonVOffset =
          p.buttonVerticalPosition !== undefined
            ? p.buttonVerticalPosition
            : positionConfig.buttonVerticalPercent || 0;

        var widgetHOffset =
          p.widgetHorizontalPosition !== undefined
            ? p.widgetHorizontalPosition
            : positionConfig.widgetHorizontalPercent || 0;
        var widgetVOffset =
          p.widgetVerticalPosition !== undefined
            ? p.widgetVerticalPosition
            : positionConfig.widgetVerticalPercent || 0;

        var isOpening = !previousIsWidgetOpen && isWidgetOpen;
        previousIsWidgetOpen = isWidgetOpen;

        if (computedIsMobile && isWidgetOpen) {
          // ✅ モバイル全画面：CSS(dvh)に一任（跳ねない）
          lockPageScroll();
          setOverlayInteractivityForState();
          setFullscreenMobileCss();

          if (isOpening) {
            host.style.transition = "none";
            host.style.transform = "translateY(100%)";
            host.offsetHeight;
            host.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
            host.style.transform = "translateY(0px)";
          } else {
            host.style.transform = "translateY(0px)";
          }
        } else if (isWidgetOpen && !computedIsMobile) {
          // デスクトップ open
          unlockPageScroll();
          setOverlayInteractivityForState();
          host.style.transform = "none";
          applyPosition(widgetHOffset, widgetVOffset);
        } else {
          // ボタンモード
          unlockPageScroll();
          setOverlayInteractivityForState();
          host.style.transform = "none";
          applyPosition(buttonHOffset, buttonVOffset);
        }

        if (wrapper.style.display === "none") wrapper.style.display = "block";
        return;
      }

      if (e.data && e.data.type === "REQUEST_PARENT_VIEWPORT") {
        sendViewport();
        return;
      }

      if (
        e.data &&
        (e.data.type === "REMOVE_WIDGET" ||
          e.data.type === "FORCE_CLOSE_WIDGET" ||
          e.data.type === "EMERGENCY_REMOVE_WIDGET")
      ) {
        removeWidget();
        return;
      }
    };

    function removeWidget() {
      try {
        unlockPageScroll();

        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        window.removeEventListener("message", handler);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("resize", sendViewport);

        if (window.DoppelChatEmbed) delete window.DoppelChatEmbed;
      } catch (_) {}
    }

    window.addEventListener("message", handler);

    window.DoppelChatEmbed = {
      open: function () {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "OPEN_CHAT" }, "*");
        }
      },
      close: function () {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "CLOSE_CHAT" }, "*");
        }
      },
      toggle: function () {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "TOGGLE_CHAT" }, "*");
        }
      },
      destroy: function () {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "REMOVE_WIDGET" }, "*");
        }
      },
      forceRemove: function () {
        removeWidget();
      },
      getIframe: function () {
        return iframe;
      },
    };

    window.removeDoppelChatWidget = function () {
      removeWidget();
    };
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
