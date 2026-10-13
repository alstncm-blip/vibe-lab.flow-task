// T08: 할 일 등록·상태 변경·수정·삭제, 설명·우선순위·마감일, 검색·필터·지연 표시.
// 데이터는 Task Flow API(API-SPEC.md)에 저장한다.

// 개발 중(5500번 정적 서버)에는 8000번 API로 직접 요청하고,
// Nginx로 함께 제공할 때(5장)는 같은 주소의 /api를 쓴다.
const API_BASE =
  location.port === "5500" ? `${location.protocol}//${location.hostname}:8000/api` : "/api";

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

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const priorityInput = document.getElementById("task-priority");
const dueDateInput = document.getElementById("task-due-date");
const submitButton = document.getElementById("submit-button");
const formError = document.getElementById("form-error");
const apiError = document.getElementById("api-error");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const priorityFilter = document.getElementById("priority-filter");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");

// 서버에서 받은 목록. 변경은 서버 응답을 받은 뒤에만 반영한다.
let tasks = [];
// 처음 목록을 불러오기 전에는 빈 목록 문구를 보여 주지 않는다.
let loaded = false;

class ApiError extends Error {}

// API 오류 응답(422 등)의 detail을 사람이 읽을 문장으로 바꾼다.
function describeError(status, body) {
  if (status === 404) {
    return "이미 삭제된 할 일입니다. 목록을 새로 불러옵니다.";
  }
  if (status === 422 && Array.isArray(body?.detail)) {
    const fields = body.detail.map((item) => item.loc?.at(-1)).filter(Boolean);
    return `입력값을 확인하세요 (${[...new Set(fields)].join(", ")}).`;
  }
  return `서버 오류가 발생했습니다 (HTTP ${status}).`;
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인하세요.");
  }

  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new ApiError(describeError(response.status, data));
    error.status = response.status;
    throw error;
  }
  return data;
}

function showApiError(message, onRetry) {
  apiError.replaceChildren(document.createTextNode(message));
  if (onRetry) {
    apiError.append(" ", createButton("다시 시도", onRetry));
  }
  apiError.hidden = false;
}

function clearApiError() {
  apiError.replaceChildren();
  apiError.hidden = true;
}

// API 호출을 실행하고, 실패하면 오류를 보여 준다. 성공하면 true.
async function runApi(action) {
  try {
    await action();
    clearApiError();
    return true;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
    if (error.status === 404) {
      // 다른 곳에서 삭제됐으면 서버 목록으로 맞춘다.
      await loadTasks();
    }
    showApiError(error.message);
    return false;
  }
}

async function loadTasks() {
  try {
    tasks = await request("GET", "/tasks");
    loaded = true;
    clearApiError();
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
    showApiError(`할 일 목록을 불러오지 못했습니다. ${error.message}`, loadTasks);
  }
  renderTasks();
}

function replaceTask(updated) {
  tasks = tasks.map((task) => (task.id === updated.id ? updated : task));
}

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
  return task.due_date !== null && task.due_date < today() && task.status !== "DONE";
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

async function changeStatus(id, status) {
  if (!Object.hasOwn(STATUSES, status)) {
    return;
  }
  await runApi(async () => {
    replaceTask(await request("PATCH", `/tasks/${id}`, { status }));
  });
  // 실패하면 드롭다운을 서버 값으로 되돌린다.
  renderTasks();
}

async function updateTask(id, changes) {
  const ok = await runApi(async () => {
    replaceTask(await request("PATCH", `/tasks/${id}`, changes));
  });
  if (ok) {
    editingId = null;
    renderTasks();
  }
}

async function deleteTask(id) {
  const task = findTask(id);
  if (!task) {
    return;
  }
  if (!confirm(`"${task.title}" 할 일을 삭제할까요?`)) {
    return;
  }
  const ok = await runApi(async () => {
    await request("DELETE", `/tasks/${id}`);
    tasks = tasks.filter((t) => t.id !== id);
  });
  if (ok && editingId === id) {
    editingId = null;
  }
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
  if (task.due_date !== null) {
    meta.appendChild(createBadge(`마감 ${task.due_date}`, "due-date"));
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
  titleField.maxLength = 100;
  titleField.value = task.title;
  titleField.setAttribute("aria-label", "할 일 제목 수정");

  const descriptionField = document.createElement("textarea");
  descriptionField.rows = 2;
  descriptionField.maxLength = 1000;
  descriptionField.value = task.description;
  descriptionField.placeholder = "설명 (선택)";
  descriptionField.setAttribute("aria-label", "설명 수정");

  const priorityField = createSelect(PRIORITIES, task.priority, "우선순위 수정");

  const dueDateField = document.createElement("input");
  dueDateField.type = "date";
  dueDateField.value = task.due_date ?? "";
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

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleField.value.trim();
    if (title === "") {
      error.textContent = "제목을 입력하세요.";
      error.hidden = false;
      titleField.focus();
      return;
    }
    saveButton.disabled = true;
    await updateTask(task.id, {
      title,
      description: descriptionField.value.trim(),
      priority: priorityField.value,
      due_date: dueDateField.value === "" ? null : dueDateField.value,
    });
    // 실패해서 수정 폼이 남아 있으면 다시 저장할 수 있게 한다.
    saveButton.disabled = false;
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
  emptyMessage.hidden = !loaded || visibleTasks.length > 0;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();

  if (title === "") {
    showError("제목을 입력하세요.");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  const ok = await runApi(async () => {
    const created = await request("POST", "/tasks", {
      title,
      description: descriptionInput.value.trim(),
      priority: priorityInput.value,
      due_date: dueDateInput.value === "" ? null : dueDateInput.value,
    });
    tasks = [...tasks, created];
  });
  submitButton.disabled = false;

  // 실패하면 입력값을 남겨 두어 다시 등록할 수 있게 한다.
  if (ok) {
    clearError();
    form.reset();
    titleInput.focus();
  }
  renderTasks();
});

for (const control of [searchInput, statusFilter, priorityFilter]) {
  control.addEventListener("input", renderTasks);
}

renderTasks();
loadTasks();
