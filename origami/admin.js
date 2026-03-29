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
  uploadOptimize: document.getElementById('upload-optimize'),
  uploadMaxSide: document.getElementById('upload-max-side'),
  uploadQuality: document.getElementById('upload-quality'),
  uploadStatus: document.getElementById('upload-status'),
  uploadResult: document.getElementById('upload-result'),
  copyUploadPathBtn: document.getElementById('copy-upload-path'),
  pieceTemplate: document.getElementById('piece-card-template'),
  detailItemTemplate: document.getElementById('detail-item-template')
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

function normalizeDetailItem(item) {
  if (typeof item === 'string') return { src: item, caption: '' };
  if (!item || typeof item !== 'object') return { src: '', caption: '' };
  return {
    src: typeof item.src === 'string' ? item.src : '',
    caption: typeof item.caption === 'string' ? item.caption : ''
  };
}

function ensurePieceDefaults(piece) {
  if (typeof piece.title !== 'string') piece.title = '';
  if (typeof piece.mainImage !== 'string') piece.mainImage = '';

  if (!Array.isArray(piece.detailImages)) {
    piece.detailImages = [];
  }
  piece.detailImages = piece.detailImages.map(normalizeDetailItem);
}

function newPieceTemplate() {
  return {
    active: true,
    title: '',
    year: '',
    software: [],
    mainImage: '',
    description: '',
    detailImages: []
  };
}

function isVideoPath(path) {
  return /\.(mp4|mov|webm|m4v)$/i.test(path || '');
}

