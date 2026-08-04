(function () {
  const api = (window.BLOG_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const statusEl = document.getElementById('status');
  const root = document.getElementById('posts');

  function media(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return api + (path.startsWith('/') ? path : '/' + path);
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  fetch(api + '/public/posts?limit=50')
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load posts (' + res.status + ')');
      return res.json();
    })
    .then(function (payload) {
      const posts = payload.data || [];
      statusEl.textContent =
        posts.length === 0
          ? 'No published posts yet. Publish one from the admin.'
          : posts.length + ' published post(s)';

      root.innerHTML = posts
        .map(function (post) {
          const img = media(post.featuredImage || post.socialSharingImage);
          const href = './post.html?slug=' + encodeURIComponent(post.slug);
          return (
            '<a class="post-card" href="' +
            href +
            '">' +
            (img
              ? '<img src="' + img + '" alt="" />'
              : '<div style="height:120px;border-radius:10px;background:#ebe4da"></div>') +
            '<div>' +
            '<h2>' +
            escapeHtml(post.title) +
            '</h2>' +
            '<div class="meta">' +
            escapeHtml(post.author && post.author.name ? post.author.name : 'Unknown') +
            (post.publishDate || post.createdAt
              ? ' · ' + formatDate(post.publishDate || post.createdAt)
              : '') +
            ' · ' +
            (post.estimatedReadingTime || 1) +
            ' min read</div>' +
            '<p>' +
            escapeHtml(post.excerpt || (post.content || '').slice(0, 160)) +
            '</p>' +
            '</div></a>'
          );
        })
        .join('');
    })
    .catch(function (err) {
      statusEl.className = 'error';
      statusEl.textContent = err.message + ' — is the API running on ' + api + '?';
    });

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
