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
  changeIndicator: document.getElementById('change-indicator'),
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
  detailItemTemplate: document.getElementById('detail-item-template'),
  addPieceFileInput: document.getElementById('add-piece-file-input'),
  addDetailFileInput: document.getElementById('add-detail-file-input')
};

const state = {
  content: null,
  sha: null,
  lastSavedContent: null,
  collections: [],
  activeCollectionId: null,
  pendingDetailPiece: null,
  uploadBusy: false
};

function setEditorStatus(message, isError = false) {
  ui.editorStatus.textContent = message;
  ui.editorStatus.style.color = isError ? '#8e1f1f' : '#666';
}

function setUploadStatus(message, isError = false) {
  ui.uploadStatus.textContent = message;
  ui.uploadStatus.style.color = isError ? '#8e1f1f' : '#666';
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function countObjectDiffs(a, b) {
  if (a === b) return 0;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray || bIsArray) {
    if (!(aIsArray && bIsArray)) return 1;
    let total = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i += 1) {
      total += countObjectDiffs(a[i], b[i]);
    }
    total += Math.abs(a.length - b.length);
    return total;
  }

  const aIsObject = a !== null && typeof a === 'object';
  const bIsObject = b !== null && typeof b === 'object';
  if (aIsObject || bIsObject) {
    if (!(aIsObject && bIsObject)) return 1;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let total = 0;
    for (const key of keys) {
      if (!(key in a) || !(key in b)) {
        total += 1;
      } else {
        total += countObjectDiffs(a[key], b[key]);
      }
    }
    return total;
  }

  return 1;
}

