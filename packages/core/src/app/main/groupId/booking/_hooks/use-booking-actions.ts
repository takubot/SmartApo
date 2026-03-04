import { useState, useEffect } from "react";
import { format, addMinutes, parseISO, parse } from "date-fns";
import {
  create_booking_menu_v2_booking_menu_create__group_id__post,
  update_booking_menu_v2_booking_menu_update_patch,
  delete_booking_menu_v2_booking_menu_delete__menu_id__delete,
  update_booking_settings_v2_booking_settings__group_id__patch,
  get_oauth_url_v2_booking_oauth_url__group_id__get,
  oauth_callback_v2_booking_oauth_callback_post,
  setup_webhook_v2_booking_webhook_setup__group_id__post,
  set_schedules_v2_booking_schedule_set__group_id__post,
} from "@repo/api-contracts/based_template/service";
import {
  showSuccessToast,
  handleErrorWithUI,
  showLoadingToast,
} from "@common/errorHandler";
import { useSearchParams, useRouter } from "next/navigation";

// UIの datetime-local (yyyy-MM-ddTHH:mm) を Date オブジェクトに変換
const parseUiDateTime = (str: string) => {
  return parse(str, "yyyy-MM-dd'T'HH:mm", new Date());
};

// APIからの日付文字列（またはUIからの日付文字列）を安全に Date に変換
const ensureDate = (val: string | Date | undefined | null) => {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (val.includes("Z") || val.includes("+")) return parseISO(val);
  if (val.length <= 16) {
    return parseUiDateTime(val);
  }
  return parseISO(val);
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
};

const validateSplitTimeRange = (
  label: string,
  startTime: string,
  endTime: string,
  durationMinutes: number,
) => {
  if (!startTime || !endTime) {
    throw new Error(`${label}の開始/終了時刻を入力してください。`);
  }
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) {
    throw new Error(`${label}の終了時刻は開始時刻より後に設定してください。`);
  }
  if (start % 15 !== 0 || end % 15 !== 0) {
    throw new Error(`${label}は15分単位で指定してください。`);
  }
  if (end - start < durationMinutes) {
    throw new Error(
      `${label}の時間幅は少なくとも${durationMinutes}分必要です。`,
    );
  }
};

