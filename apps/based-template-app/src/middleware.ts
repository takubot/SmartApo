// middleware.ts;
import { NextRequest, NextResponse } from "next/server";

// IP制限チェック
async function checkIpRestriction(
  endpointUuid: string,
  request: NextRequest,
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    if (!apiBaseUrl) {
      console.error("API_BASE_URL環境変数が設定されていません");
      return {
        allowed: true,
        message: "API_BASE_URL未設定のため、アクセスを許可しました",
      };
    }

    // クライアントIPを取得
    function getClientIP(): string {
      const forwarded = request.headers.get("X-Forwarded-For");
      if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "unknown";
      }
      const realIp = request.headers.get("X-Real-IP");
      if (realIp) {
        return realIp.trim();
      }
      const cfIp = request.headers.get("CF-Connecting-IP");
      if (cfIp) {
        return cfIp.trim();
      }
      return "unknown";
    }

    const clientIP = getClientIP();

    // バックエンドAPIを直接呼び出し（フロントエンドAPIを経由しない）
    const url = new URL(`${apiBaseUrl}/check/ip-restriction`);
    url.searchParams.append("endpoint_uuid", endpointUuid);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // クライアントのIPアドレス情報を転送
        "X-Forwarded-For": request.headers.get("X-Forwarded-For") || "",
        "X-Real-IP": request.headers.get("X-Real-IP") || "",
        "CF-Connecting-IP": request.headers.get("CF-Connecting-IP") || "",
        "X-Client-IP": clientIP,
      },
      // タイムアウトを設定
      signal: AbortSignal.timeout(10000), // 10秒
    });

    if (response.ok) {
      const data = await response.json();

      return {
        allowed: data.allowed,
        message: data.message,
      };
    } else {
      console.error(
        "IP制限チェックAPIエラー:",
        response.status,
        response.statusText,
      );

      // 本番環境でのAPI呼び出し失敗時は、制限なしとして扱う（フェイルオープン）
      console.warn("IP制限チェックAPI失敗のため、アクセスを許可します");
      return {
        allowed: true,
        message: "IP制限チェックAPIエラーのため、アクセスを許可しました",
      };
    }
  } catch (error) {
    console.error("IP制限チェックエラー:", error);

    // ネットワークエラー等の場合も、制限なしとして扱う（フェイルオープン）
    console.warn("IP制限チェック例外のため、アクセスを許可します");
    return {
      allowed: true,
      message: "IP制限チェック例外のため、アクセスを許可しました",
    };
  }
}

// アクセス拒否ページのHTMLを生成
function createAccessDeniedPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>アクセス拒否</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
          margin: 1rem;
        }
        .icon {
          font-size: 4rem;
          color: #e74c3c;
          margin-bottom: 1rem;
        }
        h1 {
          color: #2c3e50;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        p {
          color: #7f8c8d;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .back-button {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s;
        }
        .back-button:hover {
          background: #2980b9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🚫</div>
        <h1>アクセスが制限されています</h1>
        <p>${message}</p>
        <button class="back-button" onclick="history.back()">戻る</button>
      </div>
    </body>
    </html>
  `;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // IP制限機能の有効/無効を環境変数で制御
  const ipRestrictionEnabled = process.env.ENABLE_IP_RESTRICTION !== "false";

  // チャット関連のページでIP制限をチェック
  const chatPaths = ["/fullChat", "/chatEmbed"];
  const isChatPath = chatPaths.some((path) => pathname.startsWith(path));

  // 予約ページは認証不要
  if (pathname.startsWith("/booking/")) {
    return NextResponse.next();
  }

  if (isChatPath && ipRestrictionEnabled) {
    // URLからendpointUuidを抽出
    const pathSegments = pathname.split("/");
    const endpointUuid = pathSegments[2]; // /fullChat/[endpointUuid] または /chatEmbed/[endpointUuid]

    if (endpointUuid) {
      // IP制限チェック
      const ipCheck = await checkIpRestriction(endpointUuid, request);

      if (!ipCheck.allowed) {
        // アクセス拒否ページを返す
        return new NextResponse(
          createAccessDeniedPage(
            ipCheck.message || "アクセスが拒否されました。",
          ),
          {
            status: 403,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        );
      }
    }
  }

  // 管理画面へのアクセスは認証チェック
  if (pathname.startsWith("/main")) {
    // Cookieからトークンを取得
    const cookieHeader = request.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("access_token="))
      ?.split("=")[1];

    // トークンが存在しない場合はログインページへリダイレクト
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/main/:path*",
    "/fullChat/:path*",
    "/chatEmbed/:path*",
    "/:entryUuid/chatScript",
    "/:entryUuid/LINE",
  ],
};
