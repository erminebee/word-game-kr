// 한글 단어 맞추기 - 5, 6, 7, 8자리 통합 게임 로직

const STORAGE_KEY = 'korean_word_game_stats_clean_v1';
const MAX_ATTEMPTS = 10;

// 가상 키보드 레이아웃 (01번 참고 이미지 기준)
const KB_ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'BACKSPACE'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ']
];

class WordGame {
  constructor() {
    this.maxAttempts = MAX_ATTEMPTS;
    this.currentMode = 5; // 기본 5자리

    this.target = null;
    this.currentRow = 0;
    this.currentCol = 0;
    this.boardState = [];
    this.evaluations = [];
    this.keyStatus = {};
    this.isGameOver = false;
    this.isGameWon = false;

    // 통계 로드 (새로운 키로 완전 초기화)
    this.stats = this.loadStats();

    // DOM 캐싱
    this.homeView = document.getElementById('home-view');
    this.gameView = document.getElementById('game-view');
    this.allStatsView = document.getElementById('all-stats-view');

    this.boardEl = document.getElementById('game-board');
    this.headerTitle = document.getElementById('header-title');
    this.kbRow1 = document.getElementById('kb-row-1');
    this.kbRow2 = document.getElementById('kb-row-2');
    this.kbRow3 = document.getElementById('kb-row-3');
    this.submitBtn = document.getElementById('btn-submit');
    this.resultModal = document.getElementById('result-modal');
    this.toastEl = document.getElementById('toast');

    this.initDOM();
    this.showHomeView();
  }

