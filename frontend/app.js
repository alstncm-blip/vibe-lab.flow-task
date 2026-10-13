// T02: 할 일 목록을 localStorage(task-flow-v1)에 저장하고 복원한다.
const STORAGE_KEY = "task-flow-v1";

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
    task.title.trim() !== ""
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
      return parsed;
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

function renderTasks() {
  taskList.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement("li");
    // 사용자 입력은 HTML이 아닌 글자로 표시한다.
    item.textContent = task.title;
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
  tasks.push({ id: Math.max(Date.now(), maxId + 1), title });
  saveTasks();
  clearError();
  titleInput.value = "";
  titleInput.focus();
  renderTasks();
});

renderTasks();
