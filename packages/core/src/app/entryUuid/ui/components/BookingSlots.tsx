"use client";

import React from "react";
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import {
  Card,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
} from "@heroui/react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { create_booking_v2_booking_external_create_post } from "@repo/api-contracts/based_template/service";
import type { BookingMenuSlotSchemaType } from "@repo/api-contracts/based_template/zschema";

interface BookingSlotsProps {
  menuId: number;
  title?: string;
  slots: BookingMenuSlotSchemaType[];
  onSelectSlot: (slot: BookingMenuSlotSchemaType) => void;
}

const BookingSlots: React.FC<BookingSlotsProps> = ({
  menuId,
  title,
  slots,
  onSelectSlot,
}) => {
  const [selectedSlot, setSelectedSlot] =
    React.useState<BookingMenuSlotSchemaType | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(true);
  const [guestName, setGuestName] = React.useState("");
  const [guestEmail, setGuestEmail] = React.useState("");
  const [guestPhone, setGuestPhone] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const slotMapByDate = React.useMemo(() => {
    const map: Record<string, BookingMenuSlotSchemaType[]> = {};
    for (const slot of slots) {
      const key = format(parseISO(slot.startAt), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key]!.push(slot);
    }
    for (const key of Object.keys(map)) {
      map[key] = [...(map[key] || [])].sort((a, b) =>
        a.startAt.localeCompare(b.startAt),
      );
    }
    return map;
  }, [slots]);

  const initialBaseDate = React.useMemo(() => {
    if (slots.length === 0) return new Date();
    const sorted = [...slots].sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    );
    return parseISO(sorted[0]!.startAt);
  }, [slots]);

  const [weekStartDate, setWeekStartDate] = React.useState<Date>(() =>
    startOfWeek(initialBaseDate, { weekStartsOn: 1 }),
  );

  React.useEffect(() => {
    setWeekStartDate(startOfWeek(initialBaseDate, { weekStartsOn: 1 }));
  }, [initialBaseDate]);

  React.useEffect(() => {
    setIsSheetOpen(true);
  }, [menuId, slots, title]);

  const weekDates = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i)),
    [weekStartDate],
  );

  const [selectedDate, setSelectedDate] = React.useState<Date>(initialBaseDate);
  React.useEffect(() => {
    const inWeek = weekDates.some((d) => isSameDay(d, selectedDate));
    if (!inWeek) {
      const withSlot = weekDates.find((d) => {
        const key = format(d, "yyyy-MM-dd");
        return (slotMapByDate[key] || []).length > 0;
      });
      setSelectedDate(withSlot || weekDates[0] || initialBaseDate);
    }
  }, [weekDates, selectedDate, slotMapByDate, initialBaseDate]);

  const cardTitle = React.useMemo(() => {
    if (typeof title === "string" && title.trim().length > 0) {
      return title;
    }
    for (const slot of slots) {
      const rawTitle = slot?.title;
      if (typeof rawTitle === "string" && rawTitle.trim().length > 0) {
        return rawTitle;
      }
    }
    return "";
  }, [title, slots]);

  const getSlotBookingTitle = React.useCallback(
    (slot: BookingMenuSlotSchemaType) => {
      const rawTitle = slot.title ?? title;
      return typeof rawTitle === "string" && rawTitle.trim().length > 0
        ? rawTitle
        : "";
    },
    [title],
  );

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDateSlots = slotMapByDate[selectedDateKey] || [];

  const resetModal = React.useCallback(() => {
    setIsModalOpen(false);
    setSelectedSlot(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setMemo("");
    setErrorMessage(null);
    setIsSubmitting(false);
  }, []);

  const handleSelectSlot = React.useCallback(
    (slot: BookingMenuSlotSchemaType) => {
      setSelectedSlot(slot);
      setErrorMessage(null);
      setIsModalOpen(true);
    },
    [],
  );

  const getExternalUserId = React.useCallback(() => {
    if (typeof window === "undefined") return `guest_${Date.now()}`;
    const storageKey = "external_user_id";
    let externalUserId = localStorage.getItem(storageKey);
    if (!externalUserId) {
      externalUserId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(storageKey, externalUserId);
    }
    return externalUserId;
  }, []);

  const handleSubmitBooking = React.useCallback(async () => {
    if (!selectedSlot) return;
    if (!guestName.trim() || !guestEmail.trim()) {
      setErrorMessage("お名前とメールアドレスは必須です。");
      return;
    }

    const effectiveMenuId =
      selectedSlot.menuId && selectedSlot.menuId > 0
        ? selectedSlot.menuId
        : menuId;

    if (!effectiveMenuId) {
      setErrorMessage("予約メニュー情報が不足しています。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await create_booking_v2_booking_external_create_post({
        menuId: effectiveMenuId,
        startAt: selectedSlot.startAt,
        externalUserId: getExternalUserId(),
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() || undefined,
        memo: memo.trim() || undefined,
        frontDomainUrl:
          typeof window !== "undefined" ? window.location.origin : undefined,
      });
      onSelectSlot(selectedSlot);
      resetModal();
    } catch (error) {
      console.error("Failed to create booking", error);
      setErrorMessage(
        "予約の確定に失敗しました。時間をおいて再度お試しください。",
      );
      setIsSubmitting(false);
    }
  }, [
    guestEmail,
    guestName,
    guestPhone,
    memo,
    menuId,
    onSelectSlot,
    resetModal,
    selectedSlot,
    getExternalUserId,
  ]);

  if (slots.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic p-2">
        現在、予約可能な枠が見つかりませんでした。
      </div>
    );
  }

  return (
    <div className="w-full">
      {isSheetOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsSheetOpen(false)}
          />
          <Card className="relative w-full max-w-3xl rounded-t-2xl border border-blue-100 shadow-2xl">
            <CardBody className="p-0">
              <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-1.5">
                    <CalendarDays size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {cardTitle || "予約ウィジェット"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      週ごとの予約枠を選択できます
                    </p>
                  </div>
                </div>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={() => setIsSheetOpen(false)}
                >
                  <X size={16} />
                </Button>
              </div>

              <div className="px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<ChevronLeft size={14} />}
                    onPress={() =>
                      setWeekStartDate((prev) => addDays(prev, -7))
                    }
                  >
                    前週
                  </Button>
                  <p className="text-xs font-semibold text-slate-600">
                    {format(weekDates[0] || new Date(), "yyyy/MM/dd")} -{" "}
                    {format(weekDates[6] || new Date(), "yyyy/MM/dd")}
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    endContent={<ChevronRight size={14} />}
                    onPress={() => setWeekStartDate((prev) => addDays(prev, 7))}
                  >
                    次週
                  </Button>
                </div>

                <div className="mb-3 grid grid-cols-7 gap-1">
                  {weekDates.map((date) => {
                    const key = format(date, "yyyy-MM-dd");
                    const daySlots = slotMapByDate[key] || [];
                    const active = isSameDay(date, selectedDate);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`rounded-lg border px-1 py-2 text-center transition ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-[10px] font-semibold">
                          {format(date, "E", { locale: ja })}
                        </p>
                        <p
                          className={`text-sm font-bold ${
                            isToday(date) ? "text-rose-500" : ""
                          }`}
                        >
                          {format(date, "d")}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {daySlots.length}件
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                  {selectedDateSlots.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-slate-500">
                      この日は予約可能な枠がありません
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedDateSlots.map((slot, idx) => (
                        <Button
                          key={`${slot.startAt}-${idx}`}
                          size="sm"
                          variant="flat"
                          className="h-16 border border-blue-100 bg-white hover:bg-blue-50"
                          onPress={() => handleSelectSlot(slot)}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-semibold text-blue-500">
                              {getSlotBookingTitle(slot)}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {format(parseISO(slot.startAt), "HH:mm")}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              残り{slot.availableCount}枠
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Modal
        isOpen={isModalOpen}
        onClose={resetModal}
        placement="center"
        size="md"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            予約内容の入力
            {selectedSlot && (
              <span className="text-xs text-gray-500 font-medium">
                {format(
                  parseISO(selectedSlot.startAt),
                  "yyyy年M月d日(eee) HH:mm",
                  {
                    locale: ja,
                  },
                )}
              </span>
            )}
          </ModalHeader>
          <ModalBody>
            <Input
              isRequired
              label="お名前"
              placeholder="山田 太郎"
              value={guestName}
              onValueChange={setGuestName}
            />
            <Input
              isRequired
              type="email"
              label="メールアドレス"
              placeholder="example@email.com"
              value={guestEmail}
              onValueChange={setGuestEmail}
            />
            <Input
              type="tel"
              label="電話番号"
              placeholder="090-0000-0000"
              value={guestPhone}
              onValueChange={setGuestPhone}
            />
            <Textarea
              label="メモ"
              placeholder="ご要望などがあればご入力ください"
              value={memo}
              onValueChange={setMemo}
              minRows={3}
            />
            {errorMessage && (
              <p className="text-xs text-danger font-medium">{errorMessage}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={resetModal}
              isDisabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              color="primary"
              onPress={handleSubmitBooking}
              isLoading={isSubmitting}
            >
              予約を確定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default BookingSlots;
