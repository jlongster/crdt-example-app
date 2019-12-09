let qs = document.querySelector.bind(document);
let qsa = document.querySelectorAll.bind(document);

function clear() {
  qs('#root').innerHTML = '';
}

function append(str, root = qs('#root')) {
  let tpl = document.createElement('template');
  tpl.innerHTML = str;
  root.appendChild(tpl.content);
}

function sanitize(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, match => map[match]);
}

function getColor(name) {
  switch (name) {
    case 'green':
      return 'bg-green-300';
    case 'blue':
      return 'bg-blue-300';
    case 'red':
      return 'bg-red-300';
    case 'orange':
      return 'bg-orange-300';
    case 'yellow':
      return 'bg-yellow-300';
    case 'teal':
      return 'bg-teal-300';
    case 'purple':
      return 'bg-purple-300';
    case 'pink':
      return 'bg-pink-300';
  }
  return 'bg-gray-100';
}

let uiState = {
  offline: false,
  editingTodo: null,
  isAddingType: false,
  isDeletingType: false
};

let _offlineTimer = null;
function detectOffline() {
  _offlineTimer = setInterval(async () => {
    try {
      await fetch('https://crdt.jlongster.com/server/ping');
      setOffline(false);
    } catch (e) {
      setOffline(true);
    }
  }, 1000);
}

function setOffline(flag) {
  if (flag !== uiState.offline) {
    uiState.offline = flag;
    setSyncingEnabled(!flag);
    render();
  }
}

let _scrollTop = 0;
function saveScroll() {
  let scroller = qs('#scroller');
  if (scroller) {
    _scrollTop = scroller.scrollTop;
  }
}

function restoreScroll() {
  let scroller = qs('#scroller');
  if (scroller) {
    scroller.scrollTop = _scrollTop;
  }
}

let _activeElement = null;
function saveActiveElement() {
  let el = document.activeElement;
  _activeElement = el.id
    ? '#' + el.id
    : el.className
    ? '.' + el.className.replace(/ ?hover\:[^ ]*/g, '').replace(/ /g, '.')
    : null;
}

function restoreActiveElement() {
  if (_activeElement) {
    let elements = qsa(_activeElement);
    // Cheap focus management: only re-focus if there's a single
    // element, otherwise we don't know which one was focused
    if (elements.length === 1) {
      elements[0].focus();
    }
  }
}

function renderTodoTypes({ className = '', showBlank } = {}) {
  return `
    <select class="${className} mr-2 bg-transparent shadow border border-gray-300">
      ${showBlank ? '<option value=""></option>' : ''}
      ${getTodoTypes().map(
        type => `<option value="${type.id}">${type.name}</option>`
      )}
    </select>
  `;
}

function renderTodos({ root, todos, isDeleted = false }) {
  todos.forEach(todo => {
    append(
      // prettier-ignore
      `
        <div class="todo-item bg-gray-200 p-4 mb-4 rounded flex cursor-pointer" data-id="${todo.id}">
          <div class="flex-grow flex items-center">
            <div class="${isDeleted ? 'line-through' : ''}">${sanitize(todo.name)}</div>
            <div class="text-sm rounded ${todo.type ? getColor(todo.type.color) : ''} px-2 ml-3">
              ${todo.type ? sanitize(todo.type.name) : ''}
            </div>
          </div>
          <button class="btn-delete hover:bg-gray-400 px-2 rounded ${isDeleted ? 'hidden' : ''}" data-id="${todo.id}">X</button>
       </div>
      `,
      root
    );
  });
}

