"use client";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Hash, TrendingUp } from "lucide-react";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";

import type { KeywordOverviewType } from "@repo/api-contracts/based_template/zschema";

// 定数定義
const MAX_KEYWORDS = 20;
const MAX_RANKING_ITEMS = 15;
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 20;
const OPACITY_MIN = 0.6;
const OPACITY_MAX = 1;
const COLLISION_PADDING = 3;
const SPIRAL_ANGLE_STEP = 0.3;
const SPIRAL_RADIUS_STEP = 2;
const MAX_PLACEMENT_ATTEMPTS = 1000;
const HOVER_SCALE = 1.1;

interface KeywordCloudProps {
  keywordOverview: KeywordOverviewType;
}

interface KeywordPosition {
  word: string;
  x: number;
  y: number;
  fontSize: number;
  width: number;
  height: number;
  rank: number;
  count: number;
  percentage: number;
  opacity: number;
}

interface ProcessedKeyword {
  word: string;
  count: number;
  percentage: number;
  rank: number;
  fontSize: number;
  opacity: number;
}

// HSLからRGBへの変換ユーティリティ
const hslToRgb = (
  h: number,
  s: number,
  l: number,
): [number, number, number] => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h * 6 < 1) {
    r = c;
    g = x;
    b = 0;
  } else if (h * 6 < 2) {
    r = x;
    g = c;
    b = 0;
  } else if (h * 6 < 3) {
    r = 0;
    g = c;
    b = x;
  } else if (h * 6 < 4) {
    r = 0;
    g = x;
    b = c;
  } else if (h * 6 < 5) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

// 文字列からハッシュ値を生成
const stringToHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// ランクに応じた彩度・明度を取得
const getSaturationAndLightness = (
  rank: number,
): { saturation: number; lightness: number } => {
  if (rank <= 5) return { saturation: 75, lightness: 45 };
  if (rank <= 10) return { saturation: 70, lightness: 48 };
  if (rank <= 15) return { saturation: 65, lightness: 50 };
  return { saturation: 55, lightness: 52 };
};

