/**
 * ══════════════════════════════════════════════════════════════
 * GROUP-DETAIL: STREAM TAB CONTROLLER
 * frontend/faculty/group-detail/js/group-detail-stream.js
 * ══════════════════════════════════════════════════════════════
 */

async function loadStream() {
  try {
    const r = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream');
    S.posts = r.data || [];
    renderStream(S.posts);
  } catch {
    renderStream([]);
  }
}

function renderStream(posts) {
  const c = ById('stream-feed');
  if (!c) return;
  if (!posts || !posts.length) {
    c.innerHTML = `
      <div class="classroom-empty-talk-state" id="stream-empty-talk-state">
        <div class="empty-talk-illustration">
          <svg width="170" height="150" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="45" y="145" width="130" height="22" rx="4" fill="var(--bg-surface-secondary, var(--bg-surface))" stroke="var(--border-color)" stroke-width="2.5"/>
            <line x1="58" y1="156" x2="160" y2="156" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="55" y="125" width="115" height="20" rx="4" fill="var(--bg-surface)" stroke="var(--border-color)" stroke-width="2.5"/>
            <line x1="68" y1="135" x2="135" y2="135" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M40 45 C40 28, 160 28, 160 45 C160 75, 160 85, 140 95 L145 118 L122 102 C60 102, 40 95, 40 75 Z" fill="var(--bg-card)" stroke="var(--border-color)" stroke-width="2.5"/>
            <line x1="65" y1="55" x2="135" y2="55" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="65" y1="70" x2="115" y2="70" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="65" y1="85" x2="75" y2="85" stroke="var(--text-main)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="82" y1="80" x2="82" y2="90" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="165" y="75" width="30" height="50" rx="15" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="2.5"/>
            <path d="M158 100 C158 120, 202 120, 202 100" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <line x1="180" y1="120" x2="180" y2="140" stroke="var(--color-primary)" stroke-width="2.5"/>
            <line x1="168" y1="140" x2="192" y2="140" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <h2 class="empty-talk-title">This is where you can talk to your class</h2>
        <p class="empty-talk-subtitle">Use the stream to share announcements, post assignments, and respond to questions</p>
      </div>
    `;
    return;
  }
  c.innerHTML = posts.map(renderPostCard).join('');
}

function renderAttachmentPill(post, marginStyle = '') {
  const attachmentName = post.attachment_name || (post.content && post.content.match(/([a-zA-Z0-9_\-\.]+\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|png|jpe?g|webp|svg|txt|csv|py|java|json|md))/i)?.[1]);
  if (!attachmentName) return '';
  const meta = getFileTypeMeta(attachmentName);
  const dlPath = post.attachment_path || '';
  return '<div class="post-attachment-pill"' + (marginStyle ? ' style="' + marginStyle + '"' : '') + ' onclick="event.stopPropagation(); downloadAttachment(\'' + esc(dlPath) + '\', \'' + esc(attachmentName) + '\')">' +
    '<span class="file-ext-badge ' + meta.cls + '">' + esc(meta.badge) + '</span>' +
    '<span class="attachment-filename">' + esc(attachmentName) + '</span>' +
  '</div>';
}

