import React, { useState } from "react";
import {
  format,
  isToday,
  isSameDay,
  getHours,
  getMinutes,
  differenceInMinutes,
  parseISO,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Users } from "lucide-react";
import { MenuPopover } from "./menu-popover";

// APIからの日付文字列を安全に Date に変換
const parseApiDate = (val: string | Date | undefined | null) => {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  return parseISO(val);
};

interface WeekDayViewProps {
  days: Date[];
  menuSlots: any;
  isDragging: boolean;
  dragStart: Date | null;
  dragEnd: Date | null;
  movingMenu: any;
  handleMouseDownGrid: (date: Date, hour: number, minutes?: number) => void;
  handleMouseMoveGrid: (
    date: Date,
    hour: number,
    minutes: number,
    e: React.MouseEvent,
  ) => void;
  handleMouseUpGrid: () => void;
  handleMenuDragStart: (
    e: React.MouseEvent,
    menu: any,
    clickTime?: Date,
  ) => void;
  handleMenuClick: (
    e: React.MouseEvent,
    menu: any,
    onEdit: (menu: any) => void,
  ) => void;
  handleOpenEdit: (menu: any) => void;
  handleDelete: (id: number) => void;
}

const HOUR_HEIGHT = 44; // 少し高さを広げて見やすくする
const hours = Array.from({ length: 24 }, (_, i) => i);

