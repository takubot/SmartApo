import useSWR from "swr";
import {
  list_booking_menus_v2_booking_menu_list__group_id__get,
  list_booking_schedules_v2_booking_schedule_list__group_id__get,
  list_booking_blocks_v2_booking_block_list__group_id__get,
  get_booking_settings_v2_booking_settings__group_id__get,
  list_group_bookings_v2_booking_list_group__group_id__get,
  get_availability_v2_booking_availability_post,
} from "@repo/api-contracts/based_template/service";
import { format } from "date-fns";

const formatApiDateTime = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");

export function useBookingData(
  groupId: string | null,
  dateRange?: { start: Date; end: Date },
) {
  const {
    data: menus,
    isLoading: isMenusLoading,
    mutate: mutateMenus,
  } = useSWR(groupId ? `booking-menus-${groupId}` : null, () =>
    list_booking_menus_v2_booking_menu_list__group_id__get(groupId!),
  );

  const {
    data: schedules,
    isLoading: isSchedulesLoading,
    mutate: mutateSchedules,
  } = useSWR(groupId ? `booking-schedules-${groupId}` : null, () =>
    list_booking_schedules_v2_booking_schedule_list__group_id__get(groupId!),
  );

  const {
    data: blocks,
    isLoading: isBlocksLoading,
    mutate: mutateBlocks,
  } = useSWR(groupId ? `booking-blocks-${groupId}` : null, () =>
    list_booking_blocks_v2_booking_block_list__group_id__get(groupId!),
  );

  const {
    data: bookings,
    isLoading: isBookingsLoading,
    mutate: mutateBookings,
  } = useSWR(groupId ? `group-bookings-${groupId}` : null, () =>
    list_group_bookings_v2_booking_list_group__group_id__get(groupId!),
  );

  const {
    data: settings,
    isLoading: isSettingsLoading,
    mutate: mutateSettings,
  } = useSWR(groupId ? `booking-settings-${groupId}` : null, () =>
    get_booking_settings_v2_booking_settings__group_id__get(groupId!),
  );

  // 予約メニュー（計算済みスロット）の取得
  const {
    data: menuSlots,
    isLoading: isMenuSlotsLoading,
    mutate: mutateMenuSlots,
  } = useSWR(
    groupId && dateRange
      ? `booking-menu-slots-${groupId}-${formatApiDateTime(dateRange.start)}-${formatApiDateTime(dateRange.end)}`
      : null,
    () =>
      get_availability_v2_booking_availability_post({
        groupId: groupId!,
        startDate: formatApiDateTime(dateRange!.start),
        endDate: formatApiDateTime(dateRange!.end),
        includeFull: true,
      }),
  );

  return {
    menus,
    isMenusLoading,
    mutateMenus,
    schedules,
    isSchedulesLoading,
    mutateSchedules,
    blocks,
    isBlocksLoading,
    mutateBlocks,
    bookings,
    isBookingsLoading,
    mutateBookings,
    settings,
    isSettingsLoading,
    mutateSettings,
    menuSlots,
    isMenuSlotsLoading,
    mutateMenuSlots,
  };
}