function renderPostCard(post) {
  const isT = !post.author_role || post.author_role === 'TEACHER';
  const ini = initials(post.author_name || 'U');
  const dateStr = formatClassroomDate(post.created_at);
  const commentCount = Number(post.comment_count) || 0;
  const hasComments = commentCount > 0;
  const commentLinkText = hasComments ? (commentCount + ' class ' + (commentCount === 1 ? 'comment' : 'comments')) : 'Add class comment';

  return '<div class="stream-post" id="post-' + post.id + '" onclick="handlePostCardClick(' + post.id + ', event)" style="cursor:pointer">' +
    '<div class="post-header">' +
      '<div class="post-avatar' + (isT ? '' : ' student-av') + '">' + ini + '</div>' +
      '<div class="post-meta">' +
        '<div class="post-author-name">' + esc(post.author_name || 'Instructor') + '</div>' +
        '<div class="post-time">' + esc(dateStr) + '</div>' +
      '</div>' +
      '<button type="button" class="post-menu-btn" onclick="togglePostOptions(' + post.id + ', event)" title="Options" aria-label="More options">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="5" r="1.5"></circle>' +
          '<circle cx="12" cy="12" r="1.5"></circle>' +
          '<circle cx="12" cy="19" r="1.5"></circle>' +
        '</svg>' +
      '</button>' +
    '</div>' +
    '<div class="post-body">' + renderFormattedPostContent(post.content) + '</div>' +
    renderAttachmentPill(post) +
    '<div class="post-footer-row">' +
      '<button type="button" class="post-comment-link-btn' + (hasComments ? ' has-comments' : '') + '" onclick="event.stopPropagation(); openAnnouncementDetail(' + post.id + ')">' +
        (hasComments ?
          '<span class="comment-bubble-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>' +
          '<span>' + esc(commentLinkText) + '</span>' +
          '<span class="comment-student-badge">' + commentCount + '</span>'
          : esc(commentLinkText)
        ) +
      '</button>' +
    '</div>' +
  '</div>';
}

function handlePostCardClick(postId, ev) {
  if (ev.target.closest('.post-menu-btn') || ev.target.closest('.post-attachment-pill') || ev.target.closest('.post-options-dropdown')) {
    return;
  }
  openAnnouncementDetail(postId);
}

// Announcement Detail & Class Comments Studio
S.currentDetailPostId = null;

function openAnnouncementDetail(postId) {
  const post = S.posts.find(p => p.id === postId);
  if (!post) return;
  S.currentDetailPostId = postId;

  const streamLayout = document.querySelector('.stream-layout');
  if (streamLayout) streamLayout.style.display = 'none';
  const banner = ById('classroom-banner');
  if (banner) banner.style.display = 'none';
  const streamActions = ById('mobile-stream-actions');
  if (streamActions) streamActions.style.display = 'none';
  const bottomNav = ById('classroom-mobile-bottom-nav');
  if (bottomNav) bottomNav.style.display = 'none';
  const desktopTabs = ById('classroom-desktop-tabs');
  if (desktopTabs) desktopTabs.style.display = 'none';

  const detailPostCard = ById('detail-post-card');
  const ini = initials(post.author_name || 'U');
  const dateStr = formatClassroomDate(post.created_at);

  if (detailPostCard) {
    detailPostCard.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${ini}</div>
        <div class="post-meta">
          <div class="post-author-name">${esc(post.author_name || 'Instructor')}</div>
          <div class="post-time">${esc(dateStr)}</div>
        </div>
        <button type="button" class="post-menu-btn" onclick="togglePostOptions(${post.id}, event)" title="Options" aria-label="More options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1.5"></circle>
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="12" cy="19" r="1.5"></circle>
          </svg>
        </button>
      </div>
      <div class="post-body">${renderFormattedPostContent(post.content)}</div>
      ${renderAttachmentPill(post)}
    `;
  }

  const detailView = ById('announcement-detail-view');
  if (detailView) {
    detailView.classList.add('active');
    detailView.style.setProperty('display', 'flex', 'important');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadDetailComments(postId);
}

function closeAnnouncementDetail() {
  const detailView = ById('announcement-detail-view');
  if (!detailView || (!detailView.classList.contains('active') && detailView.style.display === 'none')) return;

  detailView.classList.remove('active');
  detailView.style.setProperty('display', 'none', 'important');
  S.currentDetailPostId = null;

  const streamLayout = document.querySelector('.stream-layout');
  if (streamLayout && S.tab === 'stream') streamLayout.style.display = '';
  const banner = ById('classroom-banner');
  if (banner && S.tab === 'stream') banner.style.display = '';
  const streamActions = ById('mobile-stream-actions');
  if (streamActions && S.tab === 'stream') streamActions.style.display = '';
  const bottomNav = ById('classroom-mobile-bottom-nav');
  if (bottomNav) bottomNav.style.display = '';
  const desktopTabs = ById('classroom-desktop-tabs');
  if (desktopTabs) desktopTabs.style.display = '';
}

async function loadDetailComments(postId) {
  const listEl = ById('detail-comments-list');
  if (!listEl) return;
  try {
    const r = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream/' + postId + '/comments');
    const comments = r.data || [];
    if (!comments.length) {
      listEl.innerHTML = '<div class="detail-no-comments">No comments</div>';
      return;
    }
    listEl.innerHTML = comments.map(c => `
      <div class="detail-comment-card">
        <div class="detail-comment-av">${initials(c.author_name || 'U')}</div>
        <div class="detail-comment-bubble">
          <div class="detail-comment-author-row">
            <span class="detail-comment-author">${esc(c.author_name || 'User')}</span>
            <span class="detail-comment-time">${formatClassroomDate(c.created_at)}</span>
          </div>
          <div class="detail-comment-text">${esc(c.content)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = '<div class="detail-no-comments">No comments</div>';
  }
}

async function submitDetailComment() {
  if (!S.currentDetailPostId) return;
  const input = ById('detail-comment-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const btn = ById('btn-detail-send');
  if (btn) btn.disabled = true;

  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream/' + S.currentDetailPostId + '/comments', {
      method: 'POST',
      body: JSON.stringify({ content: text })
    });
    if (input) input.value = '';
    toast('Comment posted');

    const post = S.posts.find(p => p.id === S.currentDetailPostId);
    if (post) post.comment_count = (post.comment_count || 0) + 1;
    await loadDetailComments(S.currentDetailPostId);
  } catch (e) {
    toast(e.message || 'Failed to post comment');
  } finally {
    if (btn) btn.disabled = false;
  }
}

