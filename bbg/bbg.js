/* ATTACHÉ BBG — Bloomberg Terminal runtime (local only) */
(function () {
  'use strict';
  if (window.__ATTACHE_BBG__) return;
  window.__ATTACHE_BBG__ = true;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  var GO_MAP = {
    'DESK': 'DESK <GO>',
    'COMMAND': 'CMD <GO>',
    'CMD': 'CMD <GO>',
    'OVERNIGHT': 'ON <GO>',
    'ON': 'ON <GO>',
    'WEEKLY': 'WK <GO>',
    'WK': 'WK <GO>',
    'STUDY': 'STD <GO>',
    'STUDY ROOM': 'STD <GO>',
    'STD': 'STD <GO>'
  };

  function restyleNav() {
    var nav = qs('#ub nav');
    if (!nav) return;
    qsa('a', nav).forEach(function (a) {
      var raw = (a.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
      raw = raw.replace(/\s*<GO>\s*$/i, '').trim();
      var label = GO_MAP[raw];
      if (!label) {
        // fallback: first word + <GO>
        var w = raw.split(/\s+/)[0] || raw;
        label = w + ' <GO>';
      }
      var parts = label.split(' <GO>');
      a.textContent = '';
      a.appendChild(document.createTextNode(parts[0]));
      var go = document.createElement('span');
      go.className = 'go';
      go.textContent = ' <GO>';
      a.appendChild(go);
    });
  }

  function ensureStrip() {
    if (qs('#bbg-strip')) return;
    var ub = qs('#ub');
    if (!ub || !ub.parentNode) return;
    var strip = document.createElement('div');
    strip.id = 'bbg-strip';
    var items = [];
    items.push('<span class="bbg-k">ATTACHÉ</span>');
    items.push('<span class="bbg-item">TERM<b>BBG-STYLE</b></span>');
    items.push('<span class="bbg-item">MODE<b>PAPER</b></span>');
    qsa('#ub .ub-q').forEach(function (el) {
      var t = el.textContent.replace(/\s+/g, ' ').trim();
      if (t) items.push('<span class="bbg-item">' + t.replace(/</g,'&lt;') + '</span>');
    });
    var mk = qs('#ubMk');
    if (mk) items.push('<span class="bbg-item">MKT<b id="bbgMk">' + (mk.textContent || '') + '</b></span>');
    items.push('<span class="bbg-clk" id="bbgClk"></span>');
    strip.innerHTML = items.join('');
    if (ub.nextSibling) ub.parentNode.insertBefore(strip, ub.nextSibling);
    else ub.parentNode.appendChild(strip);
  }

  function tickClock() {
    var z = 'America/Los_Angeles';
    var n = new Date();
    var txt = n.toLocaleTimeString('en-US', {
      timeZone: z, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }) + ' PT';
    var c1 = qs('#ubClk');
    var c2 = qs('#bbgClk');
    if (c1) c1.textContent = txt;
    if (c2) c2.textContent = txt;
    var mk = qs('#ubMk');
    var mk2 = qs('#bbgMk');
    if (mk && mk2) mk2.textContent = mk.textContent;
  }

  function reverseHeaders() {
    // Ensure panel headers read as reversed bars; add <GO> cue on zone headers
    qsa('.zh b').forEach(function (b) {
      if (b.dataset.bbg) return;
      b.dataset.bbg = '1';
      var t = b.textContent.trim();
      if (t && t.indexOf('<GO>') < 0) {
        // keep text; CSS already reverses
      }
    });
  }

  function scrubForbidden() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (!n.nodeValue) return;
      // skip script/style
      var p = n.parentElement;
      if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) return;
      var v = n.nodeValue;
      var next = v
        .replace(/\bORB\s*5\b/gi, 'RANGE')
        .replace(/\bORB\s*30\b/gi, 'RANGE')
        .replace(/\bORB5\b/gi, 'RANGE')
        .replace(/\bORB30\b/gi, 'RANGE')
        .replace(/\bEVERETT\b/g, 'SRC E')
        .replace(/\beverett\b/g, 'SRC E')
        .replace(/\bYahoo\s*Finance\b/gi, 'SRC')
        .replace(/\bYahoo\b/gi, 'SRC')
        .replace(/\bAlpaca\b/gi, 'SRC')
        .replace(/\bTwitter\b/gi, 'SRC')
        .replace(/\bX\.com\b/gi, 'SRC');
      if (next !== v) n.nodeValue = next;
    });

    // Neutralize outbound source links
    qsa('a[href*="yahoo"],a[href*="alpaca"],a[href*="twitter.com"],a[href*="x.com/"],a[href*="finance.yahoo"]').forEach(function (a) {
      a.removeAttribute('href');
      a.style.cursor = 'default';
      var t = (a.textContent || '').trim();
      if (/yahoo|alpaca|twitter|x\.com/i.test(t)) a.textContent = 'SRC';
    });

    // Scrub title attributes that leak source brands
    qsa('[title]').forEach(function (el) {
      var t = el.getAttribute('title') || '';
      var n = t
        .replace(/\bORB\s*5\b/gi, 'RANGE').replace(/\bORB5\b/gi, 'RANGE')
        .replace(/\bORB\s*30\b/gi, 'RANGE').replace(/\bORB30\b/gi, 'RANGE')
        .replace(/\bEVERETT\b/g, 'SRC E').replace(/\beverett\b/g, 'SRC E')
        .replace(/\bYahoo\b/gi, 'SRC').replace(/\bAlpaca\b/gi, 'SRC')
        .replace(/\bTwitter\b/gi, 'SRC');
      if (n !== t) el.setAttribute('title', n);
    });
  }

  function patchCharts() {
    function apply() {
      if (!window.Chart) return false;
      try {
        Chart.defaults.color = '#FFA028';
        Chart.defaults.borderColor = '#333333';
        Chart.defaults.backgroundColor = '#000000';
        if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
          Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
          Chart.defaults.plugins.legend.labels.color = '#FFA028';
        }
        if (Chart.defaults.scale) {
          Chart.defaults.scale.grid = Chart.defaults.scale.grid || {};
          Chart.defaults.scale.grid.color = '#222222';
          Chart.defaults.scale.ticks = Chart.defaults.scale.ticks || {};
          Chart.defaults.scale.ticks.color = '#A0A0A0';
        }
        // Patch existing charts
        if (Chart.instances) {
          Object.values(Chart.instances).forEach(function (ch) {
            try {
              if (!ch || !ch.options) return;
              ch.options.color = '#FFA028';
              if (ch.options.plugins && ch.options.plugins.legend && ch.options.plugins.legend.labels) {
                ch.options.plugins.legend.labels.color = '#FFA028';
              }
              // recolor datasets toward amber/green/red
              (ch.data && ch.data.datasets || []).forEach(function (ds, i) {
                var c = ds.borderColor;
                var s = String(c || '');
                if (/3ddc5c|00c853|up|green/i.test(s) || ds._bbgUp) {
                  ds.borderColor = '#00C853'; ds.backgroundColor = 'rgba(0,200,83,.15)';
                } else if (/ff4d4d|ff1744|dn|red/i.test(s) || ds._bbgDn) {
                  ds.borderColor = '#FF1744'; ds.backgroundColor = 'rgba(255,23,68,.15)';
                } else if (/22c7e8|00e5ff|cyan/i.test(s)) {
                  ds.borderColor = '#00E5FF'; ds.backgroundColor = 'rgba(0,229,255,.12)';
                } else {
                  ds.borderColor = i % 3 === 1 ? '#00C853' : (i % 3 === 2 ? '#FF1744' : '#FFA028');
                  if (!ds.backgroundColor || String(ds.backgroundColor).indexOf('rgba') < 0) {
                    ds.backgroundColor = 'rgba(255,160,40,.12)';
                  }
                }
              });
              ch.update('none');
            } catch (e) {}
          });
        }
      } catch (e) {}
      return true;
    }
    if (!apply()) {
      var n = 0;
      var id = setInterval(function () {
        n++;
        if (apply() || n > 40) clearInterval(id);
      }, 250);
    } else {
      setTimeout(apply, 800);
      setTimeout(apply, 2000);
    }
  }

  function densifyTables() {
    // right-align numeric-looking cells that aren't already .r
    qsa('table td').forEach(function (td) {
      if (td.classList.contains('w') || td.classList.contains('r')) return;
      var t = (td.textContent || '').trim();
      if (/^[+\-−]?\$?\d[\d,]*\.?\d*%?$/.test(t) || /^[+\-−]\d/.test(t)) {
        td.style.textAlign = 'right';
      }
    });
  }

  function retitle() {
    var t = document.title || '';
    if (/BBG/i.test(t)) return;
    t = t.replace(/^ATTACH.\s*/i, '').replace(/^[|:\-–]+\s*/, '');
    document.title = 'ATTACHÉ BBG | ' + t;
  }

  function flattenGradients() {
    qsa('[style]').forEach(function (el) {
      var s = el.getAttribute('style') || '';
      if (!/gradient|box-shadow|border-radius|backdrop-filter/i.test(s)) return;
      el.style.boxShadow = 'none';
      el.style.borderRadius = '0';
      el.style.backdropFilter = 'none';
      if (/gradient/i.test(s)) {
        if (!el.style.backgroundColor) el.style.backgroundColor = '#111';
        el.style.backgroundImage = 'none';
      }
    });
    // class-based gradients (bias meter etc.)
    qsa('.bg-m, .vz-range, .dpx .zb, .gbar').forEach(function (el) {
      el.style.backgroundImage = 'none';
      el.style.boxShadow = 'none';
      if (!el.style.backgroundColor) el.style.backgroundColor = '#111';
    });
  }

  function boot() {
    retitle();
    restyleNav();
    ensureStrip();
    tickClock();
    setInterval(tickClock, 1000);
    reverseHeaders();
    scrubForbidden();
    densifyTables();
    flattenGradients();
    patchCharts();
    // late scrub after dynamic renders
    setTimeout(scrubForbidden, 600);
    setTimeout(scrubForbidden, 1800);
    setTimeout(densifyTables, 1000);
    setTimeout(flattenGradients, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
