/**
 * ============================================================================
 * TaskAlert - Organizador de Tarefas
 * Disciplina: Desenvolvimento de Sistemas Web (EECP0036) - UFMA 2026.2
 * Aluno: Rhuã Yuri N. Sardinha | Matrícula: 20260060198
 * Trilha C: Sem API (JavaScript Vanilla e localStorage)
 * ============================================================================
 */

// Chave utilizada para persistência segura no localStorage do navegador
const STORAGE_KEY = 'taskalert_tasks_rhua';

// Estado local da aplicação (lista de tarefas em memória)
let tasks = [];

// ============================================================================
// Elementos do DOM
// ============================================================================
const taskForm = document.getElementById('task-form');
const taskNameInput = document.getElementById('task-name');
const taskCategorySelect = document.getElementById('task-category');
const taskDeadlineInput = document.getElementById('task-deadline');
const taskPrioritySelect = document.getElementById('task-priority');
const formFeedback = document.getElementById('form-feedback');

const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const tasksCounter = document.getElementById('tasks-counter');

const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');

// ============================================================================
// Funções de Armazenamento (localStorage)
// ============================================================================

/**
 * Carrega a lista de tarefas salva no localStorage.
 * Inclui tratamento defensivo com try/catch para evitar falhas caso os dados
 * estejam corrompidos no navegador.
 */
function loadTasksFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      tasks = [];
      return;
    }
    const parsedData = JSON.parse(rawData);
    if (Array.isArray(parsedData)) {
      tasks = parsedData;
    } else {
      tasks = [];
    }
  } catch (error) {
    console.warn('Falha ao ler dados do localStorage. Inicializando lista vazia.', error);
    tasks = [];
  }
}

/**
 * Salva o estado atual das tarefas no localStorage.
 */
function saveTasksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Erro ao salvar tarefas no localStorage.', error);
  }
}

// ============================================================================
// Utilitários de Data e Prazos
// ============================================================================

/**
 * Converte data no formato 'AAAA-MM-DD' para 'DD/MM/AAAA'.
 * @param {string} dateString
 * @returns {string}
 */
function formatDateBR(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Avalia o prazo da tarefa em relação à data atual e retorna o status de urgência.
 * Comparações normalizadas à meia-noite (00:00:00).
 * @param {string} deadlineString - Data no formato YYYY-MM-DD
 * @returns {'expired' | 'today' | 'tomorrow' | 'normal'}
 */
function calculateDeadlineStatus(deadlineString) {
  if (!deadlineString) return 'normal';

  const parts = deadlineString.split('-');
  if (parts.length !== 3) return 'normal';

  const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'expired'; // Prazo ultrapassado
  } else if (diffDays === 0) {
    return 'today'; // Vence no dia de hoje
  } else if (diffDays === 1) {
    return 'tomorrow'; // Vence amanhã
  }
  return 'normal'; // Dentro do prazo
}

// ============================================================================
// Feedback Visual e Validação
// ============================================================================

/**
 * Exibe uma mensagem de feedback ao usuário de forma acessível e segura.
 * Utiliza textContent para prevenir XSS.
 * @param {string} message - Texto da mensagem
 * @param {'error' | 'success'} type - Tipo do feedback
 */
function showFeedback(message, type = 'error') {
  formFeedback.textContent = message;
  formFeedback.className = `feedback-message is-visible is-${type}`;

  // Se for sucesso, oculta automaticamente após 3 segundos
  if (type === 'success') {
    setTimeout(() => {
      formFeedback.className = 'feedback-message';
      formFeedback.textContent = '';
    }, 3000);
  }
}

/**
 * Limpa a mensagem de feedback.
 */
function clearFeedback() {
  formFeedback.className = 'feedback-message';
  formFeedback.textContent = '';
}

// ============================================================================
// Renderização do DOM (Segurança com textContent)
// ============================================================================

