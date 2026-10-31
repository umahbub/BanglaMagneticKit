/**
 * ছড়ার চুম্বক | Bangla Magnetic Word Kit for Kids
 * Main Controller with Smart Next-Word Suggestions, Progressive Disclosure & Clear Audio
 */

(function () {
  const DATA = window.BANGLA_KIT_DATA || { words: [], endings: [], poems: [] };
  const Engine = window.BanglaEngine;

  const wordMetaMap = new Map();
  DATA.words.forEach(item => wordMetaMap.set(item.w, item));

  const STORAGE_CUSTOM_WORDS = 'bangla_magnet_custom_words_v1';
  const STORAGE_SAVED_POEMS = 'bangla_magnet_saved_poems_v1';
  let customWords = [];
  try {
    customWords = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_WORDS) || '[]');
    customWords.forEach(cw => {
      DATA.words.unshift(cw);
      wordMetaMap.set(cw.w, cw);
    });
  } catch (e) {
    customWords = [];
  }

  let savedPoems = [];
  try {
    savedPoems = JSON.parse(localStorage.getItem(STORAGE_SAVED_POEMS) || '[]');
  } catch (e) {
    savedPoems = [];
  }

  // App State — defaults to 'smart' (Suggested Next Words)
  const state = {
    activeCategory: 'smart',
    smartOffset: 0,
    searchQuery: '',
    activeLetter: '',
    showPhonetics: true,
    autoSpeak: true,
    autoAgree: true,
    boardTheme: 'theme-fridge',
    boardTiles: [],
    selectedTileId: null,
    inspectorTab: 'verb',
    selectedSubject: 'আমি',
    undoStack: [],
    currentCursorLine: 0,
    isPlayingPoem: false,
    mobileTab: 'words'
  };

  function isMobileViewport() {
    return window.innerWidth <= 640;
  }

  function getLineHeight() {
    return isMobileViewport() ? 58 : 70;
  }

  function getLineTopOffset() {
    return isMobileViewport() ? 14 : 20;
  }

  function getLineLeftStart() {
    return isMobileViewport() ? 18 : 28;
  }

  function getTileGap() {
    return isMobileViewport() ? 8 : 11;
  }

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  // DOM Elements
  const elWorkspaceGrid = document.querySelector('.workspace-grid');
  const elBtnMobTabWords = document.getElementById('btnMobTabWords');
  const elBtnMobTabInspector = document.getElementById('btnMobTabInspector');
  const elMobSelectedWordBadge = document.getElementById('mobSelectedWordBadge');
  const elWordTray = document.getElementById('wordTray');
  const elWordCountBadge = document.getElementById('wordCountBadge');
  const elWordSearchInput = document.getElementById('wordSearchInput');
  const elBtnClearSearch = document.getElementById('btnClearSearch');
  const elTabSmartDefault = document.getElementById('tabSmartDefault');
  const elTabEndingsMain = document.getElementById('tabEndingsMain');
  const elBtnToggleCatDrawer = document.getElementById('btnToggleCatDrawer');
  const elCollapsibleDrawer = document.getElementById('collapsibleFilterDrawer');
  const elCategoryTabs = document.getElementById('categoryTabs');
  const elLetterFilterBar = document.getElementById('letterFilterBar');
  const elTrayContextText = document.getElementById('trayContextText');
  const elBtnRefreshSmart = document.getElementById('btnRefreshSmart');

  const elBoard = document.getElementById('magneticBoard');
  const elBoardLineGuides = document.getElementById('boardLineGuides');
  const elBoardTilesLayer = document.getElementById('boardTilesLayer');
  const elBoardEmptyState = document.getElementById('boardEmptyState');
  const elBoardToast = document.getElementById('boardToast');
  const elLiveNarrationBar = document.getElementById('liveNarrationBar');
  const elNarrationBn = document.getElementById('narrationBn');
  const elNarrationEn = document.getElementById('narrationEn');

  const elPoemTitleInput = document.getElementById('poemTitleInput');
  const elPoemAuthorInput = document.getElementById('poemAuthorInput');
  const elBtnPlayPoem = document.getElementById('btnPlayPoem');
  const elBtnStopPoem = document.getElementById('btnStopPoem');
  const elSpeechModeSelect = document.getElementById('speechModeSelect');

  // Inspector DOM
  const elInspectorPlaceholder = document.getElementById('inspectorPlaceholder');
  const elInspectorActive = document.getElementById('inspectorActive');
  const elInspCategoryBadge = document.getElementById('inspCategoryBadge');
  const elInspWordBn = document.getElementById('inspWordBn');
  const elInspWordPhonetic = document.getElementById('inspWordPhonetic');
  const elInspMorphBreakdown = document.getElementById('inspMorphBreakdown');
  const elInspMorphFormula = document.getElementById('inspMorphFormula');
  const elSubjectPills = document.getElementById('subjectPills');
  const elVerbConjugationGrid = document.getElementById('verbConjugationGrid');
  const elKitAttestedRow = document.getElementById('kitAttestedEndingsRow');
  const elKitAttestedChips = document.getElementById('kitAttestedChips');
  const elNounInflectionChips = document.getElementById('nounInflectionChips');
  const elRhymeTargetLabel = document.getElementById('rhymeTargetLabel');
  const elRhymeResultsGrid = document.getElementById('rhymeResultsGrid');

  const CATEGORY_LABELS = {
    smart: '✨ পরের সম্ভাব্য শব্দ',
    popular: '🌟 জনপ্রিয় শব্দ',
    pronoun_people: '🙋 মানুষ ও সর্বনাম',
    nature: '🌙 প্রকৃতি ও আকাশ',
    animals: '🦜 পাখি ও প্রাণী',
    verbs: '🏃 কাজ ও ক্রিয়া',
    adjectives: '🎨 রং ও বিশেষণ',
    rhythm: '🥁 ছন্দ ও ধ্বনি',
    objects_food: '🏠 জিনিস ও খাবার',
    endings: '🧩 প্রত্যয় (-এ, -ছি, -টা)',
    custom: '✨ আমার যোগ করা শব্দ',
    all: '📚 সব শব্দ',
    general: '✨ ছড়ার শব্দ'
  };

  let toastTimer = null;
  function showToast(msg, duration = 2600) {
    if (!elBoardToast) return;
    elBoardToast.textContent = msg;
    elBoardToast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elBoardToast.classList.add('hidden');
    }, duration);
  }

  function pushUndo() {
    const snap = JSON.stringify(state.boardTiles);
    if (state.undoStack.length === 0 || state.undoStack[state.undoStack.length - 1] !== snap) {
      state.undoStack.push(snap);
      if (state.undoStack.length > 30) state.undoStack.shift();
    }
  }

  function inferCategory(word) {
    const clean = (word || '').replace(/[।,!?]/g, '');
    const meta = wordMetaMap.get(clean);
    if (meta && meta.c) return meta.c;
    if (Engine.SURFACE_TO_VERB_ROOT[clean]) return 'verbs';
    if (clean.endsWith('ছে') || clean.endsWith('ছি') || clean.endsWith('লাম') || clean.endsWith('বো') || clean.endsWith('বে')) {
      return 'verbs';
    }
    return 'general';
  }

  function syncCategoryTabHighlights() {
    const cat = state.activeCategory;
    if (elTabSmartDefault) elTabSmartDefault.classList.toggle('active', cat === 'smart');
    if (elTabEndingsMain) elTabEndingsMain.classList.toggle('active', cat === 'endings');
    if (elCategoryTabs) {
      elCategoryTabs.querySelectorAll('.cat-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === cat);
      });
    }
    if (elBtnToggleCatDrawer) {
      const isDrawerCat = (cat !== 'smart' && cat !== 'endings');
      elBtnToggleCatDrawer.classList.toggle('open', isDrawerCat);
      elBtnToggleCatDrawer.textContent = isDrawerCat
        ? `${CATEGORY_LABELS[cat] || '📂 বিষয়'} ▾`
        : '📂 বিষয় ▾';
    }
  }

  // ==========================================================================
  // 1. RENDER WORD & ENDING BROWSER
  // ==========================================================================
  function renderWordBrowser() {
    if (!elWordTray) return;
    elWordTray.innerHTML = '';
    syncCategoryTabHighlights();

    const cat = state.activeCategory;
    const q = state.searchQuery.trim().toLowerCase();
    const letter = state.activeLetter;

    // 1. If user is typing in Search Box, search across all words
    if (q) {
      const matches = DATA.words.filter(item =>
        item.w.includes(q) || (item.p && item.p.toLowerCase().includes(q))
      );
      if (elWordCountBadge) elWordCountBadge.textContent = `${matches.length}টি`;
      if (elTrayContextText) elTrayContextText.textContent = `🔍 "${state.searchQuery}" অনুসন্ধানের ফলাফল`;
      if (elBtnRefreshSmart) elBtnRefreshSmart.classList.add('hidden');
      renderWordTileList(matches.slice(0, 120));
      return;
    }

    // 2. SMART NEXT-WORD SUGGESTIONS (Default Mode!)
    if (cat === 'smart' && !letter) {
      const smartObj = Engine.getSmartSuggestions(state.boardTiles, state.currentCursorLine, 72);
      const allSmart = smartObj.words || [];
      const pageSize = 24;
      const start = state.smartOffset % Math.max(1, allSmart.length);
      const page = [];
      for (let i = 0; i < Math.min(pageSize, allSmart.length); i++) {
        page.push(allSmart[(start + i) % allSmart.length]);
      }

      if (elWordCountBadge) elWordCountBadge.textContent = `${page.length}টি`;
      if (elTrayContextText) elTrayContextText.textContent = smartObj.hint;
      if (elBtnRefreshSmart) elBtnRefreshSmart.classList.remove('hidden');

      renderWordTileList(page);
      return;
    }

    if (elBtnRefreshSmart) elBtnRefreshSmart.classList.add('hidden');

    // 3. ENDINGS TAB
    if (cat === 'endings' && !letter) {
      const endingsList = DATA.endings || [];
      if (elWordCountBadge) elWordCountBadge.textContent = `${endingsList.length}টি`;
      if (elTrayContextText) {
        elTrayContextText.textContent = '🧩 যেকোনো প্রত্যয় (-এ, -ছি, -টা) টেনে বোর্ডের শব্দের ওপর ছাড়লে বা ক্লিক করলে যুক্ত হবে!';
      }
      const frag = document.createDocumentFragment();
      endingsList.forEach(endObj => {
        const tile = document.createElement('div');
        tile.className = 'magnet-tile';
        tile.dataset.cat = 'endings';
        tile.dataset.word = endObj.text;
        tile.dataset.isEnding = 'true';
        tile.title = `${endObj.label_bn} — উদা: ${endObj.example}`;

        const ph = Engine.transliterate(endObj.text);
        tile.innerHTML = `
          <div class="tile-text-col">
            <span class="tile-bn">-${endObj.text}</span>
            <span class="tile-phonetic">-${ph}</span>
          </div>
          <button type="button" class="tile-speak-btn" title="উচ্চারণ শোনো">🔊</button>
        `;
        setupTrayTileEvents(tile, endObj.text, 'endings', true);
        frag.appendChild(tile);
      });
      elWordTray.appendChild(frag);
      return;
    }

    // 4. CATEGORY OR LETTER FILTER
    let filtered = DATA.words.filter(item => {
      if (cat === 'popular' || cat === 'smart') return item.pop;
      if (cat === 'custom') return item.isCustom;
      if (cat !== 'all' && item.c !== cat) return false;
      return true;
    });

    if (letter) {
      const letterMap = {
        'ই': ['ই', 'ঈ'], 'উ': ['উ', 'ঊ'], 'এ': ['এ', 'ঐ'], 'ও': ['ও', 'ঔ'],
        'ট': ['ট', 'ঠ'], 'ড': ['ড', 'ঢ'], 'ত': ['ত', 'থ'], 'য': ['য', 'র'], 'শ': ['শ', 'ষ', 'স']
      };
      const allowedStarts = letterMap[letter] || [letter];
      filtered = filtered.filter(item => allowedStarts.some(st => item.w.startsWith(st)));
    }

    if (elWordCountBadge) elWordCountBadge.textContent = `${filtered.length}টি`;
    if (elTrayContextText) {
      const catTitle = CATEGORY_LABELS[cat] || 'শব্দ';
      const letTitle = letter ? ` • "${letter}" দিয়ে শুরু` : '';
      elTrayContextText.textContent = `${catTitle}${letTitle} (${filtered.length}টি শব্দ)`;
    }

    renderWordTileList(filtered.slice(0, 220));
  }

  function renderWordTileList(list) {
    if (list.length === 0) {
      elWordTray.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #64748b; width: 100%;">
          <p style="margin-bottom: 10px; font-size: 1rem;">কোনো শব্দ পাওয়া যায়নি</p>
          <button type="button" id="btnTrayAddSearchWord" class="btn-primary-glow" style="font-size: 0.9rem; padding: 8px 16px;">
            ➕ "${state.searchQuery || 'নতুন শব্দ'}" যোগ করো
          </button>
        </div>
      `;
      const btnQuickAdd = document.getElementById('btnTrayAddSearchWord');
      if (btnQuickAdd) {
        btnQuickAdd.addEventListener('click', () => openAddWordModal(state.searchQuery.trim()));
      }
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'magnet-tile';
      tile.dataset.cat = item.c || 'general';
      tile.dataset.word = item.w;
      const isEnding = item.c === 'endings';
      if (isEnding) tile.dataset.isEnding = 'true';

      const ph = item.p || Engine.transliterate(item.w);
      const displayW = isEnding ? `-${item.w}` : item.w;

      tile.innerHTML = `
        <div class="tile-text-col">
          <span class="tile-bn">${displayW}</span>
          <span class="tile-phonetic">${ph}</span>
        </div>
        <button type="button" class="tile-speak-btn" title="উচ্চারণ শোনো (${ph})">🔊</button>
      `;

      setupTrayTileEvents(tile, item.w, item.c || 'general', isEnding);
      frag.appendChild(tile);
    });

    elWordTray.appendChild(frag);
  }

  function setupTrayTileEvents(tileEl, word, category, isEnding) {
    const speakBtn = tileEl.querySelector('.tile-speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Engine.speakWord(word);
      });
    }

    let startX = 0, startY = 0;
    let ghostEl = null;
    let hasMoved = false;

    tileEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tile-speak-btn')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;

      const onPointerMove = (moveEv) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;
        if (!hasMoved && Math.hypot(dx, dy) > 8) {
          hasMoved = true;
          ghostEl = document.createElement('div');
          ghostEl.className = 'magnet-tile board-tile dragging';
          ghostEl.dataset.cat = category;
          ghostEl.style.position = 'fixed';
          ghostEl.style.zIndex = '9999';
          ghostEl.style.pointerEvents = 'none';
          const ph = Engine.transliterate(word);
          ghostEl.innerHTML = `
            <div class="tile-text-col">
              <span class="tile-bn">${isEnding ? '-' + word : word}</span>
              <span class="tile-phonetic">${ph}</span>
            </div>
          `;
          document.body.appendChild(ghostEl);
        }

        if (hasMoved && ghostEl) {
          ghostEl.style.left = `${moveEv.clientX - 40}px`;
          ghostEl.style.top = `${moveEv.clientY - 25}px`;
          if (isEnding) {
            highlightFusionTargetAtPoint(moveEv.clientX, moveEv.clientY, word);
          }
        }
      };

      const cleanupDrag = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        clearFusionHighlights();
        if (ghostEl) {
          ghostEl.remove();
          ghostEl = null;
        }
      };

      const onPointerCancel = () => {
        cleanupDrag();
      };

      const onPointerUp = (upEv) => {
        cleanupDrag();

        if (hasMoved) {
          const boardRect = elBoard.getBoundingClientRect();
          if (
            upEv.clientX >= boardRect.left &&
            upEv.clientX <= boardRect.right &&
            upEv.clientY >= boardRect.top &&
            upEv.clientY <= boardRect.bottom
          ) {
            if (isEnding) {
              const targetTile = findBoardTileNearPoint(upEv.clientX, upEv.clientY);
              if (targetTile) {
                fuseEndingOntoTile(targetTile.id, word);
                return;
              }
            }
            const lineH = getLineHeight();
            const topOff = getLineTopOffset();
            const estW = estimateTileWidth(word);
            const maxDropX = Math.max(12, (elBoard.clientWidth || 320) - estW - 12);
            const rawDropX = upEv.clientX - boardRect.left - Math.round(estW / 2);
            const dropX = Math.max(12, Math.min(rawDropX, maxDropX));
            const dropY = Math.max(10, upEv.clientY - boardRect.top + elBoard.scrollTop - 22);
            const lineIdx = Math.max(0, Math.round((dropY - topOff) / lineH));
            addWordToBoard(word, {
              category,
              isEnding,
              x: dropX,
              y: topOff + lineIdx * lineH,
              lineIdx
            });
          }
        } else {
          if (isEnding) {
            const targetId = state.selectedTileId || (state.boardTiles.length > 0 ? state.boardTiles[state.boardTiles.length - 1].id : null);
            if (targetId) {
              fuseEndingOntoTile(targetId, word);
              return;
            }
          }
          addWordToBoard(word, { category, isEnding });
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
    });
  }

  // ==========================================================================
  // 2. MAGNETIC BOARD MANAGEMENT & IN-BOUNDS AUTO-WRAPPING
  // ==========================================================================
  function getBoardMaxRight() {
    const w = elBoard ? elBoard.clientWidth : 0;
    return Math.max(190, (w || 340) - 10);
  }

  function renderLineGuides() {
    if (!elBoardLineGuides) return;
    elBoardLineGuides.innerHTML = '';
    const lineH = getLineHeight();
    const topOff = getLineTopOffset();
    const maxLine = state.boardTiles.reduce((m, t) => Math.max(m, t.lineIdx || 0), 5);
    const totalLines = Math.max(7, maxLine + 3);
    elBoardTilesLayer.style.minHeight = `${(totalLines + 1) * lineH + 36}px`;

    for (let i = 0; i < totalLines; i++) {
      const row = document.createElement('div');
      row.className = 'board-line-guide';
      row.style.top = `${topOff + i * lineH - 6}px`;
      row.style.height = `${lineH}px`;
      row.innerHTML = `<span class="line-number-tag">${i + 1}</span>`;
      elBoardLineGuides.appendChild(row);
    }
  }

  function estimateTileWidth(word) {
    const ph = Engine.transliterate(word);
    const mobile = isMobileViewport();
    if (measureCtx) {
      measureCtx.font = mobile
        ? '700 17px "Baloo Da 2", "Hind Siliguri", sans-serif'
        : '700 20px "Baloo Da 2", "Hind Siliguri", sans-serif';
      const bnW = measureCtx.measureText(word).width;
      let phW = 0;
      if (state.showPhonetics) {
        measureCtx.font = mobile
          ? '500 10.5px "Fredoka", sans-serif'
          : '500 12px "Fredoka", sans-serif';
        phW = measureCtx.measureText(ph).width;
      }
      const padBorder = mobile ? 24 : 32;
      return Math.max(mobile ? 48 : 58, Math.ceil(Math.max(bnW, phW) + padBorder + 4));
    }
    const charLen = Math.max(word.length * 14, state.showPhonetics ? ph.length * 8 : 0);
    return Math.max(58, charLen + 32);
  }

  function getNextPositionForLine(lineIdx, nextWord = '') {
    const lineH = getLineHeight();
    const topOff = getLineTopOffset();
    const leftStart = getLineLeftStart();
    const gap = getTileGap();
    const maxRight = getBoardMaxRight();
    const neededW = nextWord ? estimateTileWidth(nextWord) : 72;

    const tilesOnLine = state.boardTiles.filter(t => t.lineIdx === lineIdx);
    if (tilesOnLine.length === 0) {
      return { x: leftStart, y: topOff + lineIdx * lineH, lineIdx };
    }
    let curRight = leftStart;
    tilesOnLine.forEach(t => {
      const domEl = elBoardTilesLayer ? elBoardTilesLayer.querySelector(`.board-tile[data-id="${t.id}"]`) : null;
      const w = (domEl && domEl.offsetWidth) ? domEl.offsetWidth : estimateTileWidth(t.word);
      if (t.x + w + gap > curRight) {
        curRight = t.x + w + gap;
      }
    });

    if (curRight + neededW > maxRight) {
      const nextLine = lineIdx + 1;
      state.currentCursorLine = nextLine;
      return getNextPositionForLine(nextLine, nextWord);
    }
    return { x: curRight, y: topOff + lineIdx * lineH, lineIdx };
  }

  function addWordToBoard(word, opts = {}) {
    pushUndo();
    const category = opts.category || inferCategory(word);
    const lineIdx = opts.lineIdx !== undefined ? opts.lineIdx : state.currentCursorLine;
    const pos = (opts.x !== undefined && opts.y !== undefined)
      ? { x: opts.x, y: opts.y, lineIdx }
      : getNextPositionForLine(lineIdx, word);

    const newTile = {
      id: 'tile_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      word,
      baseWord: opts.baseWord || word,
      ending: opts.ending || '',
      category,
      isEnding: Boolean(opts.isEnding),
      x: pos.x,
      y: pos.y,
      lineIdx: pos.lineIdx,
      tilt: (Math.random() * 1.8 - 0.9).toFixed(2)
    };

    state.boardTiles.push(newTile);
    state.selectedTileId = newTile.id;
    state.currentCursorLine = pos.lineIdx;
    state.smartOffset = 0;

    if (state.autoAgree && !opts.skipAutoAgree) {
      harmonizeLineSubjectVerb(pos.lineIdx);
    }

    renderBoard();
    renderInspector();

    // Update smart next-word suggestions automatically!
    if (state.activeCategory === 'smart') {
      renderWordBrowser();
    }

    if (state.autoSpeak && !opts.silent) {
      Engine.speakWord(newTile.word);
    }
  }

  function fuseEndingOntoTile(targetTileId, endingText) {
    const tile = state.boardTiles.find(t => t.id === targetTileId);
    if (!tile) return;
    pushUndo();

    const oldWord = tile.word;
    const fused = Engine.joinWordAndEnding(oldWord, endingText);
    tile.baseWord = tile.baseWord || oldWord;
    tile.ending = tile.ending ? `${tile.ending}+${endingText}` : endingText;
    tile.word = fused;
    tile.isEnding = false;
    state.selectedTileId = tile.id;

    renderBoard();
    renderInspector();
    if (state.activeCategory === 'smart') renderWordBrowser();
    showToast(`✨ "${oldWord}" + "-${endingText}" ➔ "${fused}" (${Engine.transliterate(fused)})`);
    if (state.autoSpeak) {
      Engine.speakWord(fused);
    }
  }

  function findBoardTileNearPoint(clientX, clientY, excludeId = null) {
    const els = elBoardTilesLayer.querySelectorAll('.board-tile');
    for (const el of els) {
      const tid = el.dataset.id;
      if (tid === excludeId) continue;
      const r = el.getBoundingClientRect();
      if (
        clientX >= r.left - 12 &&
        clientX <= r.right + 12 &&
        clientY >= r.top - 10 &&
        clientY <= r.bottom + 10
      ) {
        return state.boardTiles.find(t => t.id === tid) || null;
      }
    }
    return null;
  }

  function clearFusionHighlights() {
    elBoardTilesLayer.querySelectorAll('.fusion-target').forEach(el => {
      el.classList.remove('fusion-target');
      const chip = el.querySelector('.fusion-preview-chip');
      if (chip) chip.remove();
    });
  }

  function highlightFusionTargetAtPoint(clientX, clientY, endingText, excludeId = null) {
    clearFusionHighlights();
    const targetTile = findBoardTileNearPoint(clientX, clientY, excludeId);
    if (!targetTile || targetTile.isEnding) return;
    const targetEl = elBoardTilesLayer.querySelector(`.board-tile[data-id="${targetTile.id}"]`);
    if (!targetEl) return;

    targetEl.classList.add('fusion-target');
    const fused = Engine.joinWordAndEnding(targetTile.word, endingText);
    const chip = document.createElement('div');
    chip.className = 'fusion-preview-chip';
    chip.textContent = `${targetTile.word} + ${endingText} ➔ ${fused}`;
    targetEl.appendChild(chip);
  }

  function harmonizeLineSubjectVerb(lineIdx) {
    const lineTiles = state.boardTiles
      .filter(t => t.lineIdx === lineIdx)
      .sort((a, b) => a.x - b.x);
    if (lineTiles.length < 2) return false;

    const words = lineTiles.map(t => t.word);
    const detectedSubj = Engine.detectLineSubject(words);
    if (!detectedSubj) return false;

    let anyUpdated = false;
    lineTiles.forEach(t => {
      if (t.category === 'verbs' || Engine.SURFACE_TO_VERB_ROOT[t.word]) {
        const agreed = Engine.agreeVerbWithSubject(t.word, detectedSubj);
        if (agreed && agreed !== t.word) {
          const prev = t.word;
          t.word = agreed;
          anyUpdated = true;
          showToast(`🤝 কর্তা "${detectedSubj}" অনুযায়ী "${prev}" ➔ "${agreed}" হয়েছে!`);
        }
      }
    });
    return anyUpdated;
  }

  function renderBoard() {
    renderLineGuides();
    elBoardTilesLayer.innerHTML = '';

    if (state.boardTiles.length === 0) {
      elBoardEmptyState.classList.remove('hidden');
      return;
    }
    elBoardEmptyState.classList.add('hidden');

    const frag = document.createDocumentFragment();
    state.boardTiles.forEach(tile => {
      const el = document.createElement('div');
      el.className = 'magnet-tile board-tile' + (tile.id === state.selectedTileId ? ' selected' : '');
      el.dataset.id = tile.id;
      el.dataset.cat = tile.isEnding ? 'endings' : (tile.category || 'general');
      el.style.left = `${tile.x}px`;
      el.style.top = `${tile.y}px`;
      el.style.transform = `rotate(${tile.tilt || 0}deg)`;

      const ph = Engine.transliterate(tile.word);
      const displayWord = tile.isEnding ? `-${tile.word}` : tile.word;

      el.innerHTML = `
        <button type="button" class="tile-delete-x" title="এই শব্দটি মুছে ফেলো (Delete this word)">✕</button>
        <div class="tile-text-col">
          <span class="tile-bn">${displayWord}</span>
          <span class="tile-phonetic">${ph}</span>
        </div>
      `;

      const delBtn = el.querySelector('.tile-delete-x');
      if (delBtn) {
        delBtn.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation();
        });
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteSingleBoardTile(tile.id);
        });
      }

      setupBoardTileDrag(el, tile);
      frag.appendChild(el);
    });

    elBoardTilesLayer.appendChild(frag);
    ensureAllBoardTilesInBounds();
  }

  let pendingBoundsFrame = null;
  function ensureAllBoardTilesInBounds() {
    if (!elBoard || !elBoardTilesLayer || state.boardTiles.length === 0) return;
    const boardW = elBoard.clientWidth;
    if (boardW < 100) {
      if (!pendingBoundsFrame) {
        pendingBoundsFrame = requestAnimationFrame(() => {
          pendingBoundsFrame = null;
          ensureAllBoardTilesInBounds();
        });
      }
      return;
    }

    const maxRight = boardW - 8;
    const leftStart = getLineLeftStart();
    const lineH = getLineHeight();
    const topOff = getLineTopOffset();
    const gap = getTileGap();

    const domMap = new Map();
    const widthMap = new Map();
    elBoardTilesLayer.querySelectorAll('.board-tile').forEach(el => {
      const id = el.dataset.id;
      domMap.set(id, el);
      widthMap.set(id, el.offsetWidth || 68);
    });

    // Check if any tile on the board is clipped / out-of-bounds horizontally or above top
    const hasOutOfBounds = state.boardTiles.some(t => {
      const w = widthMap.get(t.id) || estimateTileWidth(t.word);
      return t.x < 6 || t.y < 6 || (t.x + w > maxRight);
    });

    if (!hasOutOfBounds) return;

    // Group tiles by lineIdx and wrap any overflowing lines cleanly onto subsequent rows
    const byLine = new Map();
    state.boardTiles.forEach(t => {
      const l = Math.max(0, t.lineIdx || 0);
      if (!byLine.has(l)) byLine.set(l, []);
      byLine.get(l).push(t);
    });

    const sortedLines = Array.from(byLine.keys()).sort((a, b) => a - b);
    let extraLinesInserted = 0;

    sortedLines.forEach(origLine => {
      const tiles = byLine.get(origLine).sort((a, b) => a.x - b.x);
      let targetLine = origLine + extraLinesInserted;

      const lineOverflows = tiles.some((t, idx) => {
        const w = widthMap.get(t.id) || estimateTileWidth(t.word);
        if (t.x < 6 || t.y < 6 || t.x + w > maxRight) return true;
        if (idx > 0) {
          const prev = tiles[idx - 1];
          const prevW = widthMap.get(prev.id) || estimateTileWidth(prev.word);
          if (t.x < prev.x + prevW + 2) return true;
        }
        return false;
      });

      if (!lineOverflows) {
        tiles.forEach(t => {
          t.lineIdx = targetLine;
          t.y = topOff + targetLine * lineH;
        });
      } else {
        let curX = leftStart;
        tiles.forEach((t, idx) => {
          const w = widthMap.get(t.id) || estimateTileWidth(t.word);
          if (idx > 0 && curX + w > maxRight) {
            extraLinesInserted += 1;
            targetLine += 1;
            curX = leftStart;
          }
          t.x = Math.max(6, Math.min(curX, Math.max(6, maxRight - w)));
          t.lineIdx = targetLine;
          t.y = topOff + targetLine * lineH;
          curX = t.x + w + gap;
        });
      }
    });

    // Sync updated coordinates back to live DOM tiles & line guides
    state.boardTiles.forEach(t => {
      const el = domMap.get(t.id);
      if (el) {
        el.style.left = `${t.x}px`;
        el.style.top = `${t.y}px`;
      }
    });
    renderLineGuides();
  }

  function deleteSingleBoardTile(tileId) {
    if (state.boardTiles.length === 0) {
      showToast('বোর্ডে মোছার মতো কোনো শব্দ নেই!');
      return;
    }
    const targetId = tileId || state.selectedTileId || state.boardTiles[state.boardTiles.length - 1].id;
    const targetTile = state.boardTiles.find(t => t.id === targetId);
    if (!targetTile) return;

    pushUndo();
    const removedWord = targetTile.word;
    state.boardTiles = state.boardTiles.filter(t => t.id !== targetId);

    // Select the new last tile on the board so the top Magic Bar stays helpful
    if (state.boardTiles.length > 0) {
      state.selectedTileId = state.boardTiles[state.boardTiles.length - 1].id;
    } else {
      state.selectedTileId = null;
    }

    renderBoard();
    renderInspector();
    if (state.activeCategory === 'smart') renderWordBrowser();
    showToast(`⌫ "${removedWord}" শব্দটি মোছা হয়েছে (Undo দিয়ে ফিরিয়ে আনা যাবে)`);
  }

  function setupBoardTileDrag(el, tile) {
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;
    let moved = false;

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.stopPropagation();

      startX = e.clientX;
      startY = e.clientY;
      origX = tile.x;
      origY = tile.y;
      moved = false;

      state.selectedTileId = tile.id;
      state.currentCursorLine = tile.lineIdx || 0;
      elBoardTilesLayer.querySelectorAll('.board-tile.selected').forEach(n => n.classList.remove('selected'));
      el.classList.add('selected');
      renderInspector();
      if (state.activeCategory === 'smart') renderWordBrowser();

      const onMove = (me) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 4) {
          moved = true;
          pushUndo();
          el.classList.add('dragging');
        }
        if (moved) {
          const tileW = el.offsetWidth || estimateTileWidth(tile.word);
          const maxDragX = Math.max(6, (elBoard.clientWidth || 320) - tileW - 8);
          tile.x = Math.max(6, Math.min(origX + dx, maxDragX));
          tile.y = Math.max(6, origY + dy);
          el.style.left = `${tile.x}px`;
          el.style.top = `${tile.y}px`;

          if (tile.isEnding) {
            highlightFusionTargetAtPoint(me.clientX, me.clientY, tile.word, tile.id);
          }
        }
      };

      const cleanupBoardDrag = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        el.classList.remove('dragging');
        clearFusionHighlights();
      };

      const onCancel = () => {
        cleanupBoardDrag();
        renderBoard();
      };

      const onUp = (ue) => {
        cleanupBoardDrag();

        if (moved) {
          if (tile.isEnding) {
            const target = findBoardTileNearPoint(ue.clientX, ue.clientY, tile.id);
            if (target) {
              state.boardTiles = state.boardTiles.filter(t => t.id !== tile.id);
              fuseEndingOntoTile(target.id, tile.word);
              return;
            }
          }
          const lineH = getLineHeight();
          const topOff = getLineTopOffset();
          const snappedLine = Math.max(0, Math.round((tile.y - topOff) / lineH));
          tile.lineIdx = snappedLine;
          tile.y = topOff + snappedLine * lineH;
          state.currentCursorLine = snappedLine;

          if (state.autoAgree) {
            harmonizeLineSubjectVerb(snappedLine);
          }
          renderBoard();
          renderInspector();
          if (state.activeCategory === 'smart') renderWordBrowser();
        } else {
          if (state.autoSpeak) {
            Engine.speakWord(tile.word);
          }
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    });
  }

  elBoard.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.board-tile')) return;
    const rect = elBoard.getBoundingClientRect();
    const clickY = e.clientY - rect.top + elBoard.scrollTop;
    state.currentCursorLine = Math.max(0, Math.round((clickY - getLineTopOffset()) / getLineHeight()));
    state.selectedTileId = null;
    renderBoard();
    renderInspector();
    if (state.activeCategory === 'smart') renderWordBrowser();
  });

  function setMobileActiveTab(tabName) {
    state.mobileTab = tabName === 'inspector' ? 'inspector' : 'words';
    if (elWorkspaceGrid) {
      elWorkspaceGrid.classList.toggle('mob-view-inspector', state.mobileTab === 'inspector');
    }
    if (elBtnMobTabWords) {
      elBtnMobTabWords.classList.toggle('active', state.mobileTab === 'words');
    }
    if (elBtnMobTabInspector) {
      elBtnMobTabInspector.classList.toggle('active', state.mobileTab === 'inspector');
    }
  }

  // ==========================================================================
  // 3. INTERACTIVE WORD INSPECTOR
  // ==========================================================================
  function renderInspector() {
    const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
    if (elMobSelectedWordBadge) {
      if (tile) {
        elMobSelectedWordBadge.textContent = tile.word;
        elMobSelectedWordBadge.classList.remove('hidden');
      } else {
        elMobSelectedWordBadge.classList.add('hidden');
      }
    }

    if (!tile) {
      elInspectorPlaceholder.classList.remove('hidden');
      elInspectorActive.classList.add('hidden');
      return;
    }

    elInspectorPlaceholder.classList.add('hidden');
    elInspectorActive.classList.remove('hidden');

    const ph = Engine.transliterate(tile.word);
    elInspCategoryBadge.textContent = CATEGORY_LABELS[tile.category] || '✨ শব্দ';
    elInspWordBn.textContent = tile.word;
    elInspWordPhonetic.textContent = `/${ph}/`;

    if (tile.ending && tile.baseWord && tile.baseWord !== tile.word) {
      elInspMorphBreakdown.classList.remove('hidden');
      elInspMorphFormula.textContent = `${tile.baseWord} + ${tile.ending} = ${tile.word}`;
    } else {
      elInspMorphBreakdown.classList.add('hidden');
    }

    document.querySelectorAll('.insp-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.insptab === state.inspectorTab);
    });
    document.getElementById('inspPaneVerb').classList.toggle('hidden', state.inspectorTab !== 'verb');
    document.getElementById('inspPaneNoun').classList.toggle('hidden', state.inspectorTab !== 'noun');
    document.getElementById('inspPaneRhyme').classList.toggle('hidden', state.inspectorTab !== 'rhyme');

    renderVerbAgreementPane(tile);
    renderNounInflectionsPane(tile);
    renderRhymeFinderPane(tile);
  }

  function renderVerbAgreementPane(tile) {
    const conj = Engine.conjugateVerb(tile.word);

    elSubjectPills.querySelectorAll('.subj-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subj === state.selectedSubject);
    });

    const subj = state.selectedSubject;
    const tenseList = [
      { key: 'pres', name: 'বর্তমান (Present)' },
      { key: 'cont', name: 'চলমান (Doing)' },
      { key: 'perf', name: 'পুরাঘটিত (Have done)' },
      { key: 'past', name: 'অতীত (Past)' },
      { key: 'fut', name: 'ভবিষ্যৎ (Future)' }
    ];

    elVerbConjugationGrid.innerHTML = '';
    tenseList.forEach(tObj => {
      const formWord = conj[tObj.key] && conj[tObj.key][subj];
      if (!formWord) return;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'conj-chip' + (formWord === tile.word ? ' current-form' : '');
      const fPhon = Engine.transliterate(formWord);
      chip.innerHTML = `
        <span class="chip-tense-label">${tObj.name}:</span>
        <span class="chip-word-bn">${formWord}</span>
        <span class="chip-word-en">(${fPhon})</span>
      `;
      chip.addEventListener('click', () => {
        applyWordFormToTile(tile.id, formWord, conj.root, 'verbs');
      });
      elVerbConjugationGrid.appendChild(chip);
    });
  }

  function renderNounInflectionsPane(tile) {
    const base = tile.baseWord || tile.word;
    const meta = wordMetaMap.get(base) || wordMetaMap.get(tile.word);

    if (meta && meta.ends && meta.ends.length > 0) {
      elKitAttestedRow.classList.remove('hidden');
      elKitAttestedChips.innerHTML = '';
      meta.ends.forEach(endStr => {
        const fused = Engine.joinWordAndEnding(base, endStr);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inflection-chip' + (fused === tile.word ? ' current-form' : '');
        btn.innerHTML = `
          <span class="chip-tense-label">+${endStr}:</span>
          <span class="chip-word-bn">${fused}</span>
          <span class="chip-word-en">(${Engine.transliterate(fused)})</span>
        `;
        btn.addEventListener('click', () => fuseEndingOntoTile(tile.id, endStr));
        elKitAttestedChips.appendChild(btn);
      });
    } else {
      elKitAttestedRow.classList.add('hidden');
    }

    elNounInflectionChips.innerHTML = '';
    const forms = Engine.getNounInflections(base);
    forms.forEach(f => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inflection-chip' + (f.word === tile.word ? ' current-form' : '');
      btn.innerHTML = `
        <span class="chip-tense-label">${f.label}:</span>
        <span class="chip-word-bn">${f.word}</span>
        <span class="chip-word-en">(${Engine.transliterate(f.word)})</span>
      `;
      btn.addEventListener('click', () => {
        pushUndo();
        tile.word = f.word;
        tile.baseWord = base;
        tile.ending = f.ending;
        renderBoard();
        renderInspector();
        if (state.autoSpeak) Engine.speakWord(f.word);
      });
      elNounInflectionChips.appendChild(btn);
    });
  }

  function renderRhymeFinderPane(tile) {
    elRhymeTargetLabel.textContent = tile.word;
    elRhymeResultsGrid.innerHTML = '';
    const rhymes = Engine.findRhymes(tile.word, DATA.words, 24);

    if (rhymes.length === 0) {
      elRhymeResultsGrid.innerHTML = `<span style="font-size:0.88rem; color:#64748b;">এই শব্দের সাথে সরাসরি ছন্দ পাওয়া যায়নি।</span>`;
      return;
    }

    rhymes.forEach(r => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inflection-chip';
      btn.innerHTML = `
        <span class="chip-word-bn">${r.word}</span>
        <span class="chip-word-en">(${r.phonetic})</span>
      `;
      btn.addEventListener('click', () => addWordToBoard(r.word, { category: r.category }));
      elRhymeResultsGrid.appendChild(btn);
    });
  }

  function applyWordFormToTile(tileId, newWord, rootWord, category) {
    const tile = state.boardTiles.find(t => t.id === tileId);
    if (!tile) return;
    pushUndo();
    tile.word = newWord;
    if (rootWord) tile.baseWord = rootWord;
    if (category) tile.category = category;
    renderBoard();
    renderInspector();
    if (state.activeCategory === 'smart') renderWordBrowser();
    if (state.autoSpeak) Engine.speakWord(newWord);
  }

  // ==========================================================================
  // 4. PLAY POEM ALOUD (Slow, Clear Word-by-Word or Paced Line Narration!)
  // ==========================================================================
  function getStructuredPoemLinesFromBoard() {
    if (state.boardTiles.length === 0) return [];
    const byLine = new Map();
    state.boardTiles.forEach(t => {
      const l = t.lineIdx || 0;
      if (!byLine.has(l)) byLine.set(l, []);
      byLine.get(l).push(t);
    });

    const sortedLineNums = Array.from(byLine.keys()).sort((a, b) => a - b);
    return sortedLineNums.map(lineNum => {
      const tiles = byLine.get(lineNum).sort((a, b) => a.x - b.x);
      const text = tiles.map(t => t.word).join(' ');
      const phonetic = tiles.map(t => Engine.transliterate(t.word)).join(' ');
      return { lineNum, tiles, text, phonetic };
    });
  }

  async function playBoardPoemAloud() {
    const lines = getStructuredPoemLinesFromBoard();
    if (lines.length === 0) {
      showToast('বোর্ডে এখনো কোনো শব্দ নেই! আগে কিছু শব্দ যোগ করো।');
      return;
    }

    state.isPlayingPoem = true;
    elBtnPlayPoem.classList.add('hidden');
    elBtnStopPoem.classList.remove('hidden');
    elLiveNarrationBar.classList.remove('hidden');

    const mode = elSpeechModeSelect ? elSpeechModeSelect.value : 'word-by-word';

    await Engine.speakPoemLines(lines, {
      mode,
      rate: 0.80,
      onLineStart: (idx, lineObj) => {
        elNarrationBn.textContent = lineObj.text;
        elNarrationEn.textContent = lineObj.phonetic;
      },
      onWordStart: (tile) => {
        elBoardTilesLayer.querySelectorAll('.board-tile').forEach(el => {
          el.classList.remove('speaking-highlight');
        });
        const domTile = elBoardTilesLayer.querySelector(`.board-tile[data-id="${tile.id}"]`);
        if (domTile) {
          domTile.classList.add('speaking-highlight');
          // Keep the spoken word smoothly scrolled into view inside the board
          const tileTop = tile.y;
          const tileBottom = tile.y + (domTile.offsetHeight || 52);
          if (tileTop < elBoard.scrollTop + 12) {
            elBoard.scrollTo({ top: Math.max(0, tileTop - 16), behavior: 'smooth' });
          } else if (tileBottom > elBoard.scrollTop + elBoard.clientHeight - 20) {
            elBoard.scrollTo({ top: tileBottom - elBoard.clientHeight + 28, behavior: 'smooth' });
          }
        }
      },
      onDone: () => stopBoardPoemNarration()
    });
  }

  function stopBoardPoemNarration() {
    Engine.stopSpeaking();
    state.isPlayingPoem = false;
    elBtnPlayPoem.classList.remove('hidden');
    elBtnStopPoem.classList.add('hidden');
    elLiveNarrationBar.classList.add('hidden');
    elBoardTilesLayer.querySelectorAll('.board-tile.speaking-highlight').forEach(el => {
      el.classList.remove('speaking-highlight');
    });
  }

  // ==========================================================================
  // 5. LOAD POEM TEMPLATES, SAVED POEMS & EXPORT IMAGE
  // ==========================================================================
  function loadPoemOntoBoard(poem, mode = 'short') {
    pushUndo();
    stopBoardPoemNarration();
    state.boardTiles = [];
    state.selectedTileId = null;
    state.currentCursorLine = 0;

    if (elPoemTitleInput) elPoemTitleInput.value = poem.title_bn;
    if (elPoemAuthorInput) elPoemAuthorInput.value = poem.poet || '';

    const linesToLoad = mode === 'short' ? poem.lines.slice(0, 4) : poem.lines;
    const leftStart = getLineLeftStart();
    const lineH = getLineHeight();
    const topOff = getLineTopOffset();
    const gap = getTileGap();
    const maxRight = getBoardMaxRight();

    let visualLineIdx = 0;

    linesToLoad.forEach((lineObj, pIdx) => {
      let curX = leftStart;

      lineObj.words.forEach((w, wIdx) => {
        const wWidth = estimateTileWidth(w);
        // Wrap long poem lines onto the next row so no word EVER goes out of bounds!
        if (wIdx > 0 && curX + wWidth > maxRight) {
          visualLineIdx += 1;
          curX = leftStart;
        }

        const isLastWord = (wIdx === lineObj.words.length - 1);
        const baseW = (isLastWord && lineObj.base) ? lineObj.base : w;
        const endingW = (isLastWord && lineObj.endings && lineObj.endings.length > 0) ? lineObj.endings[0] : '';

        state.boardTiles.push({
          id: `tile_${Date.now()}_${pIdx}_${wIdx}_${Math.random().toString(36).slice(2, 5)}`,
          word: w,
          baseWord: baseW,
          ending: endingW,
          category: inferCategory(w),
          isEnding: false,
          x: curX,
          y: topOff + visualLineIdx * lineH,
          lineIdx: visualLineIdx,
          tilt: (Math.random() * 1.6 - 0.8).toFixed(2)
        });

        curX += wWidth + gap;
      });

      visualLineIdx += 1;
    });

    if (elBoard) elBoard.scrollTop = 0;
    state.currentCursorLine = Math.max(0, visualLineIdx - 1);

    // Auto-select a verb tile (or the last word of line 1) so the Word Options pane
    // immediately displays Verb Forms, Suffix Endings, and Rhymes!
    if (state.boardTiles.length > 0) {
      const verbTile = state.boardTiles.find(t => t.category === 'verbs' || Engine.SURFACE_TO_VERB_ROOT[t.word]);
      state.selectedTileId = (verbTile || state.boardTiles[state.boardTiles.length - 1]).id;
    }

    renderBoard();
    renderInspector();
    if (state.activeCategory === 'smart') renderWordBrowser();
  }

  function tidyBoardLayout() {
    if (state.boardTiles.length === 0) return;
    pushUndo();
    const lines = getStructuredPoemLinesFromBoard();
    const leftStart = getLineLeftStart();
    const lineH = getLineHeight();
    const topOff = getLineTopOffset();
    const gap = getTileGap();
    const maxRight = getBoardMaxRight();

    let visualLineIdx = 0;
    lines.forEach((lineObj) => {
      let curX = leftStart;
      lineObj.tiles.forEach((t, idx) => {
        const wWidth = estimateTileWidth(t.word);
        if (idx > 0 && curX + wWidth > maxRight) {
          visualLineIdx += 1;
          curX = leftStart;
        }
        t.lineIdx = visualLineIdx;
        t.x = curX;
        t.y = topOff + visualLineIdx * lineH;
        t.tilt = '0';
        curX += wWidth + gap;
      });
      visualLineIdx += 1;
    });
    renderBoard();
    showToast('📏 সব শব্দ লাইনে সুন্দর করে সাজানো হয়েছে!');
  }

  function updateSavedPoemsBadge() {
    const badge = document.getElementById('savedPoemsCount');
    if (badge) badge.textContent = String(savedPoems.length);
  }

  function saveCurrentPoemToStorage() {
    if (state.boardTiles.length === 0) {
      showToast('সেভ করার আগে বোর্ডে কিছু শব্দ যোগ করো!');
      return;
    }
    const lines = getStructuredPoemLinesFromBoard();
    const firstLineTitle = (lines[0] && lines[0].text) ? lines[0].text.slice(0, 28) : 'আমার ছড়া';
    const poemRecord = {
      id: 'saved_' + Date.now(),
      title: (elPoemTitleInput && elPoemTitleInput.value.trim()) || firstLineTitle,
      author: (elPoemAuthorInput && elPoemAuthorInput.value.trim()) || 'খুদে ছড়াকার',
      createdAt: new Date().toLocaleDateString('bn-BD'),
      preview: lines.map(l => l.text).join('\n'),
      tiles: JSON.parse(JSON.stringify(state.boardTiles))
    };
    savedPoems.unshift(poemRecord);
    localStorage.setItem(STORAGE_SAVED_POEMS, JSON.stringify(savedPoems));
    updateSavedPoemsBadge();
    showToast(`💾 "${poemRecord.title}" আমার খাতায় সেভ হয়েছে!`);
  }

  function renderSavedPoemsModal() {
    const listEl = document.getElementById('savedPoemsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (savedPoems.length === 0) {
      listEl.innerHTML = `<p style="color:#64748b; padding: 16px;">তোমার খাতায় এখনো কোনো ছড়া সেভ করা হয়নি। বোর্ডের উপরের <strong>💾 সেভ</strong> বাটনে ক্লিক করে ছড়া সংরক্ষণ করো!</p>`;
      return;
    }

    savedPoems.forEach(sp => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.innerHTML = `
        <div>
          <div class="tpl-head">
            <span class="tpl-icon">📝</span>
            <div>
              <div class="tpl-title-bn">${sp.title}</div>
              <div class="tpl-poet">${sp.createdAt}</div>
            </div>
          </div>
          <div class="tpl-preview-lines" style="margin-top:8px; white-space:pre-line;">${sp.preview}</div>
        </div>
        <div class="tpl-actions">
          <button type="button" class="btn-tpl-load">🧲 বোর্ডে লোড করো</button>
          <button type="button" class="btn-tpl-speak">🔊 শোনো</button>
          <button type="button" class="btn-mini btn-mini-danger btn-del-saved" style="flex:0 0 36px;">🗑️</button>
        </div>
      `;

      card.querySelector('.btn-tpl-load').addEventListener('click', () => {
        pushUndo();
        state.boardTiles = JSON.parse(JSON.stringify(sp.tiles));
        if (elPoemTitleInput) elPoemTitleInput.value = sp.title;
        renderBoard();
        renderInspector();
        document.getElementById('modalSavedPoems').classList.add('hidden');
      });

      card.querySelector('.btn-tpl-speak').addEventListener('click', () => {
        Engine.speakWord(sp.preview.replace(/\n/g, '। '));
      });

      card.querySelector('.btn-del-saved').addEventListener('click', () => {
        savedPoems = savedPoems.filter(item => item.id !== sp.id);
        localStorage.setItem(STORAGE_SAVED_POEMS, JSON.stringify(savedPoems));
        updateSavedPoemsBadge();
        renderSavedPoemsModal();
      });

      listEl.appendChild(card);
    });
  }

  function exportPoemAsImage() {
    if (state.boardTiles.length === 0) {
      showToast('ছবি ডাউনলোড করার আগে বোর্ডে কিছু শব্দ দিয়ে ছড়া তৈরি করো!');
      return;
    }

    const lines = getStructuredPoemLinesFromBoard();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = 1000;
    const height = Math.max(560, 180 + lines.length * 76);
    canvas.width = width;
    canvas.height = height;

    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (state.boardTheme === 'theme-sky') {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#312e81');
    } else if (state.boardTheme === 'theme-meadow') {
      grad.addColorStop(0, '#e0f2fe');
      grad.addColorStop(1, '#dcfce7');
    } else if (state.boardTheme === 'theme-notebook') {
      grad.addColorStop(0, '#fffdf5');
      grad.addColorStop(1, '#fef3c7');
    } else {
      grad.addColorStop(0, '#eef2ff');
      grad.addColorStop(1, '#fdf2f8');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const isDark = state.boardTheme === 'theme-sky';
    ctx.fillStyle = isDark ? '#fde047' : '#312e81';
    ctx.font = 'bold 34px "Baloo Da 2", "Hind Siliguri", sans-serif';
    const title = (elPoemTitleInput && elPoemTitleInput.value.trim()) || 'আমার বাংলা ছড়া';
    ctx.fillText(`🧲 ${title}`, 48, 72);

    const catColors = {
      pronoun_people: { bg: '#fff1f2', border: '#f43f5e', text: '#881337' },
      nature: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
      animals: { bg: '#fefce8', border: '#eab308', text: '#713f12' },
      verbs: { bg: '#ecfdf5', border: '#10b981', text: '#064e3b' },
      adjectives: { bg: '#f5f3ff', border: '#8b5cf6', text: '#4c1d95' },
      rhythm: { bg: '#fdf2f8', border: '#ec4899', text: '#831843' },
      objects_food: { bg: '#fff7ed', border: '#f97316', text: '#7c2d92' },
      general: { bg: '#ffffff', border: '#64748b', text: '#1e293b' }
    };

    lines.forEach((lineObj, idx) => {
      let curX = 52;
      const curY = 120 + idx * 72;

      lineObj.tiles.forEach(t => {
        ctx.font = 'bold 24px "Baloo Da 2", "Hind Siliguri", sans-serif';
        const bnWidth = ctx.measureText(t.word).width;
        const ph = Engine.transliterate(t.word);
        ctx.font = '500 13px "Fredoka", sans-serif';
        const phWidth = state.showPhonetics ? ctx.measureText(ph).width : 0;

        const boxW = Math.max(bnWidth, phWidth) + 28;
        const boxH = state.showPhonetics ? 54 : 42;
        const col = catColors[t.category] || catColors.general;

        ctx.fillStyle = col.border;
        ctx.beginPath();
        ctx.roundRect(curX, curY + 4, boxW, boxH, 10);
        ctx.fill();

        ctx.fillStyle = col.bg;
        ctx.strokeStyle = col.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(curX, curY, boxW, boxH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = col.text;
        ctx.font = 'bold 23px "Baloo Da 2", "Hind Siliguri", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.word, curX + boxW / 2, curY + 27);

        if (state.showPhonetics) {
          ctx.fillStyle = '#475569';
          ctx.font = '500 12px "Fredoka", sans-serif';
          ctx.fillText(ph, curX + boxW / 2, curY + 45);
        }

        ctx.textAlign = 'left';
        curX += boxW + 12;
      });
    });

    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('📸 ছড়ার রঙিন ছবি ডাউনলোড হয়েছে!');
  }

  function renderTemplatesModal() {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    (DATA.poems || []).forEach(poem => {
      const card = document.createElement('div');
      card.className = 'template-card';
      const previewLines = poem.lines.slice(0, 4).map(l => l.words.join(' ')).join('<br/>');

      card.innerHTML = `
        <div>
          <div class="tpl-head">
            <span class="tpl-icon">${poem.icon || '📜'}</span>
            <div>
              <div class="tpl-title-bn">${poem.title_bn}</div>
              <div class="tpl-poet">${poem.poet}</div>
            </div>
          </div>
          <div class="tpl-preview-lines" style="margin-top:8px;">${previewLines}</div>
        </div>
        <div class="tpl-actions">
          <button type="button" class="btn-tpl-load">🧲 বোর্ডে সাজাও</button>
          <button type="button" class="btn-tpl-speak">🔊 শোনো</button>
        </div>
      `;

      card.querySelector('.btn-tpl-load').addEventListener('click', () => {
        const modeInput = document.querySelector('input[name="templateLoadMode"]:checked');
        const mode = modeInput ? modeInput.value : 'short';
        loadPoemOntoBoard(poem, mode);
        document.getElementById('modalTemplates').classList.add('hidden');
      });

      card.querySelector('.btn-tpl-speak').addEventListener('click', () => {
        const sampleText = poem.lines.slice(0, 4).map(l => l.words.join(', ')).join('। ');
        Engine.speakWord(sampleText);
      });

      grid.appendChild(card);
    });
  }

  function openAddWordModal(prefill = '') {
    const modal = document.getElementById('modalAddWord');
    const bnInput = document.getElementById('newWordBn');
    const phInput = document.getElementById('newWordPhonetic');
    modal.classList.remove('hidden');
    bnInput.value = prefill;
    phInput.value = prefill ? Engine.transliterate(prefill) : '';
    updateNewWordPreview();
    bnInput.focus();
  }

  function updateNewWordPreview() {
    const bn = document.getElementById('newWordBn').value.trim();
    const cat = document.getElementById('newWordCategory').value;
    const phInput = document.getElementById('newWordPhonetic');
    const previewContainer = document.getElementById('newWordFormsPreview');

    if (!bn) {
      previewContainer.innerHTML = `<span style="color:#64748b; font-size:0.85rem;">উপরে বাংলা শব্দ লিখলে তার রূপ দেখা যাবে...</span>`;
      return;
    }

    phInput.placeholder = Engine.transliterate(bn);
    previewContainer.innerHTML = '';

    if (cat === 'verbs') {
      const conj = Engine.conjugateVerb(bn);
      const samples = [conj.pres['আমি'], conj.pres['তুমি'], conj.pres['সে'], conj.perf['আমি'], conj.perf['সে'], conj.fut['আমি']];
      Array.from(new Set(samples)).forEach(w => {
        const span = document.createElement('span');
        span.className = 'inflection-chip';
        span.innerHTML = `<span class="chip-word-bn">${w}</span> <span class="chip-word-en">(${Engine.transliterate(w)})</span>`;
        span.addEventListener('click', () => Engine.speakWord(w));
        previewContainer.appendChild(span);
      });
    } else {
      const forms = Engine.getNounInflections(bn).slice(0, 6);
      forms.forEach(f => {
        const span = document.createElement('span');
        span.className = 'inflection-chip';
        span.innerHTML = `<span class="chip-word-bn">${f.word}</span> <span class="chip-word-en">(${Engine.transliterate(f.word)})</span>`;
        span.addEventListener('click', () => Engine.speakWord(f.word));
        previewContainer.appendChild(span);
      });
    }
  }

  function bindEvents() {
    elWordSearchInput.addEventListener('input', () => {
      state.searchQuery = elWordSearchInput.value;
      elBtnClearSearch.classList.toggle('hidden', !state.searchQuery);
      renderWordBrowser();
    });

    elBtnClearSearch.addEventListener('click', () => {
      state.searchQuery = '';
      elWordSearchInput.value = '';
      elBtnClearSearch.classList.add('hidden');
      renderWordBrowser();
    });

    // Primary Mode Bar buttons
    if (elTabSmartDefault) {
      elTabSmartDefault.addEventListener('click', () => {
        state.activeCategory = 'smart';
        state.activeLetter = '';
        state.smartOffset = 0;
        if (elCollapsibleDrawer) elCollapsibleDrawer.classList.add('hidden');
        renderWordBrowser();
      });
    }

    if (elTabEndingsMain) {
      elTabEndingsMain.addEventListener('click', () => {
        state.activeCategory = 'endings';
        state.activeLetter = '';
        if (elCollapsibleDrawer) elCollapsibleDrawer.classList.add('hidden');
        renderWordBrowser();
      });
    }

    if (elBtnToggleCatDrawer) {
      elBtnToggleCatDrawer.addEventListener('click', () => {
        elCollapsibleDrawer.classList.toggle('hidden');
      });
    }

    if (elBtnRefreshSmart) {
      elBtnRefreshSmart.addEventListener('click', () => {
        state.smartOffset += 18;
        renderWordBrowser();
      });
    }

    // Category drawer tabs
    if (elCategoryTabs) {
      elCategoryTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-tab');
        if (!btn) return;
        state.activeCategory = btn.dataset.cat;
        if (elCollapsibleDrawer) elCollapsibleDrawer.classList.add('hidden');
        renderWordBrowser();
      });
    }

    // Alphabet filter inside drawer
    if (elLetterFilterBar) {
      elLetterFilterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.letter-btn');
        if (!btn) return;
        state.activeLetter = btn.dataset.letter || '';
        if (state.activeCategory === 'smart' || state.activeCategory === 'endings') {
          state.activeCategory = 'all';
        }
        elLetterFilterBar.querySelectorAll('.letter-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (elCollapsibleDrawer) elCollapsibleDrawer.classList.add('hidden');
        renderWordBrowser();
      });
    }

    // Top "More Options" dropdown menu
    const btnMoreMenu = document.getElementById('btnToggleMoreMenu');
    const elMoreDropdown = document.getElementById('moreOptionsDropdown');
    if (btnMoreMenu && elMoreDropdown) {
      btnMoreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        elMoreDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.more-menu-wrap')) {
          elMoreDropdown.classList.add('hidden');
        }
      });
    }

    // Dropdown Options
    const btnPhon = document.getElementById('btnTogglePhonetics');
    if (btnPhon) {
      btnPhon.addEventListener('click', () => {
        state.showPhonetics = !state.showPhonetics;
        document.body.classList.toggle('show-phonetics', state.showPhonetics);
        btnPhon.classList.toggle('active', state.showPhonetics);
        btnPhon.querySelector('.status-pill').textContent = state.showPhonetics ? 'ON' : 'OFF';
        renderBoard();
      });
    }

    const btnAutoSpeak = document.getElementById('btnToggleAutoSpeak');
    if (btnAutoSpeak) {
      btnAutoSpeak.addEventListener('click', () => {
        state.autoSpeak = !state.autoSpeak;
        btnAutoSpeak.classList.toggle('active', state.autoSpeak);
        btnAutoSpeak.querySelector('.status-pill').textContent = state.autoSpeak ? 'ON' : 'OFF';
      });
    }

    const btnAutoAgree = document.getElementById('btnToggleAutoAgree');
    if (btnAutoAgree) {
      btnAutoAgree.addEventListener('click', () => {
        state.autoAgree = !state.autoAgree;
        btnAutoAgree.classList.toggle('active', state.autoAgree);
        btnAutoAgree.querySelector('.status-pill').textContent = state.autoAgree ? 'ON' : 'OFF';
      });
    }

    const btnAgreeAll = document.getElementById('btnAutoAgreeAll');
    if (btnAgreeAll) {
      btnAgreeAll.addEventListener('click', () => {
        pushUndo();
        const maxL = state.boardTiles.reduce((m, t) => Math.max(m, t.lineIdx || 0), 0);
        let changed = false;
        for (let l = 0; l <= maxL; l++) {
          if (harmonizeLineSubjectVerb(l)) changed = true;
        }
        renderBoard();
        renderInspector();
        if (!changed) showToast('🤝 সব লাইনের কর্তা ও ক্রিয়া ইতিমধ্যে মিল আছে!');
        if (elMoreDropdown) elMoreDropdown.classList.add('hidden');
      });
    }

    document.querySelectorAll('.sym-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.symbol;
        if (state.boardTiles.length > 0) {
          const last = state.boardTiles[state.boardTiles.length - 1];
          pushUndo();
          last.word = last.word + sym;
          renderBoard();
          renderInspector();
        }
      });
    });

    document.getElementById('btnNewLine').addEventListener('click', () => {
      state.currentCursorLine += 1;
      state.smartOffset = 0;
      if (state.activeCategory === 'smart') renderWordBrowser();
      showToast(`↵ নতুন লাইন (${state.currentCursorLine + 1} নং লাইন)`);
    });

    elBtnPlayPoem.addEventListener('click', playBoardPoemAloud);
    elBtnStopPoem.addEventListener('click', stopBoardPoemNarration);

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.body.classList.remove('theme-fridge', 'theme-sky', 'theme-meadow', 'theme-notebook');
        document.body.classList.add(theme);
        state.boardTheme = theme;
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    document.getElementById('btnTidyBoard').addEventListener('click', tidyBoardLayout);
    document.getElementById('btnSavePoem').addEventListener('click', saveCurrentPoemToStorage);

    document.getElementById('btnUndo').addEventListener('click', () => {
      if (state.undoStack.length === 0) return;
      state.boardTiles = JSON.parse(state.undoStack.pop());
      state.selectedTileId = state.boardTiles.length > 0 ? state.boardTiles[state.boardTiles.length - 1].id : null;
      renderBoard();
      renderInspector();
      if (state.activeCategory === 'smart') renderWordBrowser();
    });

    const btnDeleteSelectedWord = document.getElementById('btnDeleteSelectedWord');
    if (btnDeleteSelectedWord) {
      btnDeleteSelectedWord.addEventListener('click', () => {
        deleteSingleBoardTile(state.selectedTileId);
      });
    }

    document.getElementById('btnExportImage').addEventListener('click', () => {
      if (elMoreDropdown) elMoreDropdown.classList.add('hidden');
      exportPoemAsImage();
    });

    document.getElementById('btnClearBoard').addEventListener('click', () => {
      if (state.boardTiles.length === 0) return;
      if (state.boardTiles.length > 1) {
        const ok = window.confirm('তুমি কি পুরো বোর্ডের সবগুলো শব্দ মুছে ফেলতে চাও?\n(একটি শব্দ মুছতে চাইলে "⌫ শব্দ মুছুন" বাটনে ক্লিক করো।)');
        if (!ok) return;
      }
      pushUndo();
      stopBoardPoemNarration();
      state.boardTiles = [];
      state.selectedTileId = null;
      state.currentCursorLine = 0;
      renderBoard();
      renderInspector();
      if (state.activeCategory === 'smart') renderWordBrowser();
    });

    document.getElementById('btnEmptyLoadSample').addEventListener('click', () => {
      if (DATA.poems && DATA.poems.length > 0) loadPoemOntoBoard(DATA.poems[0], 'short');
    });

    document.getElementById('btnEmptyAddStarter').addEventListener('click', () => {
      ['আমি', 'সকাল', 'বেলার', 'পাখি'].forEach(w => addWordToBoard(w, { silent: true, lineIdx: 0 }));
      ['চাঁদ', 'মামা', 'আকাশে', 'হাসে'].forEach(w => addWordToBoard(w, { silent: true, lineIdx: 1 }));
    });

    document.getElementById('btnInspSpeak').addEventListener('click', () => {
      const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
      if (tile) Engine.speakWord(tile.word);
    });

    document.getElementById('btnInspDuplicate').addEventListener('click', () => {
      const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
      if (tile) addWordToBoard(tile.word, { category: tile.category, baseWord: tile.baseWord, ending: tile.ending, lineIdx: tile.lineIdx });
    });

    document.getElementById('btnInspDelete').addEventListener('click', () => {
      if (!state.selectedTileId) return;
      deleteSingleBoardTile(state.selectedTileId);
    });

    document.getElementById('btnInspClose').addEventListener('click', () => {
      state.selectedTileId = null;
      renderBoard();
      renderInspector();
    });

    document.getElementById('btnInspPeelEnding').addEventListener('click', () => {
      const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
      if (!tile || !tile.baseWord) return;
      pushUndo();
      tile.word = tile.baseWord;
      tile.ending = '';
      renderBoard();
      renderInspector();
      if (state.autoSpeak) Engine.speakWord(tile.word);
    });

    document.querySelectorAll('.insp-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.inspectorTab = btn.dataset.insptab;
        renderInspector();
      });
    });

    elSubjectPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.subj-pill');
      if (!btn) return;
      state.selectedSubject = btn.dataset.subj;
      renderInspector();
    });

    document.getElementById('btnQuickRhymeLast').addEventListener('click', () => {
      if (state.boardTiles.length === 0) {
        showToast('বোর্ডে অন্তত একটি শব্দ যোগ করো!');
        return;
      }
      const lastTile = state.boardTiles[state.boardTiles.length - 1];
      state.selectedTileId = lastTile.id;
      state.inspectorTab = 'rhyme';
      setMobileActiveTab('inspector');
      renderBoard();
      renderInspector();
    });

    if (elBtnMobTabWords) {
      elBtnMobTabWords.addEventListener('click', () => setMobileActiveTab('words'));
    }
    if (elBtnMobTabInspector) {
      elBtnMobTabInspector.addEventListener('click', () => setMobileActiveTab('inspector'));
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderBoard();
      }, 120);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        ensureAllBoardTilesInBounds();
      });
    }

    document.getElementById('btnOpenTemplates').addEventListener('click', () => {
      renderTemplatesModal();
      document.getElementById('modalTemplates').classList.remove('hidden');
    });

    document.getElementById('btnOpenAddWord').addEventListener('click', () => openAddWordModal(''));

    const btnSaved = document.getElementById('btnOpenSavedPoems');
    if (btnSaved) {
      btnSaved.addEventListener('click', () => {
        renderSavedPoemsModal();
        document.getElementById('modalSavedPoems').classList.remove('hidden');
      });
    }

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.close;
        if (targetId) document.getElementById(targetId).classList.add('hidden');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    const elNewWordBn = document.getElementById('newWordBn');
    const elNewWordCat = document.getElementById('newWordCategory');
    elNewWordBn.addEventListener('input', updateNewWordPreview);
    elNewWordCat.addEventListener('change', updateNewWordPreview);

    document.getElementById('btnPreviewNewWordSpeak').addEventListener('click', () => {
      const w = elNewWordBn.value.trim();
      if (w) Engine.speakWord(w);
    });

    document.getElementById('formAddWord').addEventListener('submit', (e) => {
      e.preventDefault();
      const w = elNewWordBn.value.trim();
      if (!w) return;
      const p = document.getElementById('newWordPhonetic').value.trim() || Engine.transliterate(w);
      const c = elNewWordCat.value || 'general';
      const addDirectly = document.getElementById('chkAddDirectlyToBoard').checked;

      const newEntry = { w, p, c, f: 10, pop: true, root: true, ends: [], isCustom: true };
      customWords.unshift(newEntry);
      localStorage.setItem(STORAGE_CUSTOM_WORDS, JSON.stringify(customWords));
      DATA.words.unshift(newEntry);
      wordMetaMap.set(w, newEntry);

      document.getElementById('modalAddWord').classList.add('hidden');
      renderWordBrowser();

      if (addDirectly) {
        addWordToBoard(w, { category: c, isEnding: c === 'endings' });
      }
      showToast(`➕ "${w}" (${p}) যোগ হয়েছে!`);
    });
  }

  function init() {
    updateSavedPoemsBadge();
    bindEvents();

    if (DATA.poems && DATA.poems.length > 0) {
      loadPoemOntoBoard(DATA.poems[0], 'short');
    } else {
      renderBoard();
      renderInspector();
    }
    renderWordBrowser();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