let _modalAnnouncementFile = null;
let _composeStreamFile = null;

function handleModalAnnouncementFileSelect(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  _modalAnnouncementFile = file;
  const meta = getFileTypeMeta(file.name);
  const preview = ById('modal-attachment-preview');
  const badge = ById('modal-preview-badge');
  const name = ById('modal-preview-name');
  const size = ById('modal-preview-size');
  if (badge) {
    badge.textContent = meta.badge;
    badge.className = 'file-ext-badge ' + meta.cls;
  }
  if (name) name.textContent = file.name;
  if (size) size.textContent = formatFileSize(file.size);
  if (preview) preview.style.display = 'block';
  const el = ById('modal-announcement-text');
  if (el) {
    const cur = (el.isContentEditable ? (el.innerText || el.textContent) : el.value) || '';
    if (!cur.trim()) {
      if (el.isContentEditable) el.innerText = 'Attached: ' + file.name;
      else el.value = 'Attached: ' + file.name;
    }
  }
  updateModalPostState();
}

function clearModalAnnouncementFile() {
  _modalAnnouncementFile = null;
  const input = ById('modal-announcement-file');
  if (input) input.value = '';
  const preview = ById('modal-attachment-preview');
  if (preview) preview.style.display = 'none';
  updateModalPostState();
}

function handleComposeStreamFileSelect(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  _composeStreamFile = file;
  const meta = getFileTypeMeta(file.name);
  const preview = ById('compose-attachment-preview');
  const badge = ById('compose-preview-badge');
  const name = ById('compose-preview-name');
  const size = ById('compose-preview-size');
  if (badge) {
    badge.textContent = meta.badge;
    badge.className = 'file-ext-badge ' + meta.cls;
  }
  if (name) name.textContent = file.name;
  if (size) size.textContent = formatFileSize(file.size);
  if (preview) preview.style.display = 'block';
  expandCompose();
  updateComposeState();
}

function clearComposeStreamFile() {
  _composeStreamFile = null;
  const input = ById('compose-stream-file');
  if (input) input.value = '';
  const preview = ById('compose-attachment-preview');
  if (preview) preview.style.display = 'none';
  updateComposeState();
}

