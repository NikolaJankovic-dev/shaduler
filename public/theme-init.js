(function() {
  try {
    const stored = localStorage.getItem('vite-ui-theme') || 'system';
    const validTheme = ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
    
    if (validTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.add(systemTheme);
    } else {
      document.documentElement.classList.add(validTheme);
    }
  } catch (e) {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.add(systemTheme);
  }
})();

