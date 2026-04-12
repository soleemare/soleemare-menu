export type DaySchedule = {
  isOpen: boolean;
  open?: string;
  close?: string;
};

export type WeeklySchedule = {
  [key: number]: DaySchedule;
};

export type StoreStatus = {
  isOpen: boolean;
  message: string;
  opensAt: string | null;
  closesAt: string | null;
};

export type NextAvailableSchedule = {
  date: Date;
  dayIndex: number;
  dayName: string;
  open: string;
  close: string;
  label: string;
};

export type ScheduleSlot = {
  label: string;
  value: string;
};

export type ScheduledSlotCount = {
  value: string;
  count: number;
};

export type SchedulableDay = NextAvailableSchedule & {
  key: string;
  shortLabel: string;
  helperLabel: string;
};

export type ScheduledHeatmapCell = {
  key: string;
  label: string;
  count: number;
  intensity: number;
};

export type ScheduledHeatmapRow = {
  hour: string;
  cells: ScheduledHeatmapCell[];
};

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayIndex: number;
};

// 0 = domingo, 1 = lunes, 2 = martes, ..., 6 = sábado
export const weeklySchedule: WeeklySchedule = {
  0: { isOpen: true, open: "13:00", close: "20:00" }, // domingo
  1: { isOpen: false }, // lunes
  2: { isOpen: true, open: "13:00", close: "22:00" }, // martes
  3: { isOpen: true, open: "13:00", close: "22:00" }, // miércoles
  4: { isOpen: true, open: "13:00", close: "22:00" }, // jueves
  5: { isOpen: true, open: "13:00", close: "23:00" }, // viernes
  6: { isOpen: true, open: "13:00", close: "23:00" }, // sábado
};

const STORE_TIME_ZONE = "America/Santiago";
const STORE_LOCALE = "es-CL";
export const SCHEDULED_SLOT_CAPACITY = 3;

const weekdayIndexMap: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const zonedDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getZonedDateParts(date: Date): ZonedDateParts {
  const parts = zonedDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = values.weekday?.slice(0, 3).toLowerCase() || "sun";

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    dayIndex: weekdayIndexMap[weekday] ?? 0,
  };
}

function getDateTimeUtcValue(parts: Pick<ZonedDateParts, "year" | "month" | "day" | "hour" | "minute">) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function buildStoreDate(
  parts: Pick<ZonedDateParts, "year" | "month" | "day">,
  time: string
) {
  const [hours, minutes] = time.split(":").map(Number);
  const desiredValue = getDateTimeUtcValue({
    ...parts,
    hour: hours,
    minute: minutes,
  });

  let candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes));

  for (let index = 0; index < 3; index += 1) {
    const candidateParts = getZonedDateParts(candidate);
    const candidateValue = getDateTimeUtcValue(candidateParts);
    const diff = desiredValue - candidateValue;

    if (diff === 0) {
      break;
    }

    candidate = new Date(candidate.getTime() + diff);
  }

  candidate.setSeconds(0, 0);
  return candidate;
}

function buildDateWithTime(baseDate: Date, time: string) {
  const parts = getZonedDateParts(baseDate);
  return buildStoreDate(parts, time);
}

function getStoreDateWithOffset(baseDate: Date, offsetDays: number, time = "12:00") {
  const parts = getZonedDateParts(baseDate);
  const shiftedDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays, 12, 0, 0, 0)
  );

  return buildStoreDate(
    {
      year: shiftedDate.getUTCFullYear(),
      month: shiftedDate.getUTCMonth() + 1,
      day: shiftedDate.getUTCDate(),
    },
    time
  );
}

