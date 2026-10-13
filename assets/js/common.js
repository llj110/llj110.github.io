(() => {
  const root = document.documentElement;
  const button = document.querySelector('.language-toggle');
  const search = document.getElementById('paper-search');
  const papers = [...document.querySelectorAll('.publications-page .publication')];
  const groups = [...document.querySelectorAll('.publication-group')];
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
