export type DaySchedule = {
  isOpen: boolean;
  open?: string;
  close?: string;
};

export type WeeklySchedule = {
  [key: number]: DaySchedule;
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

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getStoreStatus(date = new Date()) {
  const day = date.getDay();
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

  const nowMinutes = date.getHours() * 60 + date.getMinutes();
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