  // 로컬 스토리지 통계 로드 (5, 6, 7, 8자리 완전 초기 상태)
  loadStats() {
    const defaultStats = {
      5: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, totalGuesses: 0, playedWords: [] },
      6: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, totalGuesses: 0, playedWords: [] },
      7: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, totalGuesses: 0, playedWords: [] },
      8: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, totalGuesses: 0, playedWords: [] }
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const len of [5, 6, 7, 8]) {
          if (parsed[len]) {
            defaultStats[len] = { ...defaultStats[len], ...parsed[len] };
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }

    return defaultStats;
  }

  // 통계 저장
  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // DOM 이벤트 초기화
  initDOM() {
    this.renderKeyboard();

    // 홈 화면 자릿수 버튼 클릭
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const len = parseInt(btn.dataset.length, 10);
        this.startModeGame(len);
      });
    });

    // 홈 화면 누적 결과 버튼 클릭
    document.getElementById('btn-home-all-stats').addEventListener('click', () => {
      this.showAllStatsView();
    });

    // 전체 누적 결과 화면 내 뒤로가기 / 홈으로 버튼
    document.getElementById('btn-all-stats-back').addEventListener('click', () => {
      this.showHomeView();
    });
    document.getElementById('btn-all-stats-home').addEventListener('click', () => {
      this.showHomeView();
    });

    // 게임 화면 헤더 뒤로가기 (<) -> 홈으로 이동
    document.getElementById('btn-header-back').addEventListener('click', () => {
      this.showHomeView();
    });

    // 게임 화면 헤더 더보기 (...) -> 현재 자릿수 통계 모달
    document.getElementById('btn-header-more').addEventListener('click', () => {
      this.openStatsOnlyModal();
    });

    // 결과보기 버튼 클릭
    this.submitBtn.addEventListener('click', () => {
      this.handleGuessSubmit();
    });

    // 결과 모달 내 버튼들
    document.getElementById('btn-next-game').addEventListener('click', () => {
      this.closeResultModal();
      this.startNewGame();
    });

    document.getElementById('btn-go-home').addEventListener('click', () => {
      this.closeResultModal();
      this.showHomeView();
    });

    document.getElementById('btn-result-close').addEventListener('click', () => {
      this.closeResultModal();
    });
  }

  // 뷰 전환: 홈 화면
  showHomeView() {
    this.homeView.classList.remove('hidden');
    this.gameView.classList.add('hidden');
    this.allStatsView.classList.add('hidden');
    this.closeResultModal();
  }

  // 뷰 전환: 게임 화면 (모드 지정)
  startModeGame(length) {
    this.currentMode = length;
    this.headerTitle.textContent = `${length}자리 단어`;

    this.homeView.classList.add('hidden');
    this.gameView.classList.remove('hidden');
    this.allStatsView.classList.add('hidden');
    this.closeResultModal();

    this.startNewGame();
  }

  // 뷰 전환: 누적 결과 전체 화면
  showAllStatsView() {
    for (const len of [5, 6, 7, 8]) {
      const s = this.stats[len];
      const winrate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
      const avg = s.wins > 0 ? (s.totalGuesses / s.wins).toFixed(1) : '0.0';

      document.getElementById(`all-stat-${len}-played`).textContent = s.played;
      document.getElementById(`all-stat-${len}-winrate`).textContent = `${winrate}%`;
      document.getElementById(`all-stat-${len}-avg`).textContent = avg;
      document.getElementById(`all-stat-${len}-streak`).textContent = s.currentStreak;
    }

    this.homeView.classList.add('hidden');
    this.gameView.classList.add('hidden');
    this.allStatsView.classList.remove('hidden');
  }

  // 가상 키보드 렌더링
  renderKeyboard() {
    const rowContainers = [this.kbRow1, this.kbRow2, this.kbRow3];

    KB_ROWS.forEach((row, idx) => {
      const container = rowContainers[idx];
      container.innerHTML = '';

      row.forEach(char => {
        const btn = document.createElement('button');
        btn.classList.add('key-btn');
        btn.setAttribute('type', 'button');

        if (char === 'BACKSPACE') {
          btn.classList.add('key-backspace');
          btn.innerHTML = '←';
          btn.setAttribute('aria-label', '지우기');
          btn.dataset.key = 'BACKSPACE';
          btn.addEventListener('click', () => this.handleBackspace());
        } else {
          btn.textContent = char;
          btn.dataset.key = char;
          btn.addEventListener('click', () => this.handleCharInput(char));
        }

        container.appendChild(btn);
      });
    });
  }

  // 새 게임 시작
  startNewGame() {
    this.isGameOver = false;
    this.isGameWon = false;
    this.currentRow = 0;
    this.currentCol = 0;
    this.evaluations = [];
    this.keyStatus = {};

    // 대상 단어 추출
    this.target = this.pickTargetWord(this.currentMode);
    console.log(`[${this.currentMode}자리] 정답 단어: ${this.target.word} (${this.target.jamo.join(' ')})`);

    this.renderBoard();
    this.resetKeyboardStatus();
  }

  // 미출제 단어 랜덤 선택 (소진 시 초기화)
  pickTargetWord(len) {
    const wordSource = (typeof GAME_WORDS !== 'undefined' ? GAME_WORDS : (window.GAME_WORDS || {}));
    const wordList = wordSource[len] || [];
    
    if (wordList.length === 0) {
      console.error(`[오류] ${len}자리 단어 목록을 찾을 수 없습니다!`);
      const fallbackMap = {
        5: { word: '하늘', jamo: ['ㅎ', 'ㅏ', 'ㄴ', 'ㅡ', 'ㄹ'] },
        6: { word: '울음', jamo: ['ㅇ', 'ㅜ', 'ㄹ', 'ㅇ', 'ㅡ', 'ㅁ'] },
        7: { word: '꽃잎', jamo: ['ㄱ', 'ㄱ', 'ㅗ', 'ㅊ', 'ㅇ', 'ㅣ', 'ㅍ'] },
        8: { word: '다람쥐', jamo: ['ㄷ', 'ㅏ', 'ㄹ', 'ㅏ', 'ㅁ', 'ㅈ', 'ㅜ', 'ㅣ'] }
      };
      return fallbackMap[len] || { word: '하늘', jamo: ['ㅎ', 'ㅏ', 'ㄴ', 'ㅡ', 'ㄹ'] };
    }

    const statObj = this.stats[len];
    let played = statObj.playedWords || [];

    let available = wordList.filter(w => !played.includes(w.word));
    if (available.length === 0) {
      statObj.playedWords = [];
      played = [];
      available = [...wordList];
    }

    return available[Math.floor(Math.random() * available.length)];
  }

  // 보드 렌더링 (자릿수별 크기 클래스 적용)
  renderBoard() {
    this.boardEl.innerHTML = '';
    this.boardEl.className = `game-board len-${this.currentMode}`;
    this.boardState = [];

    for (let r = 0; r < this.maxAttempts; r++) {
      const rowEl = document.createElement('div');
      rowEl.classList.add('board-row');
      rowEl.dataset.row = r;

      const rowTiles = [];
      for (let c = 0; c < this.currentMode; c++) {
        const tileEl = document.createElement('div');
        tileEl.classList.add('board-tile');
        tileEl.dataset.row = r;
        tileEl.dataset.col = c;
        if (r === 0) tileEl.classList.add('active-row');
        rowEl.appendChild(tileEl);
        rowTiles.push('');
      }

      this.boardEl.appendChild(rowEl);
      this.boardState.push(rowTiles);
    }
  }

  // 글자 입력
  handleCharInput(char) {
    if (this.isGameOver) return;
    if (this.currentCol >= this.currentMode) return;

    this.boardState[this.currentRow][this.currentCol] = char;

    const tile = this.getTileEl(this.currentRow, this.currentCol);
    tile.textContent = char;
    tile.classList.add('pop');
    setTimeout(() => tile.classList.remove('pop'), 150);

    this.currentCol++;
  }

  // 백스페이스
  handleBackspace() {
    if (this.isGameOver) return;
    if (this.currentCol <= 0) return;

    this.currentCol--;
    this.boardState[this.currentRow][this.currentCol] = '';

    const tile = this.getTileEl(this.currentRow, this.currentCol);
    tile.textContent = '';
  }

  getTileEl(row, col) {
    return this.boardEl.querySelector(`.board-tile[data-row="${row}"][data-col="${col}"]`);
  }

  getRowEl(row) {
    return this.boardEl.querySelector(`.board-row[data-row="${row}"]`);
  }

  // 결과보기 제출
  handleGuessSubmit() {
    if (this.isGameOver) return;

    if (this.currentCol < this.currentMode) {
      this.showToast(`${this.currentMode}칸을 모두 입력해주세요!`);
      return;
    }

    const guess = this.boardState[this.currentRow];
    const target = this.target.jamo;

    const evaluation = this.evaluateGuess(guess, target);
    this.evaluations.push(evaluation);

    // 타일 색상 적용
    for (let c = 0; c < this.currentMode; c++) {
      const tile = this.getTileEl(this.currentRow, c);
      tile.classList.remove('active-row');
      tile.classList.add(evaluation[c]);
    }

    // 키보드 색상 반영
    this.updateKeyboardColors(guess, evaluation);

    const isWin = evaluation.every(res => res === 'correct');

    if (isWin) {
      this.isGameOver = true;
      this.isGameWon = true;
      this.recordGameResult(true, this.currentRow + 1);
      setTimeout(() => this.openResultModal(true), 600);
      return;
    }

    this.currentRow++;
    this.currentCol = 0;

    if (this.currentRow >= this.maxAttempts) {
      this.isGameOver = true;
      this.isGameWon = false;
      this.recordGameResult(false, this.maxAttempts);
      setTimeout(() => this.openResultModal(false), 600);
    } else {
      const activeRowEl = this.getRowEl(this.currentRow);
      if (activeRowEl) {
        activeRowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      for (let c = 0; c < this.currentMode; c++) {
        const nextTile = this.getTileEl(this.currentRow, c);
        if (nextTile) nextTile.classList.add('active-row');
      }
    }
  }

  // 워들 판정
  evaluateGuess(guess, target) {
    const len = this.currentMode;
    const result = new Array(len).fill('absent');
    const targetUsed = new Array(len).fill(false);
    const guessUsed = new Array(len).fill(false);

    // 1차: 초록색
    for (let i = 0; i < len; i++) {
      if (guess[i] === target[i]) {
        result[i] = 'correct';
        targetUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    // 2차: 노란색
    for (let i = 0; i < len; i++) {
      if (guessUsed[i]) continue;
      for (let j = 0; j < len; j++) {
        if (!targetUsed[j] && guess[i] === target[j]) {
          result[i] = 'present';
          targetUsed[j] = true;
          break;
        }
      }
    }

    return result;
  }

  updateKeyboardColors(guess, evaluation) {
    const priority = { 'correct': 3, 'present': 2, 'absent': 1 };

    guess.forEach((char, idx) => {
      const curEval = evaluation[idx];
      const prevEval = this.keyStatus[char];

      if (!prevEval || priority[curEval] > priority[prevEval]) {
        this.keyStatus[char] = curEval;

        const btn = document.querySelector(`.key-btn[data-key="${char}"]`);
        if (btn) {
          btn.classList.remove('correct', 'present', 'absent');
          btn.classList.add(curEval);
        }
      }
    });
  }

  resetKeyboardStatus() {
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.classList.remove('correct', 'present', 'absent');
    });
  }

  recordGameResult(won, attempts) {
    const statObj = this.stats[this.currentMode];
    statObj.played += 1;

    if (!statObj.playedWords) statObj.playedWords = [];
    if (!statObj.playedWords.includes(this.target.word)) {
      statObj.playedWords.push(this.target.word);
    }

    if (won) {
      statObj.wins += 1;
      statObj.currentStreak += 1;
      if (statObj.currentStreak > statObj.maxStreak) {
        statObj.maxStreak = statObj.currentStreak;
      }
      statObj.totalGuesses += attempts;
    } else {
      statObj.currentStreak = 0;
    }

    this.saveStats();
  }

  // 결과 모달 열기
  openResultModal(won) {
    const statObj = this.stats[this.currentMode];

    document.getElementById('result-answer-word').textContent = this.target.word;

    const blocksGrid = document.getElementById('result-blocks-grid');
    blocksGrid.innerHTML = '';

    // 7, 8자리이거나 시도 횟수가 많으면 컴팩트 스타일
    if (this.currentMode >= 7 || this.evaluations.length > 6) {
      blocksGrid.classList.add('compact');
    } else {
      blocksGrid.classList.remove('compact');
    }

    this.evaluations.forEach(rowEval => {
      const rowEl = document.createElement('div');
      rowEl.classList.add('result-block-row');

      rowEval.forEach(status => {
        const block = document.createElement('div');
        block.classList.add('result-block');
        if (status === 'correct') {
          block.classList.add('green');
        } else if (status === 'present') {
          block.classList.add('yellow');
        } else {
          block.classList.add('black');
        }
        rowEl.appendChild(block);
      });

      blocksGrid.appendChild(rowEl);
    });

    const statusTextEl = document.getElementById('result-status-text');
    if (won) {
      statusTextEl.textContent = '성공';
      statusTextEl.classList.remove('fail');
    } else {
      statusTextEl.textContent = '실패';
      statusTextEl.classList.add('fail');
    }

    const played = statObj.played;
    const wins = statObj.wins;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    const avgGuesses = wins > 0 ? (statObj.totalGuesses / wins).toFixed(1) : '0.0';

    document.getElementById('stat-played').textContent = played;
    document.getElementById('stat-win-rate').textContent = `${winRate}%`;
    document.getElementById('stat-avg-guesses').textContent = avgGuesses;
    document.getElementById('stat-current-streak').textContent = statObj.currentStreak;

    this.resultModal.classList.remove('hidden');
  }

  openStatsOnlyModal() {
    const statObj = this.stats[this.currentMode];
    document.getElementById('result-answer-word').textContent = '???';

    const blocksGrid = document.getElementById('result-blocks-grid');
    blocksGrid.innerHTML = '<div style="font-size:14px; color:#8b95a1; padding: 12px;">게임 진행 중입니다</div>';

    document.getElementById('result-status-text').textContent = '도전 중';
    document.getElementById('result-status-text').classList.remove('fail');

    const played = statObj.played;
    const wins = statObj.wins;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    const avgGuesses = wins > 0 ? (statObj.totalGuesses / wins).toFixed(1) : '0.0';

    document.getElementById('stat-played').textContent = played;
    document.getElementById('stat-win-rate').textContent = `${winRate}%`;
    document.getElementById('stat-avg-guesses').textContent = avgGuesses;
    document.getElementById('stat-current-streak').textContent = statObj.currentStreak;

    this.resultModal.classList.remove('hidden');
  }

  closeResultModal() {
    this.resultModal.classList.add('hidden');
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 1800);
  }
}

// 시작
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new WordGame();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WordGame };
}
