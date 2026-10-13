// T03: 할 일 등록·상태 변경·수정·삭제. localStorage(task-flow-v1)에 저장하고 복원한다.
const STORAGE_KEY = "task-flow-v1";
const STATUSES = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const formError = document.getElementById("form-error");
const storageError = document.getElementById("storage-error");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");

// 저장값이 손상됐거나 저장소를 쓸 수 없으면 false가 되고, 이후 저장하지 않는다.
let canSave = true;

function isValidTask(task) {
  return (
    task !== null &&
    typeof task === "object" &&
    (typeof task.id === "number" || typeof task.id === "string") &&
    typeof task.title === "string" &&
    task.title.trim() !== "" &&
    // T02에서 저장한 항목에는 status가 없다.
    (task.status === undefined || Object.hasOwn(STATUSES, task.status))
  );
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
      return parsed.map((task) => ({ ...task, status: task.status ?? "TODO" }));
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

// 제목을 수정 중인 항목의 id. 한 번에 한 항목만 수정한다.
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

function updateTitle(id, title) {
  const task = findTask(id);
  if (!task) {
    return;
  }
  task.title = title;
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

function renderViewItem(item, task) {
  const title = document.createElement("span");
  title.className = "task-title";
  // 사용자 입력은 HTML이 아닌 글자로 표시한다.
  title.textContent = task.title;
  if (task.status === "DONE") {
    title.classList.add("done");
  }

  const statusSelect = document.createElement("select");
  statusSelect.setAttribute("aria-label", "상태");
  for (const [value, label] of Object.entries(STATUSES)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    statusSelect.appendChild(option);
  }
  statusSelect.value = task.status;
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

  item.append(title, actions);
}

function renderEditItem(item, task) {
  const editForm = document.createElement("form");
  editForm.className = "edit-form";
  editForm.noValidate = true;

  const input = document.createElement("input");
  input.type = "text";
  input.value = task.title;
  input.setAttribute("aria-label", "할 일 제목 수정");

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
    const title = input.value.trim();
    if (title === "") {
      error.textContent = "제목을 입력하세요.";
      error.hidden = false;
      input.focus();
      return;
    }
    updateTitle(task.id, title);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cancel();
    }
  });

  editForm.append(input, saveButton, createButton("취소", cancel));
  item.append(editForm, error);
  // 목록에 붙은 뒤 포커스를 준다.
  queueMicrotask(() => input.focus());
}

function renderTasks() {
  taskList.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement("li");
    if (task.id === editingId) {
      item.className = "editing";
      renderEditItem(item, task);
    } else {
      renderViewItem(item, task);
    }
    taskList.appendChild(item);
  }
  emptyMessage.hidden = tasks.length > 0;
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
  tasks.push({ id: Math.max(Date.now(), maxId + 1), title, status: "TODO" });
  saveTasks();
  clearError();
  titleInput.value = "";
  titleInput.focus();
  renderTasks();
});

renderTasks();
