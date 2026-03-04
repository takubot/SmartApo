"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  get_public_booking_menu_v2_booking_external_menu_public__menu_uuid__get,
  get_public_availability_v2_booking_external_availability_public__menu_uuid__post,
  create_booking_v2_booking_external_create_post,
} from "@repo/api-contracts/based_template/service";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardBody,
  Spinner,
} from "@heroui/react";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  isSameDay,
  isAfter,
  startOfWeek,
  addDays,
  subDays,
  eachDayOfInterval,
} from "date-fns";
import { ja } from "date-fns/locale";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";
import Image from "next/image";

// APIからの日付文字列を安全に Date に変換
const parseApiDate = (val: string | Date) => {
  if (val instanceof Date) return val;
  if (!val) return new Date();
  if (val.includes("Z") || val.includes("+")) return parseISO(val);
  return parseISO(val + "Z");
};

export default function PublicBookingPage() {
  const params = useParams();
  const menuUuid = params.menuUuid as string;

  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedMenuSlot, setSelectedMenuSlot] = useState<any | null>(null);

  const {
    data: menu,
    isLoading: isLoadingMenu,
    error: menuError,
  } = useSWR(menuUuid ? `public-menu-${menuUuid}` : null, () =>
    get_public_booking_menu_v2_booking_external_menu_public__menu_uuid__get(
      menuUuid,
    ),
  );

  // 予約枠がある最初の週を探す
  useEffect(() => {
    if (menu && menuUuid) {
      const findFirstAvailableWeek = async () => {
        const start = startOfDay(new Date());
        const end = endOfDay(addDays(start, 60)); // 最大60日先まで確認
        try {
          const slots =
            await get_public_availability_v2_booking_external_availability_public__menu_uuid__post(
              menuUuid,
              {
                menuId: menu.menuId,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                includeFull: false,
              },
            );
          if (slots && slots.length > 0) {
            const now = new Date();
            const firstSlot = slots
              .map((s: any) => ({ ...s, startDate: parseApiDate(s.startAt) }))
              .filter((s: any) => isAfter(s.startDate, now))
              .sort(
                (a: any, b: any) =>
                  a.startDate.getTime() - b.startDate.getTime(),
              )[0];

            if (firstSlot) {
              setBaseDate(firstSlot.startDate);
            }
          }
        } catch (err) {
          console.error("Failed to find first available week", err);
        }
      };
      findFirstAvailableWeek();
    }
  }, [menu, menuUuid]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // 月曜日開始
    const days = Array.from(
      eachDayOfInterval({
        start: start,
        end: addDays(start, 6),
      }),
    );
    return days;
  }, [baseDate]);

  const { data: menuSlots, isLoading: isLoadingSlots } = useSWR(
    menu && weekDays && weekDays.length > 0
      ? `booking-menu-slots-${menu.menuId}-${weekDays[0]!.toISOString()}`
      : null,
    () => {
      const start = startOfDay(weekDays[0]!);
      const end = endOfDay(weekDays[6]!);
      return get_public_availability_v2_booking_external_availability_public__menu_uuid__post(
        menuUuid,
        {
          menuId: menu!.menuId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          includeFull: false,
        },
      );
    },
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    setSelectedMenuSlot(null);
  }, [baseDate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleTimeSelect = (menuSlot: any) => {
    setSelectedMenuSlot(menuSlot);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menu || !selectedMenuSlot) return;

    setIsSubmitting(true);
    try {
      await create_booking_v2_booking_external_create_post({
        menuId: menu.menuId,
        startAt: selectedMenuSlot.startAt,
        externalUserId: `guest-${Date.now()}`,
        guestName: name,
        guestEmail: email,
        guestPhone: phone,
        memo: `会社名: ${company}\nメッセージ: ${message}`,
        frontDomainUrl: window.location.origin,
      });
      showSuccessToast("予約が完了しました");
      setIsCompleted(true);
    } catch (err) {
      handleErrorWithUI(err, "予約の送信");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Spinner size="lg" label="読み込み中..." />
      </div>
    );
  }

  if (menuError || !menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <Card className="max-w-md w-full shadow-lg border-0">
          <CardBody className="text-center p-12">
            <div className="bg-danger-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={32} className="text-danger" />
            </div>
            <h1 className="text-2xl font-bold text-default-900 mb-4">エラー</h1>
            <p className="text-default-500 leading-relaxed">
              予約メニューが見つからないか、期限切れの可能性があります。
              <br />
              URLが正しいかご確認ください。
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardBody className="text-center p-12 space-y-8">
            <div className="flex justify-center">
              <div className="bg-success-50 w-20 h-20 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={48} className="text-success" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-default-900">予約完了</h1>
              <p className="text-default-500 text-lg">
                予約が正常に受け付けられました。
                <br />
                確認メールをお送りしましたので、内容をご確認ください。
              </p>
            </div>
            <Button
              color="primary"
              size="lg"
              variant="flat"
              onPress={() => window.close()}
              className="w-full font-bold h-14 text-lg"
            >
              画面を閉じる
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden font-sans antialiased text-gray-900">
      {/* Header - Compact */}
      <header className="h-14 bg-white border-b border-gray-100 flex-shrink-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src={
                "/themeIcon/" +
                (process.env.NEXT_PUBLIC_LOGO_IMG_URL || "doppel_logo.png")
              }
              alt="logo"
              width={90}
              height={28}
              style={{ width: "auto", height: "24px" }}
              priority
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Info & Calendar - Persistent 2-column layout */}
        <div className="flex flex-col border-r border-gray-100 bg-white w-[40%] lg:w-[45%] xl:w-[40%]">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Menu Info - Fixed size for 2-column layout */}
            <div className="p-4 sm:p-8 pb-4 space-y-4 flex-shrink-0">
              <div className="space-y-1">
                <h2 className="font-black tracking-tight text-gray-900 leading-none truncate text-xl sm:text-2xl">
                  {menu.title}
                </h2>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-gray-400">
                    <Clock size={12} className="text-primary" />
                    <span>{menu.durationMinutes}分</span>
                  </div>
                </div>
              </div>
              {menu.description && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {menu.description}
                </p>
              )}
            </div>

            {/* Calendar Section */}
            <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-6 pt-0">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 sm:gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span>Select Date</span>
                </h3>
                <div className="flex items-center gap-1 bg-gray-50 p-0.5 sm:p-1 rounded-lg border border-gray-100">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => setBaseDate(subDays(baseDate, 7))}
                    isDisabled={
                      weekDays &&
                      weekDays.length > 0 &&
                      weekDays[0]!.getTime() <=
                        startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
                    }
                    className="rounded-md h-6 w-6 sm:h-8 sm:w-8"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="font-bold text-gray-700 text-[9px] sm:text-[11px] px-1 sm:px-2 min-w-[50px] sm:min-w-[75px] text-center">
                    {weekDays &&
                      weekDays.length > 0 &&
                      format(weekDays[0]!, "yyyy年M月")}
                  </span>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => setBaseDate(addDays(baseDate, 7))}
                    className="rounded-md h-6 w-6 sm:h-8 sm:w-8"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 bg-gray-50/50 rounded-2xl sm:rounded-3xl border border-gray-100 flex flex-col overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-white flex-shrink-0">
                  {weekDays &&
                    weekDays.map((day, i) => (
                      <div
                        key={i}
                        className={`py-2 sm:py-3 text-center border-r border-gray-100 last:border-0 ${
                          isSameDay(day, new Date()) ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                          {format(day, "eee", { locale: ja })}
                        </div>
                        <div
                          className={`text-xs sm:text-sm font-black ${
                            isSameDay(day, new Date())
                              ? "text-primary"
                              : "text-gray-900"
                          }`}
                        >
                          {format(day, "d")}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto divide-x divide-gray-100 scrollbar-hide">
                  <div className="grid grid-cols-7 min-h-full divide-x divide-gray-100 bg-white/50">
                    {isLoadingSlots ? (
                      <div className="col-span-7 flex items-center justify-center py-20">
                        <Spinner color="primary" size="sm" />
                      </div>
                    ) : (
                      weekDays &&
                      weekDays.map((day, i) => {
                        const daySlots =
                          menuSlots
                            ?.filter((s: any) =>
                              isSameDay(parseApiDate(s.startAt), day),
                            )
                            .sort(
                              (a: any, b: any) =>
                                new Date(a.startAt).getTime() -
                                new Date(b.startAt).getTime(),
                            ) || [];

                        return (
                          <div
                            key={i}
                            className="p-1 sm:p-1.5 space-y-1 sm:space-y-1.5"
                          >
                            {daySlots.length > 0 ? (
                              daySlots.map((s: any, idx: number) => {
                                const startTime = parseApiDate(s.startAt);
                                const isSelected =
                                  selectedMenuSlot?.startAt === s.startAt;
                                const isPast = isAfter(new Date(), startTime);

                                if (isPast) return null;

                                return (
                                  <Button
                                    key={idx}
                                    size="sm"
                                    onPress={() => handleTimeSelect(s)}
                                    className={`w-full font-bold h-7 sm:h-9 text-[9px] sm:text-[11px] rounded-lg sm:rounded-xl transition-all border-2 ${
                                      isSelected
                                        ? "bg-primary text-white border-primary shadow-md scale-[1.05] z-10"
                                        : "bg-white text-gray-600 border-gray-100 hover:border-primary/30 hover:bg-primary/5"
                                    }`}
                                  >
                                    {format(startTime, "HH:mm")}
                                  </Button>
                                );
                              })
                            ) : (
                              <div className="text-center py-4 sm:py-6">
                                <span className="text-[8px] sm:text-[10px] font-bold text-gray-200">
                                  -
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form - Persistent 2-column layout */}
        <div
          className={`flex-1 bg-white overflow-hidden flex flex-col transition-all duration-500`}
        >
          {selectedMenuSlot ? (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 xl:p-10">
                <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-success shrink-0 shadow-sm border border-success-100">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                        ご予約情報の入力
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] sm:text-xs font-bold text-primary bg-primary/5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-primary/10">
                          {format(
                            parseApiDate(selectedMenuSlot.startAt),
                            "yyyy年M月d日 (eeee) HH:mm",
                            { locale: ja },
                          )}
                          〜
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        isRequired
                        label="お名前"
                        placeholder="氏名を入力してください"
                        value={name}
                        onValueChange={setName}
                        variant="underlined"
                        classNames={{
                          input: "text-xs sm:text-sm font-bold",
                          label:
                            "font-black text-gray-400 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase",
                        }}
                      />
                      <Input
                        isRequired
                        type="email"
                        label="メールアドレス"
                        placeholder="example@email.com"
                        value={email}
                        onValueChange={setEmail}
                        variant="underlined"
                        classNames={{
                          input: "text-xs sm:text-sm font-bold",
                          label:
                            "font-black text-gray-400 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase",
                        }}
                      />
                      <Input
                        type="tel"
                        label="電話番号"
                        placeholder="090-0000-0000"
                        value={phone}
                        onValueChange={setPhone}
                        variant="underlined"
                        classNames={{
                          input: "text-xs sm:text-sm font-bold",
                          label:
                            "font-black text-gray-400 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase",
                        }}
                      />
                      <Input
                        label="会社名"
                        placeholder="会社名・所属を入力してください"
                        value={company}
                        onValueChange={setCompany}
                        variant="underlined"
                        classNames={{
                          input: "text-xs sm:text-sm font-bold",
                          label:
                            "font-black text-gray-400 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase",
                        }}
                      />
                      <Textarea
                        label="メッセージ"
                        placeholder="ご質問やご要望があれば入力してください"
                        value={message}
                        onValueChange={setMessage}
                        variant="underlined"
                        minRows={2}
                        classNames={{
                          input: "text-xs sm:text-sm font-bold",
                          label:
                            "font-black text-gray-400 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase",
                        }}
                      />
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        color="primary"
                        size="lg"
                        className="w-full font-black text-white h-10 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] bg-primary"
                        isLoading={isSubmitting}
                      >
                        予約を確定する
                      </Button>
                      <p className="text-center mt-4 text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                        確定後、確認メールが自動送信されます
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30 p-20 text-center animate-in fade-in duration-700">
              <div className="max-w-xs space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mx-auto border border-gray-50">
                    <Clock size={40} className="text-primary animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">
                    日時を選択してください
                  </h4>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    左側のカレンダーからご希望の日時を選択すると、こちらに予約フォームが表示されます。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          height: 100%;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        body {
          background-color: #f8fafc !important;
          overscroll-behavior-y: none;
        }
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
