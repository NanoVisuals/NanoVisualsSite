/* ═══════════════════════════════════════════
   NanoVisuals — script
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const TABS = ['home', 'faq', 'help'];
  const nav = document.getElementById('nav');
  const navPill = document.getElementById('navPill');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
  const pages = Array.from(document.querySelectorAll('.page'));
  const toast = document.getElementById('toast');

  /* ── Табы / маршрутизация ───────────────── */
  let activeTab = 'home';

  function tabFromHash() {
    const h = (location.hash || '').replace('#', '').toLowerCase();
    return TABS.includes(h) ? h : 'home';
  }

  function setTab(tab, opts = {}) {
    if (!TABS.includes(tab)) tab = 'home';
    if (tab === activeTab && !opts.force) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    activeTab = tab;

    pages.forEach((page) => {
      const on = page.dataset.page === tab;
      page.classList.toggle('is-active', on);
      page.hidden = !on;
    });

    navButtons.forEach((btn) => {
      const on = btn.dataset.tab === tab;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });

    movePill();
    updateHash(tab);

    if (opts.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (tab === 'faq') {
      requestAnimationFrame(() => {
        const search = document.getElementById('faqSearch');
        if (search && window.innerWidth > 860) search.focus({ preventScroll: true });
      });
    }
  }

  function updateHash(tab) {
    const target = '#' + tab;
    if (location.hash !== target) {
      history.replaceState(null, '', target);
    }
  }

  function movePill() {
    const active = navButtons.find((b) => b.dataset.tab === activeTab);
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    navPill.style.width = btnRect.width + 'px';
    navPill.style.left = btnRect.left - navRect.left + 'px';
    navPill.classList.add('is-ready');
  }

  // Делегирование кликов по любым элементам с data-tab
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-tab]');
    if (!el) return;
    e.preventDefault();
    setTab(el.dataset.tab);
  });

  window.addEventListener('hashchange', () => setTab(tabFromHash(), { scroll: false }));
  window.addEventListener('resize', movePill);
  window.addEventListener('load', movePill);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(movePill).catch(() => {});
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (!document.activeElement || !document.activeElement.classList.contains('nav-btn')) return;
    e.preventDefault();
    const i = TABS.indexOf(activeTab);
    const next = e.key === 'ArrowRight'
      ? (i + 1) % TABS.length
      : (i - 1 + TABS.length) % TABS.length;
    setTab(TABS[next]);
    navButtons.find((b) => b.dataset.tab === TABS[next]).focus();
  });

  /* ── Toast ──────────────────────────────── */
  let toastTimer;
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  /* ── Копирование ника ───────────────────── */
  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) { /* пробуем запасной способ */ }

    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = btn.dataset.copy;
      const ok = await copyText(value);
      const label = btn.querySelector('span');
      const old = label.textContent;

      if (!ok) {
        showToast('Не удалось скопировать: ' + value);
        return;
      }

      btn.classList.add('is-done');
      label.textContent = 'Скопировано';
      showToast(value + ' — скопировано');
      setTimeout(() => {
        btn.classList.remove('is-done');
        label.textContent = old;
      }, 1600);
    });
  });

  /* ── FAQ: поиск и фильтры ───────────────── */
  const faqSearch = document.getElementById('faqSearch');
  const faqClear = document.getElementById('faqClear');
  const faqList = document.getElementById('faqList');
  const faqEmpty = document.getElementById('faqEmpty');
  const faqItems = faqList ? Array.from(faqList.querySelectorAll('.faq')) : [];
  const filterChips = Array.from(document.querySelectorAll('#faqFilters .chip'));
  const searchBox = faqSearch ? faqSearch.closest('.search') : null;
  let activeFilter = 'all';

  function normalize(str) {
    return str.toLowerCase().replace(/ё/g, 'е').trim();
  }

  function applyFaqFilter() {
    const q = normalize(faqSearch ? faqSearch.value : '');
    let visible = 0;

    faqItems.forEach((item) => {
      const cat = item.dataset.cat || 'all';
      const text = normalize(item.textContent + ' ' + (item.dataset.tags || ''));
      const catOk = activeFilter === 'all' || cat === activeFilter || cat === 'all';
      const searchOk = !q || text.includes(q);
      const show = catOk && searchOk;

      item.classList.toggle('is-hidden', !show);
      if (!show && item.open) item.open = false;
      if (show) visible++;
    });

    if (faqEmpty) faqEmpty.hidden = visible !== 0;
    if (searchBox) searchBox.classList.toggle('has-value', !!q);
  }

  if (faqSearch) {
    faqSearch.addEventListener('input', applyFaqFilter);

    if (faqClear) {
      faqClear.addEventListener('click', () => {
        faqSearch.value = '';
        applyFaqFilter();
        faqSearch.focus();
      });
    }
  }

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter || 'all';
      filterChips.forEach((c) => c.classList.toggle('is-active', c === chip));
      applyFaqFilter();
    });
  });

  // Аккордеон: открыт только один пункт
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item && other.open) other.open = false;
      });
    });
  });

  /* ── Счётчики на главной ────────────────── */
  const counters = Array.from(document.querySelectorAll('[data-count]'));

  function animateCounter(el) {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window && counters.length) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => io.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  /* ── Подсветка карточек за курсором ─────── */
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  /* ── Старт ──────────────────────────────── */
  activeTab = tabFromHash();
  if (activeTab !== 'home') {
    setTab(activeTab, { force: true, scroll: false });
  } else {
    navButtons.forEach((b) => {
      const on = b.dataset.tab === 'home';
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    pages.forEach((p) => {
      const on = p.dataset.page === 'home';
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
  }
  requestAnimationFrame(movePill);
  applyFaqFilter();

  // Пересчитать позицию пилюли после загрузки шрифтов
  setTimeout(movePill, 350);
  setTimeout(movePill, 1200);
})();