function createMediaPreview(path) {
  const src = String(path || '').trim();
  if (!src) {
    const empty = document.createElement('span');
    empty.className = 'preview-empty';
    empty.textContent = 'No preview';
    return empty;
  }

  if (isVideoPath(src)) {
    const video = document.createElement('video');
    video.className = 'preview-media';
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    return video;
  }

  const img = document.createElement('img');
  img.className = 'preview-media';
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  return img;
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

function swapItems(items, fromIndex, toIndex) {
  const tmp = items[fromIndex];
  items[fromIndex] = items[toIndex];
  items[toIndex] = tmp;
}

function renderDetailItems(detailsContainer, piece) {
  detailsContainer.innerHTML = '';

  if (!piece.detailImages.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No detail media yet.';
    detailsContainer.appendChild(empty);
    return;
  }

  piece.detailImages.forEach((detail, detailIndex) => {
    const node = ui.detailItemTemplate.content.firstElementChild.cloneNode(true);

    const previewEl = node.querySelector('.detail-preview');
    const srcEl = node.querySelector('.detail-src');
    const captionEl = node.querySelector('.detail-caption');

    previewEl.replaceChildren(createMediaPreview(detail.src));
    srcEl.value = detail.src;
    captionEl.value = detail.caption;

    srcEl.addEventListener('input', () => {
      detail.src = srcEl.value;
      previewEl.replaceChildren(createMediaPreview(detail.src));
    });

    captionEl.addEventListener('input', () => {
      detail.caption = captionEl.value;
    });

    node.querySelector('.detail-up').addEventListener('click', () => {
      if (detailIndex === 0) return;
      swapItems(piece.detailImages, detailIndex, detailIndex - 1);
      renderPieces();
    });

    node.querySelector('.detail-down').addEventListener('click', () => {
      if (detailIndex >= piece.detailImages.length - 1) return;
      swapItems(piece.detailImages, detailIndex, detailIndex + 1);
      renderPieces();
    });

    node.querySelector('.detail-remove').addEventListener('click', () => {
      piece.detailImages.splice(detailIndex, 1);
      renderPieces();
    });

    detailsContainer.appendChild(node);
  });
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
    const mainImageEl = node.querySelector('.piece-main-image');
    const piecePreviewEl = node.querySelector('.piece-preview');
    const detailsListEl = node.querySelector('.details-list');

    indexEl.textContent = `Piece ${index + 1}`;
    activeEl.checked = piece.active !== false;
    titleEl.value = piece.title;
    mainImageEl.value = piece.mainImage;
    piecePreviewEl.replaceChildren(createMediaPreview(piece.mainImage));

    activeEl.addEventListener('change', () => {
      piece.active = activeEl.checked;
    });

    titleEl.addEventListener('input', () => {
      piece.title = titleEl.value;
    });

    mainImageEl.addEventListener('input', () => {
      piece.mainImage = mainImageEl.value;
      piecePreviewEl.replaceChildren(createMediaPreview(piece.mainImage));
    });

    node.querySelector('.move-up').addEventListener('click', () => {
      if (index === 0) return;
      swapItems(pieces, index, index - 1);
      renderPieces();
    });

    node.querySelector('.move-down').addEventListener('click', () => {
      if (index >= pieces.length - 1) return;
      swapItems(pieces, index, index + 1);
      renderPieces();
    });

    node.querySelector('.remove-piece').addEventListener('click', () => {
      pieces.splice(index, 1);
      renderPieces();
    });

    node.querySelector('.add-detail-item').addEventListener('click', () => {
      piece.detailImages.push({ src: '', caption: '' });
      renderPieces();
    });

    renderDetailItems(detailsListEl, piece);
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

function isOptimizableImage(file) {
  return Boolean(file?.type) && file.type.startsWith('image/');
}

async function optimizeImageFile(file, maxSide, quality) {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  const longestSide = Math.max(width, height);
  if (longestSide > maxSide) {
    const scale = maxSide / longestSide;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context for optimization.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === 'function') bitmap.close();

  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/webp', quality);
  });

  if (!blob) {
    throw new Error('Image optimization failed.');
  }

  const base = sanitizeFilename(file.name).replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.webp`, { type: 'image/webp' });
}

async function uploadMedia(event) {
  event.preventDefault();

  const sourceFile = ui.uploadFile.files?.[0];
  if (!sourceFile) {
    setUploadStatus('Select a file first.', true);
    return;
  }

  const folder = ui.uploadFolder.value.trim().replace(/^\/+|\/+$/g, '');
  if (!folder.startsWith('images/')) {
    setUploadStatus('Folder must start with images/.', true);
    return;
  }

  let fileToUpload = sourceFile;
  const optimize = ui.uploadOptimize.checked;
  const maxSide = Math.max(800, Number(ui.uploadMaxSide.value || 2560));
  const quality = Math.min(1, Math.max(0.6, Number(ui.uploadQuality.value || 0.88)));

  if (optimize && isOptimizableImage(sourceFile)) {
    try {
      setUploadStatus('Optimizing image...');
      fileToUpload = await optimizeImageFile(sourceFile, maxSide, quality);
    } catch (error) {
      fileToUpload = sourceFile;
      setUploadStatus(`Optimization skipped: ${error.message}`);
    }
  }

  const path = `${folder}/${sanitizeFilename(fileToUpload.name)}`.replace(/\/{2,}/g, '/');

  const formData = new FormData();
  formData.append('path', path);
  formData.append('file', fileToUpload);
  formData.append('message', `chore(admin): upload ${path}`);

  setUploadStatus('Uploading...');
  ui.uploadResult.textContent = '';
  ui.copyUploadPathBtn.hidden = true;

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

    const optimizedTag = fileToUpload !== sourceFile ? ' (optimized)' : '';
    setUploadStatus(`Upload complete${optimizedTag}.`);
    ui.uploadResult.textContent = payload.path;
    ui.copyUploadPathBtn.hidden = false;
  } catch (error) {
    setUploadStatus(error.message, true);
  }
}

async function refreshSessionAndBoot() {
  let session;
  try {
    session = await api('/session');
  } catch (error) {
    showLoggedOut();
    setEditorStatus(`Session check failed: ${error.message}`, true);
    return;
  }

  if (!session.authenticated) {
    showLoggedOut();
    return;
  }

  showAuthenticated(session.username);
  try {
    await loadContent();
  } catch (error) {
    setEditorStatus(`Signed in, but content could not load: ${error.message}`, true);
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

  ui.copyUploadPathBtn.addEventListener('click', async () => {
    const value = ui.uploadResult.textContent.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setUploadStatus('Path copied.');
    } catch {
      setUploadStatus('Could not copy path automatically. Please copy manually.', true);
    }
  });
}

bindEvents();
refreshSessionAndBoot();
