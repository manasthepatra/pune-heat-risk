/**
 * site.js — Shared utilities for all pages
 * Pune Urban Heat Framework
 */

/* ============================================================
   PROGRESS BAR
   ============================================================ */
function initProgressBar() {
  const bar = document.getElementById('site-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
}

/* ============================================================
   NAVBAR — scroll behaviour
   ============================================================ */
function initNavbar() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile-menu');
  const closeBtn   = document.getElementById('nav-mobile-close');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
    closeBtn && closeBtn.addEventListener('click', () => mobileMenu.classList.remove('open'));
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileMenu.classList.remove('open'))
    );
  }
}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function initReveal() {
  const targets = document.querySelectorAll('.reveal, .reveal-fast');
  if (!targets.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => obs.observe(el));
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
function initLightbox() {
  const lb    = document.getElementById('site-lightbox');
  const img   = document.getElementById('site-lightbox-img');
  const close = document.getElementById('site-lightbox-close');
  if (!lb) return;

  window.openLightbox = (src) => {
    img.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeLB = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { img.src = ''; }, 300);
  };
  close && close.addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });

  // Auto-attach to any .fig-img
  document.querySelectorAll('.fig-img').forEach(el => {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', () => openLightbox(el.src));
  });
}

/* ============================================================
   LAZY-LOAD IMAGES
   ============================================================ */
function initLazyImages() {
  const imgs = document.querySelectorAll('img[data-src]');
  if (!imgs.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.src = e.target.dataset.src;
        e.target.removeAttribute('data-src');
        obs.unobserve(e.target);
      }
    });
  }, { rootMargin: '200px' });
  imgs.forEach(img => obs.observe(img));
}

/* ============================================================
   INIT ALL
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initProgressBar();
  initNavbar();
  initReveal();
  initLightbox();
  initLazyImages();
});
