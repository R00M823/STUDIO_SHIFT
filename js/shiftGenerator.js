const SHIFT_TYPES = ["休み", "早番", "遅番"];

export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function createDefaultEmployees() {
  return [
    {
      id: crypto.randomUUID(),
      name: "田中",
      skill: "接客",
      minHours: 120,
      maxHours: 160,
      preferredOff: [1, 2],
      unavailable: [17],
      monthlyOff: 10,
      daysOff: 2,
      canWorkMorning: true,
      canWorkEvening: true,
    },
    {
      id: crypto.randomUUID(),
      name: "佐藤",
      skill: "調理",
      minHours: 120,
      maxHours: 160,
      preferredOff: [5],
      unavailable: [9, 18],
      monthlyOff: 10,
      daysOff: 1,
      canWorkMorning: true,
      canWorkEvening: false,
    },
    {
      id: crypto.randomUUID(),
      name: "伊藤",
      skill: "接客",
      minHours: 120,
      maxHours: 160,
      preferredOff: [6, 7],
      unavailable: [14],
      monthlyOff: 10,
      daysOff: 2,
      canWorkMorning: false,
      canWorkEvening: true,
    },
  ];
}

export function generateSchedule({ month, employees, minStaff, morningStaff, eveningStaff }) {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  const totalDays = getDaysInMonth(year, monthIndex);

  const schedule = {};
  employees.forEach((employee) => {
    schedule[employee.id] = Array.from({ length: totalDays }, () => "休み");
  });

  const warnings = [];
  const today = new Date();
  const currentMonth = today.getMonth();

  for (let day = 1; day <= totalDays; day += 1) {
    const dayWorkers = [];
    const dayOffCount = {};

    employees.forEach((employee) => {
      const isUnavailable = employee.unavailable.includes(day);
      const isPreferredOff = employee.preferredOff.includes(day);
      const hasMonthlyOff = employee.daysOff >= 1 && isPreferredOff;

      if (isUnavailable) {
        schedule[employee.id][day - 1] = "休み";
        dayOffCount[employee.id] = (dayOffCount[employee.id] || 0) + 1;
      } else if (hasMonthlyOff) {
        schedule[employee.id][day - 1] = "休み";
      } else {
        const currentPattern =
          schedule[employee.id].slice(Math.max(0, day - 4), day - 1).filter((value) => value !== "休み").length;

        if (currentPattern >= 3) {
          schedule[employee.id][day - 1] = "休み";
          warnings.push({
            type: "warning",
            message: `${employee.name}は4連勤に近いため、その日を休ませます。`,
          });
        } else {
          dayWorkers.push(employee);
        }
      }
    });

    const morningSlots = Math.min(morningStaff, dayWorkers.length);
    const eveningSlots = Math.min(eveningStaff, dayWorkers.length - morningSlots);

    let assignedMorning = 0;
    let assignedEvening = 0;

    dayWorkers.forEach((employee) => {
      if (assignedMorning < morningSlots && employee.canWorkMorning) {
        schedule[employee.id][day - 1] = "早番";
        assignedMorning += 1;
      } else if (assignedEvening < eveningSlots && employee.canWorkEvening) {
        schedule[employee.id][day - 1] = "遅番";
        assignedEvening += 1;
      }
    });

    const assignedTotal = Object.values(schedule).filter((employeeSchedule) => employeeSchedule[day - 1] !== "休み").length;
    if (assignedTotal < minStaff) {
      warnings.push({
        type: "danger",
        message: `${day}日: 最低人数 ${minStaff}人に満たないため、追加調整が必要です。`,
      });
    }

    if (monthIndex === currentMonth && day < today.getDate()) {
      // 過去日は無視
    }
  }

  const suggestions = [];
  employees.forEach((employee) => {
    const totalWorkDays = schedule[employee.id].filter((slot) => slot !== "休み").length;
    if (totalWorkDays < employee.minHours / 8) {
      suggestions.push({
        type: "warning",
        message: `${employee.name}の勤務日数が少なく、調整候補を検討してください。`,
      });
    }
  });

  return {
    schedule,
    warnings: [...warnings, ...suggestions],
  };
}

export function validateSchedule(schedule, employees) {
  const issues = [];

  employees.forEach((employee) => {
    const shifts = schedule[employee.id];
    for (let i = 0; i < shifts.length; i += 1) {
      const current = shifts[i];
      if (current === "休み") continue;
      const window = shifts.slice(Math.max(0, i - 3), i + 4).filter((value) => value !== "休み");
      if (window.length > 3) {
        issues.push({
          type: "danger",
          message: `${employee.name}は4連勤の可能性があります。`,
        });
      }
    }
  });

  return issues;
}

export function suggestSwaps(schedule, employees) {
  const suggestions = [];
  employees.forEach((employee) => {
    const workDays = schedule[employee.id].flatMap((value, index) => (value !== "休み" ? [index + 1] : []));
    if (workDays.length > 0) {
      suggestions.push({
        type: "success",
        message: `${employee.name}の代替候補: 休み希望のスタッフと入れ替え可能です。`,
      });
    }
  });

  return suggestions;
}

export function formatMonthLabel(value) {
  const date = new Date(`${value}-01T00:00:00`);
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
}
