import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Input,
  Textarea,
  Checkbox,
  Divider,
  ScrollShadow,
} from "@heroui/react";
import {
  Trash2,
  Users,
  Clock,
  Repeat,
  RotateCcw,
  Wand2,
  Calendar,
  Palette,
} from "lucide-react";

interface BookingMenuSidePanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingMenu: {
    menuId: number;
    title?: string;
    description?: string;
    color?: string;
    startAt: string;
    endAt: string;
    maxCapacity: number;
    seriesId?: string;
  } | null;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  color: string;
  setColor: (val: string) => void;
  startAt: string;
  setStartAt: (val: string) => void;
  endAt: string;
  setEndAt: (val: string) => void;
  maxCapacity: string;
  setMaxCapacity: (val: string) => void;
  repeatType: "none" | "weekly";
  setRepeatType: (val: "none" | "weekly") => void;
  repeatUntil: string;
  setRepeatUntil: (val: string) => void;
  repeatInterval: number;
  setRepeatInterval: (val: number) => void;
  repeatDaysOfWeek: number[];
  setRepeatDaysOfWeek: (val: number[]) => void;
  daySpecificTimes: { [key: number]: { start: string; end: string } };
  setDaySpecificTimes: (val: {
    [key: number]: { start: string; end: string };
  }) => void;
  isSplitMode: boolean;
  setIsSplitMode: (val: boolean) => void;
  menuDurationMinutes: number;
  setMenuDurationMinutes: (val: number) => void;
  gapMinutes: number;
  setGapMinutes: (val: number) => void;
  isSubmitting: boolean;
  handleSave: (
    payload?: {
      menuId?: number;
      title?: string;
      description?: string;
      color?: string;
      startAt?: string;
      endAt?: string;
      maxCapacity?: number;
    },
    options?: { onClose?: () => void },
  ) => void;
  handleDelete: (id: number) => void;
}

