/* ============================================
   高考化学通 - 应用核心逻辑
   ============================================ */

const app = {
  currentPage: 'home',
  currentModule: null,
  moduleTab: 'cards',
  quizState: null,
  cardState: null,
  dailyState: null,

  // ---------- 初始化 ----------
  init() {
    this.loadProgress();
    this.checkDailyStreak();
    this.renderHome();
    this.updateNav();
    this.updateWrongBadge();
    window.addEventListener('beforeunload', () => this.saveProgress());
  },

  // ---------- 本地存储 ----------
  storage: {
    doneMap: {},       // {id: timestamp}
    correctMap: {},    // {id: boolean}
    wrongList: [],     // [{id, module, count}]
    cardKnown: {},     // {id: boolean}
    streak: 0,
    lastDate: '',
    dailyDone: false,
    dailyCorrect: 0,
  },

  saveProgress() {
    const s = this.storage;
    localStorage.setItem('chem_doneMap', JSON.stringify(s.doneMap));
    localStorage.setItem('chem_correctMap', JSON.stringify(s.correctMap));
    localStorage.setItem('chem_wrongList', JSON.stringify(s.wrongList));
    localStorage.setItem('chem_cardKnown', JSON.stringify(s.cardKnown));
    localStorage.setItem('chem_streak', String(s.streak));
    localStorage.setItem('chem_lastDate', s.lastDate);
    localStorage.setItem('chem_dailyDone', String(s.dailyDone));
    localStorage.setItem('chem_dailyCorrect', String(s.dailyCorrect));
  },

  loadProgress() {
    const s = this.storage;
    try { s.doneMap = JSON.parse(localStorage.getItem('chem_doneMap')) || {}; } catch(e) {}
    try { s.correctMap = JSON.parse(localStorage.getItem('chem_correctMap')) || {}; } catch(e) {}
    try { s.wrongList = JSON.parse(localStorage.getItem('chem_wrongList')) || []; } catch(e) {}
    try { s.cardKnown = JSON.parse(localStorage.getItem('chem_cardKnown')) || {}; } catch(e) {}
    s.streak = parseInt(localStorage.getItem('chem_streak')) || 0;
    s.lastDate = localStorage.getItem('chem_lastDate') || '';
    s.dailyDone = localStorage.getItem('chem_dailyDone') === 'true';
    s.dailyCorrect = parseInt(localStorage.getItem('chem_dailyCorrect')) || 0;
  },

  checkDailyStreak() {
    const today = new Date().toISOString().slice(0,10);
    const s = this.storage;
    if (s.lastDate !== today) {
      if (s.lastDate === this.yesterdayStr()) {
        s.streak += 1;
      } else {
        s.streak = 1;
      }
      s.lastDate = today;
      s.dailyDone = false;
      s.dailyCorrect = 0;
      this.saveProgress();
    }
  },

  yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0,10);
  },

  // ---------- 导航 ----------
  navTo(page) {
    this.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1))?.classList.remove('hidden');
    this.updateNav();

    if (page === 'home') this.renderHome();
    if (page === 'wrong') this.renderWrong();
    if (page === 'profile') this.renderProfile();
    window.scrollTo(0,0);
  },

  updateNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === this.currentPage);
    });
  },

  updateWrongBadge() {
    const count = this.storage.wrongList.length;
    const badge = document.getElementById('wrongBadge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  },

  // ---------- 首页 ----------
  renderHome() {
    const s = this.storage;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';
    document.getElementById('greetingText').textContent = greeting;
    document.getElementById('streakBadge').textContent = (s.streak || 0) + '天';

    const totalQ = ALL_QUESTIONS.length;
    const doneIds = Object.keys(s.doneMap);
    const correctIds = Object.keys(s.correctMap).filter(k => s.correctMap[k]);
    const wrongIds = doneIds.filter(k => !s.correctMap[k]);
    const mastered = correctIds.length;
    const weak = wrongIds.length;
    const unlearned = totalQ - doneIds.length;
    const pct = totalQ > 0 ? Math.round((mastered / totalQ) * 100) : 0;

    document.getElementById('masteryPercent').textContent = pct + '%';
    document.getElementById('statMastered').textContent = mastered;
    document.getElementById('statWeak').textContent = weak;
    document.getElementById('statUnlearned').textContent = unlearned;

    const ring = document.getElementById('masteryRing');
    if (ring) {
      const circumference = 314;
      ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    }

    const list = document.getElementById('moduleList');
    list.innerHTML = CHEM_MODULES.map(m => {
      const modQs = ALL_QUESTIONS.filter(q => q.module === m.id);
      const modDone = modQs.filter(q => s.doneMap[q.id]).length;
      const modMastered = modQs.filter(q => s.correctMap[q.id]).length;
      const modPct = modQs.length > 0 ? Math.round((modMastered / modQs.length) * 100) : 0;
      return `
        <div class="module-item" onclick="app.openModule('${m.id}')">
          <div class="module-item-icon" style="background:${m.bg}">${m.icon}</div>
          <div class="module-item-info">
            <div class="module-item-name">${m.name}</div>
            <div class="module-item-progress">${modMastered}/${modQs.length}已掌握</div>
            <div class="module-item-bar">
              <div class="module-item-bar-inner" style="width:${modPct}%;background:${m.color}"></div>
            </div>
          </div>
          <div class="module-item-arrow">&#8594;</div>
        </div>`;
    }).join('');
  },

  // ---------- 模块页 ----------
  openModule(moduleId) {
    this.currentModule = moduleId;
    this.moduleTab = 'cards';
    this.navTo('module');
    this.renderModule();
  },

  renderModule() {
    const m = CHEM_MODULES.find(x => x.id === this.currentModule);
    if (!m) return;
    document.getElementById('moduleTag').textContent = m.name;
    document.querySelectorAll('.module-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === this.moduleTab);
    });

    if (this.moduleTab === 'cards') this.renderCards();
    else this.renderModuleQuizEntry();
  },

  switchModuleTab(tab) {
    this.moduleTab = tab;
    this.renderModule();
  },

  // ---------- 知识卡片 ----------
  renderCards() {
    const m = this.currentModule;
    const cards = KNOWLEDGE_CARDS.filter(c => c.module === m);
    const s = this.storage;
    if (!this.cardState || this.cardState.module !== m) {
      this.cardState = { module: m, index: 0, flipped: false };
    }
    const cs = this.cardState;
    const card = cards[cs.index];
    const known = s.cardKnown[card.concept] || false;

    document.getElementById('moduleTopProgress').textContent = (cs.index + 1) + '/' + cards.length;

    document.getElementById('moduleTabContent').innerHTML = `
      <div class="card-flip-wrap">
        <div class="card-flip ${cs.flipped ? 'flipped' : ''}" onclick="app.flipCard()">
          <div class="card-face front">
            <span class="card-badge">必背概念</span>
            <div class="card-concept">${card.concept}</div>
            <div class="card-hint">&#128073; 点击卡片查看答案</div>
          </div>
          <div class="card-face back">
            <span class="card-badge">详细解析</span>
            <div class="card-detail">${card.detail}</div>
            <div class="card-keywords">
              ${card.keywords.map(k => `<span class="card-keyword">${k}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="card-nav">
        <button class="card-nav-btn prev" onclick="event.stopPropagation();app.prevCard()">&#8592;</button>
        <button class="card-nav-btn next ${known ? '' : 'know'}" onclick="event.stopPropagation();app.markCardKnown()">${known ? '&#10003;' : '&#10003;'}</button>
        <button class="card-nav-btn next" onclick="event.stopPropagation();app.nextCard()">&#8594;</button>
      </div>
      <div class="card-progress">${cs.index + 1} / ${cards.length}</div>
    `;
  },

  flipCard() {
    if (!this.cardState) return;
    this.cardState.flipped = !this.cardState.flipped;
    document.querySelector('.card-flip')?.classList.toggle('flipped', this.cardState.flipped);
  },

  nextCard() {
    const cards = KNOWLEDGE_CARDS.filter(c => c.module === this.currentModule);
    if (!this.cardState) return;
    this.cardState.index = Math.min(this.cardState.index + 1, cards.length - 1);
    this.cardState.flipped = false;
    this.renderCards();
  },

  prevCard() {
    if (!this.cardState) return;
    this.cardState.index = Math.max(this.cardState.index - 1, 0);
    this.cardState.flipped = false;
    this.renderCards();
  },

  markCardKnown() {
    const cards = KNOWLEDGE_CARDS.filter(c => c.module === this.currentModule);
    if (!this.cardState) return;
    const card = cards[this.cardState.index];
    this.storage.cardKnown[card.concept] = true;
    this.saveProgress();
    this.nextCard();
  },

  // ---------- 模块刷题入口 ----------
  renderModuleQuizEntry() {
    const m = CHEM_MODULES.find(x => x.id === this.currentModule);
    const modQs = ALL_QUESTIONS.filter(q => q.module === m.id);
    const done = modQs.filter(q => this.storage.doneMap[q.id]).length;
    document.getElementById('moduleTopProgress').textContent = done + '/' + modQs.length;
    document.getElementById('moduleTabContent').innerHTML = `
      <div class="module-quiz-entry">
        <h3>${m.icon} ${m.name}</h3>
        <p>本模块共 ${modQs.length} 道真题风格选择题<br>已做 ${done} 道</p>
        <button class="btn btn-primary" onclick="app.startQuiz('${m.id}', 'module')">开始刷题</button>
      </div>
    `;
  },

  // ---------- 错题重做（单题） ----------
  startWrongQuestion(questionId) {
    const q = ALL_QUESTIONS.find(x => x.id === questionId);
    if (!q) {
      alert('题目未找到');
      return;
    }
    this.quizState = {
      questions: [q],
      current: 0,
      selected: null,
      submitted: false,
      answers: [],
      mode: 'wrong',
      moduleId: q.module,
    };
    this.navTo('quiz');
    this.renderQuiz();
  },

  // ---------- 刷题 ----------
  startQuiz(moduleId, mode) {
    let questions = [];
    if (mode === 'daily') {
      questions = this.getDailyQuestions();
      this.dailyState = { mode: 'daily', started: true };
    } else if (mode === 'wrong') {
      questions = this.getWrongQuestions();
    } else {
      questions = this.getModuleQuestions(moduleId);
    }
    if (questions.length === 0) {
      alert('没有可用的题目');
      return;
    }
    this.quizState = {
      questions: questions,
      current: 0,
      selected: null,
      submitted: false,
      answers: [],
      mode: mode,
      moduleId: moduleId,
    };
    this.navTo('quiz');
    this.renderQuiz();
  },

  getModuleQuestions(moduleId) {
    const s = this.storage;
    const modQs = ALL_QUESTIONS.filter(q => q.module === moduleId);
    // 优先未做题
    let pool = modQs.filter(q => !s.doneMap[q.id]);
    // 补充错题（未掌握的）
    const wrongIds = s.wrongList.filter(w => w.count < 2).map(w => w.id);
    const wrongQs = modQs.filter(q => wrongIds.includes(q.id) && !pool.find(p => p.id === q.id));
    pool = pool.concat(wrongQs);
    // 补充已做对的题
    if (pool.length < 10) {
      const rest = modQs.filter(q => !pool.find(p => p.id === q.id));
      pool = pool.concat(rest);
    }
    return pool.slice(0, 30);
  },

  getDailyQuestions() {
    const s = this.storage;
    const perMod = 2;
    let pool = [];
    CHEM_MODULES.forEach(m => {
      const modQs = ALL_QUESTIONS.filter(q => q.module === m.id && !s.doneMap[q.id]);
      const shuffled = modQs.sort(() => Math.random() - 0.5);
      pool = pool.concat(shuffled.slice(0, perMod));
    });
    // 补充错题
    const wrongIds = s.wrongList.filter(w => w.count < 2).map(w => w.id);
    const wrongQs = ALL_QUESTIONS.filter(q => wrongIds.includes(q.id) && !pool.find(p => p.id === q.id));
    pool = pool.concat(wrongQs);
    // 随机补充
    if (pool.length < 10) {
      const rest = ALL_QUESTIONS.filter(q => !pool.find(p => p.id === q.id)).sort(() => Math.random() - 0.5);
      pool = pool.concat(rest.slice(0, 10 - pool.length));
    }
    return pool.slice(0, 10).sort(() => Math.random() - 0.5);
  },

  getWrongQuestions() {
    const s = this.storage;
    const wrongIds = s.wrongList.filter(w => w.count < 2).map(w => w.id);
    return ALL_QUESTIONS.filter(q => wrongIds.includes(q.id));
  },

  renderQuiz() {
    const qs = this.quizState;
    if (!qs) return;
    const q = qs.questions[qs.current];
    const m = CHEM_MODULES.find(x => x.id === q.module);
    document.getElementById('quizTag').textContent = m ? m.name : '刷题';
    document.getElementById('quizProgress').textContent = (qs.current + 1) + '/' + qs.questions.length;

    const labels = ['A','B','C','D'];
    const diffLabels = ['','基础','中等','较难'];
    document.getElementById('quizBody').innerHTML = `
      <div class="quiz-question-num">第 ${qs.current + 1} 题 ${q.difficulty ? '<span class="quiz-difficulty difficulty-' + q.difficulty + '">' + diffLabels[q.difficulty] + '</span>' : ''}</div>
      <div class="quiz-question">${q.q}</div>
      ${q.image ? '<div class="quiz-image"><img src="' + q.image + '" alt="题目配图" onclick="app.previewImage(\'' + q.image + '\')" /></div>' : ''}
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <div class="quiz-option ${qs.submitted ? (i === q.answer ? 'correct' : (i === qs.selected ? 'wrong' : '')) : (i === qs.selected ? 'selected' : '')}"
               onclick="app.selectOption(${i})">
            <div class="quiz-option-label">${labels[i]}</div>
            <div>${opt}</div>
          </div>
        `).join('')}
      </div>
      ${qs.submitted ? `
        <div class="quiz-explanation">
          <strong>解析：</strong>${q.explanation}
        </div>
        <div class="quiz-actions">
          ${qs.current > 0 ? '<button class="btn btn-secondary" onclick="app.prevQuiz()">上一题</button>' : '<div></div>'}
          <button class="btn btn-primary" onclick="app.nextQuiz()">${qs.current < qs.questions.length - 1 ? '下一题' : '查看结果'}</button>
        </div>
      ` : `
        <div class="quiz-actions">
          <div></div>
          <button class="btn btn-primary" onclick="app.submitAnswer()" ${qs.selected === null ? 'disabled' : ''}>确认答案</button>
        </div>
      `}
    `;
  },

  previewImage(url) {
    let overlay = document.getElementById('imagePreviewOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'imagePreviewOverlay';
      overlay.className = 'image-preview-overlay';
      overlay.onclick = () => overlay.classList.remove('active');
      overlay.innerHTML = '<img class="image-preview-img" /><div class="image-preview-hint">点击任意处关闭</div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('img').src = url;
    overlay.classList.add('active');
  },

  selectOption(idx) {
    const qs = this.quizState;
    if (!qs || qs.submitted) return;
    qs.selected = idx;
    this.renderQuiz();
  },

  submitAnswer() {
    const qs = this.quizState;
    if (!qs || qs.selected === null || qs.submitted) return;
    qs.submitted = true;
    const q = qs.questions[qs.current];
    const correct = qs.selected === q.answer;
    qs.answers.push({ id: q.id, correct, selected: qs.selected });

    const s = this.storage;
    s.doneMap[q.id] = Date.now();
    s.correctMap[q.id] = correct;

    if (correct) {
      // 错题重做答对：累加正确次数，连续答对2次则从错题本移除（已掌握）
      const wIdx = s.wrongList.findIndex(w => w.id === q.id);
      if (wIdx !== -1) {
        s.wrongList[wIdx].count += 1;
        if (s.wrongList[wIdx].count >= 2) {
          s.wrongList.splice(wIdx, 1);
        }
      }
    } else {
      // 答错：加入错题本；已在错题本则重置正确计数（需重新连答对2次）
      const wIdx = s.wrongList.findIndex(w => w.id === q.id);
      if (wIdx !== -1) {
        s.wrongList[wIdx].count = 0;
      } else {
        s.wrongList.push({ id: q.id, module: q.module, count: 0 });
      }
    }

    this.saveProgress();
    this.updateWrongBadge();
    this.renderQuiz();
  },

  nextQuiz() {
    const qs = this.quizState;
    if (!qs) return;
    if (qs.current < qs.questions.length - 1) {
      qs.current += 1;
      qs.selected = null;
      qs.submitted = false;
      this.renderQuiz();
    } else {
      this.showResult();
    }
  },

  prevQuiz() {
    const qs = this.quizState;
    if (!qs || qs.current <= 0) return;
    qs.current -= 1;
    const prev = qs.answers[qs.current];
    qs.selected = prev ? prev.selected : null;
    qs.submitted = !!prev;
    this.renderQuiz();
  },

  quitQuiz() {
    if (this.quizState && this.quizState.mode === 'daily') {
      this.navTo('home');
    } else if (this.quizState && this.quizState.mode === 'wrong') {
      this.navTo('wrong');
    } else {
      this.navTo('module');
    }
    this.quizState = null;
  },

  // ---------- 每日一练 ----------
  startDaily() {
    const s = this.storage;
    if (s.dailyDone) {
      alert('今日每日一练已完成！正确 ' + s.dailyCorrect + ' 题');
      return;
    }
    this.startQuiz(null, 'daily');
  },

  // ---------- 结果页 ----------
  showResult() {
    const qs = this.quizState;
    if (!qs) return;
    const correctCount = qs.answers.filter(a => a.correct).length;
    const total = qs.questions.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    if (qs.mode === 'daily') {
      this.storage.dailyDone = true;
      this.storage.dailyCorrect = correctCount;
      this.saveProgress();
    }

    let emoji = '&#127881;';
    if (accuracy >= 90) emoji = '&#127942;';
    else if (accuracy >= 70) emoji = '&#128079;';
    else if (accuracy >= 50) emoji = '&#128170;';
    else emoji = '&#128170;';

    document.getElementById('resultEmoji').innerHTML = emoji;
    document.getElementById('resultTitle').textContent = qs.mode === 'daily' ? '每日一练完成' : '练习完成';
    document.getElementById('resultScore').textContent = correctCount + '/' + total;
    document.getElementById('resultAccuracy').textContent = '正确率 ' + accuracy + '%';

    const wrongCount = qs.answers.filter(a => !a.correct).length;
    document.getElementById('resultStats').innerHTML = `
      <div class="result-stat">
        <div class="result-stat-num" style="color:var(--green)">${correctCount}</div>
        <div class="result-stat-label">正确</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-num" style="color:var(--red)">${wrongCount}</div>
        <div class="result-stat-label">错误</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-num">${total}</div>
        <div class="result-stat-label">总题数</div>
      </div>
    `;

    const retryBtn = document.getElementById('resultRetryBtn');
    if (retryBtn) {
      retryBtn.style.display = wrongCount > 0 ? 'block' : 'none';
    }

    this.navTo('result');
  },

  retryWrong() {
    this.startQuiz(null, 'wrong');
  },

  // ---------- 错题本 ----------
  renderWrong() {
    const s = this.storage;
    const filterWrap = document.getElementById('wrongFilter');
    const list = document.getElementById('wrongList');
    const empty = document.getElementById('wrongEmpty');

    const modules = [{id:'all',name:'全部'}].concat(CHEM_MODULES.map(m => ({id:m.id,name:m.name})));
    const currentFilter = s.wrongFilter || 'all';

    filterWrap.innerHTML = modules.map(m => `
      <button class="wrong-filter-btn ${currentFilter === m.id ? 'active' : ''}" onclick="app.setWrongFilter('${m.id}')">${m.name}</button>
    `).join('');

    // 先过滤掉无效的错题记录（题目ID在题库中不存在）
    let wrongItems = s.wrongList.filter(w => ALL_QUESTIONS.find(x => x.id === w.id));
    // 清理无效数据回存
    if (wrongItems.length !== s.wrongList.length) {
      s.wrongList = wrongItems;
      this.saveProgress();
    }

    if (currentFilter !== 'all') {
      wrongItems = wrongItems.filter(w => w.module === currentFilter);
    }

    if (wrongItems.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = wrongItems.map(w => {
        const q = ALL_QUESTIONS.find(x => x.id === w.id);
        if (!q) return '';
        const m = CHEM_MODULES.find(x => x.id === q.module);
        const need = 2 - (w.count || 0);
        return `
          <div class="wrong-item" onclick="app.startWrongQuestion('${w.id}')">
            <span class="wrong-item-tag" style="background:${m?.bg||'#eee'};color:${m?.color||'#333'}">${m?.name||''}</span>
            <div class="wrong-item-q">${q.q}</div>
            <div class="wrong-item-hint">还需答对${need}次掌握</div>
          </div>
        `;
      }).join('');
    }
  },

  setWrongFilter(id) {
    this.storage.wrongFilter = id;
    this.saveProgress();
    this.renderWrong();
  },

  // ---------- 我的页面 ----------
  renderProfile() {
    // 静态内容已在HTML中
  },

  resetProgress() {
    if (!confirm('确定要重置所有学习进度吗？此操作不可恢复。')) return;
    this.storage = {
      doneMap: {}, correctMap: {}, wrongList: [], cardKnown: {},
      streak: 0, lastDate: '', dailyDone: false, dailyCorrect: 0,
    };
    this.saveProgress();
    this.updateWrongBadge();
    this.renderHome();
    alert('学习进度已重置');
  },
};
