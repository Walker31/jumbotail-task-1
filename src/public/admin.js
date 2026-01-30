(function(){
  const startBtn = document.getElementById('startBtn');
  const logs = document.getElementById('logs');
  const status = document.getElementById('status');

  function log(msg) { logs.textContent = (logs.textContent ? logs.textContent + '\n' : '') + msg; logs.scrollTop = logs.scrollHeight; }

  startBtn.addEventListener('click', async () => {
    logs.textContent = '';
    status.textContent = 'Starting...';

    const categories = document.getElementById('categories').value.split(',').map(s=>s.trim()).filter(Boolean);
    const totalPages = Number(document.getElementById('pages').value) || 1;
    const perPageDelayMs = Number(document.getElementById('delay').value) || 600;
    const persist = document.getElementById('persist').checked;
    const token = document.getElementById('token').value || undefined;

    try {
      const res = await fetch('/api/v1/admin/bootstrap/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) },
        body: JSON.stringify({ categories, totalPages, perPageDelayMs, persist })
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'unknown'}));
        status.textContent = 'Failed to start: '+(err.error || JSON.stringify(err));
        return;
      }

      const data = await res.json();
      const jobId = data.jobId;
      status.textContent = 'Job started: ' + jobId;
      log('Job started: ' + jobId);

      const es = new EventSource(`/api/v1/admin/bootstrap/stream/${jobId}`);
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.type === 'progress') {
            const p = payload.payload;
            if (p.step === 'page') {
              log(`[page] cat=${p.category} page=${p.page} found=${p.foundThisPage} total=${p.totalSoFar}`);
              status.textContent = `Scraping ${p.category} page ${p.page} (total ${p.totalSoFar})`;
            } else if (p.step === 'category-complete') {
              log(`[category] ${p.category} done, found ${p.found}`);
            } else if (p.step === 'start-category') {
              log(`[category] starting ${p.category}`);
            } else {
              log(`[progress] ${JSON.stringify(p)}`);
            }
          } else if (payload.type === 'done') {
            const r = payload.payload;
            if (r.success) {
              log('Done. scraped=' + r.scraped + ' inserted=' + r.inserted);
              status.textContent = 'Done';
            } else {
              log('Done with error: ' + (r.error || 'unknown'));
              status.textContent = 'Done (error)';
            }
            es.close();
          }
        } catch (err) { log('parse error: ' + err.message); }
      };

      es.onerror = (err) => {
        log('EventSource error');
        es.close();
      };

    } catch (err) {
      status.textContent = 'Start error: ' + err.message;
      log('Start error: ' + err.message);
    }
  });
})();