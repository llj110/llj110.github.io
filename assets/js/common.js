(() => {
  const root = document.documentElement;
  const button = document.querySelector('.language-toggle');
  const search = document.getElementById('paper-search');
  const papers = [...document.querySelectorAll('.publications-page .publication')];
  const groups = [...document.querySelectorAll('.publication-group')];
  const service = document.querySelector('.service-section');
  const news = document.querySelector('.news-section');
  const reviewerGroups = [...document.querySelectorAll('.service-group')].map(group => {
    const visible = group.querySelector('.service-visible-list');
    return { visible, cards: [...visible.children], details: group.querySelector('.service-details'), overflow: group.querySelector('.service-overflow-list'), counts: [...group.querySelectorAll('.service-more-count')] };
  });
  let serviceFrame = 0;
  function updateReviewerCount(group) {
    const count = group.overflow.children.length;
    group.details.hidden = count === 0;
    group.counts.forEach(label => { label.textContent = count; });
  }
  function fitReviewers() {
    if (!service || !news) return;
    const opened = reviewerGroups.map(group => group.details.open);
    reviewerGroups.forEach(group => {
      group.details.open = false;
      group.cards.forEach(card => group.visible.append(card));
      updateReviewerCount(group);
    });
    // In the stacked mobile layout, the compact cards can use their natural height.
    if (window.matchMedia('(min-width: 541px)').matches) {
      const available = news.getBoundingClientRect().height;
      while (service.getBoundingClientRect().height > available + 1) {
        const candidate = reviewerGroups.filter(group => group.visible.children.length > 3).sort((a, b) => b.visible.children.length - a.visible.children.length)[0];
        if (!candidate) break;
        candidate.overflow.prepend(candidate.visible.lastElementChild);
        updateReviewerCount(candidate);
      }
      // Fill any free slots on the final row without making the column taller.
      let added;
      do {
        added = false;
        reviewerGroups.forEach(group => {
          while (group.overflow.children.length) {
            const card = group.overflow.firstElementChild;
            group.visible.append(card);
            updateReviewerCount(group);
            if (service.getBoundingClientRect().height > available + 1) {
              group.overflow.prepend(card);
              updateReviewerCount(group);
              break;
            }
            added = true;
          }
        });
      } while (added);
    }
    reviewerGroups.forEach((group, index) => { group.details.open = opened[index] && !group.details.hidden; });
  }
  function scheduleReviewerFit() {
    if (!service || !news) return;
    cancelAnimationFrame(serviceFrame);
    serviceFrame = requestAnimationFrame(fitReviewers);
  }
  if (service && news) {
    window.addEventListener('resize', scheduleReviewerFit);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleReviewerFit).observe(news);
    if (document.fonts) document.fonts.ready.then(scheduleReviewerFit);
  }
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { mobileMenu.open = false; }));
    mobileMenu.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        mobileMenu.open = false;
        mobileMenu.querySelector('summary').focus();
      }
    });
  }
  let language = 'en';
  try { if (localStorage.getItem('homepage-language') === 'zh') language = 'zh'; } catch (_) {}
  function updateSearch() {
    if (!search) return;
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    papers.forEach(paper => {
      const show = words.every(word => paper.dataset.search.includes(word));
      paper.hidden = !show;
      if (show) count++;
    });
    groups.forEach(group => { group.hidden = ![...group.querySelectorAll('.publication')].some(paper => !paper.hidden); });
    document.getElementById('no-results').hidden = count !== 0;
    document.getElementById('search-status').textContent = language === 'zh' ? count + ' 篇论文' : count + (count === 1 ? ' paper' : ' papers');
  }
  function setLanguage(value) {
    language = value;
    root.lang = value === 'zh' ? 'zh-CN' : 'en';
    if (button) {
      button.textContent = value === 'zh' ? 'EN' : '中文';
      button.setAttribute('aria-label', value === 'zh' ? 'Switch to English' : 'Switch to Chinese');
    }
    if (search) search.placeholder = value === 'zh' ? '论文名称、作者或会议 / 期刊' : 'Title, author, or venue';
    try { localStorage.setItem('homepage-language', value); } catch (_) {}
    updateSearch();
    scheduleReviewerFit();
  }
  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
  }
  if (search) {
    document.querySelector('.publication-search').hidden = false;
    search.addEventListener('input', updateSearch);
  }
  setLanguage(language);
})();
