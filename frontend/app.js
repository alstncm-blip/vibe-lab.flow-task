// T01: 제목 입력·등록·목록. 저장은 하지 않으므로 새로고침하면 사라진다.
const tasks = [];

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const formError = document.getElementById("form-error");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");

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

  tasks.push({ id: Date.now(), title });
  clearError();
  titleInput.value = "";
  titleInput.focus();
  renderTasks();
});

renderTasks();