// 予約枠の重なりを計算するヘルパー
const calculateOverlapPositions = (dayMenuSlots: any[]) => {
  if (!dayMenuSlots || dayMenuSlots.length === 0) return [];

  const sortedSlots = [...dayMenuSlots].sort((a, b) => {
    const aStart = parseApiDate(a.startAt).getTime();
    const bStart = parseApiDate(b.startAt).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return parseApiDate(b.endAt).getTime() - parseApiDate(a.endAt).getTime();
  });

  const clusters: any[][] = [];
  let currentCluster: any[] = [];
  let clusterEnd: number = 0;

  sortedSlots.forEach((menuSlot) => {
    const start = parseApiDate(menuSlot.startAt).getTime();
    const end = parseApiDate(menuSlot.endAt).getTime();

    if (start < clusterEnd) {
      currentCluster.push(menuSlot);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [menuSlot];
      clusterEnd = end;
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  return clusters.flatMap((cluster) => {
    const columns: any[][] = [];
    cluster.forEach((menuSlot) => {
      let placed = false;
      const slotStart = parseApiDate(menuSlot.startAt).getTime();
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        if (column && column.length > 0) {
          const lastSlotInColumn = column[column.length - 1];
          if (
            lastSlotInColumn &&
            parseApiDate(lastSlotInColumn.endAt).getTime() <= slotStart
          ) {
            column.push(menuSlot);
            placed = true;
            break;
          }
        }
      }
      if (!placed) columns.push([menuSlot]);
    });

    return cluster.map((menuSlot) => {
      let columnIndex = 0;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        if (column && column.includes(menuSlot)) {
          columnIndex = i;
          break;
        }
      }
      return { ...menuSlot, columnIndex, totalColumns: columns.length };
    });
  });
};

export function WeekDayView({
  days,
  menuSlots,
  isDragging,
  dragStart,
  dragEnd,
  movingMenu,
  handleMouseDownGrid,
  handleMouseMoveGrid,
  handleMouseUpGrid,
  handleMenuDragStart,
  handleMenuClick,
  handleOpenEdit,
  handleDelete,
}: WeekDayViewProps) {
  const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null);

  const getMenuSlotStyle = (menuSlot: any) => {
    const start = parseApiDate(menuSlot.startAt);
    const end = parseApiDate(menuSlot.endAt);
    const startMinutes = getHours(start) * 60 + getMinutes(start);
    const durationMinutes = differenceInMinutes(end, start);

    const { columnIndex = 0, totalColumns = 1 } = menuSlot;
    const width = 100 / totalColumns;
    const left = width * columnIndex;

    const currentCount =
      (menuSlot.maxCapacity || 0) - (menuSlot.availableCount || 0);
    const isFull = currentCount >= (menuSlot.maxCapacity || 1);

    return {
      top: `${startMinutes * (HOUR_HEIGHT / 60)}px`,
      height: `${Math.max(durationMinutes * (HOUR_HEIGHT / 60), 24)}px`,
      left: `${left}%`,
      width: `calc(${width}% - 4px)`, // 少し隙間を開けて見やすくする
      backgroundColor: isFull ? "#fee2e2" : menuSlot.color || "#3b82f6",
      color: isFull ? "#991b1b" : "#ffffff",
      borderLeft: `4px solid ${isFull ? "#ef4444" : menuSlot.color || "#1d4ed8"}`,
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div
        className="flex-1 overflow-auto scrollbar-hide relative bg-white"
        onMouseLeave={handleMouseUpGrid}
      >
        <div className="min-w-max flex flex-col">
          {/* 曜日ヘッダー (Sticky Top) */}
          <div className="flex sticky top-0 z-30 bg-white border-b border-divider">
            <div className="w-12 sm:w-16 shrink-0 bg-white border-r border-divider sticky left-0 z-40" />
            {days.map((day) => (
              <div
                key={day.toString()}
                className="flex-1 min-w-[140px] py-4 text-center border-l border-divider bg-white"
              >
                <div
                  className={`text-[10px] uppercase font-bold tracking-wider ${isToday(day) ? "text-primary" : "text-default-400"}`}
                >
                  {format(day, "eee", { locale: ja })}
                </div>
                <div
                  className={`text-xl mt-1.5 w-10 h-10 mx-auto flex items-center justify-center rounded-full transition-all ${
                    isToday(day)
                      ? "bg-primary text-white font-bold shadow-md"
                      : "text-default-900 hover:bg-default-100"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          <div
            className="flex relative"
            style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
          >
            {/* 時間軸 (Sticky Left) */}
            <div className="w-12 sm:w-16 shrink-0 border-r border-divider bg-white sticky left-0 z-20">
              {hours.map((h) => (
                <div
                  key={h}
                  className="text-[10px] text-default-400 pr-3 text-right relative bg-white"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="absolute -top-2 right-3">{`${h}:00`}</span>
                </div>
              ))}
              <div
                className="text-[10px] text-default-400 pr-3 text-right relative bg-white"
                style={{ height: "0px" }}
              >
                <span className="absolute -top-2 right-3">0:00</span>
              </div>
            </div>

            {/* グリッド本体 */}
            <div className="flex-1 flex relative">
              <div className="absolute inset-0 z-0 pointer-events-none">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b border-divider"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}
              </div>

              {days.map((day) => {
                const daySlots =
                  menuSlots?.filter((s: any) =>
                    isSameDay(parseApiDate(s.startAt), day),
                  ) || [];
                const positionedSlots = calculateOverlapPositions(daySlots);

                return (
                  <div
                    key={day.toString()}
                    className="flex-1 min-w-[120px] sm:min-w-[140px] border-l border-divider relative z-10"
                    onMouseUp={handleMouseUpGrid}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="relative border-b border-divider/30"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {[0, 15, 30, 45].map((m) => (
                          <div
                            key={m}
                            className="absolute left-0 right-0 cursor-cell hover:bg-primary/5 active:bg-primary/10 transition-colors"
                            style={{
                              height: `${HOUR_HEIGHT / 4}px`,
                              top: `${(m / 60) * HOUR_HEIGHT}px`,
                            }}
                            onMouseDown={() => handleMouseDownGrid(day, h, m)}
                            onMouseMove={(e) =>
                              handleMouseMoveGrid(day, h, m, e)
                            }
                          />
                        ))}
                      </div>
                    ))}

                    {isDragging &&
                      dragStart &&
                      dragEnd &&
                      isSameDay(day, dragStart) && (
                        <div
                          className="absolute left-1 right-1 bg-primary/30 border-2 border-primary rounded-lg z-50 pointer-events-none shadow-xl backdrop-blur-[2px]"
                          style={{
                            top: `${(getHours(dragStart) * 60 + getMinutes(dragStart)) * (HOUR_HEIGHT / 60)}px`,
                            height: `${Math.abs(differenceInMinutes(dragEnd, dragStart)) * (HOUR_HEIGHT / 60)}px`,
                          }}
                        >
                          <div className="p-2 text-[11px] font-bold text-primary-700 bg-white/40 rounded-t-[6px]">
                            {movingMenu ? movingMenu.title : "新規予定の作成"}
                          </div>
                        </div>
                      )}

                    {positionedSlots.map((menuSlot: any, idx: number) => {
                      const slotKey = `${menuSlot.menuId}-${menuSlot.startAt}-${idx}`;
                      return (
                        <MenuPopover
                          key={slotKey}
                          menuSlot={menuSlot}
                          isOpen={activePopoverKey === slotKey}
                          onOpenChange={(open) =>
                            setActivePopoverKey(open ? slotKey : null)
                          }
                          onEdit={(menu) => {
                            handleOpenEdit(menu);
                            setActivePopoverKey(null);
                          }}
                          onDelete={(id) => {
                            handleDelete(id);
                            setActivePopoverKey(null);
                          }}
                          trigger={
                            <div
                              onClick={(e) =>
                                handleMenuClick(e, menuSlot, () =>
                                  setActivePopoverKey(slotKey),
                                )
                              }
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(menuSlot);
                                setActivePopoverKey(null);
                              }}
                              onMouseDown={(e) =>
                                handleMenuDragStart(e, menuSlot)
                              }
                              className={`absolute rounded-lg p-2 text-[11px] overflow-hidden shadow-sm cursor-pointer transition-all hover:brightness-105 hover:shadow-lg hover:z-30 z-20 border border-black/10 active:scale-[0.98] ${
                                movingMenu?.menuId === menuSlot.menuId &&
                                isDragging
                                  ? "opacity-0"
                                  : "opacity-100"
                              }`}
                              style={getMenuSlotStyle(menuSlot)}
                            >
                              <div className="font-bold truncate leading-tight">
                                {menuSlot.title || "(無題)"}
                              </div>
                              <div className="opacity-80 font-medium text-[10px] mt-0.5">
                                {format(
                                  parseApiDate(menuSlot.startAt),
                                  "HH:mm",
                                )}{" "}
                                -{" "}
                                {format(parseApiDate(menuSlot.endAt), "HH:mm")}
                              </div>
                              {menuSlot.maxCapacity > 0 && (
                                <div className="mt-1.5 flex items-center gap-1 bg-black/10 rounded-full px-2 py-0.5 w-fit text-[9px] font-bold">
                                  <Users size={10} strokeWidth={3} />
                                  <span>
                                    {menuSlot.maxCapacity -
                                      menuSlot.availableCount}
                                    /{menuSlot.maxCapacity}
                                  </span>
                                </div>
                              )}
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
