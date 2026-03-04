import { useState } from "react";
import { format, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { MenuPopover } from "./menu-popover";

// APIからの日付文字列を安全に Date に変換
const parseApiDate = (val: string | Date | undefined | null) => {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  return parseISO(val);
};

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  menuSlots: any;
  handleOpenCreate: (date: Date) => void;
  handleOpenEdit: (menu: any) => void;
  handleDelete: (id: number) => void;
  handleMenuClick?: (
    e: React.MouseEvent,
    menu: any,
    onEdit: (menu: any) => void,
  ) => void;
}

export function MonthView({
  days,
  currentDate,
  menuSlots,
  handleOpenCreate,
  handleOpenEdit,
  handleDelete,
  handleMenuClick,
}: MonthViewProps) {
  const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-auto">
        <div className="min-w-[700px] h-full flex flex-col">
          <div className="grid grid-cols-7 border-b border-divider shrink-0 sticky top-0 bg-white z-20">
            {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[10px] font-bold text-default-400 uppercase"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-[520px]">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const daySlots =
                menuSlots?.filter((s: any) =>
                  isSameDay(parseApiDate(s.startAt), day),
                ) || [];
              return (
                <div
                  key={day.toString()}
                  className={`border-r border-b border-divider p-1.5 overflow-hidden hover:bg-default-50 transition-colors cursor-pointer ${!isCurrentMonth ? "bg-default-50/50" : ""}`}
                  onClick={() => handleOpenCreate(day)}
                >
                  <div
                    className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ml-auto mb-1 ${isToday(day) ? "bg-primary text-white" : "text-default-600"}`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5 overflow-y-auto max-h-[80px] scrollbar-hide">
                    {daySlots.map((s: any, idx: number) => {
                      const slotKey = `${s.menuId}-${s.startAt}-${idx}`;
                      return (
                        <MenuPopover
                          key={slotKey}
                          menuSlot={s}
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
                              onClick={(e) => {
                                if (handleMenuClick) {
                                  handleMenuClick(e, s, () =>
                                    setActivePopoverKey(slotKey),
                                  );
                                } else {
                                  e.stopPropagation();
                                  setActivePopoverKey(slotKey);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(s);
                                setActivePopoverKey(null);
                              }}
                              className={`text-[10px] px-2 py-1 rounded-md truncate font-semibold shadow-sm border border-black/5 cursor-pointer transition-all hover:brightness-105 hover:shadow-md active:scale-95 mb-0.5 ${s.availableCount <= 0 ? "bg-red-100 text-red-800 border-red-200" : ""}`}
                              style={
                                s.availableCount > 0
                                  ? {
                                      backgroundColor: s.color || "#3b82f6",
                                      color: "#fff",
                                    }
                                  : {}
                              }
                            >
                              <span className="opacity-80 mr-1.5 font-bold">
                                {format(parseApiDate(s.startAt), "HH:mm")}
                              </span>
                              {s.title || "(無題)"}
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