function triggerNewAnnouncement() {
  if (window.innerWidth <= 768) {
    openMobileAnnouncementComposer();
  } else {
    openNewAnnouncementModal();
  }
}

function sanitizeStreamHtml(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.innerHTML = str;
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'P', 'BR', 'A', 'DIV', 'SPAN']);

  function clean(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowed.has(child.tagName)) {
          const txt = document.createTextNode(child.textContent);
          node.replaceChild(txt, child);
        } else {
          const attrs = Array.from(child.attributes);
          for (const attr of attrs) {
            if (child.tagName === 'A' && attr.name.toLowerCase() === 'href') {
              const href = attr.value.trim();
              if (href.startsWith('javascript:') || href.startsWith('data:')) {
                child.removeAttribute(attr.name);
              } else {
                child.setAttribute('target', '_blank');
                child.setAttribute('rel', 'noopener noreferrer');
              }
            } else {
              child.removeAttribute(attr.name);
            }
          }
          clean(child);
        }
      }
    }
  }

  clean(temp);
  return temp.innerHTML;
}

function renderFormattedPostContent(content) {
  if (!content) return '';
  if (/<(b|strong|i|em|u|ul|ol|li|p|br|a)\b/i.test(content)) {
    return sanitizeStreamHtml(content);
  }
  let text = esc(content);
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  text = text.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>');
  text = text.replace(/^•\s+(.+)$/gm, '<li>$1</li>');
  if (text.includes('<li>')) {
    text = text.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
  }
  text = text.replace(/\n/g, '<br>');
  return text;
}

function updateModalPostState() {
  const el = ById('modal-announcement-text');
  const btn = ById('btn-submit-modal-announcement');
  if (!btn) return;
  const text = el ? (el.isContentEditable ? (el.innerText || el.textContent) : el.value) : '';
  const hasText = text && text.trim().length > 0;
  const hasFile = !!_modalAnnouncementFile;
  btn.disabled = !(hasText || hasFile);
}

function updateFormatButtonsState() {
  if (typeof document.queryCommandState !== 'function') return;
  try {
    const boldBtn = ById('post-btn-bold');
    if (boldBtn) boldBtn.classList.toggle('active', !!document.queryCommandState('bold'));
    const italicBtn = ById('post-btn-italic');
    if (italicBtn) italicBtn.classList.toggle('active', !!document.queryCommandState('italic'));
    const underlineBtn = ById('post-btn-underline');
    if (underlineBtn) underlineBtn.classList.toggle('active', !!document.queryCommandState('underline'));
    const bulletBtn = ById('post-btn-bullet');
    if (bulletBtn) bulletBtn.classList.toggle('active', !!document.queryCommandState('insertUnorderedList'));
  } catch (e) {
    // Ignore queryCommandState errors if editor not focused
  }
}

function formatModalText(type) {
  const editor = ById('modal-announcement-text');
  if (!editor) return;
  editor.focus();

  switch (type) {
    case 'bold':
      document.execCommand('bold', false, null);
      break;
    case 'italic':
      document.execCommand('italic', false, null);
      break;
    case 'underline':
      document.execCommand('underline', false, null);
      break;
    case 'bullet':
      document.execCommand('insertUnorderedList', false, null);
      break;
    case 'clear':
      document.execCommand('removeFormat', false, null);
      if (typeof document.queryCommandState === 'function' && document.queryCommandState('insertUnorderedList')) {
        document.execCommand('insertUnorderedList', false, null);
      }
      break;
  }
  updateModalPostState();
  updateFormatButtonsState();
}

function insertLinkToModalAnnouncement() {
  const editor = ById('modal-announcement-text');
  if (!editor) return;
  editor.focus();
  const url = prompt('Enter link URL (e.g. https://...):');
  if (!url) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) {
    document.execCommand('insertHTML', false, '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>&nbsp;');
  } else {
    document.execCommand('createLink', false, url);
  }
  updateModalPostState();
  updateFormatButtonsState();
}