function toDateKey(date: Date) {
  const { year, month, day } = getZonedDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const dayNames = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

export function getStoreStatus(date = new Date()): StoreStatus {
  const parts = getZonedDateParts(date);
  const day = parts.dayIndex;
  const todaySchedule = weeklySchedule[day];

  if (
    !todaySchedule ||
    !todaySchedule.isOpen ||
    !todaySchedule.open ||
    !todaySchedule.close
  ) {
    return {
      isOpen: false,
      message: "Hoy estamos cerrados",
      opensAt: null,
      closesAt: null,
    };
  }

  const nowMinutes = parts.hour * 60 + parts.minute;
  const openMinutes = timeToMinutes(todaySchedule.open);
  const closeMinutes = timeToMinutes(todaySchedule.close);

  const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  if (isOpen) {
    return {
      isOpen: true,
      message: `Abierto hoy hasta las ${todaySchedule.close}`,
      opensAt: todaySchedule.open,
      closesAt: todaySchedule.close,
    };
  }

  if (nowMinutes < openMinutes) {
    return {
      isOpen: false,
      message: `Cerrado ahora. Abrimos hoy a las ${todaySchedule.open}`,
      opensAt: todaySchedule.open,
      closesAt: todaySchedule.close,
    };
  }

  return {
    isOpen: false,
    message: `Cerrado por hoy. Atendemos hasta las ${todaySchedule.close}`,
    opensAt: todaySchedule.open,
    closesAt: todaySchedule.close,
  };
}

export function getNextAvailableSchedule(date = new Date()): NextAvailableSchedule | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDate = getStoreDateWithOffset(date, offset);
    const nextDateParts = getZonedDateParts(nextDate);

    const dayIndex = nextDateParts.dayIndex;
    const schedule = weeklySchedule[dayIndex];

    if (!schedule?.isOpen || !schedule.open || !schedule.close) {
      continue;
    }

    return {
      date: nextDate,
      dayIndex,
      dayName: dayNames[dayIndex],
      open: schedule.open,
      close: schedule.close,
      label: nextDate.toLocaleDateString(STORE_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: STORE_TIME_ZONE,
      }),
    };
  }

  return null;
}

export function getSchedulableSchedule(date = new Date()): NextAvailableSchedule | null {
  const status = getStoreStatus(date);
  const parts = getZonedDateParts(date);
  const todaySchedule = weeklySchedule[parts.dayIndex];

  if (status.isOpen && todaySchedule?.open && todaySchedule?.close) {
    const today = buildStoreDate(parts, `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`);

    return {
      date: today,
      dayIndex: parts.dayIndex,
      dayName: dayNames[parts.dayIndex],
      open: todaySchedule.open,
      close: todaySchedule.close,
      label: today.toLocaleDateString(STORE_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: STORE_TIME_ZONE,
      }),
    };
  }

  return getNextAvailableSchedule(date);
}

export function getSchedulableDays(
  date = new Date(),
  maxDays = 2
): SchedulableDay[] {
  const days: SchedulableDay[] = [];

  for (let offset = 0; offset <= 7 && days.length < maxDays; offset += 1) {
    const nextDate = getStoreDateWithOffset(date, offset);
    const nextDateParts = getZonedDateParts(nextDate);

    const dayIndex = nextDateParts.dayIndex;
    const schedule = weeklySchedule[dayIndex];

    if (!schedule?.isOpen || !schedule.open || !schedule.close) {
      continue;
    }

    const candidate: NextAvailableSchedule = {
      date: nextDate,
      dayIndex,
      dayName: dayNames[dayIndex],
      open: schedule.open,
      close: schedule.close,
      label: nextDate.toLocaleDateString(STORE_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: STORE_TIME_ZONE,
      }),
    };

    const slots = getScheduleSlotsForDay(
      candidate,
      30,
      offset === 0 ? date : undefined
    );

    if (slots.length === 0) {
      continue;
    }

    const shortLabel =
      offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : capitalize(candidate.dayName);

    days.push({
      ...candidate,
      key: toDateKey(nextDate),
      shortLabel,
      helperLabel:
        offset === 0
          ? "Disponible hoy"
          : offset === 1
            ? "Disponible mañana"
            : capitalize(candidate.label),
    });
  }

  return days;
}

export function getDateKeyFromIso(isoDate: string) {
  return toDateKey(new Date(isoDate));
}

