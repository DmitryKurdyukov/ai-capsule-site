(function () {
  'use strict';

  var I18N = window.AI_CAPSULE_I18N || {};
  var LANGS = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'zh', label: '中文', flag: '🇨🇳' }
  ];
  var DEFAULT_LANG = 'en';

  // ---------- language ----------

  function detectLang() {
    try {
      var stored = localStorage.getItem('aic_lang');
      if (stored && I18N[stored]) return stored;
    } catch (e) {}
    var nav = (navigator.language || 'en').toLowerCase().split('-')[0];
    return I18N[nav] ? nav : DEFAULT_LANG;
  }

  function t(lang, key) {
    var dict = I18N[lang] || I18N[DEFAULT_LANG];
    return (dict && dict[key]) || (I18N[DEFAULT_LANG] && I18N[DEFAULT_LANG][key]) || key;
  }

  function osLabel(lang, os) {
    var key = os === 'win' ? 'download.win' : 'download.mac';
    return t(lang, key);
  }

  function applyLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    var os = detectOS();

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(lang, key);
      if (key === 'hero.ctaPrimary') val = val.replace('{{os}}', osLabel(lang, os));
      el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var attr = el.getAttribute('data-i18n-attr');
      var key = el.getAttribute('data-i18n');
      if (key) el.setAttribute(attr, t(lang, key));
    });

    var flagEl = document.getElementById('langFlag');
    var labelEl = document.getElementById('langLabel');
    var current = LANGS.find(function (l) { return l.code === lang; }) || LANGS[0];
    if (flagEl) flagEl.textContent = current.flag;
    if (labelEl) labelEl.textContent = current.code.toUpperCase();

    document.querySelectorAll('.lang-option').forEach(function (opt) {
      opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
    });

    document.title = t(lang, 'meta.title');
  }

  function setLang(lang) {
    if (!I18N[lang]) lang = DEFAULT_LANG;
    try { localStorage.setItem('aic_lang', lang); } catch (e) {}
    applyLang(lang);
  }

  function buildLangMenu(current) {
    var menu = document.getElementById('langMenu');
    if (!menu) return;
    menu.innerHTML = '';
    LANGS.forEach(function (l) {
      var btn = document.createElement('button');
      btn.className = 'lang-option' + (l.code === current ? ' active' : '');
      btn.setAttribute('data-lang', l.code);
      btn.innerHTML = '<span>' + l.flag + '</span><span>' + l.label + '</span>';
      btn.addEventListener('click', function () {
        setLang(l.code);
        closeLangMenu();
      });
      menu.appendChild(btn);
    });
  }

  function closeLangMenu() {
    var sw = document.getElementById('langSwitch');
    var btn = document.getElementById('langBtn');
    if (sw) sw.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  // ---------- OS detection ----------

  function detectOS() {
    var ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
    if (/Mac|iPhone|iPad|iPod/i.test(ua)) return 'mac';
    if (/Win/i.test(ua)) return 'win';
    return 'mac';
  }

  // Ссылки на конкретные файлы релиза (dmg/exe) уже прописаны в HTML вручную —
  // здесь только подсвечиваем карточку под ОС посетителя, href не трогаем
  function highlightOS() {
    var os = detectOS();
    var ids = { mac: 'dlMac', win: 'dlWin' };
    Object.keys(ids).forEach(function (key) {
      var el = document.getElementById(ids[key]);
      if (el) el.classList.toggle('primary', key === os);
    });
  }

  // ---------- init ----------

  document.addEventListener('DOMContentLoaded', function () {
    var lang = detectLang();
    buildLangMenu(lang);
    applyLang(lang);
    highlightOS();

    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // nav scroll state (hysteresis to avoid flicker when scrollY hovers near the threshold)
    var nav = document.getElementById('nav');
    var navScrolled = false;
    var scrollTicking = false;
    var applyScrollState = function () {
      scrollTicking = false;
      if (!nav) return;
      var y = window.scrollY;
      if (!navScrolled && y > 24) {
        navScrolled = true;
        nav.classList.add('scrolled');
      } else if (navScrolled && y < 8) {
        navScrolled = false;
        nav.classList.remove('scrolled');
      }
    };
    var onScroll = function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(applyScrollState);
    };
    applyScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });

    // mobile nav burger
    var burger = document.getElementById('navBurger');
    var navLinks = document.getElementById('navLinks');
    if (burger && navLinks) {
      burger.addEventListener('click', function () {
        navLinks.classList.toggle('open');
      });
      navLinks.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { navLinks.classList.remove('open'); });
      });
    }

    // language dropdown
    var langSwitch = document.getElementById('langSwitch');
    var langBtn = document.getElementById('langBtn');
    if (langBtn && langSwitch) {
      langBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = langSwitch.classList.toggle('open');
        langBtn.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', function (e) {
        if (!langSwitch.contains(e.target)) closeLangMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLangMenu();
      });
    }

    // scroll reveal
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && revealEls.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }

    // lazy video: load + autoplay-on-view, muted loop
    var videos = document.querySelectorAll('video[data-src]');
    if (videos.length) {
      if ('IntersectionObserver' in window) {
        var vio = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var v = entry.target;
            if (entry.isIntersecting) {
              if (!v.src) {
                v.src = v.getAttribute('data-src');
                v.load();
              }
              v.play().catch(function () {});
            } else {
              v.pause();
            }
          });
        }, { threshold: 0.35 });
        videos.forEach(function (v) { vio.observe(v); });
      } else {
        videos.forEach(function (v) { v.src = v.getAttribute('data-src'); });
      }

      // click-to-toggle play/pause on the media frame
      videos.forEach(function (v) {
        var frame = v.closest('.feature-media');
        if (!frame) return;
        frame.addEventListener('click', function () {
          if (v.paused) v.play().catch(function () {});
          else v.pause();
        });
      });
    }
  });
})();