function openNewAnnouncementModal() {
  const el = ById('modal-announcement-text');
  if (el) {
    if (el.isContentEditable) el.innerHTML = '';
    else el.value = '';
  }
  clearModalAnnouncementFile();
  updateModalPostState();
  updateFormatButtonsState();
  openModal('modal-new-announcement');
  setTimeout(() => {
    if (el) el.focus();
  }, 150);
}

async function submitModalAnnouncement() {
  const el = ById('modal-announcement-text');
  const plainText = el ? (el.isContentEditable ? (el.innerText || el.textContent) : el.value).trim() : '';
  let contentHtml = el ? (el.isContentEditable ? el.innerHTML : el.value).trim() : '';

  if (!plainText && _modalAnnouncementFile) {
    contentHtml = _modalAnnouncementFile.name;
  }
  if (!plainText && !_modalAnnouncementFile) {
    toast('Please enter announcement text or attach a file');
    if (el) el.focus();
    return;
  }

  const contentToSend = (el && el.isContentEditable && /<(b|strong|i|em|u|ul|ol|li|a)\b/i.test(contentHtml))
    ? sanitizeStreamHtml(contentHtml)
    : (plainText || contentHtml);

  const btn = ById('btn-submit-modal-announcement');
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

  try {
    if (_modalAnnouncementFile) {
      const fd = new FormData();
      fd.append('content', contentToSend || _modalAnnouncementFile.name);
      fd.append('attachment', _modalAnnouncementFile);
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream', {
        method: 'POST',
        body: fd
      });
    } else {
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream', {
        method: 'POST',
        body: JSON.stringify({ content: contentToSend })
      });
    }
    clearModalAnnouncementFile();
    closeModal('modal-new-announcement');
    toast('Announcement posted!');
    await loadStream();
  } catch (e) {
    toast(e.message || 'Failed to post announcement');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Post'; }
  }
}

/* ══════════════════════════════════════════════════════════════
   MOBILE FULL-SCREEN ANNOUNCEMENT COMPOSER LOGIC (Image 3)
   ══════════════════════════════════════════════════════════════ */
let _mobileAnnouncementFile = null;

function openMobileAnnouncementComposer() {
  const composer = ById('mobile-announcement-composer');
  if (!composer) return;
  composer.style.display = 'flex';
  composer.classList.add('active');

  const ta = ById('mobile-composer-text');
  if (ta) {
    ta.value = '';
    setTimeout(() => ta.focus(), 120);
  }
  clearMobileComposerFile();
  updateMobileComposerState();

  const nameChip = ById('mobile-chip-class-name');
  if (nameChip && S.group && S.group.subject_name) {
    nameChip.textContent = S.group.subject_name.slice(0, 16);
  }

  const bottomNav = ById('classroom-mobile-bottom-nav');
  if (bottomNav) bottomNav.style.display = 'none';
  const fab = ById('classwork-mobile-fab');
  if (fab) fab.style.display = 'none';
}

function closeMobileAnnouncementComposer() {
  const composer = ById('mobile-announcement-composer');
  if (!composer) return;
  composer.style.display = 'none';
  composer.classList.remove('active');

  const bottomNav = ById('classroom-mobile-bottom-nav');
  if (bottomNav) bottomNav.style.display = '';
  if (S.tab === 'classwork') {
    const fab = ById('classwork-mobile-fab');
    if (fab) fab.style.display = '';
  }
}

function handleMobileComposerFileSelect(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  _mobileAnnouncementFile = file;

  const preview = ById('mobile-composer-attachment-preview');
  const badge = ById('mobile-preview-badge');
  const nameEl = ById('mobile-preview-name');
  const sizeEl = ById('mobile-preview-size');

  if (preview && badge && nameEl && sizeEl) {
    const meta = typeof getFileTypeMeta === 'function' ? getFileTypeMeta(file.name) : { badge: 'FILE', cls: 'badge-other', badgeClass: 'badge-other' };
    badge.textContent = meta.badge || 'FILE';
    badge.className = 'file-ext-badge ' + (meta.badgeClass || meta.cls || '');
    nameEl.textContent = file.name;
    sizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';
    preview.style.display = 'block';
  }
  updateMobileComposerState();
}

