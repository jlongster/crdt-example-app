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

function render() {
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';

  let root = qs('#root');
  root.style.height = '100%';

  let { offline, editingTodo, isAddingType, isDeletingType } = uiState;

  clear();

  // prettier-ignore
  append(`
    <div class="flex flex-col h-full">

      <div class="flex flex-col flex-grow items-center pt-8 overflow-auto">
        <div style="width: 700px">
          <form id="add-form" class="flex">
            <input placeholder="Add todo..." class="shadow border border-gray-300 mr-2 flex-grow p-2 rounded" />
            ${renderTodoTypes()}
            <button id="btn-add-todo" class="bg-green-600 text-white rounded p-2">Add</button>
          </form>

          <div class="mt-8" id="todos">
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center relative border-t">
        <div class="relative">
          <div id="up-to-date" class="absolute top-0 bottom-0 flex items-center" style="right: -100%; opacity: 0">
            <div class="flex flex-row items-center text-green-700 text-sm">
              <img src="check.svg" class="mr-1" style="width: 13px; height: 13px;" /> Up to date
            </div>
          </div>
          <button id="btn-sync" class="m-4 mr-6 ${offline ? 'bg-red-600' : 'bg-blue-600'} text-white rounded p-2">
            Sync ${offline ? '(offline)' : ''}
          </button>
        </div>

        <div class="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-sm">
          <button id="btn-offline-simulate" class="text-sm hover:bg-gray-300 px-2 py-1 rounded ${offline ? 'text-blue-700' : 'text-red-700'}">${offline ? 'Go online' : 'Simulate offline'}</button>
          <button id="btn-add-type" class="text-sm hover:bg-gray-300 px-2 py-1 rounded">Add type</button>
          <button id="btn-delete-type" class="text-sm hover:bg-gray-300 px-2 py-1 rounded">Delete type</button>
        </div>
      </div>
    </div>
  `);

  getTodos().forEach(todo => {
    append(
      // prettier-ignore
      `
        <div class="todo-item bg-gray-200 p-4 mb-4 rounded flex cursor-pointer" data-id="${todo.id}">
          <div class="flex-grow flex items-center">
            ${todo.name}
            <div class="text-sm rounded ${todo.type ? getColor(todo.type.color) : ''} px-2 ml-3">
              ${todo.type ? todo.type.name : ''}
            </div>
          </div>
          <button class="btn-delete" data-id="${todo.id}">X</button>
       </div>
      `,
      qs('#todos')
    );
  });

  if (editingTodo) {
    append(`
      <div class="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center" style="background-color: rgba(.2, .2, .2, .4)">
        <div class="bg-white p-8" style="width: 500px">
          <h2 class="text-lg font-bold mb-4">Edit todo</h2>
          <div class="flex">
            <input value="${editingTodo.name}" class="shadow border border-gray-300 mr-2 flex-grow p-2 rounded" />
            <button id="btn-edit-save" class="rounded p-2 bg-blue-600 text-white mr-2">Save</button>
            <button id="btn-edit-cancel" class="rounded p-2 bg-gray-200">Cancel</button>
          </div>
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
}

function wait(n) {
  return new Promise(resolve => {
    setTimeout(resolve, n);
  });
}

function addEventHandlers() {
  qs('#add-form').addEventListener('submit', async e => {
    e.preventDefault();
    let [nameNode, typeNode] = e.target.elements;
    let name = nameNode.value;
    let type = typeNode.selectedOptions[0].value;

    nameNode.value = '';
    typeNode.selectedIndex = 0;

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
      uiState.editingTodo = todo;
      render();
    });
  }

  for (let btn of qsa('.btn-delete')) {
    btn.addEventListener('click', e => {
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
  let el = document.activeElement;
  let focusedQS = el.id
    ? '#' + el.id
    : el.className
    ? '.' + el.className.replace(/ /g, '.')
    : null;

  render();

  if (focusedQS) {
    let elements = qsa(focusedQS);
    // Cheap focus management: only re-focus if there's a single
    // element, otherwise we don't know which one was focused
    if (elements.length === 1) {
      elements[0].focus();
    }
  }

  let message = qs('#up-to-date');
  message.style.transition = 'none'
  message.style.opacity = 1;

  clearTimeout(_syncMessageTimer);
  _syncMessageTimer = setTimeout(() => {
    message.style.transition = 'opacity .7s'
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