function updateChangeIndicator() {
  if (!ui.changeIndicator || !state.content || !state.lastSavedContent) return;

  const changes = countObjectDiffs(state.lastSavedContent, state.content);
  if (changes === 0) {
    ui.changeIndicator.textContent = 'Up to date';
    ui.changeIndicator.classList.add('up-to-date');
    ui.changeIndicator.classList.remove('dirty');
    if (ui.saveBtn) ui.saveBtn.disabled = true;
  } else {
    ui.changeIndicator.textContent = `${changes} unsaved change${changes === 1 ? '' : 's'}`;
    ui.changeIndicator.classList.add('dirty');
    ui.changeIndicator.classList.remove('up-to-date');
    if (ui.saveBtn) ui.saveBtn.disabled = false;
  }
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

function toPreviewSrc(path) {
  const src = String(path || '').trim();
  if (!src) return '';
  if (/^(https?:)?\/\//i.test(src)) return src;
  if (src.startsWith('/')) return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  return `/${src}`;
}

function createMediaPreview(path) {
  const src = toPreviewSrc(path);
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

function getMainUploadOptions() {
  return {
    folder: ui.uploadFolder.value,
    optimize: ui.uploadOptimize.checked,
    maxSide: ui.uploadMaxSide.value,
    quality: ui.uploadQuality.value
  };
}

function setUploadBusy(isBusy) {
  state.uploadBusy = isBusy;
  ui.addPieceBtn.disabled = isBusy;
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
      updateChangeIndicator();
    });

    captionEl.addEventListener('input', () => {
      detail.caption = captionEl.value;
      updateChangeIndicator();
    });

    node.querySelector('.detail-up').addEventListener('click', () => {
      if (detailIndex === 0) return;
      swapItems(piece.detailImages, detailIndex, detailIndex - 1);
      renderPieces();
      updateChangeIndicator();
    });

    node.querySelector('.detail-down').addEventListener('click', () => {
      if (detailIndex >= piece.detailImages.length - 1) return;
      swapItems(piece.detailImages, detailIndex, detailIndex + 1);
      renderPieces();
      updateChangeIndicator();
    });

    node.querySelector('.detail-remove').addEventListener('click', () => {
      piece.detailImages.splice(detailIndex, 1);
      renderPieces();
      updateChangeIndicator();
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
      updateChangeIndicator();
    });

    titleEl.addEventListener('input', () => {
      piece.title = titleEl.value;
      updateChangeIndicator();
    });

    mainImageEl.addEventListener('input', () => {
      piece.mainImage = mainImageEl.value;
      piecePreviewEl.replaceChildren(createMediaPreview(piece.mainImage));
      updateChangeIndicator();
    });

    node.querySelector('.move-up').addEventListener('click', () => {
      if (index === 0) return;
      swapItems(pieces, index, index - 1);
      renderPieces();
      updateChangeIndicator();
    });

    node.querySelector('.move-down').addEventListener('click', () => {
      if (index >= pieces.length - 1) return;
      swapItems(pieces, index, index + 1);
      renderPieces();
      updateChangeIndicator();
    });

    node.querySelector('.remove-piece').addEventListener('click', () => {
      pieces.splice(index, 1);
      renderPieces();
      updateChangeIndicator();
    });

    node.querySelector('.add-detail-item').addEventListener('click', () => {
      if (state.uploadBusy) return;
      state.pendingDetailPiece = piece;
      ui.addDetailFileInput.value = '';
      ui.addDetailFileInput.click();
    });

    node.querySelector('.add-detail-empty').addEventListener('click', () => {
      piece.detailImages.push({ src: '', caption: '' });
      renderPieces();
      updateChangeIndicator();
      setEditorStatus('Added an empty detail row.');
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
  state.lastSavedContent = deepClone(data.content);
  state.collections = collectPieceCollections(state.content);
  state.activeCollectionId = state.collections[0]?.id || null;

  if (!state.collections.length) {
    setEditorStatus('No editable piece collections were found.', true);
    return;
  }

  renderCollectionSelect();
  renderPieces();
  updateChangeIndicator();
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
    state.lastSavedContent = deepClone(state.content);
    updateChangeIndicator();
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

function isGifFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '');
  return mime === 'image/gif' || /\.gif$/i.test(name);
}

function isOptimizableImage(file) {
  if (!file) return false;
  if (isGifFile(file)) return false;
  return Boolean(file.type) && file.type.startsWith('image/');
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

function getNormalizedUploadOptions({ folder, optimize, maxSide, quality }) {
  const normalizedFolder = String(folder || '').trim().replace(/^\/+|\/+$/g, '');
  if (!normalizedFolder.startsWith('images/')) {
    throw new Error('Folder must start with images/.');
  }

  return {
    folder: normalizedFolder,
    optimize: Boolean(optimize),
    maxSide: Math.max(800, Number(maxSide || 2560)),
    quality: Math.min(1, Math.max(0.6, Number(quality || 0.88)))
  };
}

async function uploadWithOptions({ sourceFile, folder, optimize, maxSide, quality, messagePrefix = 'upload' }) {
  if (!sourceFile) {
    throw new Error('Select a file first.');
  }

  const opts = getNormalizedUploadOptions({ folder, optimize, maxSide, quality });

  let fileToUpload = sourceFile;
  let optimized = false;

  if (opts.optimize && isOptimizableImage(sourceFile)) {
    fileToUpload = await optimizeImageFile(sourceFile, opts.maxSide, opts.quality);
    optimized = true;
  }

  const path = `${opts.folder}/${sanitizeFilename(fileToUpload.name)}`.replace(/\/{2,}/g, '/');

  const formData = new FormData();
  formData.append('path', path);
  formData.append('file', fileToUpload);
  formData.append('message', `chore(admin): ${messagePrefix} ${path}`);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Upload failed (${response.status})`);
  }

  return {
    path: payload.path,
    optimized
  };
}

async function uploadMedia(event) {
  event.preventDefault();

  const sourceFile = ui.uploadFile.files?.[0];
  if (!sourceFile) {
    setUploadStatus('Select a file first.', true);
    return;
  }

  setUploadStatus('Uploading...');
  ui.uploadResult.textContent = '';
  ui.copyUploadPathBtn.hidden = true;

  try {
    const result = await uploadWithOptions({
      sourceFile,
      folder: ui.uploadFolder.value,
      optimize: ui.uploadOptimize.checked,
      maxSide: ui.uploadMaxSide.value,
      quality: ui.uploadQuality.value,
      messagePrefix: 'upload'
    });

    const optimizedTag = result.optimized ? ' (optimized)' : '';
    setUploadStatus(`Upload complete${optimizedTag}.`);
    ui.uploadResult.textContent = result.path;
    ui.copyUploadPathBtn.hidden = false;
  } catch (error) {
    setUploadStatus(error.message, true);
  }
}

async function addNewPieceFromUpload(sourceFile) {
  const pieces = getActivePiecesArray();
  if (!Array.isArray(pieces)) {
    setEditorStatus('Cannot add piece to this collection.', true);
    return;
  }

  setUploadBusy(true);
  setEditorStatus(`Uploading "${sourceFile.name}"...`);
  try {
    const result = await uploadWithOptions({
      sourceFile,
      ...getMainUploadOptions(),
      messagePrefix: 'upload piece'
    });

    const newPiece = newPieceTemplate();
    newPiece.mainImage = result.path;
    pieces.push(newPiece);
    renderPieces();
    updateChangeIndicator();
    setEditorStatus(`New piece uploaded and added: ${result.path}`);
  } catch (error) {
    setEditorStatus(error.message, true);
  } finally {
    setUploadBusy(false);
    ui.addPieceFileInput.value = '';
  }
}

async function addDetailMediaFromUpload(sourceFile, targetPiece) {
  if (!targetPiece) {
    setEditorStatus('Could not find target piece.', true);
    return;
  }

  setUploadBusy(true);
  setEditorStatus(`Uploading detail media "${sourceFile.name}"...`);
  try {
    const result = await uploadWithOptions({
      sourceFile,
      ...getMainUploadOptions(),
      messagePrefix: 'upload detail media'
    });

    targetPiece.detailImages.push({
      src: result.path,
      caption: ''
    });
    renderPieces();
    updateChangeIndicator();
    setEditorStatus(`Detail media uploaded and added: ${result.path}`);
  } catch (error) {
    setEditorStatus(error.message, true);
  } finally {
    state.pendingDetailPiece = null;
    setUploadBusy(false);
    ui.addDetailFileInput.value = '';
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
    if (state.uploadBusy) return;
    ui.addPieceFileInput.value = '';
    ui.addPieceFileInput.click();
  });

  ui.addPieceFileInput.addEventListener('change', () => {
    const file = ui.addPieceFileInput.files?.[0];
    if (!file) return;
    addNewPieceFromUpload(file);
  });

  ui.addDetailFileInput.addEventListener('change', () => {
    const file = ui.addDetailFileInput.files?.[0];
    if (!file) return;
    addDetailMediaFromUpload(file, state.pendingDetailPiece);
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
