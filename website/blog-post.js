(function () {
  const api = (window.BLOG_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const id = params.get('id');
  const statusEl = document.getElementById('status');
  const article = document.getElementById('article');

  if (!slug && !id) {
    statusEl.className = 'error';
    statusEl.textContent = 'Missing ?slug= or ?id= in the URL';
    return;
  }

  const url = slug
    ? api + '/public/posts/slug/' + encodeURIComponent(slug)
    : api + '/public/posts/' + encodeURIComponent(id);

  function media(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return api + (path.startsWith('/') ? path : '/' + path);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Post not found (' + res.status + ')');
      return res.json();
    })
    .then(function (post) {
      statusEl.hidden = true;
      article.hidden = false;

      document.title = post.metaTitle || post.title;

      const metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      metaDesc.content = post.metaDescription || post.excerpt || '';
      document.head.appendChild(metaDesc);

      const img = media(post.featuredImage || post.socialSharingImage);
      const cats = (post.categories || [])
        .map(function (c) {
          return '<span class="chip">' + escapeHtml(c.name) + '</span>';
        })
        .join('');
      const tags = (post.tags || [])
        .map(function (t) {
          return '<span class="chip">#' + escapeHtml(t.name) + '</span>';
        })
        .join('');

      article.innerHTML =
        '<h1 class="article-title">' +
        escapeHtml(post.title) +
        '</h1>' +
        '<div class="meta">' +
        escapeHtml(post.author && post.author.name ? post.author.name : '') +
        ' · ' +
        (post.estimatedReadingTime || 1) +
        ' min read</div>' +
        (img ? '<img class="hero" src="' + img + '" alt="" />' : '') +
        '<div class="chips">' +
        cats +
        tags +
        '</div>' +
        '<div class="content">' +
        escapeHtml(post.content) +
        '</div>';
    })
    .catch(function (err) {
      statusEl.className = 'error';
      statusEl.textContent = err.message;
    });
})();
