"use client";

import { useGroupContext } from "../layout-client";
import { Spinner, useDisclosure, Button } from "@heroui/react";
import { useCalendarState } from "./_hooks/use-calendar-state";
import { useBookingData } from "./_hooks/use-booking-data";
import { useBookingActions } from "./_hooks/use-booking-actions";
import { useBookingDragDrop } from "./_hooks/use-booking-drag-drop";
import { BookingHeader } from "./_components/booking-header";
import { BookingListView } from "./_components/booking-list-view";
import { MonthView } from "./_components/month-view";
import { WeekDayView } from "./_components/week-day-view";
import { BookingMenuSidePanel } from "./_components/booking-menu-side-panel";
import { SettingsModal } from "./_components/settings-modal";
import { CalendarDays, Clock, Users, ChevronRight, Link } from "lucide-react";
import { useMemo } from "react";
import { showSuccessToast } from "@common/errorHandler";

export default function BookingPage() {
  const groupId = useGroupContext();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onOpenChange: onSettingsOpenChange,
  } = useDisclosure();

  const { viewMode, setViewMode, currentDate, days, next, prev } =
    useCalendarState();

  const dateRange = useMemo(() => {
    if (!days || days.length === 0) return undefined;
    const start = days[0];
    const end = days[days.length - 1];
    if (!start || !end) return undefined;
    return { start, end };
  }, [days]);

  const {
    menus,
    isMenusLoading,
    mutateMenus,
    bookings,
    settings,
    mutateSettings,
    menuSlots,
    mutateMenuSlots,
    schedules,
  } = useBookingData(groupId, dateRange);

  const {
    isSubmitting,
    editingMenu,
    title,
    setTitle,
    description,
    setDescription,
    color,
    setColor,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    maxCapacity,
    setMaxCapacity,
    repeatType,
    setRepeatType,
    repeatUntil,
    setRepeatUntil,
    repeatInterval,
    setRepeatInterval,
    repeatDaysOfWeek,
    setRepeatDaysOfWeek,
    daySpecificTimes,
    setDaySpecificTimes,
    isSplitMode,
    setIsSplitMode,
    menuDurationMinutes,
    setMenuDurationMinutes,
    gapMinutes,
    setGapMinutes,
    handleConnectGoogle,
    handleSetupWebhook,
    handleUpdateSettings,
    handleSave,
    handleDelete,
    handleOpenEdit: baseHandleOpenEdit,
    resetForm,
  } = useBookingActions(
    groupId,
    mutateMenus,
    mutateSettings,
    mutateMenuSlots,
    menus,
    schedules,
  );

  const handleOpenEdit = (menu: any) => {
    baseHandleOpenEdit(menu);
    onOpen();
  };

  const {
    isDragging,
    dragStart,
    dragEnd,
    movingMenu,
    handleMouseDownGrid,
    handleMouseMoveGrid,
    handleMouseUpGrid,
    handleMenuDragStart,
    handleMenuClick,
  } = useBookingDragDrop(handleSave, (start, end) => {
    resetForm(start, end);
    onOpen();
  });

  return (
    <div className="flex flex-col h-full bg-white text-default-900 overflow-hidden font-sans select-none">
      <BookingHeader
        currentDate={currentDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        next={next}
        prev={prev}
        onSettingsOpen={onSettingsOpen}
        onCreateOpen={() => {
          resetForm();
          onOpen();
        }}
      />

      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* 左側：予約メニューリストサイドバー */}
        <aside className="w-full xl:w-80 border-b xl:border-b-0 xl:border-r border-divider bg-default-50/30 overflow-hidden flex flex-col shrink-0 max-h-[40vh] xl:max-h-none">
          <div className="p-4 xl:p-6 border-b border-divider bg-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              面談設定一覧
            </h2>
            <p className="text-xs text-default-400 mt-1">
              作成済みの面談メニューを管理できます
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 xl:p-4 space-y-3 scrollbar-hide">
            {isMenusLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 w-full bg-default-100 animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            ) : menus && menus.length > 0 ? (
              menus.map((menu: any) => (
                <div
                  key={menu.menuId}
                  onClick={() => handleOpenEdit(menu)}
                  className="group bg-white border border-divider p-4 rounded-2xl hover:border-primary hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: menu.color || "#3b82f6" }}
                  />
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate pr-2">
                        {menu.title || "(無題)"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        radius="full"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/booking/reserve/${menu.menuUuid}`;
                          navigator.clipboard.writeText(url);
                          showSuccessToast("予約リンクをコピーしました");
                        }}
                        className="text-default-400 hover:text-primary"
                      >
                        <Link size={14} />
                      </Button>
                      <ChevronRight
                        size={16}
                        className="text-default-300 group-hover:text-primary transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] text-default-500 font-medium">
                      <Clock size={12} className="text-default-400" />
                      所要時間: {menu.durationMinutes}分
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-default-500 font-medium">
                      <Users size={12} className="text-default-400" />
                      定員: {menu.maxCapacity}名
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CalendarDays size={20} className="text-default-300" />
                </div>
                <p className="text-sm text-default-400 font-medium">
                  予約枠がありません
                </p>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="mt-4 font-bold"
                  onClick={() => {
                    resetForm();
                    onOpen();
                  }}
                >
                  枠を作成する
                </Button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isMenusLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <Spinner color="primary" size="lg" label="データを取得中..." />
            </div>
          )}

          {viewMode === "list" ? (
            <BookingListView bookings={bookings} menuSlots={menuSlots} />
          ) : viewMode === "month" ? (
            <MonthView
              days={days}
              currentDate={currentDate}
              menuSlots={menuSlots}
              handleOpenCreate={(day) => {
                resetForm(day);
                onOpen();
              }}
              handleOpenEdit={handleOpenEdit}
              handleDelete={handleDelete}
              handleMenuClick={handleMenuClick}
            />
          ) : (
            <WeekDayView
              days={days}
              menuSlots={menuSlots}
              isDragging={isDragging}
              dragStart={dragStart}
              dragEnd={dragEnd}
              movingMenu={movingMenu}
              handleMouseDownGrid={handleMouseDownGrid}
              handleMouseMoveGrid={handleMouseMoveGrid}
              handleMouseUpGrid={handleMouseUpGrid}
              handleMenuDragStart={handleMenuDragStart}
              handleMenuClick={handleMenuClick}
              handleOpenEdit={handleOpenEdit}
              handleDelete={handleDelete}
            />
          )}
        </div>
      </main>

      <BookingMenuSidePanel
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        editingMenu={editingMenu}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        color={color}
        setColor={setColor}
        startAt={startAt}
        setStartAt={setStartAt}
        endAt={endAt}
        setEndAt={setEndAt}
        maxCapacity={maxCapacity}
        setMaxCapacity={setMaxCapacity}
        repeatType={repeatType}
        setRepeatType={setRepeatType}
        repeatUntil={repeatUntil}
        setRepeatUntil={setRepeatUntil}
        repeatInterval={repeatInterval}
        setRepeatInterval={setRepeatInterval}
        repeatDaysOfWeek={repeatDaysOfWeek}
        setRepeatDaysOfWeek={setRepeatDaysOfWeek}
        daySpecificTimes={daySpecificTimes}
        setDaySpecificTimes={setDaySpecificTimes}
        isSplitMode={isSplitMode}
        setIsSplitMode={setIsSplitMode}
        menuDurationMinutes={menuDurationMinutes}
        setMenuDurationMinutes={setMenuDurationMinutes}
        gapMinutes={gapMinutes}
        setGapMinutes={setGapMinutes}
        isSubmitting={isSubmitting}
        handleSave={handleSave}
        handleDelete={handleDelete}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onOpenChange={onSettingsOpenChange}
        settings={settings}
        handleConnectGoogle={handleConnectGoogle}
        handleSetupWebhook={handleSetupWebhook}
        handleUpdateSettings={handleUpdateSettings}
      />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