export function useBookingActions(
  groupId: string | null,
  mutateMenus: () => void,
  mutateSettings: () => void,
  mutateMenuSlots: () => void,
  menus: any[] | undefined,
  schedules: any[] | undefined,
) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOauthProcessing, setIsOauthProcessing] = useState(false);

  // 予約メニュー編集用の状態
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("1");
  const [repeatType, setRepeatType] = useState<"none" | "weekly">("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>([]);
  const [daySpecificTimes, setDaySpecificTimes] = useState<{
    [key: number]: { start: string; end: string };
  }>({});

  // 分割作成用の状態 (メニュー設定として扱う)
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [menuDurationMinutes, setMenuDurationMinutes] = useState(60);
  const [gapMinutes, setGapMinutes] = useState(0);

  const handleOAuthCallback = async (code: string) => {
    setIsOauthProcessing(true);
    showLoadingToast("カレンダー連携を完了しています...");
    try {
      await oauth_callback_v2_booking_oauth_callback_post({
        groupId: groupId!,
        code,
        redirectUri: window.location.origin + window.location.pathname,
      });
      showSuccessToast("カレンダーと連携しました");
      mutateSettings();
      router.replace(window.location.pathname);
    } catch (error) {
      handleErrorWithUI(error, "カレンダー連携");
    } finally {
      setIsOauthProcessing(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state === groupId && !isOauthProcessing) {
      handleOAuthCallback(code);
    }
  }, [searchParams, groupId]);

  const handleConnectGoogle = async () => {
    try {
      const { authUrl } =
        await get_oauth_url_v2_booking_oauth_url__group_id__get(groupId!);
      window.location.href = authUrl;
    } catch (error) {
      handleErrorWithUI(error, "認証URL取得");
    }
  };

  const handleSetupWebhook = async () => {
    showLoadingToast("リアルタイム同期を設定中...");
    try {
      await setup_webhook_v2_booking_webhook_setup__group_id__post(groupId!);
      showSuccessToast("リアルタイム同期を有効にしました");
      mutateSettings();
    } catch (error) {
      handleErrorWithUI(error, "同期設定");
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      await update_booking_settings_v2_booking_settings__group_id__patch(
        groupId!,
        newSettings,
      );
      showSuccessToast("設定を更新しました");
      mutateSettings();
    } catch (error) {
      handleErrorWithUI(error, "設定更新");
    }
  };

  const resetForm = (start?: Date, end?: Date) => {
    setEditingMenu(null);
    setTitle("");
    setDescription("");
    setColor("#3b82f6");
    setMaxCapacity("1");
    setRepeatType("none");
    setRepeatUntil("");
    setRepeatInterval(1);
    setRepeatDaysOfWeek([]);
    setDaySpecificTimes({});
    setIsSplitMode(false);
    setMenuDurationMinutes(60);
    setGapMinutes(0);

    if (start) {
      setStartAt(format(start, "yyyy-MM-dd'T'HH:mm"));
      if (end) {
        setEndAt(format(end, "yyyy-MM-dd'T'HH:mm"));
      } else {
        setEndAt(format(addMinutes(start, 60), "yyyy-MM-dd'T'HH:mm"));
      }
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      setStartAt(format(now, "yyyy-MM-dd'T'HH:mm"));
      setEndAt(format(addMinutes(now, 60), "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const handleOpenEdit = (menu: any) => {
    setEditingMenu(menu);
    setTitle(menu.title || "");
    setDescription(menu.description || "");
    setColor(menu.color || "#3b82f6");
    setMaxCapacity(String(menu.maxCapacity));
    setMenuDurationMinutes(menu.durationMinutes || 60);
    setGapMinutes(menu.bufferAfterMinutes || 0);

    // スケジュールの復元
    const targetMenuId = Number(menu.menuId);
    const menuSchedules = (schedules || []).filter(
      (s: any) => Number(s.menuId) === targetMenuId,
    );
    if (menuSchedules.length > 0) {
      setRepeatType("weekly");
      const days = Array.from(
        new Set(menuSchedules.map((s: any) => s.dayOfWeek)),
      );
      setRepeatDaysOfWeek(days.sort());
      const dayTimeMap: { [key: number]: { start: string; end: string } } = {};
      menuSchedules.forEach((s: any) => {
        const startTime =
          typeof s.startTime === "string"
            ? s.startTime.substring(0, 5)
            : format(new Date(`2000-01-01T${s.startTime}`), "HH:mm");
        const endTime =
          typeof s.endTime === "string"
            ? s.endTime.substring(0, 5)
            : format(new Date(`2000-01-01T${s.endTime}`), "HH:mm");
        if (!dayTimeMap[s.dayOfWeek]) {
          dayTimeMap[s.dayOfWeek] = { start: startTime, end: endTime };
        }
      });
      setDaySpecificTimes(dayTimeMap);

      const firstSchedule =
        menuSchedules.find((s: any) => s.dayOfWeek === days[0]) ||
        menuSchedules[0];
      const startTime =
        typeof firstSchedule.startTime === "string"
          ? firstSchedule.startTime.substring(0, 5)
          : format(new Date(`2000-01-01T${firstSchedule.startTime}`), "HH:mm");
      const endTime =
        typeof firstSchedule.endTime === "string"
          ? firstSchedule.endTime.substring(0, 5)
          : format(new Date(`2000-01-01T${firstSchedule.endTime}`), "HH:mm");
      const baseDate =
        startAt && startAt.includes("T")
          ? startAt.split("T")[0]
          : format(new Date(), "yyyy-MM-dd");
      setStartAt(`${baseDate}T${startTime}`);
      setEndAt(`${baseDate}T${endTime}`);
    } else {
      setRepeatType("none");
      setRepeatDaysOfWeek([]);
      setDaySpecificTimes({});
    }
  };

  const handleSave = async (
    customPayload?: any,
    options?: { onClose?: () => void },
  ) => {
    setIsSubmitting(true);
    const isUpdate = !!(editingMenu || customPayload?.menuId);
    if (!customPayload) showLoadingToast(isUpdate ? "更新中..." : "作成中...");

    try {
      const splitUnit = Math.max(1, menuDurationMinutes || 60);
      const baseStartTime = startAt.includes("T")
        ? startAt.split("T")[1].substring(0, 5)
        : "";
      const baseEndTime = endAt.includes("T")
        ? endAt.split("T")[1].substring(0, 5)
        : "";

      if (
        isSplitMode &&
        repeatType === "weekly" &&
        repeatDaysOfWeek.length > 0
      ) {
        repeatDaysOfWeek.forEach((day) => {
          const dayStart = daySpecificTimes[day]?.start || baseStartTime;
          const dayEnd = daySpecificTimes[day]?.end || baseEndTime;
          const dayLabel =
            ["日", "月", "火", "水", "木", "金", "土"][day] ?? "曜日";
          validateSplitTimeRange(
            `${dayLabel}曜日`,
            dayStart,
            dayEnd,
            splitUnit,
          );
        });
      }

      const payload = {
        title: customPayload?.title ?? title,
        description: customPayload?.description ?? description,
        color: customPayload?.color ?? color,
        maxCapacity: customPayload?.maxCapacity ?? (parseInt(maxCapacity) || 1),
        durationMinutes: menuDurationMinutes || 60,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: gapMinutes || 0,
        isActive: true,
      };

      let menuId = editingMenu?.menuId || customPayload?.menuId;

      if (menuId) {
        await update_booking_menu_v2_booking_menu_update_patch({
          menuId: menuId,
          ...payload,
        });
      } else {
        const response =
          (await create_booking_menu_v2_booking_menu_create__group_id__post(
            groupId!,
            payload,
          )) as any;
        menuId = response.menuId;
      }

      // 繰り返し設定（スケジュール）の保存
      if (repeatType === "weekly" && repeatDaysOfWeek.length > 0) {
        if (!baseStartTime || !baseEndTime) {
          throw new Error("繰り返し設定には開始・終了時刻が必要です。");
        }

        const scheduleRequests = repeatDaysOfWeek.map((day) => ({
          menuId: menuId,
          dayOfWeek: day,
          startTime: daySpecificTimes[day]?.start || baseStartTime,
          endTime: daySpecificTimes[day]?.end || baseEndTime,
        }));

        if (scheduleRequests.length > 0) {
          await set_schedules_v2_booking_schedule_set__group_id__post(
            groupId!,
            {
              menuId: menuId,
              schedules: scheduleRequests,
            },
          );
        }
      }

      if (!customPayload)
        showSuccessToast(
          isUpdate ? "面談設定を更新しました" : "面談設定を作成しました",
        );

      mutateMenus();
      mutateMenuSlots();
      if (!customPayload && options?.onClose) options.onClose();
    } catch (error) {
      handleErrorWithUI(error, "面談設定保存");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この面談設定を削除してもよろしいですか？")) return;
    try {
      await delete_booking_menu_v2_booking_menu_delete__menu_id__delete(
        String(id),
      );
      showSuccessToast("面談設定を削除しました");
      mutateMenus();
      mutateMenuSlots();
    } catch (error) {
      handleErrorWithUI(error, "面談設定削除");
    }
  };

  return {
    isSubmitting,
    isOauthProcessing,
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
    handleOpenEdit,
    resetForm,
  };
}
