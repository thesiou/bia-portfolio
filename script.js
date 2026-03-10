/* ============================================================
   BIANCA BANU — PORTFOLIO SCRIPT
   Landing · Portfolio (category grid) · Piece detail page
   ============================================================ */

const isLanding   = document.body.id === 'page-landing';
const isPortfolio = document.body.id === 'page-portfolio';
const isPiece     = document.body.id === 'page-piece';

// ── Data helpers ──────────────────────────────────────────────
function getCategories() {
  return window.ARTWORKS?.categories ?? [];
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
   LANDING PAGE
   ============================================================ */
if (isLanding) {
  const src = window.ARTWORKS?.featuredImage ?? getCategories()[0]?.pieces[0]?.mainImage;

  if (src) {
    if (isVideo(src)) {
      // Swap the img for a video element
      const bg  = document.getElementById('landing-bg');
      const img = document.getElementById('landing-img');
      const vid        = document.createElement('video');
      vid.id           = 'landing-img';
      vid.autoplay     = true;
      vid.loop         = true;
      vid.muted        = true;
      vid.playsInline  = true;
      vid.className    = img.className + ' loaded';
      vid.src          = src;
      bg.replaceChild(vid, img);
    } else {
      const img  = document.getElementById('landing-img');
      img.onload = () => img.classList.add('loaded');
      img.src    = src;
    }
  }

  // Entrance fade-in for info + CTA
  const parallaxEls = [
    document.getElementById('landing-info'),
    document.getElementById('landing-cta'),
  ];
  parallaxEls.forEach((el, i) => {
    if (!el) return;
    el.style.opacity    = '0';
    el.style.transition = 'opacity 0.8s ease';
    el.style.willChange = 'transform';
    setTimeout(() => { el.style.opacity = '1'; }, 250 + i * 200);
  });

  // Parallax on scroll
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY * 0.3;
        parallaxEls.forEach(el => { if (el) el.style.transform = `translateY(${-y}px)`; });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
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

    updateUI();
    bindKeyboard();
    bindWheel();
    bindTouch();
  })();

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

      // Mini 2×2 image preview
      const preview   = document.createElement('div');
      preview.className = 'subcat-preview';
      (sub.preview ?? []).slice(0, 4).forEach(src => {
        const img   = document.createElement('img');
        img.src     = src;
        img.alt     = '';
        img.loading = 'lazy';
        preview.appendChild(img);
      });
      card.appendChild(preview);

      // Label
      const label       = document.createElement('div');
      label.className   = 'subcat-label';
      label.textContent = sub.title;
      card.appendChild(label);

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

  // ── Build a category slide ────────────────────────────────
  function buildCategorySlide(cat, catIndex) {
    // Subcategory hub (e.g. "Other Fun Stuff")
    if (cat.subcategories) return buildSubcategorySlide(cat, catIndex);
    const slide         = document.createElement('div');
    slide.className     = 'slide';
    slide.dataset.index = catIndex;

    // Animation category with a featured hero video
    if (cat.featuredVideo) {
      slide.classList.add('slide-animation');

      // Hero layer — full-screen looping video (pieces[0] is the hero piece)
      const hero = document.createElement('div');
      hero.className = 'anim-hero';
      const heroVid       = document.createElement('video');
      heroVid.src         = cat.featuredVideo;
      heroVid.autoplay    = true;
      heroVid.loop        = true;
      heroVid.muted       = true;
      heroVid.playsInline = true;
      hero.appendChild(heroVid);
      // Make hero clickable to its detail page (pieces[0])
      if (cat.pieces?.[0]) {
        hero.style.cursor = 'pointer';
        hero.addEventListener('click', () => {
          window.location.href = `piece.html?cat=${catIndex}&piece=0`;
        });
      }
      slide.appendChild(hero);

      // Grid layer — hidden until toggle, uses pieces[1+]
      const gridWrap = document.createElement('div');
      gridWrap.className = 'anim-grid-wrap';
      const grid = document.createElement('div');
      grid.className = 'slide-grid';
      const gridPieces = (cat.pieces ?? []).slice(1, 5); // skip pieces[0] (hero)
      const count = Math.min(gridPieces.length, 4);
      grid.dataset.pieces = count;
      grid.dataset.layout = cat.gridLayout ?? '';
      gridPieces.forEach((piece, i) => {
        grid.appendChild(buildPieceCard(piece, catIndex, i + 1)); // offset index by 1
      });
      const gridCtrl = setupVideoGrid(grid, false); // don't autostart — hero is showing
      gridWrap.appendChild(grid);
      slide.appendChild(gridWrap);

      // Toggle button
      const btn = document.createElement('button');
      btn.className = 'anim-toggle-btn';
      btn.setAttribute('aria-label', 'Toggle animation view');
      btn.innerHTML = `
        <span class="anim-btn-state state-to-grid" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 13 13" fill="currentColor">
            <rect x="0"   y="0"   width="5.5" height="5.5" rx="0.5"/>
            <rect x="7.5" y="0"   width="5.5" height="5.5" rx="0.5"/>
            <rect x="0"   y="7.5" width="5.5" height="5.5" rx="0.5"/>
            <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="0.5"/>
          </svg>
          <span class="anim-btn-hint">More animations</span>
        </span>
        <span class="anim-btn-state state-to-full" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <path d="M1 4.5V1h3.5M8.5 1H12v3.5M12 8.5V12H8.5M4.5 12H1V8.5"/>
          </svg>
          <span class="anim-btn-hint">Main animation</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        const isGrid = slide.classList.toggle('show-grid');
        if (isGrid) {
          heroVid.pause();
          gridCtrl.start();
        } else {
          heroVid.play();
          gridCtrl.pause();
        }
      });
      slide.appendChild(btn);
      return slide;
    }

    // Standard category slide
    const pieces = cat.pieces ?? [];
    const count  = Math.min(pieces.length, 5);

    const grid = document.createElement('div');
    grid.className = 'slide-grid';
    grid.dataset.pieces = count;
    if (cat.gridLayout) grid.dataset.layout = cat.gridLayout;

    pieces.slice(0, 5).forEach((piece, pieceIndex) => {
      grid.appendChild(buildPieceCard(piece, catIndex, pieceIndex));
    });

    setupVideoGrid(grid);

    slide.appendChild(grid);
    return slide;
  }

  // ── Build a piece card ────────────────────────────────────
  function buildPieceCard(piece, catIndex, pieceIndex) {
    const card     = document.createElement('div');
    card.className = 'piece-card';

    if (piece.mainImage) {
      if (isVideo(piece.mainImage)) {
        const vid        = document.createElement('video');
        vid.src          = piece.mainImage;
        vid.autoplay     = false; /* playback managed by setupVideoGrid */
        vid.loop         = true;
        vid.muted        = true;
        vid.playsInline  = true;
        vid.className    = 'piece-card-media';
        card.appendChild(vid);
      } else {
        const img   = document.createElement('img');
        img.src     = piece.mainImage;
        img.alt     = piece.title ?? '';
        img.loading = catIndex === 0 && pieceIndex === 0 ? 'eager' : 'lazy';
        img.className = 'piece-card-media';
        card.appendChild(img);
      }
    }

    const overlay   = document.createElement('div');
    overlay.className = 'piece-card-overlay';
    const title     = document.createElement('span');
    title.className = 'piece-card-title';
    title.textContent = piece.title ?? '';
    overlay.appendChild(title);
    card.appendChild(overlay);

    card.addEventListener('click', () => {
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
  function updateUI() { updateCounter(); updateTabs(); updateSideNav(); }

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

  // ── Touch swipe ───────────────────────────────────────────
  function bindTouch() {
    const container = document.getElementById('portfolio-container');
    container.addEventListener('touchstart', e => {
      touchStartX    = e.touches[0].clientX;
      touchStartY    = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });
    container.addEventListener('touchend', e => {
      const dx = touchStartX - e.changedTouches[0].clientX;
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 44 && Date.now() - touchStartTime < 500)
        navigate(dx > 0 ? 'next' : 'prev');
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

  const categories = getCategories();
  const category   = categories[catIndex];

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
      if (backLabel) backLabel.textContent = category.title;

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
        detailEl.appendChild(fig);
      });
    }

  // ── Regular piece view ────────────────────────────────────
  } else {
  const piece = category?.pieces[pieceIndex];

  if (!piece) {
    document.getElementById('piece-title').textContent = 'Piece not found.';
  } else {
    // Page title
    document.title = `${piece.title} — Bianca Banu`;

    // Back label
    const backLabel = document.getElementById('piece-back-label');
    if (backLabel) backLabel.textContent = category.title;

    // Sibling category label
    const sibCat = document.getElementById('piece-sibling-category');
    if (sibCat) sibCat.textContent = category.title;

    // Back link carries cat param so portfolio re-opens at right category
    const backLink = document.getElementById('piece-back');
    if (backLink) backLink.href = `portfolio.html?cat=${catIndex}`;
    const backGrid = document.getElementById('piece-back-grid');
    if (backGrid) backGrid.href = `portfolio.html?cat=${catIndex}`;

    // Hero image / video
    if (piece.mainImage) {
      const hero = document.getElementById('piece-hero');

      if (isVideo(piece.mainImage)) {
        // Hide the img elements, show a video instead
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
        hero.classList.add('hero-landscape'); // videos are typically landscape
      } else {
        const imgBg = document.getElementById('piece-img-bg');
        const img   = document.getElementById('piece-img');
        imgBg.src = piece.mainImage;
        img.src   = piece.mainImage;
        img.alt   = piece.title ?? '';
        applyAspectClass(img, hero, 'hero-landscape');
      }
    }

    // Header — title and year only
    document.getElementById('piece-title').textContent = piece.title ?? '';
    document.getElementById('piece-year').textContent  = piece.year  ?? '';

    // Description
    if (piece.description) {
      document.getElementById('piece-description').textContent = piece.description;
    }

    // Detail media — images and videos in order (mp4s auto-detected by extension)
    const detailEl = document.getElementById('piece-detail-images');
    (piece.detailImages ?? []).forEach(item => {
      const fig      = document.createElement('figure');
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
      }

      fig.appendChild(media);
      if (item.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = item.caption;
        fig.appendChild(cap);
      }
      detailEl.appendChild(fig);
    });

    // Prev / next within category
    const prevBtn = document.getElementById('piece-prev');
    const nextBtn = document.getElementById('piece-next');

    if (pieceIndex === 0) prevBtn.disabled = true;
    else prevBtn.addEventListener('click', () => {
      window.location.href = `piece.html?cat=${catIndex}&piece=${pieceIndex - 1}`;
    });

    if (pieceIndex >= category.pieces.length - 1) nextBtn.disabled = true;
    else nextBtn.addEventListener('click', () => {
      window.location.href = `piece.html?cat=${catIndex}&piece=${pieceIndex + 1}`;
    });
  }
  } // end else (regular piece view)
}

// ── Utility ───────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
