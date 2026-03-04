import { useState, useRef } from "react";
import {
  setHours,
  setMinutes,
  addMinutes,
  differenceInMinutes,
  isSameDay,
  parseISO,
} from "date-fns";

// APIからの日付文字列を安全に Date に変換
const parseApiDate = (val: string | Date | undefined | null) => {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  return parseISO(val);
};

export function useBookingDragDrop(
  handleSave: (payload: any) => Promise<void>,
  handleOpenCreate: (start: Date, end: Date) => void,
) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [movingMenu, setMovingMenu] = useState<any>(null);
  const [dragOffsetMinutes, setDragOffsetMinutes] = useState(0);

  // ドラッグ操作の状態管理
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const wasMoved = useRef(false);
  const dragOccurred = useRef(false);

  const handleMouseDownGrid = (
    date: Date,
    hour: number,
    minutes: number = 0,
  ) => {
    // 既存のタイマーがあればクリア
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    const start = setHours(setMinutes(date, minutes), hour);
    setIsDragging(true);
    setDragStart(start);
    setDragEnd(addMinutes(start, 30));
    setDragOffsetMinutes(0);
    wasMoved.current = false;
    dragOccurred.current = false;
  };

  const handleMouseMoveGrid = (
    date: Date,
    hour: number,
    minutes: number = 0,
    e: React.MouseEvent,
  ) => {
    if (!isDragging || !dragStart) return;
    const current = setHours(setMinutes(date, minutes), hour);

    if (movingMenu) {
      const start = parseApiDate(movingMenu.startAt);
      const end = parseApiDate(movingMenu.endAt);
      const duration = differenceInMinutes(end, start);

      const newStart = addMinutes(current, -dragOffsetMinutes);
      const newEnd = addMinutes(newStart, duration);

      // 実際に時間が変わった場合のみ「移動した」とみなす
      if (Math.abs(newStart.getTime() - dragStart.getTime()) > 1000) {
        wasMoved.current = true;
      }

      setDragStart(newStart);
      setDragEnd(newEnd);
    } else {
      if (current >= dragStart) {
        setDragEnd(addMinutes(current, 15));
      } else {
        setDragStart(current);
      }
      wasMoved.current = true;
    }
  };

  const handleMouseUpGrid = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!isDragging) {
      setMovingMenu(null);
      return;
    }

    setIsDragging(false);
    dragOccurred.current = true;
    // clickイベントへの伝播が終わるまで少し待ってからフラグをリセット
    setTimeout(() => {
      dragOccurred.current = false;
    }, 100);

    if (movingMenu && dragStart && dragEnd) {
      // 実際に移動があった場合のみ保存
      if (wasMoved.current) {
        const originalStart = parseApiDate(movingMenu.startAt).getTime();
        const newStart = dragStart.getTime();

        if (originalStart !== newStart) {
          handleSave({
            ...movingMenu,
            startAt: dragStart.toISOString(),
            endAt: dragEnd.toISOString(),
          });
        }
      }
      setMovingMenu(null);
    } else if (dragStart && dragEnd) {
      handleOpenCreate(dragStart, dragEnd);
    }

    setDragStart(null);
    setDragEnd(null);
    setDragOffsetMinutes(0);
  };

  const handleMenuDragStart = (
    e: React.MouseEvent,
    menu: any,
    clickTime?: Date,
  ) => {
    e.stopPropagation();

    // 既存のタイマーをクリア（連続タップ対策）
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    setMovingMenu(menu);
    wasMoved.current = false;

    const start = parseApiDate(menu.startAt);
    const end = parseApiDate(menu.endAt);
    const offset = clickTime ? differenceInMinutes(clickTime, start) : 0;

    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      setDragStart(start);
      setDragEnd(end);
      setDragOffsetMinutes(offset);
    }, 300);
  };

  const handleMenuClick = (
    e: React.MouseEvent,
    menu: any,
    onEdit: (menu: any) => void,
  ) => {
    e.stopPropagation();
    // ドラッグが発生した直後のクリックイベントであれば無視する
    if (dragOccurred.current) return;
    onEdit(menu);
  };

  return {
    isDragging,
    dragStart,
    dragEnd,
    movingMenu,
    handleMouseDownGrid,
    handleMouseMoveGrid,
    handleMouseUpGrid,
    handleMenuDragStart,
    handleMenuClick,
  };
}
