import { createDefaultEmployees, generateSchedule, validateSchedule, suggestSwaps, formatMonthLabel } from "./shiftGenerator.js";

const monthInput = document.querySelector("#monthInput");
const minStaffInput = document.querySelector("#minStaffInput");
const morningStaffInput = document.querySelector("#morningStaffInput");
const eveningStaffInput = document.querySelector("#eveningStaffInput");
const employeeList = document.querySelector("#employeeList");
const shiftTable = document.querySelector("#shiftTable");
const alertList = document.querySelector("#alertList");

const state = {
  employees: createDefaultEmployees(),
  schedule: {},
};

function renderEmployees() {
  employeeList.innerHTML = "";

  state.employees.forEach((employee) => {
    const card = document.createElement("div");
    card.className = "employee-card";
    card.innerHTML = `
      <div class="row">
        <label>
          <span>名前</span>
          <input data-field="name" value="${employee.name}" />
        </label>
        <label>
          <span>スキル</span>
          <input data-field="skill" value="${employee.skill}" />
        </label>
      </div>
      <div class="row">
        <label>
          <span>最低人数</span>
          <input type="number" data-field="minHours" value="${employee.minHours}" />
        </label>
        <label>
          <span>希望休</span>
          <input data-field="preferredOff" value="${employee.preferredOff.join(",")}" />
        </label>
      </div>
      <div class="meta">
        <label>
          <span>早番可</span>
          <input type="checkbox" data-field="canWorkMorning" ${employee.canWorkMorning ? "checked" : ""} />
        </label>
        <label>
          <span>遅番可</span>
          <input type="checkbox" data-field="canWorkEvening" ${employee.canWorkEvening ? "checked" : ""} />
        </label>
        <button class="remove-button" data-remove-id="${employee.id}">削除</button>
      </div>
    `;

    employeeList.appendChild(card);
  });
}

function getMonthValue() {
  return monthInput.value || new Date().toISOString().slice(0, 7);
}

function renderShiftTable() {
  const month = getMonthValue();
  const [year, monthNum] = month.split("-").map(Number);
  const totalDays = new Date(year, monthNum, 0).getDate();
  const tableHeader = ["スタッフ"]; 

  for (let day = 1; day <= totalDays; day += 1) {
    tableHeader.push(String(day));
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  tableHeader.forEach((value) => {
    const th = document.createElement("th");
    th.textContent = value;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  shiftTable.innerHTML = "";
  shiftTable.appendChild(thead);

  const tbody = document.createElement("tbody");

  state.employees.forEach((employee) => {
    const row = document.createElement("tr");
    const staffCell = document.createElement("td");
    staffCell.textContent = employee.name;
    row.appendChild(staffCell);

    for (let day = 1; day <= totalDays; day += 1) {
      const dayCell = document.createElement("td");
      const select = document.createElement("select");
      const currentValue = state.schedule[employee.id]?.[day - 1] || "休み";

      ["休み", "早番", "遅番"].forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        if (optionValue === currentValue) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener("change", (event) => {
        state.schedule[employee.id][day - 1] = event.target.value;
      });

      dayCell.appendChild(select);
      row.appendChild(dayCell);
    }

    tbody.appendChild(row);
  });

  shiftTable.appendChild(tbody);
}

function renderAlerts(messages) {
  alertList.innerHTML = "";

  if (!messages.length) {
    const item = document.createElement("li");
    item.className = "success";
    item.textContent = "条件に問題はありません。必要に応じて手動調整を行ってください。";
    alertList.appendChild(item);
    return;
  }

  messages.forEach((message) => {
    const item = document.createElement("li");
    item.className = message.type === "danger" ? "danger" : message.type === "warning" ? "warning" : "success";
    item.textContent = message.message;
    alertList.appendChild(item);
  });
}

function buildSchedule() {
  const result = generateSchedule({
    month: getMonthValue(),
    employees: state.employees,
    minStaff: Number(minStaffInput.value) || 2,
    morningStaff: Number(morningStaffInput.value) || 1,
    eveningStaff: Number(eveningStaffInput.value) || 1,
  });

  state.schedule = result.schedule;
  const validationIssues = validateSchedule(result.schedule, state.employees);
  const swapSuggestions = suggestSwaps(result.schedule, state.employees);
  renderAlerts([...result.warnings, ...validationIssues, ...swapSuggestions]);
  renderShiftTable();
}

function addEmployee() {
  const employee = {
    id: crypto.randomUUID(),
    name: `スタッフ${state.employees.length + 1}`,
    skill: "接客",
    minHours: 120,
    maxHours: 160,
    preferredOff: [1],
    unavailable: [],
    monthlyOff: 10,
    daysOff: 1,
    canWorkMorning: true,
    canWorkEvening: true,
  };

  state.employees.push(employee);
  renderEmployees();
  buildSchedule();
}

function handleEmployeeEdit(event) {
  const field = event.target.dataset.field;
  const employeeId = event.target.closest(".employee-card")?.querySelector("[data-remove-id]")?.dataset.removeId;
  if (!field || !employeeId) return;

  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee) return;

  if (field === "preferredOff") {
    employee.preferredOff = event.target.value
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value));
  } else if (field === "canWorkMorning" || field === "canWorkEvening") {
    employee[field] = event.target.checked;
  } else if (field === "minHours") {
    employee[field] = Number(event.target.value);
  } else {
    employee[field] = event.target.value;
  }

  buildSchedule();
}

function handleEmployeeRemove(event) {
  const employeeId = event.target.dataset.removeId;
  if (!employeeId) return;
  state.employees = state.employees.filter((employee) => employee.id !== employeeId);
  renderEmployees();
  buildSchedule();
}

function exportCsv() {
  const rows = [
    ["スタッフ", ...Array.from({ length: new Date(Number(getMonthValue().slice(0, 4)), Number(getMonthValue().slice(5, 7)), 0).getDate() }, (_, i) => `${i + 1}日`)]
  ];

  state.employees.forEach((employee) => {
    const row = [employee.name];
    const schedule = state.schedule[employee.id] || [];
    for (let i = 0; i < schedule.length; i += 1) {
      row.push(schedule[i]);
    }
    rows.push(row);
  });

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `STUDIO_SHIFT_${getMonthValue()}.csv`;
  a.click();
}

monthInput.value = new Date().toISOString().slice(0, 7);
renderEmployees();
buildSchedule();

monthInput.addEventListener("change", buildSchedule);
minStaffInput.addEventListener("change", buildSchedule);
morningStaffInput.addEventListener("change", buildSchedule);
eveningStaffInput.addEventListener("change", buildSchedule);
document.querySelector("#generateShiftButton").addEventListener("click", buildSchedule);
document.querySelector("#addEmployeeButton").addEventListener("click", addEmployee);
document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
employeeList.addEventListener("input", handleEmployeeEdit);
employeeList.addEventListener("change", handleEmployeeEdit);
employeeList.addEventListener("click", (event) => {
  if (event.target.classList.contains("remove-button")) {
    handleEmployeeRemove(event);
  }
});
