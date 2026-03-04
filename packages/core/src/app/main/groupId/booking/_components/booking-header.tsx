import { Button } from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Plus,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ViewMode } from "../_hooks/use-calendar-state";

interface BookingHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  next: () => void;
  prev: () => void;
  onSettingsOpen: () => void;
  onCreateOpen: () => void;
}

export function BookingHeader({
  currentDate,
  viewMode,
  setViewMode,
  next,
  prev,
  onSettingsOpen,
  onCreateOpen,
}: BookingHeaderProps) {
  return (
    <header className="px-3 sm:px-4 py-2 border-b border-divider shrink-0 bg-white sticky top-0 z-20 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-foreground">予約管理</h1>
          </div>
          <div className="flex items-center gap-1 sm:ml-2">
            <div className="flex items-center">
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onClick={prev}
                className="text-default-600 hover:bg-default-100 h-8 w-8"
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onClick={next}
                className="text-default-600 hover:bg-default-100 h-8 w-8"
              >
                <ChevronRight size={18} />
              </Button>
            </div>
            <h2 className="text-sm sm:text-base font-bold ml-1 min-w-[120px] sm:min-w-[150px]">
              {format(
                currentDate,
                viewMode === "day" ? "yyyy年 M月 d日 (eeee)" : "yyyy年 M月",
                { locale: ja },
              )}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className="text-default-600 h-8 w-8"
            >
              <Search size={18} />
            </Button>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={onSettingsOpen}
              className="text-default-600 h-8 w-8"
            >
              <Settings size={18} />
            </Button>
          </div>

          <div className="flex items-center bg-default-100 rounded-md p-0.5 border border-divider">
            {(["month", "week", "day", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 sm:px-3 py-1 rounded-sm text-[10px] font-bold transition-all ${
                  viewMode === mode
                    ? "bg-white text-primary shadow-sm"
                    : "text-default-500 hover:text-default-900"
                }`}
              >
                {mode === "month"
                  ? "月"
                  : mode === "week"
                    ? "週"
                    : mode === "day"
                      ? "日"
                      : "一覧"}
              </button>
            ))}
          </div>

          <Button
            color="primary"
            size="sm"
            startContent={<Plus size={16} />}
            onClick={onCreateOpen}
            className="font-bold h-8 px-3 sm:ml-1"
          >
            作成
          </Button>
        </div>
      </div>
    </header>
  );
}