function render() {
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';

  saveScroll();
  saveActiveElement();

  let root = qs('#root');
  root.style.height = '100%';

  let { offline, editingTodo, isAddingType, isDeletingType } = uiState;

  clear();

  // prettier-ignore
  append(`
    <div class="flex flex-col h-full">

      <div id="scroller" class="flex flex-col flex-grow items-center pt-8 overflow-auto px-4 relative">
        <div style="width: 100%; max-width: 600px">
          <form id="add-form" class="flex">
            <input placeholder="Add todo..." class="shadow border border-gray-300 mr-2 flex-grow p-2 rounded" />
            ${renderTodoTypes()}
            <button id="btn-add-todo" class="bg-green-600 text-white rounded p-2">Add</button>
          </form>

          <div class="mt-8" id="todos">
          </div>

          <h2 class="text-lg mt-24">Deleted todos</h2>
          <div class="mt-8" id="deleted-todos">
          </div>
        </div>

        <div id="up-to-date" class="fixed flex items-center mb-2 rounded bg-gray-800 px-4 py-3" style="opacity: 0; bottom: 80px">
          <div class="flex flex-row items-center text-green-200 text-sm">
            <img src="check.svg" class="mr-1" style="width: 13px; height: 13px;" /> Up to date
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center relative border-t">
        <div class="relative">
          <button id="btn-sync" class="m-4 mr-6 ${offline ? 'bg-red-600' : 'bg-blue-600'} text-white rounded p-2">
            Sync ${offline ? '(offline)' : ''}
          </button>
        </div>

        <div class="absolute left-0 top-0 bottom-0 flex items-center pr-4 text-sm">
          <button id="btn-offline-simulate" class="text-sm hover:bg-gray-300 px-2 py-1 rounded ${offline ? 'text-blue-700' : 'text-red-700'}">${offline ? 'Go online' : 'Simulate offline'}</button>
        </div>

        <div class="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-sm">
          <button id="btn-add-type" class="text-sm hover:bg-gray-300 px-2 py-1 rounded">Add type</button>
          <button id="btn-delete-type" class="text-sm hover:bg-gray-300 px-2 py-1 rounded">Delete type</button>
        </div>
      </div>
    </div>
  `);

  renderTodos({ root: qs('#todos'), todos: getTodos() });
  renderTodos({
    root: qs('#deleted-todos'),
    todos: getDeletedTodos(),
    isDeleted: true
  });

  if (editingTodo) {
    append(`
      <div class="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center" style="background-color: rgba(.2, .2, .2, .4)">
        <div class="bg-white p-8" style="width: 500px">
          <h2 class="text-lg font-bold mb-4">Edit todo</h2>
          <div class="flex">
            <input value="${sanitize(
              editingTodo.name
            )}" class="shadow border border-gray-300 mr-2 flex-grow p-2 rounded" />
            <button id="btn-edit-save" class="rounded p-2 bg-blue-600 text-white mr-2">Save</button>
            <button id="btn-edit-cancel" class="rounded p-2 bg-gray-200">Cancel</button>
          </div>

          ${
            editingTodo.tombstone === 1
              ? '<button id="btn-edit-undelete" class="pt-4 text-sm">Undelete</button>'
              : ''
          }
        </div>
      <div>
    `);
  }

  if (isAddingType) {
    append(`
      <div class="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center" style="background-color: rgba(.2, .2, .2, .4)">
        <div class="bg-white p-8" style="width: 500px">
          <h2 class="text-lg font-bold mb-4">Add todo type</h2>
          <div class="flex">
            <input placeholder="Name..." autofocus class="shadow border border-gray-300 mr-2 flex-grow p-2 rounded" />
            <button id="btn-edit-save" class="rounded p-2 bg-blue-600 text-white mr-2">Save</button>
            <button id="btn-edit-cancel" class="rounded p-2 bg-gray-200">Cancel</button>
          </div>
        </div>
      </div>
    `);
  }

  if (isDeletingType) {
    append(`
      <div class="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center" style="background-color: rgba(.2, .2, .2, .4)">
        <div class="bg-white p-8" style="width: 500px">
          <h2 class="text-lg font-bold mb-4">Delete todo type</h2>
          <div class="pb-2">
            Delete ${renderTodoTypes({ className: 'selected' })} and
            merge into ${renderTodoTypes({
              className: 'merge',
              showBlank: true
            })}
          </div>

          <div class="flex mt-2">
            <button id="btn-edit-delete" class="rounded p-2 bg-red-600 text-white mr-2">Delete</button>
            <button id="btn-edit-cancel" class="rounded p-2 bg-gray-200">Cancel</button>
          </div>
        </div>
      </div>
    `);
  }

  addEventHandlers();
  restoreScroll();
  restoreActiveElement();
}

