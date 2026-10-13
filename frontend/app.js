// T04: 할 일 등록·상태 변경·수정·삭제, 설명·우선순위·마감일, 검색·필터·지연 표시.
// localStorage(task-flow-v1)에 저장하고 복원한다.
const STORAGE_KEY = "task-flow-v1";
const STATUSES = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};
const PRIORITIES = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const priorityInput = document.getElementById("task-priority");
const dueDateInput = document.getElementById("task-due-date");
const formError = document.getElementById("form-error");
const storageError = document.getElementById("storage-error");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const priorityFilter = document.getElementById("priority-filter");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");

// 저장값이 손상됐거나 저장소를 쓸 수 없으면 false가 되고, 이후 저장하지 않는다.
let canSave = true;

function isValidTask(task) {
  // T02·T03에서 저장한 항목에는 status·description·priority·dueDate가 없을 수 있다.
  return (
    task !== null &&
    typeof task === "object" &&
    (typeof task.id === "number" || typeof task.id === "string") &&
    typeof task.title === "string" &&
    task.title.trim() !== "" &&
    (task.status === undefined || Object.hasOwn(STATUSES, task.status)) &&
    (task.description === undefined || typeof task.description === "string") &&
    (task.priority === undefined || Object.hasOwn(PRIORITIES, task.priority)) &&
    (task.dueDate === undefined || task.dueDate === null || DATE_PATTERN.test(task.dueDate))
  );
}

function withDefaults(task) {
  return {
    ...task,
    status: task.status ?? "TODO",
    description: task.description ?? "",
    priority: task.priority ?? "MEDIUM",
    dueDate: task.dueDate ?? null,
  };
}

function showStorageError(message) {
  storageError.textContent = message;
  storageError.hidden = false;
}

function loadTasks() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    canSave = false;
    showStorageError("브라우저 저장소를 사용할 수 없습니다. 이번에 등록한 할 일은 새로고침하면 사라집니다.");
    return [];
  }

  if (raw === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isValidTask)) {
      return parsed.map(withDefaults);
    }
  } catch {
    // 아래에서 손상된 값으로 처리한다.
  }

  // 손상된 저장값은 덮어쓰지 않고 그대로 둔다.
  canSave = false;
  showStorageError(
    `저장된 데이터(${STORAGE_KEY})를 읽을 수 없습니다. 기존 데이터를 보호하기 위해 저장하지 않습니다. ` +
      "이번에 등록한 할 일은 새로고침하면 사라집니다."
  );
  return [];
}

function saveTasks() {
  if (!canSave) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    showStorageError("할 일을 저장하지 못했습니다. 새로고침하면 사라질 수 있습니다.");
  }
}

const tasks = loadTasks();

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = "";
  formError.hidden = true;
}

// 브라우저 기준 오늘 날짜(YYYY-MM-DD).
function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// 마감일이 오늘보다 이전이고 완료되지 않은 할 일은 지연이다.
function isOverdue(task) {
  return task.dueDate !== null && task.dueDate < today() && task.status !== "DONE";
}

function matchesFilters(task) {
  const keyword = searchInput.value.trim().toLowerCase();
  if (
    keyword !== "" &&
    !task.title.toLowerCase().includes(keyword) &&
    !task.description.toLowerCase().includes(keyword)
  ) {
    return false;
  }
  if (statusFilter.value !== "ALL" && task.status !== statusFilter.value) {
    return false;
  }
  if (priorityFilter.value !== "ALL" && task.priority !== priorityFilter.value) {
    return false;
  }
  return true;
}

// 내용을 수정 중인 항목의 id. 한 번에 한 항목만 수정한다.
let editingId = null;

function findTask(id) {
  return tasks.find((task) => task.id === id);
}

function changeStatus(id, status) {
  const task = findTask(id);
  if (!task || !Object.hasOwn(STATUSES, status)) {
    return;
  }
  task.status = status;
  saveTasks();
  renderTasks();
}

function updateTask(id, changes) {
  const task = findTask(id);
  if (!task) {
    return;
  }
  Object.assign(task, changes);
  editingId = null;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const task = findTask(id);
  if (!task) {
    return;
  }
  if (!confirm(`"${task.title}" 할 일을 삭제할까요?`)) {
    return;
  }
  const index = tasks.findIndex((t) => t.id === id);
  tasks.splice(index, 1);
  if (editingId === id) {
    editingId = null;
  }
  saveTasks();
  renderTasks();
}

function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createSelect(options, value, ariaLabel) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", ariaLabel);
  for (const [optionValue, label] of Object.entries(options)) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    select.appendChild(option);
  }
  select.value = value;
  return select;
}

function createBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

function renderViewItem(item, task) {
  const header = document.createElement("div");
  header.className = "task-header";

  const title = document.createElement("span");
  title.className = "task-title";
  // 사용자 입력은 HTML이 아닌 글자로 표시한다.
  title.textContent = task.title;
  if (task.status === "DONE") {
    title.classList.add("done");
  }

  const statusSelect = createSelect(STATUSES, task.status, "상태");
  statusSelect.addEventListener("change", () => changeStatus(task.id, statusSelect.value));

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    statusSelect,
    createButton("수정", () => {
      editingId = task.id;
      renderTasks();
    }),
    createButton("삭제", () => deleteTask(task.id))
  );
  header.append(title, actions);
  item.appendChild(header);

  if (task.description !== "") {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    item.appendChild(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.appendChild(createBadge(`우선순위 ${PRIORITIES[task.priority]}`, `priority-${task.priority.toLowerCase()}`));
  if (task.dueDate !== null) {
    meta.appendChild(createBadge(`마감 ${task.dueDate}`, "due-date"));
  }
  if (isOverdue(task)) {
    item.classList.add("overdue");
    meta.appendChild(createBadge("지연", "overdue-badge"));
  }
  item.appendChild(meta);
}

function renderEditItem(item, task) {
  const editForm = document.createElement("form");
  editForm.className = "edit-form";
  editForm.noValidate = true;

  const titleField = document.createElement("input");
  titleField.type = "text";
  titleField.value = task.title;
  titleField.setAttribute("aria-label", "할 일 제목 수정");

  const descriptionField = document.createElement("textarea");
  descriptionField.rows = 2;
  descriptionField.value = task.description;
  descriptionField.placeholder = "설명 (선택)";
  descriptionField.setAttribute("aria-label", "설명 수정");

  const priorityField = createSelect(PRIORITIES, task.priority, "우선순위 수정");

  const dueDateField = document.createElement("input");
  dueDateField.type = "date";
  dueDateField.value = task.dueDate ?? "";
  dueDateField.setAttribute("aria-label", "마감일 수정");

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "저장";

  const cancel = () => {
    editingId = null;
    renderTasks();
  };

  const error = document.createElement("p");
  error.className = "form-error";
  error.hidden = true;

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleField.value.trim();
    if (title === "") {
      error.textContent = "제목을 입력하세요.";
      error.hidden = false;
      titleField.focus();
      return;
    }
    updateTask(task.id, {
      title,
      description: descriptionField.value.trim(),
      priority: priorityField.value,
      dueDate: dueDateField.value === "" ? null : dueDateField.value,
    });
  });
  editForm.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cancel();
    }
  });

  const row = document.createElement("div");
  row.className = "form-row";
  row.append(priorityField, dueDateField, saveButton, createButton("취소", cancel));

  editForm.append(titleField, descriptionField, row);
  item.append(editForm, error);
  // 목록에 붙은 뒤 포커스를 준다.
  queueMicrotask(() => titleField.focus());
}

function renderTasks() {
  taskList.replaceChildren();
  const visibleTasks = tasks.filter((task) => task.id === editingId || matchesFilters(task));
  for (const task of visibleTasks) {
    const item = document.createElement("li");
    if (task.id === editingId) {
      item.className = "editing";
      renderEditItem(item, task);
    } else {
      renderViewItem(item, task);
    }
    taskList.appendChild(item);
  }

  if (tasks.length === 0) {
    emptyMessage.textContent = "등록된 할 일이 없습니다.";
  } else {
    emptyMessage.textContent = "조건에 맞는 할 일이 없습니다.";
  }
  emptyMessage.hidden = visibleTasks.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();

  if (title === "") {
    showError("제목을 입력하세요.");
    titleInput.focus();
    return;
  }

  // 같은 밀리초에 등록해도 id가 겹치지 않게 한다.
  const maxId = tasks.reduce((max, task) => Math.max(max, Number(task.id) || 0), 0);
  tasks.push({
    id: Math.max(Date.now(), maxId + 1),
    title,
    status: "TODO",
    description: descriptionInput.value.trim(),
    priority: priorityInput.value,
    dueDate: dueDateInput.value === "" ? null : dueDateInput.value,
  });
  saveTasks();
  clearError();
  form.reset();
  titleInput.focus();
  renderTasks();
});

for (const control of [searchInput, statusFilter, priorityFilter]) {
  control.addEventListener("input", renderTasks);
}

renderTasks();
