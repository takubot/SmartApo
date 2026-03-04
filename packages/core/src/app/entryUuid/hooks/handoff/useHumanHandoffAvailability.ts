"use client";

import { useEffect, useMemo, useState } from "react";

type HumanHandoffAvailabilitySlot = {
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const toMinutes = (hhmm: string): number | null => {
  const matched = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!matched) {
    return null;
  }
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  return hour * 60 + minute;
};

const getJstClock = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!weekday || !hour || !minute) {
    return null;
  }

  const dayOfWeek = WEEKDAY_MAP[weekday];
  const minutes = Number(hour) * 60 + Number(minute);
  if (!Number.isInteger(dayOfWeek) || Number.isNaN(minutes)) {
    return null;
  }
  return { dayOfWeek, minutes };
};

const isWithinSlotNow = (
  slots: HumanHandoffAvailabilitySlot[] | undefined,
): boolean => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return false;
  }
  const jstClock = getJstClock();
  if (!jstClock) {
    return false;
  }

  return slots.some((slot) => {
    const dayOfWeek = Number(slot?.dayOfWeek);
    const startTime = typeof slot?.startTime === "string" ? slot.startTime : "";
    const endTime = typeof slot?.endTime === "string" ? slot.endTime : "";
    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      startMinutes === null ||
      endMinutes === null
    ) {
      return false;
    }

    return (
      dayOfWeek === jstClock.dayOfWeek &&
      jstClock.minutes >= startMinutes &&
      jstClock.minutes < endMinutes
    );
  });
};

export const useHumanHandoffAvailability = (
  slots: HumanHandoffAvailabilitySlot[] | undefined,
) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => isWithinSlotNow(slots), [slots, tick]);
};