export function getScheduleSlotsForDay(
  schedule: NextAvailableSchedule,
  intervalMinutes = 30,
  fromDate?: Date
): ScheduleSlot[] {
  const openMinutes = timeToMinutes(schedule.open);
  const closeMinutes = timeToMinutes(schedule.close);
  const slots: ScheduleSlot[] = [];
  let startMinutes = openMinutes;

  if (fromDate) {
    const sameDay = toDateKey(fromDate) === toDateKey(schedule.date);

    if (sameDay) {
      const parts = getZonedDateParts(fromDate);
      const nowMinutes = parts.hour * 60 + parts.minute;
      const roundedMinutes =
        Math.ceil((nowMinutes + 1) / intervalMinutes) * intervalMinutes;

      startMinutes = Math.max(openMinutes, roundedMinutes);
    }
  }

  for (
    let currentMinutes = startMinutes;
    currentMinutes < closeMinutes;
    currentMinutes += intervalMinutes
  ) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeLabel = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const slotDate = buildDateWithTime(schedule.date, timeLabel);

    slots.push({
      label: timeLabel,
      value: slotDate.toISOString(),
    });
  }

  return slots;
}

export function formatScheduledDateTime(isoDate: string | null) {
  if (!isoDate) return null;

  return new Date(isoDate).toLocaleString(STORE_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  });
}

export function getScheduledSlotCounts(scheduledDates: string[]) {
  const counts = new Map<string, number>();

  scheduledDates.forEach((isoDate) => {
    if (!isoDate) return;
    counts.set(isoDate, (counts.get(isoDate) ?? 0) + 1);
  });

  return counts;
}

export function getScheduledHeatmapBucketKey(isoDate: string) {
  const dayKey = getDateKeyFromIso(isoDate);
  const hourLabel = new Date(isoDate).toLocaleTimeString(STORE_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: STORE_TIME_ZONE,
  });

  return `${dayKey}-${hourLabel}`;
}

export function filterAvailableScheduleSlots(
  slots: ScheduleSlot[],
  slotCounts: Map<string, number>,
  slotCapacity = SCHEDULED_SLOT_CAPACITY
) {
  return slots.filter((slot) => (slotCounts.get(slot.value) ?? 0) < slotCapacity);
}

export function getScheduledSlotStatus(
  isoDate: string,
  slotCounts: Map<string, number>,
  slotCapacity = SCHEDULED_SLOT_CAPACITY
) {
  const count = slotCounts.get(isoDate) ?? 0;

  return {
    count,
    remaining: Math.max(slotCapacity - count, 0),
    isFull: count >= slotCapacity,
  };
}

export function buildScheduledOrdersHeatmap(
  scheduledDates: string[],
  dayCount = 7,
  slotCapacity = SCHEDULED_SLOT_CAPACITY,
  date = new Date()
) {
  const schedulableDays = getSchedulableDays(date, dayCount);
  const heatmapCounts = new Map<string, number>();

  scheduledDates.forEach((isoDate) => {
    if (!isoDate) return;

    const bucketKey = getScheduledHeatmapBucketKey(isoDate);
    heatmapCounts.set(bucketKey, (heatmapCounts.get(bucketKey) ?? 0) + 1);
  });

  const hourSet = new Set<string>();
  const daySlots = schedulableDays.map((day) => {
    const slots = getScheduleSlotsForDay(day, 30);
    slots.forEach((slot) => {
      hourSet.add(slot.label);
    });
    return {
      ...day,
      slots,
    };
  });

  const orderedHours = Array.from(hourSet).sort((left, right) =>
    left.localeCompare(right)
  );

  const rows: ScheduledHeatmapRow[] = orderedHours.map((hour) => ({
    hour,
    cells: daySlots.map((day) => {
      const count = heatmapCounts.get(`${day.key}-${hour}`) ?? 0;

      return {
        key: `${day.key}-${hour}`,
        label: day.shortLabel,
        count,
        intensity: Math.min(count / slotCapacity, 1),
      };
    }),
  }));

  return {
    days: daySlots.map((day) => ({
      key: day.key,
      shortLabel: day.shortLabel,
      label: capitalize(day.label),
    })),
    rows,
    slotCapacity,
  };
}
