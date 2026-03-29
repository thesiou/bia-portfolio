const API_BASE = '/origami-api';

const ui = {
  sessionLabel: document.getElementById('session-label'),
  logoutBtn: document.getElementById('logout-btn'),
  authPanel: document.getElementById('auth-panel'),
  editorPanel: document.getElementById('editor-panel'),
  uploadPanel: document.getElementById('upload-panel'),
  collectionSelect: document.getElementById('collection-select'),
  addPieceBtn: document.getElementById('add-piece-btn'),
  saveBtn: document.getElementById('save-btn'),
  commitMessage: document.getElementById('commit-message'),
  editorStatus: document.getElementById('editor-status'),
  piecesList: document.getElementById('pieces-list'),
  uploadForm: document.getElementById('upload-form'),
  uploadFolder: document.getElementById('upload-folder'),
  uploadFile: document.getElementById('upload-file'),
  uploadStatus: document.getElementById('upload-status'),
  uploadResult: document.getElementById('upload-result'),
  pieceTemplate: document.getElementById('piece-card-template')
};

const state = {
  content: null,
  sha: null,
  collections: [],
  activeCollectionId: null
};

function setEditorStatus(message, isError = false) {
  ui.editorStatus.textContent = message;
  ui.editorStatus.style.color = isError ? '#8e1f1f' : '#666';
}

function setUploadStatus(message, isError = false) {
  ui.uploadStatus.textContent = message;
  ui.uploadStatus.style.color = isError ? '#8e1f1f' : '#666';
}

function showAuthenticated(username) {
  ui.sessionLabel.textContent = `Signed in as ${username}`;
  ui.logoutBtn.hidden = false;
  ui.authPanel.hidden = true;
  ui.editorPanel.hidden = false;
  ui.uploadPanel.hidden = false;
}

function showLoggedOut() {
  ui.sessionLabel.textContent = 'Not signed in';
  ui.logoutBtn.hidden = true;
  ui.authPanel.hidden = false;
  ui.editorPanel.hidden = true;
  ui.uploadPanel.hidden = true;
}

function getByPath(root, path) {
  return path.reduce((obj, key) => (obj == null ? undefined : obj[key]), root);
}

function collectPieceCollections(content) {
  const result = [];
  (content.categories ?? []).forEach((category, catIndex) => {
    if (Array.isArray(category.pieces)) {
      result.push({
        id: `cat-${catIndex}`,
        label: category.title || `Category ${catIndex + 1}`,
        path: ['categories', catIndex, 'pieces']
      });
    }

    (category.sections ?? []).forEach((section, sectionIndex) => {
      if (!Array.isArray(section.pieces)) return;
      const sectionTitle = section.title || `Section ${sectionIndex + 1}`;
      result.push({
        id: `cat-${catIndex}-section-${sectionIndex}`,
        label: `${category.title || `Category ${catIndex + 1}`} / ${sectionTitle}`,
        path: ['categories', catIndex, 'sections', sectionIndex, 'pieces']
      });
    });
  });
  return result;
}

function ensurePieceDefaults(piece) {
  if (!Array.isArray(piece.software)) piece.software = [];
  if (!Array.isArray(piece.detailImages)) piece.detailImages = [];
  if (typeof piece.title !== 'string') piece.title = '';
  if (typeof piece.year !== 'string') piece.year = '';
  if (typeof piece.mainImage !== 'string') piece.mainImage = '';
  if (typeof piece.description !== 'string') piece.description = '';
}

function newPieceTemplate() {
  return {
    active: true,
    title: '',
    year: '',
    software: ['Clip Studio Paint'],
    mainImage: '',
    description: '',
    detailImages: []
  };
}

function renderCollectionSelect() {
  ui.collectionSelect.innerHTML = '';
  state.collections.forEach(collection => {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = collection.label;
    ui.collectionSelect.appendChild(option);
  });

  if (!state.activeCollectionId && state.collections.length) {
    state.activeCollectionId = state.collections[0].id;
  }

  ui.collectionSelect.value = state.activeCollectionId || '';
}

function getActiveCollection() {
  return state.collections.find(collection => collection.id === state.activeCollectionId) || null;
}

function getActivePiecesArray() {
  const collection = getActiveCollection();
  if (!collection) return null;
  return getByPath(state.content, collection.path);
}

function swapPieces(pieces, fromIndex, toIndex) {
  const temp = pieces[fromIndex];
  pieces[fromIndex] = pieces[toIndex];
  pieces[toIndex] = temp;
}