export default function KeywordCloud({ keywordOverview }: KeywordCloudProps) {
  const summary = keywordOverview.summary;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionsRef = useRef<KeywordPosition[]>([]);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);

  const overallKeywords = useMemo<ProcessedKeyword[]>(() => {
    return (summary.keywords ?? [])
      .slice(0, MAX_KEYWORDS)
      .map((keyword, index) => ({
        word: keyword.word,
        count: keyword.count,
        percentage: keyword.percentage,
        rank: index + 1,
        fontSize: Math.max(
          FONT_SIZE_MIN,
          Math.min(FONT_SIZE_MAX, FONT_SIZE_MIN + (keyword.percentage / 5) * 3),
        ),
        opacity: Math.max(
          OPACITY_MIN,
          Math.min(OPACITY_MAX, OPACITY_MIN + keyword.percentage / 10),
        ),
      }));
  }, [summary.keywords]);

  // ランクに応じた背景色クラスを取得（紫系グラデーション）
  const getColorByRank = useCallback((rank: number): string => {
    if (rank <= 3) return "bg-purple-600"; // 1-3位: 濃い紫
    if (rank <= 7) return "bg-purple-500"; // 4-7位: 中紫
    if (rank <= 12) return "bg-purple-400"; // 8-12位: やや薄い紫
    return "bg-purple-300"; // 13位以降: 薄い紫
  }, []);

  // ランクに応じたグラデーションクラスを取得（紫系グラデーション）
  const getColorByRankLight = useCallback((rank: number): string => {
    if (rank <= 3) return "from-purple-100 to-purple-200"; // 1-3位
    if (rank <= 7) return "from-purple-50 to-purple-100"; // 4-7位
    if (rank <= 12) return "from-purple-50 to-purple-50"; // 8-12位
    return "from-gray-50 to-purple-50"; // 13位以降
  }, []);

  // キーワードカラー生成（HSL色相を均等に分散）
  const getKeywordColor = useCallback(
    (word: string, rank: number, opacity: number): string => {
      const hash = stringToHash(word);
      const hue = (hash % 360) / 360;
      const { saturation, lightness } = getSaturationAndLightness(rank);

      const [r, g, b] = hslToRgb(hue, saturation / 100, lightness / 100);

      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    [],
  );

  // 衝突検出関数
  const checkCollision = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      placedKeywords: KeywordPosition[],
    ): boolean => {
      const expandedWidth = width + COLLISION_PADDING * 2;
      const expandedHeight = height + COLLISION_PADDING * 2;
      const expandedX = x - COLLISION_PADDING;
      const expandedY = y - COLLISION_PADDING;

      return placedKeywords.some((placed) => {
        const placedExpandedX = placed.x - COLLISION_PADDING;
        const placedExpandedY = placed.y - COLLISION_PADDING;
        const placedExpandedWidth = placed.width + COLLISION_PADDING * 2;
        const placedExpandedHeight = placed.height + COLLISION_PADDING * 2;

        return (
          expandedX < placedExpandedX + placedExpandedWidth &&
          expandedX + expandedWidth > placedExpandedX &&
          expandedY < placedExpandedY + placedExpandedHeight &&
          expandedY + expandedHeight > placedExpandedY
        );
      });
    },
    [],
  );

  // スパイラル配置アルゴリズム
  const placeKeywords = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      keywords: ProcessedKeyword[],
      canvasWidth: number,
      canvasHeight: number,
    ): KeywordPosition[] => {
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const placedKeywords: KeywordPosition[] = [];

      for (const keyword of keywords) {
        ctx.font = `bold ${keyword.fontSize}px sans-serif`;
        const metrics = ctx.measureText(keyword.word);
        const width = metrics.width;
        const height = keyword.fontSize * 1.2;

        let angle = 0;
        let radius = 0;
        let attempts = 0;
        let placed = false;

        while (!placed && attempts < MAX_PLACEMENT_ATTEMPTS) {
          const x = centerX + radius * Math.cos(angle) - width / 2;
          const y = centerY + radius * Math.sin(angle) - height / 2;

          const isWithinBounds =
            x >= 0 &&
            y >= 0 &&
            x + width <= canvasWidth &&
            y + height <= canvasHeight;

          if (
            isWithinBounds &&
            !checkCollision(x, y, width, height, placedKeywords)
          ) {
            placedKeywords.push({
              word: keyword.word,
              x,
              y,
              fontSize: keyword.fontSize,
              width,
              height,
              rank: keyword.rank,
              count: keyword.count,
              percentage: keyword.percentage,
              opacity: keyword.opacity,
            });
            placed = true;
          }

          angle += SPIRAL_ANGLE_STEP;
          radius += SPIRAL_RADIUS_STEP / (1 + attempts / 100);
          attempts++;
        }
      }

      return placedKeywords;
    },
    [checkCollision],
  );

  // Canvas描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || overallKeywords.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawCanvas = () => {
      // 高DPIディスプレイ対応
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // サイズが0の場合はスキップ
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const canvasWidth = rect.width;
      const canvasHeight = rect.height;

      // 背景をクリア
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // グラデーション背景（より洗練されたデザイン）
      const gradient = ctx.createRadialGradient(
        canvasWidth / 2,
        canvasHeight / 2,
        0,
        canvasWidth / 2,
        canvasHeight / 2,
        Math.max(canvasWidth, canvasHeight),
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.5, "rgba(250, 245, 255, 0.6)");
      gradient.addColorStop(1, "rgba(238, 242, 255, 0.4)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // キーワードを配置
      const positions = placeKeywords(
        ctx,
        overallKeywords,
        canvasWidth,
        canvasHeight,
      );
      positionsRef.current = positions;

      // キーワードを描画
      positions.forEach((pos) => {
        const isHovered = hoveredKeyword === pos.word;
        const scale = isHovered ? HOVER_SCALE : 1;
        const currentFontSize = pos.fontSize * scale;
        const currentWidth = pos.width * scale;
        const currentHeight = pos.height * scale;
        const offsetX = (currentWidth - pos.width) / 2;
        const offsetY = (currentHeight - pos.height) / 2;

        ctx.save();

        // フォント設定
        ctx.font = `bold ${currentFontSize}px sans-serif`;
        ctx.textBaseline = "top";

        // 影を描画
        if (isHovered) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        // テキストを描画
        const color = getKeywordColor(pos.word, pos.rank, pos.opacity);
        ctx.fillStyle = color;
        ctx.fillText(pos.word, pos.x - offsetX, pos.y - offsetY);

        ctx.restore();
      });
    };

    // 初回描画
    drawCanvas();

    // リサイズ対応
    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [overallKeywords, hoveredKeyword, placeKeywords, getKeywordColor]);

  // マウスイベントハンドラー
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const dpr = window.devicePixelRatio || 1;
    const scaledX = x / dpr;
    const scaledY = y / dpr;

    // 保存された位置情報を使用してホバー判定
    const positions = positionsRef.current;

    let found = false;
    for (const pos of positions) {
      if (
        scaledX >= pos.x &&
        scaledX <= pos.x + pos.width &&
        scaledY >= pos.y &&
        scaledY <= pos.y + pos.height
      ) {
        setHoveredKeyword(pos.word);
        canvas.style.cursor = "pointer";
        found = true;
        break;
      }
    }

    if (!found) {
      setHoveredKeyword(null);
      canvas.style.cursor = "default";
    }
  };

  const handleMouseLeave = () => {
    setHoveredKeyword(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "default";
    }
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="grid grid-cols-2 gap-1.5 h-full min-h-0">
        {/* キーワードクラウドカード */}
        <Card className="flex flex-col border border-default-200 min-h-0 h-full">
          <CardHeader className="pb-0.5 border-b border-default-100 flex-shrink-0 px-2 py-1">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                <Hash className="w-3 h-3 text-primary" />
                キーワードクラウド
              </h3>
              <Chip
                color="default"
                variant="flat"
                size="sm"
                className="text-[9px] h-3.5"
              >
                {summary.yearMonth}
              </Chip>
            </div>
          </CardHeader>
          <CardBody className="pt-1 px-2 pb-1.5 flex-1 flex flex-col min-h-0 overflow-hidden">
            {overallKeywords.length > 0 ? (
              <div className="relative rounded overflow-hidden bg-default-50 border border-default-100 flex-1 min-h-0 w-full">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
                {hoveredKeyword && (
                  <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 bg-primary text-white px-1.5 py-0.5 rounded text-[9px] font-medium shadow-lg pointer-events-none max-w-[90%] z-10">
                    <span className="font-bold">{hoveredKeyword}</span>
                    {overallKeywords.find((k) => k.word === hoveredKeyword) && (
                      <span className="ml-1 text-primary-100">
                        (
                        {
                          overallKeywords.find((k) => k.word === hoveredKeyword)
                            ?.count
                        }
                        /
                        {
                          overallKeywords.find((k) => k.word === hoveredKeyword)
                            ?.percentage
                        }
                        %)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-default-400 bg-default-50 rounded min-h-0">
                <div className="text-center px-2">
                  <Hash className="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                  <p className="text-[10px]">データなし</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* キーワードランキングカード */}
        <Card className="flex flex-col border border-default-200 min-h-0 h-full">
          <CardHeader className="pb-0.5 border-b border-default-100 flex-shrink-0 px-2 py-1">
            <h3 className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              ランキング
            </h3>
          </CardHeader>
          <CardBody className="pt-1 px-2 pb-1.5 flex-1 flex flex-col min-h-0 overflow-hidden">
            {overallKeywords.length > 0 ? (
              <div
                className="space-y-0.5 overflow-y-auto flex-1 min-h-0 pr-1 w-full"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgb(196 181 253) rgb(250 245 255)",
                }}
              >
                {overallKeywords
                  .slice(0, MAX_RANKING_ITEMS)
                  .map((keyword, index) => (
                    <div
                      key={keyword.word}
                      className={`group flex items-center justify-between p-0.5 bg-gradient-to-r ${getColorByRankLight(
                        keyword.rank,
                      )} rounded transition-all duration-200 hover:shadow-sm border border-transparent hover:border-primary/20`}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <div
                          className={`w-3.5 h-3.5 ${getColorByRank(
                            keyword.rank,
                          )} rounded-full flex items-center justify-center mr-1 flex-shrink-0 shadow-sm`}
                        >
                          <span className="text-[9px] font-bold text-white">
                            {keyword.rank}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate text-[10px]">
                            {keyword.word}
                          </p>
                          <p className="text-[9px] text-default-500">
                            {keyword.percentage}%
                          </p>
                        </div>
                      </div>
                      <Chip
                        color={keyword.rank <= 3 ? "secondary" : "default"}
                        variant="flat"
                        size="sm"
                        className="text-[9px] h-3.5 ml-0.5 flex-shrink-0"
                      >
                        {keyword.count}
                      </Chip>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-default-400 bg-default-50 rounded min-h-0">
                <div className="text-center px-2">
                  <TrendingUp className="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                  <p className="text-[10px]">データなし</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
