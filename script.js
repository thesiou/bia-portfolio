/* ============================================================
   BIANCA BANU — PORTFOLIO SCRIPT
   Landing · Portfolio (category grid) · Piece detail page
   ============================================================ */

(async () => {
  try {
    if (window.ARTWORKS_READY && typeof window.ARTWORKS_READY.then === 'function') {
      await window.ARTWORKS_READY;
    }
  } catch (err) {
    console.error('Failed to load artworks data.', err);
  }

const isLanding   = document.body.id === 'page-landing';
const isPortfolio = document.body.id === 'page-portfolio';
const isPiece     = document.body.id === 'page-piece';

// ── Data helpers ──────────────────────────────────────────────
function getCategories() {
  return window.ARTWORKS?.categories ?? [];
}

function isPieceActive(piece) {
  return piece?.active !== false;
}

function getRenderablePieces(pieces) {
  return (pieces ?? [])
    .map((piece, rawIndex) => ({ piece, rawIndex }))
    .filter(({ piece }) => isPieceActive(piece));
}

// ── Escape HTML ───────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Video detection ───────────────────────────────────────────
function isVideo(src) {
  return /\.(mp4|webm|mov)$/i.test(src ?? '');
}

// ── Aspect ratio helper ───────────────────────────────────────
function applyAspectClass(img, el, landscapeClass) {
  const apply = () => {
    if (img.naturalWidth / img.naturalHeight >= 1.4)
      el.classList.add(landscapeClass);
  };
  img.complete && img.naturalWidth > 0 ? apply() : img.addEventListener('load', apply, { once: true });
}

/* ============================================================
   PORTFOLIO — CATEGORY GRID
   ============================================================ */
if (isPortfolio) {

  let categories   = [];
  let currentIndex = 0;
  let isTransition = false;

  const savedScrollY = {};
  let wheelAccumX = 0, wheelTimer = null;
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

  // ── Portfolio lightbox ────────────────────────────────────
  const lbEl      = document.getElementById('portfolio-lightbox');
  const lbMedia   = document.getElementById('portfolio-lb-media');
  const lbDetails = document.getElementById('portfolio-lb-details');
  const lbClose   = document.getElementById('portfolio-lb-close');

  function openPortfolioLightbox(src, detailsHref, catI, pieceI) {
    if (!lbEl) return;
    lbMedia.innerHTML = '';
    if (isVideo(src)) {
      const vid        = document.createElement('video');
      vid.src          = src;
      vid.autoplay     = true;
      vid.loop         = true;
      vid.muted        = true;
      vid.playsInline  = true;
      vid.className    = 'lb-video';
      lbMedia.appendChild(vid);
    } else {
      const img     = document.createElement('img');
      img.src       = src;
      img.alt       = '';
      img.className = 'lb-img';
      lbMedia.appendChild(img);
    }
    if (detailsHref && lbDetails) {
      lbDetails.href    = detailsHref;
      lbDetails.hidden  = false;
      lbDetails.onclick = () => {
        sessionStorage.setItem('returnScroll', JSON.stringify({ cat: catI, piece: pieceI }));
      };
    } else if (lbDetails) {
      lbDetails.hidden = true;
    }
    lbEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePortfolioLightbox() {
    if (!lbEl) return;
    lbEl.classList.remove('open');
    document.body.style.overflow = '';
    const vid = lbMedia?.querySelector('video');
    if (vid) vid.pause();
  }

  lbClose?.addEventListener('click', closePortfolioLightbox);
  lbEl?.addEventListener('click', e => { if (e.target === lbEl) closePortfolioLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lbEl?.classList.contains('open')) closePortfolioLightbox();
  });

  // ── Intro overlay ─────────────────────────────────────────
  (() => {
    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;
    if (sessionStorage.getItem('introSeen')) {
      overlay.style.display = 'none';
      return;
    }
    sessionStorage.setItem('introSeen', '1');

    const pieces = overlay.querySelectorAll('.intro-piece-inner');

    // Pieces drift up and fade in, staggered
    pieces.forEach((el, i) => {
      setTimeout(() => {
        el.style.opacity   = '1';
        el.style.translate = '0 0';
      }, 200 + i * 320);
    });

    // Auto-dismiss: wait for last piece to finish fading in, then hold
    const lastPieceFinish = 200 + (pieces.length - 1) * 320 + 720;
    const holdTime        = 800;

    function dismissIntro() {
      if (overlay.dataset.dismissed) return;
      overlay.dataset.dismissed = '1';

      // Stagger pieces out: drift up + fade
      pieces.forEach((el, i) => {
        setTimeout(() => {
          el.style.opacity   = '0';
          el.style.translate = '0 -20px';
        }, i * 55);
      });

      // Once all pieces have started leaving, fade the overlay itself
      const allStarted = (pieces.length - 1) * 55 + 180;
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 500);
      }, allStarted);
    }

    setTimeout(dismissIntro, lastPieceFinish + holdTime);
    overlay.addEventListener('click', dismissIntro);
  })();

  // ── Init ─────────────────────────────────────────────────
  (() => {
    categories = getCategories();
    const track      = document.getElementById('slides-track');
    const emptyState = document.getElementById('empty-state');

    if (!categories.length) {
      emptyState.hidden = false;
      const nav = document.getElementById('portfolio-nav');
      if (nav) nav.style.display = 'none';
      return;
    }

    categories.forEach((cat, i) => {
      savedScrollY[i] = 0;
      track.appendChild(buildCategorySlide(cat, i));
    });

    const counterTotal = document.getElementById('counter-total');
    if (counterTotal) counterTotal.textContent = pad(categories.length);
    buildTabs();

    // Restore category position when returning from a piece page
    const params   = new URLSearchParams(window.location.search);
    const catParam = parseInt(params.get('cat') ?? '0', 10);
    if (catParam > 0 && catParam < categories.length) {
      track.style.transition = 'none';
      track.style.transform  = `translateX(calc(${catParam} * -100vw))`;
      currentIndex = catParam;
      requestAnimationFrame(() => { track.style.transition = ''; });
    }

    // Restore scroll position within a category when returning from a piece page
    const returnScroll = JSON.parse(sessionStorage.getItem('returnScroll') ?? 'null');
    sessionStorage.removeItem('returnScroll');
    if (returnScroll?.piece > 0 && returnScroll.cat === currentIndex) {
      const slide = document.querySelector(`.slide[data-index="${currentIndex}"]`);
      if (slide) requestAnimationFrame(() => {
        slide.scrollTop = returnScroll.piece * window.innerHeight;
      });
    }

    updateUI();
    bindKeyboard();
    bindWheel();
    // Only bind touch swipe on non-touch devices — mobile uses chevron buttons
    if (!window.matchMedia('(hover: none)').matches) bindTouch();

    if (window.matchMedia('(hover: none)').matches) {
      initPieceDots();
      bindSlideScrollDots();
      showSwipeHint();
    }
  })();

  // ── Build links slide ─────────────────────────────────────
  function buildLinksSlide(cat, catIndex) {
    const slide = document.createElement('div');
    slide.className = 'slide slide-links';
    slide.dataset.index = catIndex;

    const inner = document.createElement('div');
    inner.className = 'links-inner';

    const heading = document.createElement('p');
    heading.className = 'links-heading';
    heading.textContent = 'Find me';
    inner.appendChild(heading);

    (cat.links ?? []).forEach(link => {
      if (!link.url) return; // skip empty placeholders
      const a = document.createElement('a');
      a.className = 'link-row';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      const title = document.createElement('span');
      title.className = 'link-title';
      title.textContent = link.title;

      const arrow = document.createElement('span');
      arrow.className = 'link-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13L13 3M13 3H5M13 3v8"/></svg>`;

      a.appendChild(title);
      a.appendChild(arrow);
      inner.appendChild(a);
    });

    slide.appendChild(inner);
    return slide;
  }

  // ── Build subcategory slide ("Other Fun Stuff") ───────────
  function buildSubcategorySlide(cat, catIndex) {
    const slide         = document.createElement('div');
    slide.className     = 'slide';
    slide.dataset.index = catIndex;

    const grid = document.createElement('div');
    grid.className      = 'slide-grid';
    grid.dataset.pieces = cat.subcategories.length;
    grid.dataset.layout = '2x2';

    cat.subcategories.forEach((sub, subIndex) => {
      const card      = document.createElement('div');
      card.className  = 'piece-card subcat-card' + (sub.externalLink ? ' external' : '');

      // Image area
      const imgWrap     = document.createElement('div');
      imgWrap.className = 'subcat-img-wrap';
      const previewSrc  = typeof sub.preview === 'string' ? sub.preview : (sub.preview ?? [])[0];
      if (previewSrc) {
        const img   = document.createElement('img');
        img.src     = previewSrc;
        img.alt     = sub.title;
        img.loading = 'lazy';
        imgWrap.appendChild(img);
      }
      card.appendChild(imgWrap);

      // Text panel
      const panel       = document.createElement('div');
      panel.className   = 'subcat-panel';

      const titleEl     = document.createElement('span');
      titleEl.className = 'subcat-panel-title';
      titleEl.textContent = sub.title;

      const arrowEl     = document.createElement('span');
      arrowEl.className = 'subcat-panel-arrow';
      arrowEl.setAttribute('aria-hidden', 'true');
      arrowEl.innerHTML = sub.externalLink
        ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13L13 3M13 3H5M13 3v8"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

      panel.appendChild(titleEl);
      panel.appendChild(arrowEl);
      card.appendChild(panel);

      // Click
      card.addEventListener('click', () => {
        if (sub.externalLink) {
          window.open(sub.externalLink, '_blank');
        } else {
          window.location.href = `piece.html?cat=${catIndex}&sub=${subIndex}`;
        }
      });

      grid.appendChild(card);
    });

    slide.appendChild(grid);
    return slide;
  }

  // ── Build footer (injected into each slide) ──────────────
  function buildFooter() {
    const footer = document.createElement('footer');
    footer.className = 'slide-footer';
    footer.innerHTML =
      `<a href="https://linktr.ee/lunaarts" target="_blank" rel="noopener noreferrer" class="footer-brand">` +
        `<img src="logo.png" alt="" class="footer-brand-logo" aria-hidden="true" />` +
        `<span class="footer-brand-name">Bianca Banu</span>` +
      `</a>` +
      `<div class="footer-icons">` +
        `<a href="https://www.instagram.com/luna_being_productive" target="_blank" rel="noopener noreferrer" aria-label="Instagram">` +
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>` +
        `</a>` +
        `<a href="https://www.artstation.com/lunaazx" target="_blank" rel="noopener noreferrer" aria-label="ArtStation">` +
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 20.5L12 3l10 17.5H2z"/><path d="M7 14h10"/></svg>` +
        `</a>` +
        `<a href="https://www.behance.net/lunaarts" target="_blank" rel="noopener noreferrer" aria-label="Behance">` +
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h6a3.5 3.5 0 0 1 0 7H5V4z"/><path d="M5 11h7a4 4 0 0 1 0 8H5V11z"/><line x1="14.5" y1="7" x2="20" y2="7"/></svg>` +
        `</a>` +
        `<a href="https://linktr.ee/lunaarts" target="_blank" rel="noopener noreferrer" aria-label="Linktree">` +
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>` +
        `</a>` +
      `</div>`;
    return footer;
  }

  // ── Build a category slide ────────────────────────────────
  function buildCategorySlide(cat, catIndex) {
    if (cat.links)         return buildLinksSlide(cat, catIndex);
    if (cat.subcategories) return buildSubcategorySlide(cat, catIndex);

    const slide         = document.createElement('div');
    slide.className     = 'slide';
    slide.dataset.index = catIndex;

    if (cat.sections) {
      cat.sections.forEach((section, sectionIndex) => {
        const layout  = section.gridLayout ?? cat.gridLayout;
        const useLazy = layout === 'pages';
        const sectionPieces = getRenderablePieces(section.pieces ?? []);

        if (section.title) {
          const label = document.createElement('div');
          label.className = 'slide-section-label';
          label.textContent = section.title;
          slide.appendChild(label);
        }
        const grid = document.createElement('div');
        grid.className = 'slide-grid';
        grid.dataset.pieces = sectionPieces.length;
        if (layout) grid.dataset.layout = layout;
        sectionPieces.forEach(({ piece, rawIndex }) => {
          grid.appendChild(buildPieceCard(piece, catIndex, rawIndex, {
            lazy: useLazy,
            sectionIndex
          }));
        });
        setupVideoGrid(grid);
        slide.appendChild(grid);
      });
      setupLazyLoading(slide);
    } else {
      const pieces = getRenderablePieces(cat.pieces ?? []);
      const limit  = cat.gridLayout === 'compact' ? pieces.length : 5;
      const visiblePieces = pieces.slice(0, limit);
      const count  = visiblePieces.length;

      const grid = document.createElement('div');
      grid.className = 'slide-grid';
      grid.dataset.pieces = count;
      if (cat.gridLayout) grid.dataset.layout = cat.gridLayout;

      visiblePieces.forEach(({ piece, rawIndex }) => {
        grid.appendChild(buildPieceCard(piece, catIndex, rawIndex));
      });

      setupVideoGrid(grid);
      slide.appendChild(grid);
    }

    slide.appendChild(buildFooter());
    return slide;
  }

  // ── Build a piece card ────────────────────────────────────
  function buildPieceCard(piece, catIndex, pieceIndex, opts = {}) {
    const card     = document.createElement('div');
    card.className = 'piece-card';

    if (piece.mainImage) {
      if (isVideo(piece.mainImage)) {
        const vid        = document.createElement('video');
        vid.src          = piece.mainImage;
        vid.autoplay     = false;
        vid.loop         = true;
        vid.muted        = true;
        vid.playsInline  = true;
        vid.className    = 'piece-card-media';
        vid.addEventListener('loadedmetadata', () => {
          if (vid.videoWidth / vid.videoHeight >= 1.4) card.classList.add('piece-card-landscape');
        }, { once: true });
        card.appendChild(vid);
      } else {
        const img     = document.createElement('img');
        img.alt       = piece.title ?? '';
        img.className = 'piece-card-media';
        if (opts.lazy) {
          img.dataset.src = piece.mainImage;
          card.classList.add('piece-card-shimmer');
        } else {
          img.src     = piece.mainImage;
          img.loading = catIndex === 0 && pieceIndex === 0 ? 'eager' : 'lazy';
          applyAspectClass(img, card, 'piece-card-landscape');
        }
        card.appendChild(img);
      }
    }

    if (piece.externalLink) {
      card.classList.add('piece-card-external');
      // External pieces: persistent bottom panel with platform name + arrow
      const panel = document.createElement('div');
      panel.className = 'piece-card-ext-panel';

      const label = document.createElement('span');
      label.className = 'piece-card-ext-label';
      label.textContent = piece.externalLabel ?? 'View externally';

      const arrow = document.createElement('span');
      arrow.className = 'piece-card-ext-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13L13 3M13 3H5M13 3v8"/></svg>`;

      panel.appendChild(label);
      panel.appendChild(arrow);
      card.appendChild(panel);
    } else {
      const overlay = document.createElement('div');
      overlay.className = 'piece-card-overlay';
      const title = document.createElement('span');
      title.className = 'piece-card-title';
      title.textContent = (piece.title ?? '').trim() || 'Open piece';
      overlay.appendChild(title);
      card.appendChild(overlay);
    }

    // Click → external link OR lightbox
    card.addEventListener('click', () => {
      if (piece.externalLink) {
        window.open(piece.externalLink, '_blank', 'noopener,noreferrer');
        return;
      }
      if (Number.isInteger(opts.sectionIndex)) {
        window.location.href = `piece.html?cat=${catIndex}&section=${opts.sectionIndex}&piece=${pieceIndex}`;
        return;
      }
      window.location.href = `piece.html?cat=${catIndex}&piece=${pieceIndex}`;
    });

    return card;
  }

  // ── Video grid: all play simultaneously ───────────────────
  function setupVideoGrid(grid, autostart = true) {
    const videos = Array.from(grid.querySelectorAll('video'));
    if (autostart) videos.forEach(v => v.play());
    return {
      start: () => videos.forEach(v => v.play()),
      pause: () => videos.forEach(v => v.pause()),
    };
  }

  // ── Lazy load images via IntersectionObserver ─────────────
  function setupLazyLoading(slide) {
    const lazyImgs = Array.from(slide.querySelectorAll('img[data-src]'));
    if (!lazyImgs.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.src;
        if (!src) return;
        img.src = src;
        img.removeAttribute('data-src');
        img.addEventListener('load', () => {
          img.classList.add('page-img-loaded');
          img.closest('.piece-card')?.classList.remove('piece-card-shimmer');
        }, { once: true });
        observer.unobserve(img);
      });
    }, {
      root: slide,
      rootMargin: '0px 0px 500px 0px',
      threshold: 0
    });

    lazyImgs.forEach(img => observer.observe(img));
  }

  // ── Navigation ────────────────────────────────────────────
  function navigate(direction) {
    if (isTransition) return;
    goToSlide(direction === 'next' ? currentIndex + 1 : currentIndex - 1);
  }

  function goToSlide(targetIndex) {
    if (isTransition || targetIndex === currentIndex) return;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    isTransition = true;
    document.getElementById('slides-track').style.transform =
      `translateX(calc(${targetIndex} * -100vw))`;

    currentIndex = targetIndex;
    updateUI();

    setTimeout(() => { isTransition = false; }, 750);
  }

  // ── Build nav tabs (once) ─────────────────────────────────
  function buildTabs() {
    const container = document.getElementById('nav-tabs');
    if (!container) return;
    categories.forEach((cat, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'nav-tab-sep';
        sep.textContent = '·';
        sep.setAttribute('aria-hidden', 'true');
        container.appendChild(sep);
      }
      const btn = document.createElement('button');
      btn.className = 'nav-tab' + (i === currentIndex ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
      btn.innerHTML = `<span>${esc(cat.title)}</span>`;
      btn.addEventListener('click', () => goToSlide(i));
      container.appendChild(btn);
    });
  }

  // ── UI ────────────────────────────────────────────────────
  function updateUI() { updateCounter(); updateTabs(); updateSideNav(); refreshPieceDots(); }

  function updateCounter() {
    const el = document.getElementById('counter-current');
    if (el) el.textContent = pad(currentIndex + 1);
  }

  function updateTabs() {
    document.querySelectorAll('.nav-tab').forEach((tab, i) => {
      tab.classList.toggle('active', i === currentIndex);
      tab.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
    });
  }

  function updateSideNav() {
    const prev = document.getElementById('nav-prev');
    const next = document.getElementById('nav-next');
    const prevLabel = document.getElementById('nav-prev-label');
    const nextLabel = document.getElementById('nav-next-label');

    if (prev) prev.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === categories.length - 1;
    if (prevLabel) prevLabel.textContent = currentIndex > 0 ? categories[currentIndex - 1].title : '';
    if (nextLabel) nextLabel.textContent = currentIndex < categories.length - 1 ? categories[currentIndex + 1].title : '';
  }

  // ── Keyboard ──────────────────────────────────────────────
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate('next'); }
    });
    document.getElementById('nav-prev')?.addEventListener('click', () => navigate('prev'));
    document.getElementById('nav-next')?.addEventListener('click', () => navigate('next'));
  }

  // ── Trackpad horizontal swipe ─────────────────────────────
  function bindWheel() {
    document.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.3 && Math.abs(e.deltaX) > 8) {
        e.preventDefault();
        wheelAccumX += e.deltaX;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          if (Math.abs(wheelAccumX) > 40) navigate(wheelAccumX > 0 ? 'next' : 'prev');
          wheelAccumX = 0;
        }, 60);
      }
    }, { passive: false });
  }

  // ── Piece scroll dots (mobile only) ──────────────────────
  function initPieceDots() {
    const container = document.createElement('div');
    container.id = 'piece-dots';
    document.body.appendChild(container);
    refreshPieceDots();
  }

  function refreshPieceDots() {
    const container = document.getElementById('piece-dots');
    if (!container) return;
    const cat = categories[currentIndex];
    if (!cat) return;
    const count = cat.subcategories
      ? cat.subcategories.length
      : cat.sections
        ? 0
        : Math.min(getRenderablePieces(cat.pieces ?? []).length, 5);
    container.innerHTML = '';
    if (count <= 1) { container.hidden = true; return; }
    container.hidden = false;
    const slide = document.querySelector(`.slide[data-index="${currentIndex}"]`);
    const activeIndex = slide ? Math.round(slide.scrollTop / window.innerHeight) : 0;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'piece-dot' + (i === activeIndex ? ' active' : '');
      container.appendChild(dot);
    }
  }

  function bindSlideScrollDots() {
    document.querySelectorAll('.slide').forEach((slide, catIndex) => {
      slide.addEventListener('scroll', () => {
        if (catIndex !== currentIndex) return;
        const pieceIndex = Math.round(slide.scrollTop / window.innerHeight);
        document.querySelectorAll('.piece-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === pieceIndex);
        });
      }, { passive: true });
    });
  }

  // ── One-time swipe hint (mobile only) ────────────────────
  function showSwipeHint() {
    if (sessionStorage.getItem('swipeHintSeen') || categories.length <= 1) return;
    sessionStorage.setItem('swipeHintSeen', '1');
    const hint = document.createElement('div');
    hint.id = 'swipe-hint';
    hint.textContent = 'tap arrows to browse';
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add('fade-out'), 1800);
    hint.addEventListener('transitionend', () => hint.remove(), { once: true });
  }

  // ── Touch swipe — follows finger in real-time ─────────────
  function bindTouch() {
    const container = document.getElementById('portfolio-container');
    const track     = document.getElementById('slides-track');
    let dragAxis    = null; // 'x' | 'y' | null
    let dragging    = false;

    container.addEventListener('touchstart', e => {
      if (isTransition) return;
      touchStartX    = e.touches[0].clientX;
      touchStartY    = e.touches[0].clientY;
      touchStartTime = Date.now();
      dragAxis       = null;
      dragging       = false;
      track.style.transition = 'none';
    }, { passive: true });

    container.addEventListener('touchmove', e => {
      if (isTransition) return;

      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;

      if (!dragAxis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }

      if (dragAxis === 'x') {
        e.preventDefault();
        dragging = true;

        let drag = dx;
        if ((currentIndex === 0 && dx > 0) || (currentIndex === categories.length - 1 && dx < 0)) {
          drag = dx * 0.25;
        }

        track.style.transform = `translateX(calc(${currentIndex * -100}vw + ${drag}px))`;
      }
    }, { passive: false });

    container.addEventListener('touchend', e => {
      track.style.transition = '';

      if (!dragging || dragAxis !== 'x') {
        dragAxis = null;
        dragging = false;
        return;
      }

      const dx       = e.changedTouches[0].clientX - touchStartX;
      const dt       = Math.max(1, Date.now() - touchStartTime);
      const velocity = Math.abs(dx) / dt;

      if (Math.abs(dx) > window.innerWidth * 0.18 || velocity > 0.3) {
        navigate(dx < 0 ? 'next' : 'prev');
      } else {
        track.style.transform = `translateX(calc(${currentIndex * -100}vw))`;
      }

      dragAxis = null;
      dragging = false;
    }, { passive: true });
  }
}