function clearMobileComposerFile() {
  _mobileAnnouncementFile = null;
  const input = ById('mobile-composer-file');
  if (input) input.value = '';
  const preview = ById('mobile-composer-attachment-preview');
  if (preview) preview.style.display = 'none';
  updateMobileComposerState();
}

function updateMobileComposerState() {
  const ta = ById('mobile-composer-text');
  const btn = ById('btn-mobile-composer-submit');
  if (!btn) return;
  const hasText = ta && ta.value.trim().length > 0;
  const hasFile = !!_mobileAnnouncementFile;
  btn.disabled = !(hasText || hasFile);
  btn.style.opacity = (hasText || hasFile) ? '1' : '0.5';
}

async function submitMobileAnnouncement() {
  const ta = ById('mobile-composer-text');
  let text = ta ? ta.value.trim() : '';
  if (!text && _mobileAnnouncementFile) {
    text = _mobileAnnouncementFile.name;
  }
  if (!text && !_mobileAnnouncementFile) {
    toast('Please enter announcement text or attach a file');
    if (ta) ta.focus();
    return;
  }

  const btn = ById('btn-mobile-composer-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

  try {
    if (_mobileAnnouncementFile) {
      const fd = new FormData();
      fd.append('content', text || _mobileAnnouncementFile.name);
      fd.append('attachment', _mobileAnnouncementFile);
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream', {
        method: 'POST',
        body: fd
      });
    } else {
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream', {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
    }
    clearMobileComposerFile();
    closeMobileAnnouncementComposer();
    toast('Announcement posted!');
    await loadStream();
  } catch (e) {
    toast(e.message || 'Failed to post announcement');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create'; }
  }
}

function downloadAttachment(path, fname) {
  if (path) {
    const link = document.createElement('a');
    link.href = path;
    link.download = fname || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast('Downloading ' + (fname || 'attachment') + '…');
  } else {
    toast('Opening document: ' + (fname || 'Document'));
  }
}

let _activePostDropdown = null;
function togglePostOptions(pid, ev) {
  if (ev) ev.stopPropagation();
  if (_activePostDropdown) {
    _activePostDropdown.remove();
    _activePostDropdown = null;
  }
  const postCard = ById('post-' + pid);
  if (!postCard) return;

  const dd = document.createElement('div');
  dd.className = 'post-options-dropdown';
  dd.innerHTML = `
    <button type="button" class="post-option-item" onclick="copyPostLink(${pid});event.stopPropagation();">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      <span>Copy link</span>
    </button>
    <button type="button" class="post-option-item danger" onclick="deleteAnnouncement(${pid});event.stopPropagation();">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      <span>Delete</span>
    </button>
  `;
  postCard.appendChild(dd);
  _activePostDropdown = dd;

  const onDocClick = () => {
    if (_activePostDropdown) {
      _activePostDropdown.remove();
      _activePostDropdown = null;
    }
    document.removeEventListener('click', onDocClick);
  };
  setTimeout(() => document.addEventListener('click', onDocClick), 50);
}

function copyPostLink(pid) {
  const url = window.location.origin + window.location.pathname + '?id=' + S.groupId + '&tab=stream#post-' + pid;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard!'));
  } else {
    toast('Link copied');
  }
}

async function deleteAnnouncement(pid) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream/' + pid, { method: 'DELETE' });
    toast('Announcement deleted');
    if (S.currentDetailPostId === pid) closeAnnouncementDetail();
    await loadStream();
  } catch (e) {
    toast(e.message || 'Failed to delete announcement');
  }
}

function toggleDetailOverflow(ev) {
  if (ev) ev.stopPropagation();
  if (!S.currentDetailPostId) return;
  togglePostOptions(S.currentDetailPostId, ev);
}

