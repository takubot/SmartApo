import { Popover, PopoverTrigger, PopoverContent, Button } from "@heroui/react";
import {
  Edit2,
  Trash2,
  X,
  Clock,
  AlignLeft,
  Calendar,
  Link,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { showSuccessToast } from "@common/errorHandler";

interface MenuPopoverProps {
  menuSlot: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (menu: any) => void;
  onDelete: (id: number) => void;
  trigger: React.ReactNode;
}

// APIからの日付文字列を安全に Date に変換
const parseApiDate = (val: string | Date | undefined | null) => {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  return parseISO(val);
};

export function MenuPopover({
  menuSlot,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
  trigger,
}: MenuPopoverProps) {
  const start = parseApiDate(menuSlot.startAt);
  const end = parseApiDate(menuSlot.endAt);

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom"
      offset={10}
      showArrow
      backdrop="transparent"
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              opacity: { duration: 0.15 },
              scale: { duration: 0.2, ease: "easeOut" },
            },
          },
          exit: {
            y: 5,
            opacity: 0,
            scale: 0.95,
            transition: {
              opacity: { duration: 0.1 },
              scale: { duration: 0.1 },
            },
          },
        },
      }}
      classNames={{
        base: "before:bg-[#202124]",
        content: "p-0 border-none bg-transparent shadow-2xl",
      }}
    >
      <PopoverTrigger>{trigger}</PopoverTrigger>
      <PopoverContent>
        <div className="w-[calc(100vw-2rem)] sm:w-[440px] max-w-[440px] bg-[#202124] text-white rounded-xl overflow-hidden border border-white/10 ring-1 ring-black/20">
          {/* ヘッダーアクション */}
          <div className="flex justify-end items-center gap-0.5 p-1.5 bg-white/5">
            <Button
              isIconOnly
              variant="light"
              radius="full"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/booking/reserve/${menuSlot.menuUuid}`;
                navigator.clipboard.writeText(url);
                showSuccessToast("予約リンクをコピーしました");
              }}
              className="text-white/80 hover:text-primary hover:bg-primary/10 w-9 h-9"
              title="予約リンクをコピー"
            >
              <Link size={18} strokeWidth={2.5} />
            </Button>
            <Button
              isIconOnly
              variant="light"
              radius="full"
              size="sm"
              onClick={() => onEdit(menuSlot)}
              className="text-white/80 hover:text-white hover:bg-white/10 w-9 h-9"
            >
              <Edit2 size={18} strokeWidth={2.5} />
            </Button>
            <Button
              isIconOnly
              variant="light"
              radius="full"
              size="sm"
              onClick={() => {
                if (confirm("この予約枠を削除してもよろしいですか？")) {
                  onDelete(menuSlot.menuId);
                }
              }}
              className="text-white/80 hover:text-danger hover:bg-danger/10 w-9 h-9"
            >
              <Trash2 size={18} strokeWidth={2.5} />
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button
              isIconOnly
              variant="light"
              radius="full"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 w-9 h-9"
            >
              <X size={20} strokeWidth={2.5} />
            </Button>
          </div>

          {/* コンテンツ */}
          <div className="p-4 sm:p-8 space-y-5 sm:space-y-7">
            <div className="flex items-start gap-3 sm:gap-5">
              <div
                className="w-5 h-5 rounded-md mt-1.5 shrink-0 shadow-sm"
                style={{ backgroundColor: menuSlot.color || "#3b82f6" }}
              />
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
                    {menuSlot.title || "(無題)"}
                  </h3>
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold ${menuSlot.availableCount <= 0 ? "bg-danger-100 text-danger" : "bg-success-100 text-success"}`}
                  >
                    {menuSlot.availableCount <= 0
                      ? "満員"
                      : `空き: ${menuSlot.availableCount}/${menuSlot.maxCapacity}`}
                  </div>
                </div>
                <div className="text-[15px] text-white/60 font-medium flex items-center gap-2">
                  <span>
                    {format(start, "yyyy年 M月 d日 (eeee)", { locale: ja })}
                  </span>
                </div>
                <div className="text-[15px] text-white/60 font-medium">
                  {format(start, "HH:mm")} – {format(end, "HH:mm")}
                </div>
              </div>
            </div>

            {menuSlot.description ? (
              <div className="flex items-start gap-5">
                <AlignLeft
                  size={20}
                  className="text-white/40 mt-0.5 shrink-0"
                />
                <div className="text-[14px] text-white/80 whitespace-pre-wrap leading-relaxed">
                  {menuSlot.description}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-5">
                <AlignLeft
                  size={20}
                  className="text-white/20 mt-0.5 shrink-0"
                />
                <div className="text-[14px] text-white/40 italic">
                  説明はありません
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