/* ============================================================
   PIECE DETAIL PAGE
   ============================================================ */
if (isPiece) {
  const params     = new URLSearchParams(window.location.search);
  const catIndex   = parseInt(params.get('cat')   ?? '0', 10);
  const pieceIndex = parseInt(params.get('piece') ?? '0', 10);
  const subParam   = params.get('sub');
  const sectionParam = params.get('section');

  const categories = getCategories();
  const category   = categories[catIndex];
  const sectionIndex = sectionParam === null ? null : parseInt(sectionParam, 10);

  // ── Shared lightbox ───────────────────────────────────────
  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = lightbox?.querySelector('img');
  const lightboxClose = document.getElementById('lightbox-close');

  function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // ── Subcategory gallery view ──────────────────────────────
  if (subParam !== null) {
    const sub = category?.subcategories?.[parseInt(subParam, 10)];
    if (!sub) {
      document.getElementById('piece-title').textContent = 'Not found.';
    } else {
      document.title = `${sub.title} — Bianca Banu`;
      document.body.classList.add('page-subcategory');

      const backLink = document.getElementById('piece-back');
      if (backLink) backLink.href = `portfolio.html?cat=${catIndex}`;
      const backLabel = document.getElementById('piece-back-label');
      if (backLabel) backLabel.textContent = 'Back';

      document.getElementById('piece-title').textContent = sub.title;
      document.getElementById('piece-year').textContent  = '';

      const detailEl = document.getElementById('piece-detail-images');
      (sub.pieces ?? []).forEach(src => {
        const fig   = document.createElement('figure');
        const img   = document.createElement('img');
        img.src     = src;
        img.alt     = '';
        img.loading = 'eager';
        fig.appendChild(img);
        fig.addEventListener('click', () => openLightbox(src));
        detailEl.appendChild(fig);
      });
    }

  // ── Regular piece view ────────────────────────────────────
  } else {
  const sectionPieces = Number.isInteger(sectionIndex) ? category?.sections?.[sectionIndex]?.pieces : null;
  const piece = (sectionPieces ?? category?.pieces)?.[pieceIndex];

  if (!piece || !isPieceActive(piece)) {
    document.getElementById('piece-title').textContent = 'Piece not found.';
  } else {
    document.title = `${piece.title} — Bianca Banu`;

    const backLabel = document.getElementById('piece-back-label');
    if (backLabel) backLabel.textContent = 'Back';

    const sibCat = document.getElementById('piece-sibling-category');
    if (sibCat) sibCat.textContent = category.title;

    const backLink = document.getElementById('piece-back');
    if (backLink) backLink.href = `portfolio.html?cat=${catIndex}`;
    const backBottom = document.getElementById('piece-back-bottom');
    if (backBottom) backBottom.href = `portfolio.html?cat=${catIndex}`;
    const backBottomLabel = document.getElementById('piece-back-bottom-label');
    if (backBottomLabel) backBottomLabel.textContent = `Back to ${category.title}`;
    const backGrid = document.getElementById('piece-back-grid');
    if (backGrid) backGrid.href = `portfolio.html?cat=${catIndex}`;

    // Expand toggle
    const expandBtn = document.getElementById('piece-expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        document.body.classList.toggle('piece-expanded');
      });
    }

    // Hero image / video
    if (piece.mainImage) {
      const hero = document.getElementById('piece-hero');

      if (isVideo(piece.mainImage)) {
        document.getElementById('piece-img-bg').style.display = 'none';
        document.getElementById('piece-img').style.display    = 'none';
        const vid       = document.createElement('video');
        vid.src         = piece.mainImage;
        vid.autoplay    = true;
        vid.loop        = true;
        vid.muted       = true;
        vid.playsInline = true;
        vid.id          = 'piece-video-hero';
        hero.appendChild(vid);
        hero.classList.add('hero-landscape');
      } else {
        const imgBg = document.getElementById('piece-img-bg');
        const img   = document.getElementById('piece-img');
        imgBg.src = piece.mainImage;
        img.src   = piece.mainImage;
        img.alt   = piece.title ?? '';
        applyAspectClass(img, hero, 'hero-landscape');
        const apply = () => {
          if (!hero.classList.contains('hero-landscape') && expandBtn) {
            expandBtn.hidden = false;
          }
        };
        img.complete && img.naturalWidth > 0 ? apply() : img.addEventListener('load', apply, { once: true });

        // Click hero image to open fullscreen lightbox
        img.addEventListener('click', () => openLightbox(img.src));
      }
    }

    // Header
    document.getElementById('piece-title').textContent = piece.title ?? '';
    document.getElementById('piece-year').textContent  = piece.year  ?? '';
    if (!piece.title && !piece.year) {
      document.getElementById('piece-header').style.display = 'none';
    }

    // Description
    if (piece.description) {
      document.getElementById('piece-description').textContent = piece.description;
    }

    // Detail media
    const detailEl = document.getElementById('piece-detail-images');
    if (!(piece.detailImages ?? []).length) {
      const empty = document.createElement('p');
      empty.className = 'no-detail';
      empty.textContent = 'no detailed content added for this piece yet';
      detailEl.appendChild(empty);
    }
    (piece.detailImages ?? []).forEach(item => {
      const fig  = document.createElement('figure');
      let   media;

      if (isVideo(item.src)) {
        media             = document.createElement('video');
        media.src         = item.src;
        media.controls    = true;
        media.muted       = true;
        media.playsInline = true;
        media.className   = 'detail-video';
      } else {
        media         = document.createElement('img');
        media.src     = item.src;
        media.alt     = item.caption ?? '';
        media.loading = 'eager';
        // Lightbox on click for detail images
        media.style.cursor = 'zoom-in';
        media.addEventListener('click', () => openLightbox(media.src));
      }

      fig.appendChild(media);
      if (item.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = item.caption;
        fig.appendChild(cap);
      }
      detailEl.appendChild(fig);
    });

  }
  } // end else (regular piece view)
}

// ── Utility ───────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

})();
