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
  var currentLang = DEFAULT_LANG;

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
    currentLang = lang;
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
    reelOnLangChange();
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

  // ---------- hero reel (video + text showcase) ----------

  // start/end are seconds to trim playback to; null plays the clip in full.
  var reelSteps = [
    { type: 'text', key: 'reel.text1' },
    { type: 'video', src: 'assets/video/AppPreviewPart1.mp4', start: 0, end: 7 },
    { type: 'text', key: 'reel.text2' },
    { type: 'video', src: 'assets/video/AppPreviewPart2.mp4', start: 4, end: 15 },
    { type: 'text', key: 'reel.text3' },
    { type: 'video', src: 'assets/video/AppPreviewPart3.mp4', start: 6, end: 15 },
    { type: 'text', key: 'reel.text4' },
    { type: 'video', src: 'assets/video/AppPreviewPart4.mp4', start: 0, end: 9 },
    { type: 'text', key: 'reel.text5' },
    { type: 'text', key: 'reel.text6' }
  ];

  var reelEl, reelVideo, reelTextWrap, reelTextInner, reelCursor, reelProgressEl;
  var reelSegs = [];
  var reelIndex = -1;
  var reelActive = false;
  var reelTimer = null;
  var reelTypeRAF = null;
  var reelVideoHandlers = null;

  function reelOnLangChange() {
    if (!reelEl || reelIndex === -1) return;
    var step = reelSteps[reelIndex];
    if (step.type === 'text') reelTextInner.textContent = t(currentLang, step.key);
  }

  function reelClearTimers() {
    if (reelTimer) { clearTimeout(reelTimer); reelTimer = null; }
    if (reelTypeRAF) { cancelAnimationFrame(reelTypeRAF); reelTypeRAF = null; }
  }

  function reelDetachVideoHandlers() {
    if (!reelVideoHandlers) return;
    if (reelVideoHandlers.loadedmetadata) reelVideo.removeEventListener('loadedmetadata', reelVideoHandlers.loadedmetadata);
    if (reelVideoHandlers.timeupdate) reelVideo.removeEventListener('timeupdate', reelVideoHandlers.timeupdate);
    reelVideoHandlers = null;
  }

  function reelResetProgress() {
    reelSegs.forEach(function (fill, i) {
      fill.style.transition = 'none';
      fill.style.width = (i < reelIndex ? 100 : 0) + '%';
    });
  }

  function reelAnimateActiveSegment(durationMs) {
    var fill = reelSegs[reelIndex];
    if (!fill) return;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    // force reflow so the transition below animates from 0% instead of jumping straight to 100%
    void fill.offsetWidth;
    requestAnimationFrame(function () {
      fill.style.transition = 'width ' + Math.max(durationMs, 200) + 'ms linear';
      fill.style.width = '100%';
    });
  }

  function reelAdvance() {
    if (!reelActive) return;
    reelGoTo((reelIndex + 1) % reelSteps.length);
  }

  function reelShowVideo(step) {
    reelTextWrap.classList.remove('is-visible');
    reelCursor.classList.add('is-hidden');
    reelVideo.classList.remove('is-visible');
    reelDetachVideoHandlers();
    reelVideo.pause();
    reelVideo.src = step.src;

    var onLoadedMeta = function () {
      if (step.start) { try { reelVideo.currentTime = step.start; } catch (e) {} }
      var dur = (step.end || reelVideo.duration || 8) - (step.start || 0);
      reelAnimateActiveSegment(Math.max(dur, 0.3) * 1000);
      reelVideo.play().then(function () {
        reelVideo.classList.add('is-visible');
      }).catch(function () {
        reelVideo.classList.add('is-visible');
      });
    };
    var onTimeUpdate = function () {
      if (step.end && reelVideo.currentTime >= step.end) reelAdvance();
    };
    reelVideoHandlers = { loadedmetadata: onLoadedMeta, timeupdate: onTimeUpdate };
    reelVideo.addEventListener('loadedmetadata', onLoadedMeta);
    reelVideo.addEventListener('timeupdate', onTimeUpdate);
    reelVideo.load();
  }

  function reelShowText(step) {
    reelDetachVideoHandlers();
    reelVideo.classList.remove('is-visible');
    reelVideo.pause();

    var text = t(currentLang, step.key);
    var chars = Array.from(text);
    var charDelay = Math.max(16, Math.min(42, 1500 / Math.max(chars.length, 1)));
    var holdMs = Math.max(1400, Math.min(3200, chars.length * 55));

    reelTextInner.textContent = '';
    reelCursor.classList.remove('is-hidden');
    reelTextWrap.classList.add('is-visible');
    reelAnimateActiveSegment(chars.length * charDelay + holdMs);

    var i = 0;
    var lastTime = null;
    function typeStep(ts) {
      if (lastTime === null) lastTime = ts;
      if (ts - lastTime >= charDelay) {
        lastTime = ts;
        i++;
        reelTextInner.textContent = chars.slice(0, i).join('');
      }
      if (i < chars.length) {
        reelTypeRAF = requestAnimationFrame(typeStep);
      } else {
        reelTypeRAF = null;
        reelCursor.classList.add('is-hidden');
        reelTimer = setTimeout(reelAdvance, holdMs);
      }
    }
    reelTypeRAF = requestAnimationFrame(typeStep);
  }

  function reelGoTo(i) {
    reelClearTimers();
    reelIndex = i;
    reelResetProgress();
    var step = reelSteps[i];
    if (step.type === 'video') reelShowVideo(step);
    else reelShowText(step);
  }

  function reelPause() {
    reelActive = false;
    reelClearTimers();
    if (reelVideo && !reelVideo.paused) reelVideo.pause();
  }

  function reelResume() {
    if (reelActive || !reelEl) return;
    reelActive = true;
    if (reelIndex === -1) {
      reelGoTo(0);
    } else if (reelSteps[reelIndex].type === 'video') {
      reelVideo.play().catch(function () {});
    } else {
      reelGoTo(reelIndex);
    }
  }

  function initReel() {
    reelEl = document.getElementById('heroReel');
    if (!reelEl) return;
    reelVideo = document.getElementById('heroReelVideo');
    reelTextWrap = document.getElementById('heroReelText');
    reelTextInner = document.getElementById('heroReelTextInner');
    reelCursor = document.getElementById('heroReelCursor');
    reelProgressEl = document.getElementById('heroReelProgress');
    reelVideo.muted = true;

    reelSteps.forEach(function () {
      var seg = document.createElement('span');
      seg.className = 'hero-reel-progress-seg';
      var fill = document.createElement('i');
      fill.className = 'hero-reel-progress-fill';
      seg.appendChild(fill);
      reelProgressEl.appendChild(seg);
      reelSegs.push(fill);
    });

    reelVideo.addEventListener('ended', reelAdvance);

    if ('IntersectionObserver' in window) {
      // requires most of the block in view before autoplaying, so a sliver
      // peeking in at the top of the viewport on load isn't enough to start it
      var reelIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) reelResume();
          else reelPause();
        });
      }, { threshold: 0.6 });
      reelIO.observe(reelEl);
    } else {
      reelResume();
    }
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

    initReel();
  });
})();