/**
 * Constrói o elemento <li> de uma tarefa no DOM sem utilizar innerHTML para dados do usuário.
 * Toda informação digitada entra estritamente através da propriedade textContent.
 * @param {Object} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item';
  li.dataset.id = task.id;

  // Destaque visual por prioridade
  const priorityClass = `priority-${task.priority.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;
  li.classList.add(priorityClass);

  // Alerta e destaque de prazos
  const deadlineStatus = calculateDeadlineStatus(task.deadline);
  if (!task.completed) {
    if (deadlineStatus === 'expired') {
      li.classList.add('is-expired');
    } else if (deadlineStatus === 'today' || deadlineStatus === 'tomorrow') {
      li.classList.add('is-urgent');
    }
  }

  // Destaque de tarefa concluída
  if (task.completed) {
    li.classList.add('is-completed');
  }

  // Container do conteúdo
  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  // Botão de alternar conclusão (toggle completed)
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'task-toggle-btn';
  toggleBtn.setAttribute('aria-label', task.completed ? 'Marcar tarefa como pendente' : 'Marcar tarefa como concluída');
  toggleBtn.title = task.completed ? 'Marcar como pendente' : 'Marcar como concluída';
  toggleBtn.textContent = '✓';
  toggleBtn.addEventListener('click', () => toggleTaskCompleted(task.id));

  // Detalhes da tarefa (título e metadados)
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'task-details';

  const titleEl = document.createElement('h3');
  titleEl.className = 'task-title';
  titleEl.textContent = task.name; // Inserção segura via textContent

  const metaDiv = document.createElement('div');
  metaDiv.className = 'task-meta';

  // Badge da categoria
  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-category';
  categoryBadge.textContent = task.category;

  // Badge de prioridade
  const priorityBadge = document.createElement('span');
  priorityBadge.className = `badge badge-${priorityClass}`;
  priorityBadge.textContent = `Prioridade: ${task.priority}`;

  // Badge de prazo
  const deadlineBadge = document.createElement('span');
  deadlineBadge.className = 'badge badge-deadline';
  deadlineBadge.textContent = `Prazo: ${formatDateBR(task.deadline)}`;

  metaDiv.appendChild(categoryBadge);
  metaDiv.appendChild(priorityBadge);
  metaDiv.appendChild(deadlineBadge);

  // Alerta visual de vencimento / urgência
  if (!task.completed) {
    if (deadlineStatus === 'expired') {
      const alertBadge = document.createElement('span');
      alertBadge.className = 'badge badge-alert-expired';
      alertBadge.textContent = '⚠️ Vencida';
      metaDiv.appendChild(alertBadge);
    } else if (deadlineStatus === 'today') {
      const alertBadge = document.createElement('span');
      alertBadge.className = 'badge badge-alert-warning';
      alertBadge.textContent = '⚡ Vence hoje!';
      metaDiv.appendChild(alertBadge);
    } else if (deadlineStatus === 'tomorrow') {
      const alertBadge = document.createElement('span');
      alertBadge.className = 'badge badge-alert-warning';
      alertBadge.textContent = '⏳ Vence amanhã';
      metaDiv.appendChild(alertBadge);
    }
  }

  detailsDiv.appendChild(titleEl);
  detailsDiv.appendChild(metaDiv);

  contentDiv.appendChild(toggleBtn);
  contentDiv.appendChild(detailsDiv);

  // Ações da tarefa (botão de exclusão)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-delete';
  deleteBtn.setAttribute('aria-label', `Excluir tarefa "${task.name}"`);
  deleteBtn.title = 'Excluir tarefa';
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  actionsDiv.appendChild(deleteBtn);

  li.appendChild(contentDiv);
  li.appendChild(actionsDiv);

  return li;
}

/**
 * Renderiza a lista de tarefas aplicando os filtros ativos.
 */
function renderTasks() {
  // Limpa os nós existentes na lista
  while (taskList.firstChild) {
    taskList.removeChild(taskList.firstChild);
  }

  const selectedCategory = filterCategory.value;
  const selectedStatus = filterStatus.value;

  // Filtragem
  const filteredTasks = tasks.filter(task => {
    const matchCategory = selectedCategory === 'todas' || task.category === selectedCategory;
    const matchStatus =
      selectedStatus === 'todas' ||
      (selectedStatus === 'pendentes' && !task.completed) ||
      (selectedStatus === 'concluidas' && task.completed);

    return matchCategory && matchStatus;
  });

  // Atualiza contador de tarefas
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  tasksCounter.textContent = `${totalCount} ${totalCount === 1 ? 'tarefa' : 'tarefas'} (${pendingCount} pendente${pendingCount === 1 ? '' : 's'})`;

  // Exibição do estado vazio ou dos itens
  if (filteredTasks.length === 0) {
    emptyState.classList.add('is-visible');
  } else {
    emptyState.classList.remove('is-visible');
    filteredTasks.forEach(task => {
      const itemEl = createTaskElement(task);
      taskList.appendChild(itemEl);
    });
  }
}

// ============================================================================
// Ações de Negócio (Adicionar, Concluir, Remover)
// ============================================================================

/**
 * Manipula a submissão do formulário para cadastrar uma nova tarefa.
 * Valida a integridade dos dados e previne submissões vazias.
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const name = taskNameInput.value.trim();
  const category = taskCategorySelect.value;
  const deadline = taskDeadlineInput.value;
  const priority = taskPrioritySelect.value;

  // Validação: todos os campos são obrigatórios
  if (!name || !category || !deadline || !priority) {
    showFeedback('Por favor, preencha todos os campos obrigatórios para cadastrar a tarefa.', 'error');
    if (!name) taskNameInput.focus();
    return;
  }

  // Criação do novo objeto de tarefa
  const newTask = {
    id: Date.now().toString(),
    name,
    category,
    deadline,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };

  // Adiciona ao início da lista
  tasks.unshift(newTask);
  saveTasksToStorage();
  renderTasks();

  // Limpa formulário e exibe confirmação
  taskForm.reset();
  showFeedback('Tarefa adicionada com sucesso!', 'success');
  taskNameInput.focus();
}

/**
 * Alterna o estado de conclusão de uma tarefa.
 * @param {string} taskId
 */
function toggleTaskCompleted(taskId) {
  tasks = tasks.map(task => {
    if (task.id === taskId) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasksToStorage();
  renderTasks();
}

/**
 * Remove uma tarefa da lista.
 * @param {string} taskId
 */
function deleteTask(taskId) {
  tasks = tasks.filter(task => task.id !== taskId);
  saveTasksToStorage();
  renderTasks();
}

// ============================================================================
// Event Listeners e Inicialização
// ============================================================================

taskForm.addEventListener('submit', handleFormSubmit);

// Limpa mensagens de erro ao digitar
taskNameInput.addEventListener('input', () => {
  if (formFeedback.classList.contains('is-error')) {
    clearFeedback();
  }
});

filterCategory.addEventListener('change', renderTasks);
filterStatus.addEventListener('change', renderTasks);

// Inicialização da aplicação ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  loadTasksFromStorage();
  renderTasks();
});