function updateComposeState() {
  const composeTa = document.getElementById('stream-compose-text');
  if (ById('btn-post-ann')) {
    const hasText = composeTa && composeTa.value.trim();
    ById('btn-post-ann').disabled = !(hasText || _composeStreamFile);
  }
}

function expandCompose() {
  const box = ById('stream-compose-box') || document.querySelector('.compose-box');
  if (box) box.classList.add('expanded');
  const tb = ById('compose-toolbar');
  if (tb) tb.style.display = 'flex';
}

function clearCompose() {
  const composeTa = document.getElementById('stream-compose-text');
  if (composeTa) {
    composeTa.value = '';
    composeTa.style.height = 'auto';
  }
  clearComposeStreamFile();
  const box = ById('stream-compose-box') || document.querySelector('.compose-box');
  if (box) box.classList.remove('expanded');
  if (ById('compose-toolbar')) ById('compose-toolbar').style.display = 'none';
  if (ById('btn-post-ann')) ById('btn-post-ann').disabled = true;
  if (composeTa) composeTa.blur();
}

async function postAnnouncement() {
  const composeTa = document.getElementById('stream-compose-text');
  let text = composeTa ? composeTa.value.trim() : '';
  if (!text && _composeStreamFile) {
    text = _composeStreamFile.name;
  }
  if (!text && !_composeStreamFile) return;

  const btn = ById('btn-post-ann');
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

  try {
    if (_composeStreamFile) {
      const fd = new FormData();
      fd.append('content', text || _composeStreamFile.name);
      fd.append('attachment', _composeStreamFile);
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream', {
        method: 'POST',
        body: fd
      });
    } else {
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream', {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
    }
    clearComposeStreamFile();
    clearCompose();
    toast('Announcement posted!');
    await loadStream();
  } catch (e) {
    toast(e.message || 'Failed to post announcement');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Post'; }
  }
}

function focusMobileAnnouncement() {
  triggerNewAnnouncement();
}

// Bind stream functions to window
window.loadStream = loadStream;
window.renderStream = renderStream;
window.renderAttachmentPill = renderAttachmentPill;
window.renderPostCard = renderPostCard;
window.handlePostCardClick = handlePostCardClick;
window.openAnnouncementDetail = openAnnouncementDetail;
window.closeAnnouncementDetail = closeAnnouncementDetail;
window.loadDetailComments = loadDetailComments;
window.submitDetailComment = submitDetailComment;
window.handleModalAnnouncementFileSelect = handleModalAnnouncementFileSelect;
window.clearModalAnnouncementFile = clearModalAnnouncementFile;
window.handleComposeStreamFileSelect = handleComposeStreamFileSelect;
window.clearComposeStreamFile = clearComposeStreamFile;
window.triggerNewAnnouncement = triggerNewAnnouncement;
window.openNewAnnouncementModal = openNewAnnouncementModal;
window.submitModalAnnouncement = submitModalAnnouncement;
window.formatModalText = formatModalText;
window.insertLinkToModalAnnouncement = insertLinkToModalAnnouncement;
window.updateModalPostState = updateModalPostState;
window.updateFormatButtonsState = updateFormatButtonsState;
window.openMobileAnnouncementComposer = openMobileAnnouncementComposer;
window.closeMobileAnnouncementComposer = closeMobileAnnouncementComposer;
window.handleMobileComposerFileSelect = handleMobileComposerFileSelect;
window.clearMobileComposerFile = clearMobileComposerFile;
window.updateMobileComposerState = updateMobileComposerState;
window.submitMobileAnnouncement = submitMobileAnnouncement;
window.downloadAttachment = downloadAttachment;
window.togglePostOptions = togglePostOptions;
window.copyPostLink = copyPostLink;
window.deleteAnnouncement = deleteAnnouncement;
window.toggleDetailOverflow = toggleDetailOverflow;
window.updateComposeState = updateComposeState;
window.clearCompose = clearCompose;
window.postAnnouncement = postAnnouncement;
window.focusMobileAnnouncement = focusMobileAnnouncement;
window.expandCompose = expandCompose;
