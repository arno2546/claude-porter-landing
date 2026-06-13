/**
 * ClaudePorter Landing — app.js
 * Fetches releases.json, detects platform, renders download cards.
 * States: loading (skeleton), empty, error, normal.
 * Supports channel field for beta badge display.
 */

(function () {
  'use strict';

  /* ---- DOM refs ------------------------------------------ */
  const grid = document.getElementById('downloads-grid');
  const sub = document.getElementById('downloads-sub');
  const badge = document.getElementById('version-badge');
  const heroBeta = document.getElementById('hero-beta');
  const topbar = document.getElementById('topbar');

  /* ---- Constants ----------------------------------------- */
  const DATA_URL = './releases.json';

  const PLATFORMS = [
    {
      key: 'mac',
      label: 'macOS',
      formats: [
        { key: 'dmg', label: 'DMG', primary: true },
        { key: 'zip', label: 'ZIP', primary: false },
      ],
      icon: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 20c6-4 12-4 18 0"/><circle cx="7" cy="10" r="2"/><circle cx="17" cy="15" r="2"/><circle cx="22" cy="8" r="2"/></svg>',
    },
    {
      key: 'win',
      label: 'Windows',
      formats: [
        { key: 'exe', label: 'Installer', primary: true },
        { key: 'zip', label: 'ZIP', primary: false },
      ],
      icon: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="24" height="18" rx="2"/><path d="M2 11h24"/><circle cx="9" cy="8" r="1" fill="currentColor" stroke="none"/></svg>',
    },
    {
      key: 'linux',
      label: 'Linux',
      formats: [
        { key: 'appImage', label: 'AppImage', primary: true },
        { key: 'deb', label: 'DEB', primary: false },
      ],
      icon: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="14" cy="14" r="10"/><path d="M14 4a10 10 0 010 20"/><path d="M4 14h20"/><path d="M8 6l4 8M8 22l4-8M20 6l-4 8M20 22l-4-8"/></svg>',
    },
  ];

  /* ---- Platform detection -------------------------------- */
  function detectPlatform() {
    const ua = navigator.userAgent;
    if (ua.includes('Mac') && !ua.includes('like Mac')) return 'mac';
    if (ua.includes('Win')) return 'win';
    if (ua.includes('Linux') || ua.includes('X11')) return 'linux';
    return null;
  }

  /* ---- Formatting ---------------------------------------- */
  function formatSize(bytes) {
    if (bytes == null || bytes === 0) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  function shortHash(sha256) {
    if (!sha256 || sha256.length < 64) return sha256 || '';
    return sha256.slice(0, 12) + '…' + sha256.slice(-12);
  }

  function downloadUrl(version, asset) {
    // Prefer CDN URL from releases.json, fall back to local path for dev
    if (asset && asset.url) return asset.url;
    return './releases/v' + version + '/' + (asset ? asset.name : '');
  }

  /* ---- Render -------------------------------------------- */
  function renderSkeletons() {
    grid.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var card = document.createElement('div');
      card.className = 'skeleton';
      card.innerHTML =
        '<div class="skeleton-line"></div>' +
        '<div class="skeleton-line"></div>' +
        '<div class="skeleton-line"></div>';
      grid.appendChild(card);
    }
    sub.textContent = 'Loading the latest release…';
    badge.classList.remove('visible');
    heroBeta.hidden = true;
  }

  function renderError(msg) {
    grid.innerHTML =
      '<div class="error-banner">' +
      '<div class="error-banner-icon">⚠</div>' +
      '<p>' + escapeHtml(msg) + '</p>' +
      '<button class="error-retry" onclick="location.reload()">Try again</button>' +
      '</div>';
    sub.textContent = '';
    badge.classList.remove('visible');
    heroBeta.hidden = true;
  }

  function renderEmpty() {
    grid.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-state-icon">⚓</div>' +
      '<p>No releases available yet. Stay tuned!</p>' +
      '</div>';
    sub.textContent = '';
    badge.classList.remove('visible');
    heroBeta.hidden = true;
  }

  function renderCards(data, userPlatform) {
    var version = data.latestVersion;
    var channel = data.channel;
    var assets = data.assets || {};

    grid.innerHTML = '';

    /* Build sub line */
    var subParts = ['Version ' + version];
    if (channel) {
      subParts.push('<span class="channel-badge">' + escapeHtml(channel) + '</span>');
    }
    subParts.push('— released ' + formatDate(data.releaseDate));
    sub.innerHTML = subParts.join(' ');

    /* Topbar version badge */
    if (version) {
      var badgeText = 'v' + version;
      if (channel) {
        badgeText += ' · ' + channel;
      }
      badge.textContent = badgeText;
      badge.classList.add('visible');
    }

    /* Hero beta badge */
    if (channel === 'beta') {
      heroBeta.hidden = false;
    } else {
      heroBeta.hidden = true;
    }

    var cards = [];

    PLATFORMS.forEach(function (p) {
      var platformAssets = assets[p.key];
      var card = document.createElement('div');
      card.className = 'platform-card';

      if (p.key === userPlatform) {
        card.classList.add('preferred');
      }

      var header =
        '<div class="platform-card-header">' +
        '<span class="platform-icon">' + p.icon + '</span>' +
        '<span class="platform-name">' + p.label + '</span>' +
        (version ? '<span class="platform-version">v' + version + '</span>' : '') +
        '</div>';

      var actions = '<div class="platform-actions">';
      var hasAny = false;

      p.formats.forEach(function (f) {
        var asset = platformAssets && platformAssets[f.key];
        if (asset && asset.name) {
          hasAny = true;
          var cls = f.primary ? 'dl-btn primary' : 'dl-btn secondary';
          var url = downloadUrl(version, asset);
          var formatLabel = f.key === 'appImage' ? 'AppImage' : f.label.toUpperCase();
          actions +=
            '<a class="' + cls + '" href="' + url + '" ' +
            'aria-label="Download ClaudePorter ' + version + ' for ' + p.label + ' (' + f.label + ', ' + formatSize(asset.size) + ')">' +
            '<span class="dl-btn-label">' +
            (f.primary ? 'Download' : 'Also as') +
            ' <span class="dl-btn-format">' + formatLabel + '</span>' +
            '</span>' +
            '<span class="dl-btn-size">' + formatSize(asset.size) + '</span>' +
            '</a>';
        } else {
          actions +=
            '<button class="dl-btn secondary" disabled style="opacity:0.35;cursor:not-allowed">' +
            '<span class="dl-btn-label">' + f.label + '</span>' +
            '<span class="dl-btn-size">—</span>' +
            '</button>';
        }
      });

      actions += '</div>';

      var checksum = '';
      if (hasAny && platformAssets) {
        var primary = p.formats.find(function (f) { return f.primary; });
        if (primary) {
          var primaryAsset = platformAssets[primary.key];
          if (primaryAsset && primaryAsset.sha256) {
            checksum =
              '<details class="platform-checksum">' +
              '<summary>SHA-256</summary>' +
              '<code>' + shortHash(primaryAsset.sha256) + '</code>' +
              '</details>';
          }
        }
      }

      if (!hasAny) {
        actions = '<p style="font-size:0.8rem;color:var(--color-mist);padding:8px 0">Coming soon</p>';
      }

      card.innerHTML = header + actions + checksum;
      grid.appendChild(card);
      cards.push(card);
    });

    /* Trigger entrance animations with stagger */
    requestAnimationFrame(function () {
      cards.forEach(function (card, i) {
        setTimeout(function () {
          card.classList.add('visible');
        }, i * 120);
      });
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return '';
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ---- Main fetch ---------------------------------------- */
  function load() {
    renderSkeletons();
    var userPlatform = detectPlatform();

    fetch(DATA_URL + '?t=' + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.latestVersion) {
          renderEmpty();
          return;
        }
        renderCards(data, userPlatform);
      })
      .catch(function (err) {
        console.error('Failed to load releases:', err);
        renderError('Unable to load release data. Check back soon or visit our GitHub page.');
      });
  }

  /* ---- Scroll effects ------------------------------------ */
  function onScroll() {
    var y = window.scrollY;
    topbar.classList.toggle('scrolled', y > 40);

    /* Reveal feature cards on scroll */
    var cards = document.querySelectorAll('.feature-card:not(.visible)');
    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight - 80) {
        card.classList.add('visible');
      }
    });
  }

  /* ---- Init ---------------------------------------------- */
  function init() {
    load();
    window.addEventListener('scroll', onScroll, { passive: true });
    /* Trigger once for cards already in view */
    setTimeout(onScroll, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