function renderPieces() {
  const pieces = getActivePiecesArray();
  ui.piecesList.innerHTML = '';

  if (!Array.isArray(pieces)) {
    setEditorStatus('Selected collection has no editable pieces.', true);
    return;
  }

  if (!pieces.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No pieces in this collection yet.';
    ui.piecesList.appendChild(empty);
    return;
  }

  pieces.forEach((piece, index) => {
    ensurePieceDefaults(piece);

    const node = ui.pieceTemplate.content.firstElementChild.cloneNode(true);

    const indexEl = node.querySelector('.piece-index');
    const activeEl = node.querySelector('.piece-active');
    const titleEl = node.querySelector('.piece-title');
    const yearEl = node.querySelector('.piece-year');
    const mainImageEl = node.querySelector('.piece-main-image');
    const softwareEl = node.querySelector('.piece-software');
    const descriptionEl = node.querySelector('.piece-description');

    indexEl.textContent = `Piece ${index + 1}`;
    activeEl.checked = piece.active !== false;
    titleEl.value = piece.title;
    yearEl.value = piece.year;
    mainImageEl.value = piece.mainImage;
    softwareEl.value = piece.software.join(', ');
    descriptionEl.value = piece.description;

    activeEl.addEventListener('change', () => {
      piece.active = activeEl.checked;
    });

    titleEl.addEventListener('input', () => {
      piece.title = titleEl.value;
    });

    yearEl.addEventListener('input', () => {
      piece.year = yearEl.value;
    });

    mainImageEl.addEventListener('input', () => {
      piece.mainImage = mainImageEl.value;
    });

    softwareEl.addEventListener('input', () => {
      piece.software = softwareEl.value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    });

    descriptionEl.addEventListener('input', () => {
      piece.description = descriptionEl.value;
    });

    node.querySelector('.move-up').addEventListener('click', () => {
      if (index === 0) return;
      swapPieces(pieces, index, index - 1);
      renderPieces();
    });

    node.querySelector('.move-down').addEventListener('click', () => {
      if (index >= pieces.length - 1) return;
      swapPieces(pieces, index, index + 1);
      renderPieces();
    });

    node.querySelector('.remove-piece').addEventListener('click', () => {
      pieces.splice(index, 1);
      renderPieces();
    });

    ui.piecesList.appendChild(node);
  });
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function loadContent() {
  const data = await api('/content');
  state.content = data.content;
  state.sha = data.sha;
  state.collections = collectPieceCollections(state.content);
  state.activeCollectionId = state.collections[0]?.id || null;

  if (!state.collections.length) {
    setEditorStatus('No editable piece collections were found.', true);
    return;
  }

  renderCollectionSelect();
  renderPieces();
  setEditorStatus('Loaded latest content from GitHub.');
}

async function saveContent() {
  if (!state.content || !state.sha) {
    setEditorStatus('Cannot save: content not loaded.', true);
    return;
  }

  const defaultMessage = `chore(admin): update portfolio content (${new Date().toISOString().slice(0, 10)})`;
  const message = ui.commitMessage.value.trim() || defaultMessage;

  setEditorStatus('Saving...');
  try {
    const result = await api('/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: state.content,
        sha: state.sha,
        message
      })
    });

    state.sha = result.sha;
    setEditorStatus(`Saved. Commit: ${result.commitSha}`);
  } catch (error) {
    setEditorStatus(error.message, true);
  }
}

function sanitizeFilename(name) {
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : '';
  const safeBase = base
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._()-]/g, '');
  return `${safeBase || 'file'}${ext.toLowerCase()}`;
}

async function uploadMedia(event) {
  event.preventDefault();

  const file = ui.uploadFile.files?.[0];
  if (!file) {
    setUploadStatus('Select a file first.', true);
    return;
  }

  const folder = ui.uploadFolder.value.trim().replace(/^\/+|\/+$/g, '');
  if (!folder.startsWith('images/')) {
    setUploadStatus('Folder must start with images/.', true);
    return;
  }

  const path = `${folder}/${sanitizeFilename(file.name)}`.replace(/\/{2,}/g, '/');

  const formData = new FormData();
  formData.append('path', path);
  formData.append('file', file);
  formData.append('message', `chore(admin): upload ${path}`);

  setUploadStatus('Uploading...');
  ui.uploadResult.textContent = '';

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Upload failed (${response.status})`);
    }

    setUploadStatus('Upload complete.');
    ui.uploadResult.textContent = payload.path;
  } catch (error) {
    setUploadStatus(error.message, true);
  }
}

async function refreshSessionAndBoot() {
  try {
    const session = await api('/session');
    if (!session.authenticated) {
      showLoggedOut();
      return;
    }

    showAuthenticated(session.username);
    await loadContent();
  } catch (error) {
    showLoggedOut();
    setEditorStatus(error.message, true);
  }
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (error) {
    setEditorStatus(error.message, true);
  }
  showLoggedOut();
}

function bindEvents() {
  ui.collectionSelect.addEventListener('change', () => {
    state.activeCollectionId = ui.collectionSelect.value;
    renderPieces();
  });

  ui.addPieceBtn.addEventListener('click', () => {
    const pieces = getActivePiecesArray();
    if (!Array.isArray(pieces)) {
      setEditorStatus('Cannot add piece to this collection.', true);
      return;
    }

    pieces.push(newPieceTemplate());
    renderPieces();
  });

  ui.saveBtn.addEventListener('click', () => {
    saveContent();
  });

  ui.uploadForm.addEventListener('submit', uploadMedia);
  ui.logoutBtn.addEventListener('click', logout);
}

bindEvents();
refreshSessionAndBoot();
