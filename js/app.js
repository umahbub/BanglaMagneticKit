/**
 * ছড়ার চুম্বক | Bangla Magnetic Word Kit for Kids
 * Main Application Controller (js/app.js)
 */

(function () {
  const DATA = window.BANGLA_KIT_DATA || { words: [], endings: [], poems: [] };
  const Engine = window.BanglaEngine;

  // Lookup maps
  const wordMetaMap = new Map();
  DATA.words.forEach(item => wordMetaMap.set(item.w, item));

  // Load custom words from localStorage
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

  // App State
  const state = {
    activeCategory: 'popular',
    searchQuery: '',
    activeLetter: '',
    showPhonetics: true,
    autoSpeak: true,
    autoAgree: true,
    boardTheme: 'theme-fridge',
    boardTiles: [], // { id, word, baseWord, ending, category, x, y, lineIdx, tilt }
    selectedTileId: null,
    inspectorTab: 'verb', // 'verb' | 'noun' | 'rhyme'
    selectedSubject: 'আমি',
    undoStack: [],
    currentCursorLine: 0,
    isPlayingPoem: false
  };

  const LINE_HEIGHT = 62;
  const LINE_TOP_OFFSET = 20;
  const LINE_LEFT_START = 34;

  // DOM Elements
  const elWordTray = document.getElementById('wordTray');
  const elWordCountBadge = document.getElementById('wordCountBadge');
  const elWordSearchInput = document.getElementById('wordSearchInput');
  const elBtnClearSearch = document.getElementById('btnClearSearch');
  const elCategoryTabs = document.getElementById('categoryTabs');
  const elLetterFilterBar = document.getElementById('letterFilterBar');
  const elEndingsHelperBanner = document.getElementById('endingsHelperBanner');

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
  const elSpeechSpeedSelect = document.getElementById('speechSpeedSelect');

  // Inspector DOM
  const elInspectorPlaceholder = document.getElementById('inspectorPlaceholder');
  const elInspectorActive = document.getElementById('inspectorActive');
  const elInspCategoryBadge = document.getElementById('inspCategoryBadge');
  const elInspWordBn = document.getElementById('inspWordBn');
  const elInspWordPhonetic = document.getElementById('inspWordPhonetic');
  const elInspMorphBreakdown = document.getElementById('inspMorphBreakdown');
  const elInspMorphFormula = document.getElementById('inspMorphFormula');
  const elInspCustomTextInput = document.getElementById('inspCustomTextInput');
  const elVerbRootLabel = document.getElementById('verbRootLabel');
  const elLineSubjectMatchBadge = document.getElementById('lineSubjectMatchBadge');
  const elSubjectPills = document.getElementById('subjectPills');
  const elVerbConjugationGrid = document.getElementById('verbConjugationGrid');
  const elKitAttestedRow = document.getElementById('kitAttestedEndingsRow');
  const elKitAttestedChips = document.getElementById('kitAttestedChips');
  const elNounInflectionChips = document.getElementById('nounInflectionChips');
  const elRhymeTargetLabel = document.getElementById('rhymeTargetLabel');
  const elRhymeResultsGrid = document.getElementById('rhymeResultsGrid');

  const CATEGORY_LABELS = {
    pronoun_people: '🙋 মানুষ ও সর্বনাম',
    nature: '🌙 প্রকৃতি ও আকাশ',
    animals: '🦜 পাখি ও প্রাণী',
    verbs: '🏃 কাজ ও ক্রিয়া',
    adjectives: '🎨 রং ও বিশেষণ',
    rhythm: '🥁 ছন্দ ও ধ্বনি',
    objects_food: '🏠 চারপাশ ও খাবার',
    endings: '🧩 বিভক্তি ও প্রত্যয়',
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
    const meta = wordMetaMap.get(word);
    if (meta && meta.c) return meta.c;
    if (Engine.SURFACE_TO_VERB_ROOT[word]) return 'verbs';
    if (word.endsWith('ছে') || word.endsWith('ছি') || word.endsWith('লাম') || word.endsWith('বো') || word.endsWith('বে')) {
      return 'verbs';
    }
    return 'general';
  }

  // ==========================================================================
  // 1. RENDER WORD & ENDING BROWSER
  // ==========================================================================
  function renderWordBrowser() {
    elWordTray.innerHTML = '';
    const cat = state.activeCategory;
    const q = state.searchQuery.trim().toLowerCase();
    const letter = state.activeLetter;

    // Show/hide endings helper banner
    if (cat === 'endings' && !q) {
      elEndingsHelperBanner.classList.remove('hidden');
    } else {
      elEndingsHelperBanner.classList.add('hidden');
    }

    // Special rendering for Endings tab when no search query
    if (cat === 'endings' && !q) {
      const endingsList = DATA.endings || [];
      elWordCountBadge.textContent = `${endingsList.length}টি প্রত্যয়`;
      endingsList.forEach(endObj => {
        const card = document.createElement('div');
        card.className = 'magnet-tile ending-tray-card';
        card.dataset.cat = 'endings';
        card.dataset.word = endObj.text;
        card.dataset.isEnding = 'true';

        const ph = Engine.transliterate(endObj.text);
        card.innerHTML = `
          <div class="ending-card-left">
            <span class="ending-badge">-${endObj.text}</span>
            <div class="ending-meta">
              <span class="ending-meta-title">${endObj.label_bn} <small>(${ph})</small></span>
              <span class="ending-meta-ex">উদা: ${endObj.example}</span>
            </div>
          </div>
          <button type="button" class="tile-speak-btn" title="উচ্চারণ শোনো">🔊</button>
        `;

        setupTrayTileEvents(card, endObj.text, 'endings', true);
        elWordTray.appendChild(card);
      });
      return;
    }

    // Filter words
    let filtered = DATA.words.filter(item => {
      if (q) {
        return item.w.includes(q) || (item.p && item.p.toLowerCase().includes(q));
      }
      if (cat === 'popular') return item.pop;
      if (cat === 'custom') return item.isCustom;
      if (cat !== 'all' && item.c !== cat) return false;
      return true;
    });

    // Apply Bangla starting letter filter if set
    if (letter) {
      const letterMap = {
        'ই': ['ই', 'ঈ'],
        'উ': ['উ', 'ঊ'],
        'এ': ['এ', 'ঐ'],
        'ও': ['ও', 'ঔ'],
        'ট': ['ট', 'ঠ'],
        'ড': ['ড', 'ঢ'],
        'ত': ['ত', 'থ'],
        'য': ['য', 'র'],
        'শ': ['শ', 'ষ', 'স']
      };
      const allowedStarts = letterMap[letter] || [letter];
      filtered = filtered.filter(item => allowedStarts.some(st => item.w.startsWith(st)));
    }

    elWordCountBadge.textContent = `${filtered.length}টি শব্দ`;

    if (filtered.length === 0) {
      elWordTray.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #64748b; width: 100%;">
          <p style="margin-bottom: 8px;">কোনো শব্দ পাওয়া যায়নি (No matching words found)</p>
          <button type="button" id="btnTrayAddSearchWord" class="btn-primary-glow" style="font-size: 0.82rem; padding: 6px 12px;">
            ➕ "${state.searchQuery || 'নতুন শব্দ'}" ঝুলিতে যোগ করো
          </button>
        </div>
      `;
      const btnQuickAdd = document.getElementById('btnTrayAddSearchWord');
      if (btnQuickAdd) {
        btnQuickAdd.addEventListener('click', () => {
          openAddWordModal(state.searchQuery.trim());
        });
      }
      return;
    }

    // Limit DOM nodes to 280 for snappy rendering
    const slice = filtered.slice(0, 280);
    const frag = document.createDocumentFragment();

    slice.forEach(item => {
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

    // Support dragging from tray onto the board OR simple click to add
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
          ghostEl.style.left = `${moveEv.clientX - 35}px`;
          ghostEl.style.top = `${moveEv.clientY - 22}px`;
          if (isEnding) {
            highlightFusionTargetAtPoint(moveEv.clientX, moveEv.clientY, word);
          }
        }
      };

      const onPointerUp = (upEv) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        clearFusionHighlights();

        if (ghostEl) {
          ghostEl.remove();
          ghostEl = null;
        }

        if (hasMoved) {
          const boardRect = elBoard.getBoundingClientRect();
          if (
            upEv.clientX >= boardRect.left &&
            upEv.clientX <= boardRect.right &&
            upEv.clientY >= boardRect.top &&
            upEv.clientY <= boardRect.bottom
          ) {
            // Check if dropped ending onto an existing board tile
            if (isEnding) {
              const targetTile = findBoardTileNearPoint(upEv.clientX, upEv.clientY);
              if (targetTile) {
                fuseEndingOntoTile(targetTile.id, word);
                return;
              }
            }
            const dropX = Math.max(20, upEv.clientX - boardRect.left + elBoard.scrollLeft - 35);
            const dropY = Math.max(14, upEv.clientY - boardRect.top + elBoard.scrollTop - 20);
            const lineIdx = Math.max(0, Math.round((dropY - LINE_TOP_OFFSET) / LINE_HEIGHT));
            addWordToBoard(word, {
              category,
              isEnding,
              x: dropX,
              y: LINE_TOP_OFFSET + lineIdx * LINE_HEIGHT,
              lineIdx
            });
          }
        } else {
          // Simple click on tray tile
          if (isEnding) {
            // If a tile is selected on the board (or there's a last tile), snap ending onto it!
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
    });
  }

  // ==========================================================================
  // 2. MAGNETIC BOARD MANAGEMENT & INTERACTION
  // ==========================================================================
  function renderLineGuides() {
    elBoardLineGuides.innerHTML = '';
    const maxLine = state.boardTiles.reduce((m, t) => Math.max(m, t.lineIdx || 0), 6);
    const totalLines = Math.max(8, maxLine + 3);
    elBoardTilesLayer.style.minHeight = `${(totalLines + 1) * LINE_HEIGHT + 40}px`;

    for (let i = 0; i < totalLines; i++) {
      const row = document.createElement('div');
      row.className = 'board-line-guide';
      row.style.top = `${LINE_TOP_OFFSET + i * LINE_HEIGHT - 8}px`;
      row.innerHTML = `<span class="line-number-tag">${i + 1}</span>`;
      elBoardLineGuides.appendChild(row);
    }
  }

  function estimateTileWidth(word) {
    const ph = Engine.transliterate(word);
    const charLen = Math.max(word.length * 14, state.showPhonetics ? ph.length * 8 : 0);
    return Math.max(58, charLen + 34);
  }

  function getNextPositionForLine(lineIdx) {
    const tilesOnLine = state.boardTiles.filter(t => t.lineIdx === lineIdx);
    if (tilesOnLine.length === 0) {
      return { x: LINE_LEFT_START, y: LINE_TOP_OFFSET + lineIdx * LINE_HEIGHT, lineIdx };
    }
    let maxRight = LINE_LEFT_START;
    tilesOnLine.forEach(t => {
      const w = estimateTileWidth(t.word);
      if (t.x + w + 10 > maxRight) {
        maxRight = t.x + w + 10;
      }
    });
    const boardWidth = Math.max(560, elBoard.clientWidth - 60);
    if (maxRight > boardWidth - 80) {
      const nextLine = lineIdx + 1;
      state.currentCursorLine = nextLine;
      return getNextPositionForLine(nextLine);
    }
    return { x: maxRight, y: LINE_TOP_OFFSET + lineIdx * LINE_HEIGHT, lineIdx };
  }

  function addWordToBoard(word, opts = {}) {
    pushUndo();
    const category = opts.category || inferCategory(word);
    const lineIdx = opts.lineIdx !== undefined ? opts.lineIdx : state.currentCursorLine;
    const pos = (opts.x !== undefined && opts.y !== undefined)
      ? { x: opts.x, y: opts.y, lineIdx }
      : getNextPositionForLine(lineIdx);

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
      tilt: (Math.random() * 2.4 - 1.2).toFixed(2)
    };

    state.boardTiles.push(newTile);
    state.currentCursorLine = pos.lineIdx;
    state.selectedTileId = newTile.id;

    if (state.autoAgree && !opts.skipAutoAgree) {
      harmonizeLineSubjectVerb(pos.lineIdx, newTile.id);
    }

    renderBoard();
    renderInspector();

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

  /**
   * Checks a single line on the board for Subject-Verb agreement
   */
  function harmonizeLineSubjectVerb(lineIdx, changedTileId = null) {
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
        <div class="tile-text-col">
          <span class="tile-bn">${displayWord}</span>
          <span class="tile-phonetic">${ph}</span>
        </div>
      `;

      setupBoardTileDrag(el, tile);
      frag.appendChild(el);
    });

    elBoardTilesLayer.appendChild(frag);
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

      const onMove = (me) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 4) {
          moved = true;
          pushUndo();
          el.classList.add('dragging');
        }
        if (moved) {
          tile.x = Math.max(8, origX + dx);
          tile.y = Math.max(8, origY + dy);
          el.style.left = `${tile.x}px`;
          el.style.top = `${tile.y}px`;

          if (tile.isEnding) {
            highlightFusionTargetAtPoint(me.clientX, me.clientY, tile.word, tile.id);
          }
        }
      };

      const onUp = (ue) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        el.classList.remove('dragging');
        clearFusionHighlights();

        if (moved) {
          // If this is an ending tile dropped onto another tile, fuse them!
          if (tile.isEnding) {
            const target = findBoardTileNearPoint(ue.clientX, ue.clientY, tile.id);
            if (target) {
              state.boardTiles = state.boardTiles.filter(t => t.id !== tile.id);
              fuseEndingOntoTile(target.id, tile.word);
              return;
            }
          }
          // Snap Y gently to nearest poem line guide
          const snappedLine = Math.max(0, Math.round((tile.y - LINE_TOP_OFFSET) / LINE_HEIGHT));
          tile.lineIdx = snappedLine;
          tile.y = LINE_TOP_OFFSET + snappedLine * LINE_HEIGHT;
          state.currentCursorLine = snappedLine;

          if (state.autoAgree) {
            harmonizeLineSubjectVerb(snappedLine, tile.id);
          }
          renderBoard();
          renderInspector();
        } else {
          // Clicked tile on board
          if (state.autoSpeak) {
            Engine.speakWord(tile.word);
          }
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  // Click empty board background to set cursor line & deselect
  elBoard.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.board-tile')) return;
    const rect = elBoard.getBoundingClientRect();
    const clickY = e.clientY - rect.top + elBoard.scrollTop;
    state.currentCursorLine = Math.max(0, Math.round((clickY - LINE_TOP_OFFSET) / LINE_HEIGHT));
    state.selectedTileId = null;
    renderBoard();
    renderInspector();
  });

  // ==========================================================================
  // 3. INTERACTIVE WORD INSPECTOR (Subject-Verb Agreement, Endings, Rhymes)
  // ==========================================================================
  function renderInspector() {
    const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
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
    elInspCustomTextInput.value = tile.word;

    // Show root + ending breakdown if fused
    if (tile.ending && tile.baseWord && tile.baseWord !== tile.word) {
      elInspMorphBreakdown.classList.remove('hidden');
      elInspMorphFormula.textContent = `${tile.baseWord} + ${tile.ending} = ${tile.word}`;
    } else {
      elInspMorphBreakdown.classList.add('hidden');
    }

    // Activate appropriate pane
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
    elVerbRootLabel.textContent = `ধাতু / মূল: ${conj.root} — ${conj.label}`;

    // Check line subject
    const lineWords = state.boardTiles
      .filter(t => t.lineIdx === tile.lineIdx)
      .sort((a, b) => a.x - b.x)
      .map(t => t.word);
    const lineSubj = Engine.detectLineSubject(lineWords);

    if (lineSubj) {
      elLineSubjectMatchBadge.classList.remove('hidden');
      elLineSubjectMatchBadge.textContent = `✨ এই লাইনের কর্তা: "${lineSubj}"`;
    } else {
      elLineSubjectMatchBadge.classList.add('hidden');
    }

    // Highlight subject pills
    elSubjectPills.querySelectorAll('.subj-pill').forEach(btn => {
      const s = btn.dataset.subj;
      btn.classList.toggle('active', s === state.selectedSubject);
      btn.classList.toggle('line-matched', s === lineSubj);
    });

    const subj = state.selectedSubject;
    const tenseList = [
      { key: 'pres', name: 'সাধারণ বর্তমান (Present)' },
      { key: 'cont', name: 'ঘটমান বর্তমান (Continuous)' },
      { key: 'perf', name: 'পুরাঘটিত বর্তমান (Perfect)' },
      { key: 'past', name: 'সাধারণ অতীত (Past)' },
      { key: 'pcont', name: 'ঘটমান অতীত (Past Cont.)' },
      { key: 'fut', name: 'ভবিষ্যৎ কাল (Future)' }
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

    // Also add non-finite/participle forms
    if (conj.other && conj.other.length) {
      conj.other.forEach(oWord => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'conj-chip' + (oWord === tile.word ? ' current-form' : '');
        chip.innerHTML = `
          <span class="chip-tense-label">অসমাপিকা/অন্য:</span>
          <span class="chip-word-bn">${oWord}</span>
          <span class="chip-word-en">(${Engine.transliterate(oWord)})</span>
        `;
        chip.addEventListener('click', () => {
          applyWordFormToTile(tile.id, oWord, conj.root, 'verbs');
        });
        elVerbConjugationGrid.appendChild(chip);
      });
    }
  }

  function renderNounInflectionsPane(tile) {
    const base = tile.baseWord || tile.word;
    const meta = wordMetaMap.get(base) || wordMetaMap.get(tile.word);

    // 1. Check attested endings from bangla_choRar_shobdo.xlsx
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
        btn.addEventListener('click', () => {
          fuseEndingOntoTile(tile.id, endStr);
        });
        elKitAttestedChips.appendChild(btn);
      });
    } else {
      elKitAttestedRow.classList.add('hidden');
    }

    // 2. Standard noun inflections
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
    const rhymes = Engine.findRhymes(tile.word, DATA.words, 32);

    if (rhymes.length === 0) {
      elRhymeResultsGrid.innerHTML = `<span style="font-size:0.82rem; color:#64748b;">এই শব্দের সাথে সরাসরি অন্ত্যমিল পাওয়া যায়নি। অন্য একটি শব্দ চেষ্টা করো!</span>`;
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
      btn.title = 'ক্লিক করলে বোর্ডে যোগ হবে';
      btn.addEventListener('click', () => {
        addWordToBoard(r.word, { category: r.category });
      });
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
    if (state.autoSpeak) {
      Engine.speakWord(newWord);
    }
  }

  // ==========================================================================
  // 4. POEM AUDIO NARRATION (Play Full Poem Aloud)
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

    const rate = parseFloat(elSpeechSpeedSelect.value) || 0.92;

    await Engine.speakPoemLines(lines, {
      rate,
      onLineStart: (idx, lineObj) => {
        elNarrationBn.textContent = lineObj.text;
        elNarrationEn.textContent = lineObj.phonetic;

        // Highlight all tiles on this line
        elBoardTilesLayer.querySelectorAll('.board-tile').forEach(el => {
          el.classList.remove('speaking-highlight');
        });
        lineObj.tiles.forEach(t => {
          const domTile = elBoardTilesLayer.querySelector(`.board-tile[data-id="${t.id}"]`);
          if (domTile) domTile.classList.add('speaking-highlight');
        });
      },
      onDone: () => {
        stopBoardPoemNarration();
      }
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
  // 5. LOAD POEM TEMPLATES & TIDY BOARD
  // ==========================================================================
  function loadPoemOntoBoard(poem, mode = 'short') {
    pushUndo();
    stopBoardPoemNarration();
    state.boardTiles = [];
    state.selectedTileId = null;
    state.currentCursorLine = 0;

    elPoemTitleInput.value = poem.title_bn;
    elPoemAuthorInput.value = poem.poet || '';

    const linesToLoad = mode === 'short' ? poem.lines.slice(0, 6) : poem.lines;

    linesToLoad.forEach((lineObj, lineIdx) => {
      let curX = LINE_LEFT_START;
      const curY = LINE_TOP_OFFSET + lineIdx * LINE_HEIGHT;

      lineObj.words.forEach((w, wIdx) => {
        const isLastWord = (wIdx === lineObj.words.length - 1);
        const baseW = (isLastWord && lineObj.base) ? lineObj.base : w;
        const endingW = (isLastWord && lineObj.endings && lineObj.endings.length > 0) ? lineObj.endings[0] : '';

        state.boardTiles.push({
          id: `tile_${Date.now()}_${lineIdx}_${wIdx}_${Math.random().toString(36).slice(2, 5)}`,
          word: w,
          baseWord: baseW,
          ending: endingW,
          category: inferCategory(w),
          isEnding: false,
          x: curX,
          y: curY,
          lineIdx,
          tilt: (Math.random() * 2 - 1).toFixed(2)
        });

        curX += estimateTileWidth(w) + 10;
      });
    });

    state.currentCursorLine = linesToLoad.length;
    renderBoard();
    renderInspector();
    showToast(`📖 "${poem.title_bn}" বোর্ডে সাজানো হয়েছে!`);
  }

  function tidyBoardLayout() {
    if (state.boardTiles.length === 0) return;
    pushUndo();
    const lines = getStructuredPoemLinesFromBoard();
    lines.forEach((lineObj, newLineIdx) => {
      let curX = LINE_LEFT_START;
      const curY = LINE_TOP_OFFSET + newLineIdx * LINE_HEIGHT;
      lineObj.tiles.forEach(t => {
        t.lineIdx = newLineIdx;
        t.x = curX;
        t.y = curY;
        t.tilt = '0';
        curX += estimateTileWidth(t.word) + 10;
      });
    });
    renderBoard();
    showToast('📏 সব শব্দ লাইনে সুন্দর করে সাজানো হয়েছে!');
  }

  // ==========================================================================
  // 6. EXPORT POEM AS COLORFUL PNG IMAGE CARD
  // ==========================================================================
  function exportPoemAsImage() {
    if (state.boardTiles.length === 0) {
      showToast('ছবি ডাউনলোড করার আগে বোর্ডে কিছু শব্দ দিয়ে ছড়া তৈরি করো!');
      return;
    }

    const lines = getStructuredPoemLinesFromBoard();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = 1000;
    const height = Math.max(580, 200 + lines.length * 76);
    canvas.width = width;
    canvas.height = height;

    // Background based on active theme
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

    // Decorative border
    ctx.strokeStyle = state.boardTheme === 'theme-sky' ? '#6366f1' : '#cbd5e1';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Header Title & Poet
    const isDark = state.boardTheme === 'theme-sky';
    ctx.fillStyle = isDark ? '#fde047' : '#312e81';
    ctx.font = 'bold 34px "Baloo Da 2", "Hind Siliguri", sans-serif';
    const title = elPoemTitleInput.value.trim() || 'আমার বাংলা ছড়া';
    ctx.fillText(`🧲 ${title}`, 48, 72);

    const author = elPoemAuthorInput.value.trim();
    if (author) {
      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = '600 20px "Hind Siliguri", sans-serif';
      ctx.fillText(`ছড়াকার: ${author}`, 52, 104);
    }

    // Draw each line of magnetic tiles
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
      const curY = 140 + idx * 72;

      lineObj.tiles.forEach(t => {
        ctx.font = 'bold 24px "Baloo Da 2", "Hind Siliguri", sans-serif';
        const bnWidth = ctx.measureText(t.word).width;
        const ph = Engine.transliterate(t.word);
        ctx.font = '500 13px "Fredoka", sans-serif';
        const phWidth = state.showPhonetics ? ctx.measureText(ph).width : 0;

        const boxW = Math.max(bnWidth, phWidth) + 28;
        const boxH = state.showPhonetics ? 54 : 42;
        const col = catColors[t.category] || catColors.general;

        // Shadow bevel
        ctx.fillStyle = col.border;
        ctx.beginPath();
        ctx.roundRect(curX, curY + 4, boxW, boxH, 10);
        ctx.fill();

        // Main tile body
        ctx.fillStyle = col.bg;
        ctx.strokeStyle = col.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(curX, curY, boxW, boxH, 10);
        ctx.fill();
        ctx.stroke();

        // Bangla text
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

    // Footer watermark
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '500 15px "Hind Siliguri", sans-serif';
    ctx.fillText('ছড়ার চুম্বক • Bangla Magnetic Word Kit', 48, height - 34);

    const link = document.createElement('a');
    link.download = `${(elPoemTitleInput.value.trim() || 'bangla_chora').replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('📸 ছড়ার রঙিন ছবি ডাউনলোড হয়েছে!');
  }

  // ==========================================================================
  // 7. MODALS: TEMPLATES, ADD WORD, SAVED POEMS
  // ==========================================================================
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
              <div class="tpl-poet">${poem.poet} • ${poem.lines.length} লাইন</div>
            </div>
          </div>
          <div class="tpl-preview-lines" style="margin-top:8px;">${previewLines}</div>
        </div>
        <div class="tpl-actions">
          <button type="button" class="btn-tpl-load">🧲 বোর্ডে সাজাও</button>
          <button type="button" class="btn-tpl-speak" title="প্রথম কয়েক লাইন শোনো">🔊 শোনো</button>
        </div>
      `;

      card.querySelector('.btn-tpl-load').addEventListener('click', () => {
        const modeInput = document.querySelector('input[name="templateLoadMode"]:checked');
        const mode = modeInput ? modeInput.value : 'short';
        loadPoemOntoBoard(poem, mode);
        document.getElementById('modalTemplates').classList.add('hidden');
      });

      card.querySelector('.btn-tpl-speak').addEventListener('click', () => {
        const sampleText = poem.lines.slice(0, 4).map(l => l.words.join(' ')).join('। ');
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
      previewContainer.innerHTML = `<span class="muted-hint">উপরে একটি বাংলা শব্দ লিখলে তার বিভিন্ন রূপ এখানে দেখা যাবে...</span>`;
      return;
    }

    phInput.placeholder = Engine.transliterate(bn);
    previewContainer.innerHTML = '';

    if (cat === 'verbs') {
      const conj = Engine.conjugateVerb(bn);
      const samples = [
        conj.pres['আমি'], conj.pres['তুমি'], conj.pres['সে'],
        conj.perf['আমি'], conj.perf['সে'], conj.past['সে'], conj.fut['আমি']
      ];
      Array.from(new Set(samples)).forEach(w => {
        const span = document.createElement('span');
        span.className = 'inflection-chip';
        span.innerHTML = `<span class="chip-word-bn">${w}</span> <span class="chip-word-en">(${Engine.transliterate(w)})</span>`;
        span.addEventListener('click', () => Engine.speakWord(w));
        previewContainer.appendChild(span);
      });
    } else {
      const forms = Engine.getNounInflections(bn).slice(0, 8);
      forms.forEach(f => {
        const span = document.createElement('span');
        span.className = 'inflection-chip';
        span.innerHTML = `<span class="chip-word-bn">${f.word}</span> <span class="chip-word-en">(${Engine.transliterate(f.word)})</span>`;
        span.addEventListener('click', () => Engine.speakWord(f.word));
        previewContainer.appendChild(span);
      });
    }
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
    const poemRecord = {
      id: 'saved_' + Date.now(),
      title: elPoemTitleInput.value.trim() || 'আমার ছড়া',
      author: elPoemAuthorInput.value.trim() || 'খুদে ছড়াকার',
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
              <div class="tpl-poet">${sp.author} • ${sp.createdAt}</div>
            </div>
          </div>
          <div class="tpl-preview-lines" style="margin-top:8px; white-space:pre-line;">${sp.preview}</div>
        </div>
        <div class="tpl-actions">
          <button type="button" class="btn-tpl-load">🧲 বোর্ডে লোড করো</button>
          <button type="button" class="btn-tpl-speak">🔊 শোনো</button>
          <button type="button" class="btn-mini btn-mini-danger btn-del-saved" title="মুছে ফেলো">🗑️</button>
        </div>
      `;

      card.querySelector('.btn-tpl-load').addEventListener('click', () => {
        pushUndo();
        state.boardTiles = JSON.parse(JSON.stringify(sp.tiles));
        elPoemTitleInput.value = sp.title;
        elPoemAuthorInput.value = sp.author;
        renderBoard();
        renderInspector();
        document.getElementById('modalSavedPoems').classList.add('hidden');
        showToast(`📝 "${sp.title}" বোর্ডে লোড হয়েছে!`);
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

  // ==========================================================================
  // 8. EVENT LISTENERS & INITIALIZATION
  // ==========================================================================
  function bindEvents() {
    // Search input
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

    // Category tabs
    elCategoryTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-tab');
      if (!btn) return;
      state.activeCategory = btn.dataset.cat;
      elCategoryTabs.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderWordBrowser();
    });

    // Alphabet filter strip
    elLetterFilterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.letter-btn');
      if (!btn) return;
      state.activeLetter = btn.dataset.letter || '';
      elLetterFilterBar.querySelectorAll('.letter-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderWordBrowser();
    });

    // Quick punctuation & newline
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
      showToast(`↵ নতুন লাইন (${state.currentCursorLine + 1} নং লাইন) শুরু হয়েছে`);
    });

    // Header Toggles
    const btnPhon = document.getElementById('btnTogglePhonetics');
    btnPhon.addEventListener('click', () => {
      state.showPhonetics = !state.showPhonetics;
      document.body.classList.toggle('show-phonetics', state.showPhonetics);
      btnPhon.classList.toggle('active', state.showPhonetics);
      btnPhon.querySelector('strong').textContent = state.showPhonetics ? 'ON' : 'OFF';
      renderBoard();
    });

    const btnAutoSpeak = document.getElementById('btnToggleAutoSpeak');
    btnAutoSpeak.addEventListener('click', () => {
      state.autoSpeak = !state.autoSpeak;
      btnAutoSpeak.classList.toggle('active', state.autoSpeak);
      btnAutoSpeak.querySelector('strong').textContent = state.autoSpeak ? 'ON' : 'OFF';
    });

    const btnAutoAgree = document.getElementById('btnToggleAutoAgree');
    btnAutoAgree.addEventListener('click', () => {
      state.autoAgree = !state.autoAgree;
      btnAutoAgree.classList.toggle('active', state.autoAgree);
      btnAutoAgree.querySelector('strong').textContent = state.autoAgree ? 'ON' : 'OFF';
    });

    // Play / Stop Full Poem
    elBtnPlayPoem.addEventListener('click', playBoardPoemAloud);
    elBtnStopPoem.addEventListener('click', stopBoardPoemNarration);

    // Theme Switcher
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.body.classList.remove('theme-fridge', 'theme-sky', 'theme-meadow', 'theme-notebook');
        document.body.classList.add(theme);
        state.boardTheme = theme;
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // Board Tools
    document.getElementById('btnTidyBoard').addEventListener('click', tidyBoardLayout);

    document.getElementById('btnAutoAgreeAll').addEventListener('click', () => {
      pushUndo();
      const maxL = state.boardTiles.reduce((m, t) => Math.max(m, t.lineIdx || 0), 0);
      let changed = false;
      for (let l = 0; l <= maxL; l++) {
        if (harmonizeLineSubjectVerb(l)) changed = true;
      }
      renderBoard();
      renderInspector();
      if (!changed) {
        showToast('🤝 সব লাইনের কর্তা ও ক্রিয়া ইতিমধ্যে মিল আছে!');
      }
    });

    document.getElementById('btnUndo').addEventListener('click', () => {
      if (state.undoStack.length === 0) {
        showToast('আর পেছনে যাওয়ার ধাপ নেই');
        return;
      }
      const prev = state.undoStack.pop();
      state.boardTiles = JSON.parse(prev);
      state.selectedTileId = null;
      renderBoard();
      renderInspector();
    });

    document.getElementById('btnSavePoem').addEventListener('click', saveCurrentPoemToStorage);
    document.getElementById('btnExportImage').addEventListener('click', exportPoemAsImage);

    document.getElementById('btnClearBoard').addEventListener('click', () => {
      if (state.boardTiles.length === 0) return;
      pushUndo();
      stopBoardPoemNarration();
      state.boardTiles = [];
      state.selectedTileId = null;
      state.currentCursorLine = 0;
      renderBoard();
      renderInspector();
      showToast('🗑️ বোর্ড পরিষ্কার করা হয়েছে');
    });

    // Empty state buttons
    document.getElementById('btnEmptyLoadSample').addEventListener('click', () => {
      if (DATA.poems && DATA.poems.length > 0) {
        loadPoemOntoBoard(DATA.poems[0], 'short');
      }
    });

    document.getElementById('btnEmptyAddStarter').addEventListener('click', () => {
      ['আমি', 'সকাল', 'বেলার', 'পাখি'].forEach(w => addWordToBoard(w, { silent: true, lineIdx: 0 }));
      ['চাঁদ', 'মামা', 'আকাশে', 'হাসে'].forEach(w => addWordToBoard(w, { silent: true, lineIdx: 1 }));
    });

    // Inspector Actions
    document.getElementById('btnInspSpeak').addEventListener('click', () => {
      const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
      if (tile) Engine.speakWord(tile.word);
    });

    document.getElementById('btnInspDuplicate').addEventListener('click', () => {
      const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
      if (tile) {
        addWordToBoard(tile.word, {
          category: tile.category,
          baseWord: tile.baseWord,
          ending: tile.ending,
          lineIdx: tile.lineIdx
        });
      }
    });

    document.getElementById('btnInspDelete').addEventListener('click', () => {
      if (!state.selectedTileId) return;
      pushUndo();
      state.boardTiles = state.boardTiles.filter(t => t.id !== state.selectedTileId);
      state.selectedTileId = null;
      renderBoard();
      renderInspector();
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

    document.getElementById('btnInspApplyCustom').addEventListener('click', () => {
      const tile = state.boardTiles.find(t => t.id === state.selectedTileId);
      const val = elInspCustomTextInput.value.trim();
      if (tile && val) {
        applyWordFormToTile(tile.id, val, tile.baseWord, tile.category);
      }
    });

    // Inspector Tabs
    document.querySelectorAll('.insp-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.inspectorTab = btn.dataset.insptab;
        renderInspector();
      });
    });

    // Subject selector pills in Verb Agreement tab
    elSubjectPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.subj-pill');
      if (!btn) return;
      state.selectedSubject = btn.dataset.subj;
      renderInspector();
    });

    // Quick Rhyme with last word button
    document.getElementById('btnQuickRhymeLast').addEventListener('click', () => {
      if (state.boardTiles.length === 0) {
        showToast('বোর্ডে অন্তত একটি শব্দ যোগ করো!');
        return;
      }
      const lastTile = state.boardTiles[state.boardTiles.length - 1];
      state.selectedTileId = lastTile.id;
      state.inspectorTab = 'rhyme';
      renderBoard();
      renderInspector();
    });

    // Modals Open/Close
    document.getElementById('btnOpenTemplates').addEventListener('click', () => {
      renderTemplatesModal();
      document.getElementById('modalTemplates').classList.remove('hidden');
    });

    document.getElementById('btnOpenAddWord').addEventListener('click', () => {
      openAddWordModal('');
    });

    document.getElementById('btnOpenSavedPoems').addEventListener('click', () => {
      renderSavedPoemsModal();
      document.getElementById('modalSavedPoems').classList.remove('hidden');
    });

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

    // Add Custom Word Form events
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

      const newEntry = {
        w,
        p,
        c,
        f: 10,
        pop: true,
        root: true,
        ends: [],
        isCustom: true
      };

      customWords.unshift(newEntry);
      localStorage.setItem(STORAGE_CUSTOM_WORDS, JSON.stringify(customWords));
      DATA.words.unshift(newEntry);
      wordMetaMap.set(w, newEntry);

      document.getElementById('modalAddWord').classList.add('hidden');
      renderWordBrowser();

      if (addDirectly) {
        addWordToBoard(w, { category: c, isEnding: c === 'endings' });
      }
      showToast(`➕ "${w}" (${p}) শব্দের ঝুলিতে যোগ হয়েছে!`);
    });
  }

  function init() {
    updateSavedPoemsBadge();
    bindEvents();
    renderWordBrowser();

    // Load a cheerful 4-line starter Chora (আয় আয় চাঁদ মামা) on first visit
    if (DATA.poems && DATA.poems.length > 0) {
      const starterPoem = {
        ...DATA.poems[0],
        lines: DATA.poems[0].lines.slice(0, 4)
      };
      loadPoemOntoBoard(starterPoem, 'short');
      // Select the verb tile 'যা' or 'চাঁদ' to demonstrate the inspector
      if (state.boardTiles.length >= 3) {
        state.selectedTileId = state.boardTiles[2].id; // 'চাঁদ'
        renderBoard();
        renderInspector();
      }
    } else {
      renderBoard();
      renderInspector();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