export function BookingMenuSidePanel({
  isOpen,
  onOpenChange,
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
  isSubmitting,
  handleSave,
  handleDelete,
}: BookingMenuSidePanelProps) {
  const toggleDayOfWeek = (day: number) => {
    if (repeatDaysOfWeek.includes(day)) {
      setRepeatDaysOfWeek(repeatDaysOfWeek.filter((d) => d !== day));
      const next = { ...daySpecificTimes };
      delete next[day];
      setDaySpecificTimes(next);
    } else {
      setRepeatDaysOfWeek([...repeatDaysOfWeek, day].sort());
      setDaySpecificTimes({
        ...daySpecificTimes,
        [day]: {
          start: baseStartTime !== "--:--" ? baseStartTime : "09:00",
          end: baseEndTime !== "--:--" ? baseEndTime : "18:00",
        },
      });
    }
  };

  const updateDayTime = (
    day: number,
    field: "start" | "end",
    value: string,
  ) => {
    setDaySpecificTimes({
      ...daySpecificTimes,
      [day]: {
        start: daySpecificTimes[day]?.start || baseStartTime || "09:00",
        end: daySpecificTimes[day]?.end || baseEndTime || "18:00",
        [field]: value,
      },
    });
  };

  const daysOfWeek = [
    { label: "日", value: 0 },
    { label: "月", value: 1 },
    { label: "火", value: 2 },
    { label: "水", value: 3 },
    { label: "木", value: 4 },
    { label: "金", value: 5 },
    { label: "土", value: 6 },
  ];
  const baseStartTime = startAt.includes("T")
    ? startAt.split("T")[1]?.substring(0, 5)
    : "--:--";
  const baseEndTime = endAt.includes("T")
    ? endAt.split("T")[1]?.substring(0, 5)
    : "--:--";
  const timeInputStepSeconds = 900;
  const toDateTimeLocal = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const applyDurationToBaseEnd = () => {
    if (!startAt || !startAt.includes("T")) return;
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(
      start.getTime() + Math.max(1, menuDurationMinutes) * 60 * 1000,
    );
    setEndAt(toDateTimeLocal(end));
  };
  const applyDurationToDayEnd = (day: number) => {
    const current = daySpecificTimes[day];
    if (!current?.start) return;
    const [h, m] = current.start.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const startMinutes = h * 60 + m;
    const nextMinutes = startMinutes + Math.max(1, menuDurationMinutes);
    if (nextMinutes >= 24 * 60) return;
    const endH = String(Math.floor(nextMinutes / 60)).padStart(2, "0");
    const endM = String(nextMinutes % 60).padStart(2, "0");
    updateDayTime(day, "end", `${endH}:${endM}`);
  };
  const applyBaseTimeToAllDays = () => {
    const next: { [key: number]: { start: string; end: string } } = {};
    repeatDaysOfWeek.forEach((day) => {
      next[day] = {
        start: baseStartTime !== "--:--" ? baseStartTime : "09:00",
        end: baseEndTime !== "--:--" ? baseEndTime : "18:00",
      };
    });
    setDaySpecificTimes(next);
  };

  const SectionTitle = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: any;
    title: string;
    children?: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary-100 text-primary rounded-lg">
          <Icon size={16} />
        </div>
        <span className="font-bold text-default-800 text-sm">{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="right"
      size="md"
      backdrop="opaque"
      hideCloseButton={false}
      classNames={{
        base: "bg-white h-screen overflow-x-hidden",
        header: "border-b border-divider px-6 py-4",
        body: "p-0 overflow-x-hidden",
        footer: "border-t border-divider px-6 py-4 bg-default-50",
        closeButton:
          "top-4 right-4 text-default-400 hover:text-default-900 transition-colors z-50",
      }}
    >
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader>
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shadow-inner"
                  style={{ backgroundColor: color }}
                ></div>
                <h2 className="text-xl font-bold text-default-900 leading-tight">
                  {editingMenu ? "予定を編集" : "新しい予定を作成"}
                </h2>
              </div>
            </DrawerHeader>
            <DrawerBody>
              <ScrollShadow className="h-full px-6 py-6 scrollbar-hide overflow-x-hidden">
                <div className="space-y-8 pb-10">
                  {/* タイトルセクション */}
                  <div>
                    <Input
                      label="予定のタイトル"
                      placeholder="例: 個別面談、オリエンテーションなど"
                      value={title}
                      onValueChange={setTitle}
                      variant="flat"
                      labelPlacement="outside"
                      classNames={{
                        inputWrapper:
                          "bg-default-100 hover:bg-default-200 border-none h-14 transition-colors",
                        label: "text-default-700 font-bold text-sm mb-2",
                        input: "text-lg font-medium",
                      }}
                    />
                  </div>

                  {/* 日時セクション */}
                  <div className="bg-default-50 p-5 rounded-2xl border border-divider/50">
                    <SectionTitle icon={Calendar} title="日程と時間" />
                    <div className="grid grid-cols-1 gap-5">
                      <Input
                        label="開始"
                        type="datetime-local"
                        step={timeInputStepSeconds}
                        value={startAt}
                        onValueChange={setStartAt}
                        variant="flat"
                        labelPlacement="outside"
                        classNames={{
                          inputWrapper:
                            "bg-white shadow-sm border border-divider h-auto min-h-12 py-2",
                          label: "text-default-700 font-bold mb-2 text-xs",
                        }}
                      />
                      <Input
                        label="終了"
                        type="datetime-local"
                        step={timeInputStepSeconds}
                        value={endAt}
                        onValueChange={setEndAt}
                        variant="flat"
                        labelPlacement="outside"
                        classNames={{
                          inputWrapper:
                            "bg-white shadow-sm border border-divider h-auto min-h-12 py-2",
                          label: "text-default-700 font-bold mb-2 text-xs",
                        }}
                      />
                      {isSplitMode && (
                        <Button
                          size="sm"
                          variant="light"
                          color="primary"
                          startContent={<Wand2 size={12} />}
                          className="w-fit text-[11px] font-bold"
                          onPress={applyDurationToBaseEnd}
                        >
                          終了を「開始 + {menuDurationMinutes}分」に合わせる
                        </Button>
                      )}
                    </div>
                    {isSplitMode && (
                      <p className="text-[11px] text-default-500">
                        15分刻みで入力できます。{menuDurationMinutes}
                        分に満たない時間幅は不可ですが、端数は自動で切り捨てて枠を作成します。
                      </p>
                    )}
                  </div>

                  {/* 分割設定セクション */}
                  <div
                    className={`p-5 rounded-2xl border transition-all ${isSplitMode ? "bg-primary-50 border-primary-200 ring-1 ring-primary-100 shadow-sm" : "bg-default-50 border-divider/50"}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${isSplitMode ? "bg-primary text-white" : "bg-default-200 text-default-500"}`}
                        >
                          <Clock size={16} />
                        </div>
                        <span
                          className={`font-bold text-sm ${isSplitMode ? "text-primary-900" : "text-default-800"}`}
                        >
                          枠の自動分割
                        </span>
                      </div>
                      <Checkbox
                        isSelected={isSplitMode}
                        onValueChange={setIsSplitMode}
                        size="md"
                        color="primary"
                      />
                    </div>

                    {isSplitMode && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Input
                          label="1枠の長さ"
                          type="number"
                          step={15}
                          value={String(menuDurationMinutes)}
                          onValueChange={(v) =>
                            setMenuDurationMinutes(parseInt(v) || 1)
                          }
                          variant="flat"
                          size="sm"
                          labelPlacement="outside"
                          endContent={
                            <span className="text-[10px] text-default-400 font-bold">
                              分
                            </span>
                          }
                          classNames={{
                            inputWrapper: "bg-white",
                            label: "text-default-500 font-medium",
                          }}
                        />
                        <Input
                          label="間の休憩"
                          type="number"
                          step={5}
                          value={String(gapMinutes)}
                          onValueChange={(v) => setGapMinutes(parseInt(v) || 0)}
                          variant="flat"
                          size="sm"
                          labelPlacement="outside"
                          endContent={
                            <span className="text-[10px] text-default-400 font-bold">
                              分
                            </span>
                          }
                          classNames={{
                            inputWrapper: "bg-white",
                            label: "text-default-500 font-medium",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <Divider />

                  {/* 繰り返しセクション */}
                  <div className="space-y-6">
                    <SectionTitle icon={Repeat} title="繰り返しの設定" />

                    <div className="flex gap-1 bg-default-100 p-1 rounded-xl w-full">
                      {(["none", "weekly"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setRepeatType(type)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            repeatType === type
                              ? "bg-white text-primary shadow-sm scale-[1.02]"
                              : "text-default-500 hover:text-default-700"
                          }`}
                        >
                          {type === "none" ? "なし" : "毎週"}
                        </button>
                      ))}
                    </div>

                    {repeatType !== "none" && (
                      <div className="space-y-6 p-5 bg-default-50 rounded-2xl border border-divider/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="繰り返しの間隔"
                            type="number"
                            min={1}
                            value={String(repeatInterval)}
                            onValueChange={(v) =>
                              setRepeatInterval(parseInt(v) || 1)
                            }
                            variant="flat"
                            size="sm"
                            labelPlacement="outside"
                            endContent={
                              <span className="text-[10px] text-default-400 font-bold">
                                週ごと
                              </span>
                            }
                            classNames={{
                              inputWrapper: "bg-white",
                              label: "text-default-500 font-medium",
                            }}
                          />
                          <Input
                            label="終了日"
                            type="date"
                            value={repeatUntil}
                            onValueChange={setRepeatUntil}
                            variant="flat"
                            size="sm"
                            labelPlacement="outside"
                            placeholder="無制限"
                            classNames={{
                              inputWrapper: "bg-white",
                              label: "text-default-500 font-medium",
                            }}
                          />
                        </div>

                        {repeatType === "weekly" && (
                          <div className="space-y-4">
                            <span className="text-[11px] text-default-500 font-bold uppercase tracking-wider block">
                              曜日と時間（曜日ごとに変更可）
                            </span>
                            <div className="flex justify-between">
                              {daysOfWeek.map((day) => (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleDayOfWeek(day.value)}
                                  className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                                    repeatDaysOfWeek.includes(day.value)
                                      ? "bg-primary text-white shadow-md scale-110"
                                      : "bg-white text-default-600 hover:bg-default-100 border border-divider"
                                  }`}
                                >
                                  {day.label}
                                </button>
                              ))}
                            </div>
                            {repeatDaysOfWeek.length > 0 && (
                              <>
                                <div className="p-3 bg-white rounded-xl border border-divider/50 text-[12px] text-default-600 flex items-center justify-between gap-2">
                                  <span>
                                    基準時刻:
                                    <span className="font-bold text-default-800 mx-1">
                                      {baseStartTime} - {baseEndTime}
                                    </span>
                                    （必要な曜日だけ下で上書き）
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="primary"
                                    startContent={<RotateCcw size={12} />}
                                    className="text-[11px] font-bold"
                                    onClick={applyBaseTimeToAllDays}
                                  >
                                    全曜日に反映
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {repeatDaysOfWeek.map((dayValue) => {
                                    const dayLabel = daysOfWeek.find(
                                      (d) => d.value === dayValue,
                                    )?.label;
                                    const current = daySpecificTimes[
                                      dayValue
                                    ] || {
                                      start:
                                        baseStartTime !== "--:--"
                                          ? baseStartTime
                                          : "09:00",
                                      end:
                                        baseEndTime !== "--:--"
                                          ? baseEndTime
                                          : "18:00",
                                    };
                                    return (
                                      <div
                                        key={dayValue}
                                        className="p-3 bg-white rounded-xl border border-divider/50 flex items-center gap-3"
                                      >
                                        <div className="w-12 text-xs font-bold text-default-700 shrink-0">
                                          {dayLabel}曜日
                                        </div>
                                        <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-1">
                                          <Input
                                            type="time"
                                            size="sm"
                                            step={timeInputStepSeconds}
                                            value={current.start}
                                            onValueChange={(v) =>
                                              updateDayTime(
                                                dayValue,
                                                "start",
                                                v,
                                              )
                                            }
                                            classNames={{
                                              inputWrapper:
                                                "bg-default-50 h-8 text-[11px] min-h-0",
                                              input: "p-0 text-center",
                                            }}
                                          />
                                          <span className="text-default-400 text-[10px]">
                                            〜
                                          </span>
                                          <Input
                                            type="time"
                                            size="sm"
                                            step={timeInputStepSeconds}
                                            value={current.end}
                                            onValueChange={(v) =>
                                              updateDayTime(dayValue, "end", v)
                                            }
                                            classNames={{
                                              inputWrapper:
                                                "bg-default-50 h-8 text-[11px] min-h-0",
                                              input: "p-0 text-center",
                                            }}
                                          />
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="light"
                                          color="primary"
                                          className="text-[10px] font-bold min-w-0 px-2"
                                          onPress={() =>
                                            applyDurationToDayEnd(dayValue)
                                          }
                                        >
                                          +{menuDurationMinutes}分
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Divider />

                  {/* その他の設定 */}
                  <div className="grid grid-cols-1 gap-8">
                    <Input
                      label="最大定員"
                      type="number"
                      value={maxCapacity}
                      onValueChange={setMaxCapacity}
                      variant="flat"
                      labelPlacement="outside"
                      startContent={
                        <Users size={18} className="text-default-400" />
                      }
                      classNames={{
                        inputWrapper:
                          "bg-default-100 hover:bg-default-200 border-none h-12 transition-colors",
                        label: "text-default-700 font-bold text-sm mb-2",
                      }}
                      endContent={
                        <span className="text-xs text-default-400 font-bold">
                          名
                        </span>
                      }
                    />

                    <div className="space-y-3">
                      <SectionTitle icon={Palette} title="表示カラー" />
                      <div className="flex gap-2.5 flex-wrap px-1">
                        {[
                          "#3b82f6",
                          "#ef4444",
                          "#10b981",
                          "#f59e0b",
                          "#8b5cf6",
                          "#ec4899",
                          "#06b6d4",
                          "#71717a",
                        ].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                              color === c
                                ? "border-white ring-2 ring-primary ring-offset-2 ring-offset-white shadow-md"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <Textarea
                      label="詳細・メモ"
                      placeholder="予定の詳細な説明や注意事項などを入力"
                      value={description}
                      onValueChange={setDescription}
                      variant="flat"
                      labelPlacement="outside"
                      minRows={4}
                      classNames={{
                        inputWrapper:
                          "bg-default-100 hover:bg-default-200 border-none p-4 transition-colors",
                        label: "text-default-700 font-bold text-sm mb-2",
                      }}
                    />
                  </div>
                </div>
              </ScrollShadow>
            </DrawerBody>
            <DrawerFooter>
              <div className="flex flex-col sm:flex-row justify-between w-full gap-3">
                {editingMenu ? (
                  <Button
                    color="danger"
                    variant="light"
                    onPress={() => {
                      handleDelete(editingMenu.menuId);
                      onClose();
                    }}
                    startContent={<Trash2 size={18} />}
                    className="font-bold min-w-[100px] w-full sm:w-auto"
                  >
                    削除
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2 flex-1 justify-end">
                  <Button
                    variant="flat"
                    onPress={onClose}
                    className="text-default-600 font-bold px-6 flex-1 sm:flex-none"
                  >
                    キャンセル
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    onPress={() => handleSave(undefined, { onClose })}
                    isLoading={isSubmitting}
                    className="font-black px-10 shadow-lg shadow-primary/20 flex-1 sm:flex-none"
                  >
                    保存
                  </Button>
                </div>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
