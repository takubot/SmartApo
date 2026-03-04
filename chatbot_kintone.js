// 下記はsampleで作成したものなので、修正が必要な箇所は調整いただけますと幸いです。
// 特に、enventsの設定はご自身の環境に合わせて調整いただけますと幸いです。
// // 埋め込むscript文
// <script src="https://goda-kanko-shoji-app-646682719623.asia-northeast1.run.app/embed.js" data-entry-uuid="1626064d-a748-41a0-bd0e-f83aa88c4319"></script>

(function () {
  "use strict";

  // Kintoneの特定の画面が表示された時に実行する
  const events = ["portal.show", "app.record.index.show"];

  kintone.events.on(events, function (event) {
    // 既にスクリプトが追加されている場合は何もしない
    if (
      document.querySelector(
        'script[data-entry-uuid="1626064d-a748-41a0-bd0e-f83aa88c4319"]'
      )
    ) {
      return event;
    }

    // scriptタグを生成
    const script = document.createElement("script");
    script.src =
      "https://goda-kanko-shoji-app-646682719623.asia-northeast1.run.app/embed.js";
    script.setAttribute(
      "data-entry-uuid",
      "1626064d-a748-41a0-bd0e-f83aa88c4319"
    );
    script.defer = true;

    // ページのheadタグの末尾に追加
    document.head.appendChild(script);

    return event;
  });
})();