function addEventHandlers() {
  qs('#add-form').addEventListener('submit', async e => {
    e.preventDefault();
    let [nameNode, typeNode] = e.target.elements;
    let name = nameNode.value;
    let type = typeNode.selectedOptions[0].value;

    nameNode.value = '';
    typeNode.selectedIndex = 0;

    if (name === '') {
      alert("Todo can't be blank. C'mon!");
      return;
    }

    insert('todos', { name, type, order: getNumTodos() });
  });

  qs('#btn-sync').addEventListener('click', async e => {
    sync();
  });

  qs('#btn-offline-simulate').addEventListener('click', () => {
    if (uiState.offline) {
      detectOffline();
    } else {
      setOffline(true);
      clearInterval(_offlineTimer);
    }
  });

  qs('#btn-add-type').addEventListener('click', () => {
    uiState.isAddingType = true;
    render();
  });

  qs('#btn-delete-type').addEventListener('click', () => {
    uiState.isDeletingType = true;
    render();
  });

  for (let todoNode of qsa('.todo-item')) {
    todoNode.addEventListener('click', e => {
      let todo = getTodos().find(t => t.id === todoNode.dataset.id);
      if (!todo) {
        // Search the deleted todos (this could be large, so only
        // searching the existing todos first which is the common case
        // is faster
        todo = getAllTodos().find(t => t.id === todoNode.dataset.id);
      }

      uiState.editingTodo = todo;
      render();
    });
  }

  for (let btn of qsa('.btn-delete')) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      delete_('todos', e.target.dataset.id);
    });
  }

  if (uiState.editingTodo) {
    qs('#btn-edit-save').addEventListener('click', e => {
      let input = e.target.parentNode.querySelector('input');
      let value = input.value;

      update('todos', { id: uiState.editingTodo.id, name: value });
      uiState.editingTodo = null;
      render();
    });

    if (qs('#btn-edit-undelete')) {
      qs('#btn-edit-undelete').addEventListener('click', e => {
        let input = e.target.parentNode.querySelector('input');
        let value = input.value;

        update('todos', { id: uiState.editingTodo.id, tombstone: 0 });
        uiState.editingTodo = null;
        render();
      });
    }
  } else if (uiState.isAddingType) {
    qs('#btn-edit-save').addEventListener('click', e => {
      let input = e.target.parentNode.querySelector('input');
      let value = input.value;

      let colors = [
        'green',
        'blue',
        'red',
        'orange',
        'yellow',
        'teal',
        'purple',
        'pink'
      ];

      insertTodoType({
        name: value,
        color: colors[(Math.random() * colors.length) | 0]
      });
      uiState.isAddingType = false;
      render();
    });
  } else if (uiState.isDeletingType) {
    qs('#btn-edit-delete').addEventListener('click', e => {
      let modal = e.target.parentNode;
      let selected = qs('select.selected').selectedOptions[0].value;
      let merge = qs('select.merge').selectedOptions[0].value;

      if (selected === merge) {
        alert('Cannot merge type into itself');
        return;
      }

      deleteTodoType(selected, merge !== '' ? merge : null);

      uiState.isDeletingType = false;
      render();
    });
  }

  let cancel = qs('#btn-edit-cancel');
  if (cancel) {
    cancel.addEventListener('click', () => {
      uiState.editingTodo = null;
      uiState.isAddingType = false;
      uiState.isDeletingType = false;
      render();
    });
  }
}

render();

let _syncMessageTimer = null;

onSync(() => {
  render();

  let message = qs('#up-to-date');
  message.style.transition = 'none';
  message.style.opacity = 1;

  clearTimeout(_syncMessageTimer);
  _syncMessageTimer = setTimeout(() => {
    message.style.transition = 'opacity .7s';
    message.style.opacity = 0;
  }, 1000);
});

sync().then(() => {
  if (getTodoTypes().length === 0) {
    // Insert some default types
    insertTodoType({ name: 'Personal', color: 'green' });
    insertTodoType({ name: 'Work', color: 'blue' });
  }
});
detectOffline();
