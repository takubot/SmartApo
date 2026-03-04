import { format } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * カレンダー表示用のフォーマット関数
 */
export const formatCalendarTime = (date: Date | string) => {
  return format(new Date(date), "HH:mm", { locale: ja });
};

export const formatCalendarDate = (date: Date | string) => {
  return format(new Date(date), "yyyy/MM/dd", { locale: ja });
};

export const formatCalendarFull = (date: Date | string) => {
  return format(new Date(date), "yyyy/MM/dd HH:mm", { locale: ja });
};
