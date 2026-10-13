/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: GROUP-DETAIL
 * frontend/faculty/group-detail/group-detail.js
 * ══════════════════════════════════════════════════════════════
 */

var apiFetch = window.apiFetch || ((url, opts) => typeof apiRequest === 'function' ? apiRequest(url, opts) : fetchApi(url.replace(/^\/api\/v1/, ''), opts));
    const S={groupId:null,group:null,members:[],posts:[],assignments:[],tests:[],tab:'stream',cwFilter:'all',currentTest:null};
    function initGroupPage() {
      guardRoute({ requireRoles: ['TEACHER', 'SYSTEM_ADMIN'] });
      const p = new URLSearchParams(window.location.search);
      S.groupId = Number(p.get('id'));
      const initTab = p.get('tab') || 'stream';
      if (!S.groupId) {
        toast('No group specified');
        setTimeout(() => location.href = '/faculty/groups.html', 1500);
        return;
      }
      loadGroup().then(() => {
        switchTab(initTab);
        renderUserAvatar();
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGroupPage);
    } else {
      initGroupPage();
    }

    async function loadGroup(){
      try{
        const r=await apiFetch('/api/v1/teaching-groups/'+S.groupId);
        if (r && r.data) {
          S.group = r.data;
          renderBanner(S.group);
          populateSidebarStats();
          await Promise.all([loadStream(),loadMembers(),loadAssignments(),loadTests()]);
        } else {
          toast('Failed to load group: ' + (r?.error?.message || 'Invalid group'));
        }
      } catch(e) {
        toast('Failed to load group: ' + (e.message || 'Network error'));
      }
    }

    function formatClassroomDate(ds){
      if(!ds) return '';
      const d = new Date(ds);
      if(isNaN(d.getTime())) return ds;
      const now = new Date();
      const isSameYear = d.getFullYear() === now.getFullYear();
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(isSameYear ? {} : { year: 'numeric' })
      });
    }

    function renderBanner(g){
      if (!g) return;
      document.title = (g.name || 'Group') + ' — VidyaOS';
      if (ById('navbar-class-name')) ById('navbar-class-name').textContent = g.name || 'Classroom';
      if (ById('navbar-class-sub')) {
        const semTxt = g.semester ? ('Sem ' + g.semester) : '';
        const deptTxt = g.department_name ? (' • ' + g.department_name) : '';
        ById('navbar-class-sub').textContent = (semTxt + deptTxt) || '';
      }
      if (ById('banner-code-display')) ById('banner-code-display').textContent = g.invite_code || '——';
      if (ById('banner-group-name')) ById('banner-group-name').textContent = g.name || '';
      if (ById('banner-subject-name')) ById('banner-subject-name').textContent = g.subject_name || '';
      if (ById('banner-dept-name')) ById('banner-dept-name').textContent = g.department_name || 'Teaching Group';
      if (ById('dept-header-name')) ById('dept-header-name').textContent = (g.department_name ? (g.department_name + ' • ') : '') + (g.name || 'Classroom Workspace');
      if (ById('banner-component-chip')) ById('banner-component-chip').textContent = g.component === 'THEORY_PRACTICAL' ? 'THEORY + PRACTICAL' : (g.component || 'THEORY');
      if (ById('banner-sem-chip')) ById('banner-sem-chip').textContent = 'Sem ' + (g.semester || 1);
      if (ById('banner-year-chip')) ById('banner-year-chip').textContent = 'Year ' + Math.ceil((g.semester || 1) / 2);
      if (ById('banner-ay-chip')) ById('banner-ay-chip').textContent = g.academic_year_label || '';

      // Configure Lab Practical visibility based on Component (Theory + Practical)
      const compStr = String(g.component || '').toUpperCase();
      const hasPractical = compStr.includes('PRACTICAL');
      if (ById('cwcat-practicals')) ById('cwcat-practicals').style.display = hasPractical ? '' : 'none';
      if (ById('cw-dd-practical-item')) ById('cw-dd-practical-item').style.display = hasPractical ? '' : 'none';
      if (ById('cw-fab-practical-item')) ById('cw-fab-practical-item').style.display = hasPractical ? '' : 'none';
      if (ById('banner-subtitle')) {
        const semTxt = g.semester ? ('Sem ' + g.semester) : '';
        const deptTxt = g.department_name ? (' • ' + g.department_name) : '';
        ById('banner-subtitle').textContent = semTxt + deptTxt || 'Classroom';
      }
      if (ById('sidebar-invite-code')) ById('sidebar-invite-code').textContent = g.invite_code || '——';
      if (ById('people-invite-code')) ById('people-invite-code').textContent = g.invite_code || '——';
      if (ById('archive-group-name-confirm')) ById('archive-group-name-confirm').textContent = g.name || '';

      // Populate About This Class Modal (Screenshot 1 & 2 'i' info button)
      if (ById('info-modal-name')) ById('info-modal-name').textContent = g.name || '—';
      if (ById('info-modal-subject')) ById('info-modal-subject').textContent = g.subject_name || '—';
      if (ById('info-modal-dept')) ById('info-modal-dept').textContent = g.department_name || '—';
      if (ById('info-modal-sem')) ById('info-modal-sem').textContent = (g.semester ? ('Semester ' + g.semester) : '') + (g.component ? (' (' + g.component + ')') : '');
      if (ById('info-modal-teacher')) ById('info-modal-teacher').textContent = g.teacher_name || 'Faculty Member';
      if (ById('info-modal-code')) ById('info-modal-code').textContent = g.invite_code || '——';

      const bannerBg = document.querySelector('.classroom-banner-bg');
      if (bannerBg && g.component === 'PRACTICAL') {
        bannerBg.style.background = 'linear-gradient(135deg,hsl(142,70%,18%) 0%,hsl(155,65%,28%) 45%,hsl(170,60%,38%) 100%)';
      }
      if (ById('banner-icon')) {
        ById('banner-icon').innerHTML = g.component === 'PRACTICAL'
          ? '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.25"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>'
          : '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.25"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
      }
      if (g.status === 'ARCHIVED') {
        if (bannerBg) bannerBg.style.filter = 'grayscale(.45)';
        if (ById('btn-edit-group')) ById('btn-edit-group').style.display = 'none';
      }
    }

    function switchTab(tab){
      // Close announcement detail view if open
      closeAnnouncementDetail();

      ['stream','classwork','people','marks'].forEach(t=>{
        if (ById('tab-'+t)) ById('tab-'+t).style.display=t===tab?'':'none';
        if (ById('tab-btn-'+t)) ById('tab-btn-'+t).classList.toggle('active',t===tab);
        if (ById('mobile-tab-btn-'+t)) ById('mobile-tab-btn-'+t).classList.toggle('active',t===tab);
      });
      S.tab=tab;const url=new URL(location);url.searchParams.set('tab',tab);history.replaceState({},'',url);

      // Mobile stream actions visibility (only visible on stream tab)
      const streamActions = ById('mobile-stream-actions');
      if (streamActions) streamActions.style.display = tab === 'stream' ? '' : 'none';

      // Classroom hero banner visibility (only visible on stream tab per Google Classroom layout)
      const banner = ById('classroom-banner');
      if (banner) {
        banner.style.display = tab === 'stream' ? '' : 'none';
      }

      // Mobile FAB visibility (visible only on classwork tab)
      const cwFab = ById('classwork-mobile-fab');
      if (cwFab) cwFab.style.display = tab === 'classwork' ? 'inline-flex' : 'none';
      const fabMenu = ById('cw-mobile-fab-menu');
      if (fabMenu && tab !== 'classwork') fabMenu.style.display = 'none';

      // Mobile navbar title (empty on stream tab per Google Classroom, shows class name on other tabs on mobile)
      const titleEl = ById('mobile-nav-class-title');
      if (titleEl) {
        if (window.innerWidth <= 768 && tab !== 'stream') {
          titleEl.style.display = 'block';
          titleEl.textContent = S.group?.name || 'Classroom';
        } else {
          titleEl.style.display = 'none';
        }
      }

      if (tab === 'classwork' && typeof updateCwFilterCount === 'function') {
        updateCwFilterCount();
      }
    }

    async function loadStream(){
      try{const r=await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/stream');S.posts=r.data||[];renderStream(S.posts);}
      catch{renderStream([]);}
    }

    function renderStream(posts){
      const c=ById('stream-feed');
      if(!posts||!posts.length){
        c.innerHTML = `
          <div class="classroom-empty-talk-state" id="stream-empty-talk-state">
            <div class="empty-talk-illustration">
              <svg width="170" height="150" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="45" y="145" width="130" height="22" rx="4" fill="var(--bg-surface-secondary)" stroke="var(--border-color)" stroke-width="2.5"/>
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

    function getFileTypeMeta(fileName){
      const ext = (fileName || '').split('.').pop().toLowerCase();
      let badge = 'FILE';
      let cls = 'badge-file';
      if (ext === 'pdf') { badge = 'PDF'; cls = 'badge-pdf'; }
      else if (['doc', 'docx', 'odt'].includes(ext)) { badge = 'DOC'; cls = 'badge-doc'; }
      else if (['xls', 'xlsx', 'csv'].includes(ext)) { badge = 'XLS'; cls = 'badge-xls'; }
      else if (['ppt', 'pptx'].includes(ext)) { badge = 'PPT'; cls = 'badge-ppt'; }
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) { badge = 'ZIP'; cls = 'badge-zip'; }
      else if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext)) { badge = 'IMG'; cls = 'badge-img'; }
      else if (['txt', 'rtf', 'md'].includes(ext)) { badge = 'TXT'; cls = 'badge-doc'; }
      else if (['py', 'java', 'c', 'cpp', 'js', 'ts', 'html', 'css', 'json'].includes(ext)) { badge = 'CODE'; cls = 'badge-code'; }
      return { ext, badge, cls };
    }

    function formatFileSize(bytes){
      if (!bytes) return '';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function renderAttachmentPill(post, marginStyle = ''){
      const attachmentName = post.attachment_name || (post.content && post.content.match(/([a-zA-Z0-9_\-\.]+\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|png|jpe?g|webp|svg|txt|csv|py|java|json|md))/i)?.[1]);
      if (!attachmentName) return '';
      const meta = getFileTypeMeta(attachmentName);
      const dlPath = post.attachment_path || '';
      return '<div class="post-attachment-pill"' + (marginStyle ? ' style="' + marginStyle + '"' : '') + ' onclick="event.stopPropagation(); downloadAttachment(\'' + esc(dlPath) + '\', \'' + esc(attachmentName) + '\')">' +
        '<span class="file-ext-badge ' + meta.cls + '">' + esc(meta.badge) + '</span>' +
        '<span class="attachment-filename">' + esc(attachmentName) + '</span>' +
      '</div>';
    }

    function renderPostCard(post){
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
        '<div class="post-body">' + esc(post.content) + '</div>' +
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

    // ══════════════════════════════════════════════════════════════
    // ANNOUNCEMENT DETAIL & CLASS COMMENTS STUDIO (Screenshot 3)
    // ══════════════════════════════════════════════════════════════
    S.currentDetailPostId = null;

    function openAnnouncementDetail(postId){
      const post = S.posts.find(p => p.id === postId);
      if (!post) return;
      S.currentDetailPostId = postId;

      // Hide stream layout, hero banner, quick actions, and mobile bottom bar
      const streamLayout = document.querySelector('.stream-layout');
      if (streamLayout) streamLayout.style.display = 'none';
      const banner = ById('classroom-banner');
      if (banner) banner.style.display = 'none';
      const streamActions = ById('mobile-stream-actions');
      if (streamActions) streamActions.style.display = 'none';
      const bottomNav = ById('classroom-mobile-bottom-nav');
      if (bottomNav) bottomNav.style.display = 'none';

      // Render announcement post card inside detail view
      const detailPostCard = ById('detail-post-card');
      const ini = initials(post.author_name || 'U');
      const dateStr = formatClassroomDate(post.created_at);
      const attachmentName = post.attachment_name || (post.content && post.content.match(/([a-zA-Z0-9_\-]+\.pdf)/i)?.[1]);

      detailPostCard.innerHTML = `
        <div class="post-header" style="padding:0 0 0.85rem 0;">
          <div class="post-avatar">${ini}</div>
          <div class="post-meta">
            <div class="post-author-name">${esc(post.author_name || 'Instructor')}</div>
            <div class="post-time">${esc(dateStr)}</div>
          </div>
          <button type="button" class="post-menu-btn" onclick="togglePostOptions(${post.id}, event)" title="Options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
        </div>
        <div class="post-body" style="padding:0 0 0.85rem 0;">${esc(post.content)}</div>
        ${renderAttachmentPill(post, 'margin:0 0 0.85rem 0;')}
        <div style="border-bottom:1px solid var(--border-color);margin-top:0.35rem;"></div>
      `;

      // Show detail view and scroll to top
      const detailView = ById('announcement-detail-view');
      if (detailView) {
        detailView.style.display = 'flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      loadDetailComments(postId);
    }

    function closeAnnouncementDetail(){
      const detailView = ById('announcement-detail-view');
      if (!detailView || detailView.style.display === 'none') return;

      detailView.style.display = 'none';
      S.currentDetailPostId = null;

      // Restore stream layout, banner, stream actions, and bottom nav
      const streamLayout = document.querySelector('.stream-layout');
      if (streamLayout && S.tab === 'stream') streamLayout.style.display = '';
      const banner = ById('classroom-banner');
      if (banner) banner.style.display = '';
      const streamActions = ById('mobile-stream-actions');
      if (streamActions && S.tab === 'stream') streamActions.style.display = '';
      const bottomNav = ById('classroom-mobile-bottom-nav');
      if (bottomNav) bottomNav.style.display = '';
    }

    async function loadDetailComments(postId){
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

    async function submitDetailComment(){
      if (!S.currentDetailPostId) return;
      const input = ById('detail-comment-input');
      const text = input.value.trim();
      if (!text) return;

      const btn = ById('btn-detail-send');
      if (btn) btn.disabled = true;

      try {
        await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/stream/' + S.currentDetailPostId + '/comments', {
          method: 'POST',
          body: JSON.stringify({ content: text })
        });
        input.value = '';
        toast('Comment posted');

        // Update post count in memory and reload
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

    function handleModalAnnouncementFileSelect(input){
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
      const ta = ById('modal-announcement-text');
      if (ta && !ta.value.trim()) {
        ta.value = 'Attached: ' + file.name;
      }
    }

    function clearModalAnnouncementFile(){
      _modalAnnouncementFile = null;
      const input = ById('modal-announcement-file');
      if (input) input.value = '';
      const preview = ById('modal-attachment-preview');
      if (preview) preview.style.display = 'none';
    }

    function handleComposeStreamFileSelect(input){
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
      const tb = ById('compose-toolbar');
      if (tb) tb.style.display = 'flex';
      const ta = ById('stream-compose-text');
      if (ta && !ta.value.trim()) {
        ta.value = 'Attached: ' + file.name;
      }
      updateComposeState();
    }

    function clearComposeStreamFile(){
      _composeStreamFile = null;
      const input = ById('compose-stream-file');
      if (input) input.value = '';
      const preview = ById('compose-attachment-preview');
      if (preview) preview.style.display = 'none';
      updateComposeState();
    }

    // Class Info Modal
    function openClassInfoModal(){
      openModal('modal-class-info');
    }

    // New Announcement Modal
    function openNewAnnouncementModal(){
      if (ById('modal-announcement-text')) ById('modal-announcement-text').value = '';
      clearModalAnnouncementFile();
      openModal('modal-new-announcement');
      setTimeout(() => {
        const ta = ById('modal-announcement-text');
        if (ta) ta.focus();
      }, 150);
    }

    async function submitModalAnnouncement(){
      const ta = ById('modal-announcement-text');
      let text = ta ? ta.value.trim() : '';
      if (!text && _modalAnnouncementFile) {
        text = _modalAnnouncementFile.name;
      }
      if (!text && !_modalAnnouncementFile) {
        toast('Please enter announcement text or attach a file');
        if (ta) ta.focus();
        return;
      }

      const btn = ById('btn-submit-modal-announcement');
      if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

      try {
        if (_modalAnnouncementFile) {
          const fd = new FormData();
          fd.append('content', text || _modalAnnouncementFile.name);
          fd.append('attachment', _modalAnnouncementFile);
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

    function downloadAttachment(path, fname){
      if (path) {
        window.open(path, '_blank');
        toast('Downloading ' + (fname || 'attachment') + '…');
      } else {
        toast('Opening document: ' + (fname || 'Document'));
      }
    }

    let _activePostDropdown = null;
    function togglePostOptions(pid, ev){
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

    function copyPostLink(pid){
      const url = window.location.origin + window.location.pathname + '?id=' + S.groupId + '&tab=stream#post-' + pid;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard!'));
      } else {
        toast('Link copied');
      }
    }

    async function deleteAnnouncement(pid){
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

    function toggleDetailOverflow(ev){
      if (ev) ev.stopPropagation();
      if (!S.currentDetailPostId) return;
      togglePostOptions(S.currentDetailPostId, ev);
    }

    const composeTa=document.getElementById('stream-compose-text');
    if(composeTa){composeTa.addEventListener('focus',()=>ById('compose-toolbar').style.display='flex');}
    function updateComposeState(){
      if (ById('btn-post-ann')) {
        const hasText = composeTa && composeTa.value.trim();
        ById('btn-post-ann').disabled = !(hasText || _composeStreamFile);
      }
    }
    function clearCompose(){
      if (composeTa) composeTa.value = '';
      clearComposeStreamFile();
      if (ById('compose-toolbar')) ById('compose-toolbar').style.display = 'none';
      if (ById('btn-post-ann')) ById('btn-post-ann').disabled = true;
      if (composeTa) composeTa.blur();
    }
    async function postAnnouncement(){
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

    async function loadMembers(){
      try{const r=await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/members');S.members=r.data||[];renderPeople();
      ById('tab-people-count').textContent=S.members.length;ById('stat-enrolled').textContent=S.members.length;ById('kpi-students').textContent=S.members.length;ById('students-count-label').textContent=S.members.length+' students';}
      catch{S.members=[];ById('students-list').innerHTML='<div style="padding:1rem;color:var(--text-muted);font-size:.85rem">Failed to load students.</div>';}
    }
    function renderPeople(){const g=S.group;
      ById('teacher-list').innerHTML='<div class="person-row"><div class="person-av teacher-av">'+initials(g.teacher_name||'T')+'</div><div class="person-info"><div class="person-name">'+esc(g.teacher_name||'Teacher')+'</div><div class="person-sub">'+esc(g.department_name||'')+' • Instructor</div></div></div>';
      const sl=ById('students-list');
      if(!S.members.length){sl.innerHTML=emptyState('students','No students enrolled yet','Add students using their enrollment number or share the invite code.');return;}
      sl.innerHTML=S.members.map((m,i)=>'<div class="person-row"><div class="person-av" style="background:hsl('+((i*47+142)%360)+',55%,48%)">'+initials(m.full_name)+'</div><div class="person-info"><div class="person-name">'+esc(m.full_name||'Student')+'</div><div class="person-sub">Roll '+(m.class_roll_no||'—')+' • '+esc(m.official_enrollment_no||m.enrollment_no||'No enrollment no.')+'</div></div><button class="person-rm-btn" onclick="removeStudent('+m.student_id+')" title="Remove">'+window.getSvgIcon('close', 14)+'</button></div>').join('');
    }
    async function addStudentByEnroll(){const inp=ById('add-enroll-input'),eno=inp.value.trim();if(!eno){toast('Enter an enrollment number');return;}
      try{await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/members',{method:'POST',body:JSON.stringify({official_enrollment_no:eno})});inp.value='';toast('Student added!');await loadMembers();}catch(e){toast(e.message||'Student not found');}
    }
    let _pendingDelete = null;

    function requestRemoveStudent(sid){
      const member = S.members.find(m => m.student_id === sid);
      const name = member ? member.full_name : 'Student';
      const roll = member ? (member.class_roll_no ? ('Roll #' + member.class_roll_no) : '') : '';
      const enroll = member ? (member.official_enrollment_no || member.enrollment_no || '') : '';
      const detailStr = [roll, enroll].filter(Boolean).join(' • ');

      _pendingDelete = {
        action: 'remove_student',
        id: sid,
        name: name,
        execute: async () => {
          await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/members/' + sid, { method: 'DELETE' });
          toast(name + ' removed from group');
          await loadMembers();
        }
      };

      ById('del-modal-title').textContent = 'Remove Student from Group';
      ById('del-modal-desc').innerHTML = 'Remove <strong>' + esc(name) + '</strong>' + (detailStr ? ' (' + esc(detailStr) + ')' : '') + ' from <strong>' + esc(S.group?.name || 'this group') + '</strong>?';
      ById('del-modal-step2-text').innerHTML = 'You are about to remove <strong>' + esc(name) + '</strong> from this teaching group. The student will lose access to the classroom stream, assignments, and test rosters.';
      ById('del-checkbox-label').innerHTML = 'Yes, remove <strong>' + esc(name) + '</strong> from this teaching group';
      ById('btn-final-delete-confirm').textContent = 'Confirm & Remove';

      ById('del-step-1').style.display = '';
      ById('del-step-2').style.display = 'none';
      ById('del-confirm-checkbox').checked = false;
      ById('btn-final-delete-confirm').disabled = true;
      openModal('modal-confirm-delete');
    }

    function removeStudent(sid){
      requestRemoveStudent(sid);
    }
    async function loadAssignments(){
      try{const r=await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/assignments');S.assignments=r.data||[];}catch{S.assignments=[];}
      renderCWList();ById('tab-cw-count').textContent=S.assignments.length+S.tests.length;
      updateClassworkNavDot();
    }
    async function loadTests(){
      try{const r=await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/tests');S.tests=r.data||[];}catch{S.tests=[];}
      renderMarksTable();ById('tab-marks-count').textContent=S.tests.length;ById('kpi-tests').textContent=S.tests.length;ById('stat-tests').textContent=S.tests.length;
      ById('tab-cw-count').textContent=S.assignments.length+S.tests.length;renderCWList();
      updateClassworkNavDot();
    }
    function updateClassworkNavDot(){
      // Red dot is exclusively for students with pending coursework, NOT faculty/teachers
      const cwNavBtn = ById('mobile-tab-btn-classwork');
      if (cwNavBtn) {
        const dot = cwNavBtn.querySelector('.mobile-nav-red-dot');
        if (dot) dot.remove();
      }
    }
    const GD_ICONS = {
      all: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      assignment: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      practical: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="6.5" y1="15" x2="17.5" y2="15"/></svg>`,
      finaldocs: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
      test: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
      edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
      users: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      chart: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      file: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    };

    function renderCWList(){
      const f = S.cwFilter || 'all';
      let items = [];
      const mappedAssigns = (S.assignments || []).map(a => {
        const rawType = (a.type || 'ASSIGNMENT').toLowerCase();
        const normType = rawType === 'final_docs' ? 'finaldocs' : rawType;
        return { ...a, _type: normType };
      });
      const mappedTests = (S.tests || []).map(t => ({ ...t, _type: 'test' }));

      if (f === 'all') {
        items = items.concat(mappedAssigns).concat(mappedTests);
      } else if (f === 'assignments') {
        items = mappedAssigns.filter(a => a._type === 'assignment');
      } else if (f === 'practicals') {
        items = mappedAssigns.filter(a => a._type === 'practical');
      } else if (f === 'finaldocs') {
        items = mappedAssigns.filter(a => a._type === 'finaldocs');
      } else if (f === 'tests') {
        items = mappedTests;
      }

      items.sort((a,b)=>new Date(b.created_at||b.test_date)-new Date(a.created_at||a.test_date));
      const c = ById('classwork-list');
      if (!items.length) {
        const emptyMsg = f === 'practicals' ? 'No practical assignments or lab work posted yet.' :
                         f === 'finaldocs' ? 'No final semester document requests posted yet.' :
                         f === 'tests' ? 'No class tests scheduled yet.' :
                         f === 'assignments' ? 'No assignments posted yet.' :
                         'Click "+ Create" to post assignments, practical work, or schedule tests.';
        c.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon" style="display:flex;justify-content:center;margin-bottom:0.75rem;opacity:0.6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <div class="empty-title">No work items found</div>
            <div class="empty-desc">${esc(emptyMsg)}</div>
          </div>
        `;
        return;
      }

      c.innerHTML = items.map(item => {
        const isA = item._type === 'assignment';
        const isP = item._type === 'practical';
        const isF = item._type === 'finaldocs';
        const isT = item._type === 'test';

        const svgIcon = isP ? GD_ICONS.practical : isF ? GD_ICONS.finaldocs : isT ? GD_ICONS.test : GD_ICONS.assignment;
        const icls = isP ? 'wt-practical' : isF ? 'wt-finaldocs' : isT ? 'wt-test' : 'wt-assignment';
        const typeLabel = isP ? 'Practical Work' : isF ? 'Final Documents' : isT ? 'Class Test' : 'Assignment';

        const title = item.title || item.name || 'Untitled';
        const mm = item.max_marks;
        const dd = item.due_date ? new Date(item.due_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null;
        const td = item.test_date ? new Date(item.test_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null;
        const gc = item.graded_count || item.submission_count || 0;
        const tot = S.members.length || 0;
        const ij = JSON.stringify(item).replace(/"/g,'&quot;');

        return `
          <div class="work-card" id="work-card-${item.id}">
            <div class="work-card-hdr">
              <div class="work-type-icon ${icls}">${svgIcon}</div>
              <div class="work-card-title-wrap">
                <div class="work-card-title">${esc(title)}</div>
                <div class="work-card-meta">
                  <span>${typeLabel}</span>
                  ${mm ? `<span>• Max: ${mm} marks</span>` : ''}
                  ${dd ? `<span class="work-due-badge">Due: ${dd}</span>` : ''}
                  ${td ? `<span>• Date: ${td}</span>` : ''}
                </div>
              </div>
              <div class="work-card-actions">
                ${isT ? `<button class="work-action-btn" onclick="openMarksModal(${ij})">${GD_ICONS.chart} <span>Enter Marks</span></button>` : ''}
                <button class="work-action-btn" id="btn-toggle-sub-${item.id}" onclick="toggleWorkSubmissionsExpand(${item.id}, '${item._type}')" title="Show submitted & not submitted students">
                  ${GD_ICONS.users} <span>Submissions &amp; Roster</span>
                </button>
                <button class="work-action-btn" onclick="openEditWorkModal('${item._type}', ${item.id})" title="Edit work item">
                  ${GD_ICONS.edit} <span>Edit</span>
                </button>
                <button class="work-action-btn danger" onclick="delWork('${item._type}', ${item.id})" title="Delete work item">
                  ${GD_ICONS.trash}
                </button>
              </div>
              <!-- Mobile 3-Dots Minimal Anchored Dropdown -->
              <div class="work-card-menu-wrap">
                <button type="button" class="work-mobile-menu-trigger" onclick="toggleWorkCardMenu(event, ${item.id})" title="Options">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                </button>
                <div class="work-card-dropdown" id="work-card-dd-${item.id}" style="display:none">
                  <button type="button" class="work-dd-item" onclick="handleCardMenuChoice('edit', '${item._type}', ${item.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Edit</span>
                  </button>
                  ${isT ? `
                  <button type="button" class="work-dd-item" onclick="handleCardMenuChoice('marks', '${item._type}', ${item.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    <span>Enter Marks</span>
                  </button>` : ''}
                  <button type="button" class="work-dd-item danger" onclick="handleCardMenuChoice('delete', '${item._type}', ${item.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
            ${item.description ? `<div style="padding:.75rem 1.25rem;font-size:.83rem;color:var(--text-muted);border-bottom:1px solid var(--border-color);white-space:pre-line">${esc(item.description)}</div>` : ''}
            <div class="work-card-stats">
              <div class="work-stat"><div class="work-stat-val" id="stat-sub-${item.id}">${gc}</div><div class="work-stat-label">${isT ? 'Graded' : 'Submitted'}</div></div>
              <div class="work-stat"><div class="work-stat-val" id="stat-pend-${item.id}">${Math.max(0, tot - gc)}</div><div class="work-stat-label">Pending</div></div>
              <div class="work-stat"><div class="work-stat-val">${tot}</div><div class="work-stat-label">Students</div></div>
            </div>
            <div class="work-expand-pane" id="work-expand-pane-${item.id}" style="display:none"></div>
          </div>
        `;
      }).join('');
    }

    function filterCW(f){
      S.cwFilter = f;
      ['all','assignments','practicals','finaldocs','tests','materials'].forEach(c=>ById('cwcat-'+c)?.classList.toggle('active',c===f));
      const labels = {
        all:'All Work',
        assignments:'Assignments',
        practicals:'Practical Work',
        finaldocs:'Final Documents',
        tests:'Class Tests',
        materials:'Materials'
      };
      const title = labels[f] || 'Classwork';
      if (ById('cw-section-title')) ById('cw-section-title').textContent = f === 'all' ? 'All Classwork' : title;
      if (ById('cw-mobile-filter-label')) ById('cw-mobile-filter-label').textContent = title;
      updateCwFilterCount(f);
      renderCWList();
    }
    let cwDdOpen=false;
    function toggleCWDrop(){cwDdOpen=!cwDdOpen;ById('cw-dd-menu').style.display=cwDdOpen?'block':'none';}
    function closeCWDrop(){cwDdOpen=false;ById('cw-dd-menu').style.display='none';}
    document.addEventListener('click',e=>{if(!e.target.closest('#cw-dd-wrap'))closeCWDrop();});
    function renderMarksTable(){const tbody=ById('marks-tests-tbody');
      if(!S.tests.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:2.5rem">'+emptyState('test','No tests scheduled yet','Click Schedule New Test to create your first class test.')+'</td></tr>';return;}
      tbody.innerHTML=S.tests.map((t,i)=>{
        const ds=t.test_date?new Date(t.test_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'--';
        const gc=t.graded_count||0;const avg=t.avg_score!=null?parseFloat(t.avg_score).toFixed(1)+'/'+t.max_marks:'--';const pr=t.pass_rate!=null?parseFloat(t.pass_rate).toFixed(0)+'%':'--';
        const ij=JSON.stringify(t).replace(/"/g,'&quot;');
        return '<tr><td style="font-weight:700;color:var(--text-muted)">'+(i+1)+'</td><td style="font-weight:700">'+esc(t.name||t.title||'Test')+'</td><td>'+ds+'</td><td>'+(t.max_marks||'--')+'</td><td>'+gc+'/'+S.members.length+'</td><td style="font-weight:700;color:var(--status-present)">'+avg+'</td><td>'+pr+'</td><td style="text-align:right"><button class="work-action-btn" onclick="openMarksModal('+ij+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>Enter Marks</button></td></tr>';
      }).join('');
    }
    function filterMarksTable(q){document.querySelectorAll('#marks-tests-tbody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none';});}
    S.currentTestQuestions = [];
    S.currentTestInstructions = [];
    S.cachedTestScores = {};
    S.marksColumnsVisibility = { srNo: false, enrollmentNo: false, registrationNo: false };

    const DEFAULT_TEST_INSTRUCTIONS = [
      "All questions are compulsory.",
      "Write your Roll Number and Name clearly.",
      "Check question marks against each column.",
      "Neat handwriting and clear steps expected."
    ];

    function downloadBlob(blob, filename) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 150);
    }

    function toggleMarksColFilterMenu(e) {
      if (e) e.stopPropagation();
      const dd = ById('marks-col-filter-dropdown');
      if (!dd) return;
      const isOpen = dd.style.display === 'block';
      closeAllMarksDropdowns();
      dd.style.display = isOpen ? 'none' : 'block';
    }

    function toggleMarksExportMenu(e) {
      if (e) e.stopPropagation();
      const dd = ById('marks-export-dropdown');
      if (!dd) return;
      const isOpen = dd.style.display === 'block';
      closeAllMarksDropdowns();
      dd.style.display = isOpen ? 'none' : 'block';
    }

    function closeAllMarksDropdowns() {
      const ddFilter = ById('marks-col-filter-dropdown');
      const ddExport = ById('marks-export-dropdown');
      if (ddFilter) ddFilter.style.display = 'none';
      if (ddExport) ddExport.style.display = 'none';
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#marks-col-filter-wrapper') && !e.target.closest('#marks-export-wrapper')) {
        closeAllMarksDropdowns();
      }
    });

    function toggleMarksColumn(colKey, isChecked) {
      if (!S.marksColumnsVisibility) S.marksColumnsVisibility = {};
      S.marksColumnsVisibility[colKey] = Boolean(isChecked);
      updateColumnsVisibilityUI();
      renderMarksEntryTable(true);
    }

    function updateColumnsVisibilityUI() {
      const vis = S.marksColumnsVisibility || {};
      const chkSr = ById('chk-show-sr');
      const chkEnroll = ById('chk-show-enroll');
      const chkReg = ById('chk-show-reg');
      if (chkSr) chkSr.checked = Boolean(vis.srNo);
      if (chkEnroll) chkEnroll.checked = Boolean(vis.enrollmentNo);
      if (chkReg) chkReg.checked = Boolean(vis.registrationNo);

      const activeCount = (vis.srNo ? 1 : 0) + (vis.enrollmentNo ? 1 : 0) + (vis.registrationNo ? 1 : 0);
      const cntEl = ById('marks-col-filter-count');
      if (cntEl) {
        cntEl.textContent = activeCount;
        cntEl.style.display = activeCount > 0 ? 'inline-block' : 'none';
      }
    }

    function updateModalInstruction(idx, text) {
      if (S.currentTestInstructions && S.currentTestInstructions[idx] !== undefined) {
        S.currentTestInstructions[idx] = text.trim();
      }
    }

    function addModalInstruction() {
      if (!S.currentTestInstructions) S.currentTestInstructions = [];
      S.currentTestInstructions.push("New instruction (click to edit)");
      renderMarksEntryTable(true);
    }

    function removeModalInstruction(idx) {
      if (!S.currentTestInstructions || S.currentTestInstructions.length <= 1) return;
      S.currentTestInstructions.splice(idx, 1);
      renderMarksEntryTable(true);
    }

    function updateModalQuestionText(qIdx, text) {
      if (S.currentTestQuestions && S.currentTestQuestions[qIdx]) {
        S.currentTestQuestions[qIdx].text = text.trim();
      }
    }

    function toggleModalStudentAbsent(sid) {
      if (!S.cachedTestScores[sid]) {
        S.cachedTestScores[sid] = { student_id: sid, is_absent: false };
      }
      const cur = Boolean(S.cachedTestScores[sid].is_absent);
      S.cachedTestScores[sid].is_absent = !cur;
      recalcStudentTotal(sid);
      renderMarksEntryTable(true);
    }

    async function openMarksModal(test){
      S.currentTest = test;
      ById('marks-modal-title').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:0.4rem"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>' + esc(test.name || test.title);
      ById('marks-modal-meta').textContent = 'Max Marks: ' + (test.max_marks || '--') + ' • Date: ' + (test.test_date ? new Date(test.test_date).toLocaleDateString() : '--');
      let scores = {};
      try {
        const sr = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + test.id + '/scores');
        (sr.data || []).forEach(s => { scores[s.student_id] = s; });
      } catch {}
      S.cachedTestScores = scores;

      // Initialize questions breakdown: Check saved student submissions questions OR test definition questions
      let initialQuestions = null;
      const firstSavedQuestions = Object.values(scores).find(s => Array.isArray(s.questions) && s.questions.length > 0)?.questions;
      if (firstSavedQuestions && firstSavedQuestions.length > 0) {
        initialQuestions = firstSavedQuestions;
      } else if (test.questions) {
        try {
          initialQuestions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
        } catch {}
      }

      if (Array.isArray(initialQuestions) && initialQuestions.length > 0) {
        S.currentTestQuestions = initialQuestions.map((q, idx) => ({
          num: idx + 1,
          label: q.label || ('Q' + (idx + 1)),
          max: Number(q.max) || Math.round(((Number(test.max_marks) || 20) / initialQuestions.length) * 10) / 10,
          text: q.text || ''
        }));
      } else {
        const firstQScore = Object.values(scores).find(s => Array.isArray(s.question_scores) && s.question_scores.length > 0)?.question_scores;
        const qCount = firstQScore ? firstQScore.length : (Number(test.num_questions) || (test.max_marks >= 25 ? 5 : (test.max_marks >= 20 ? 4 : (test.max_marks >= 10 ? 2 : 1))));
        const marksPerQ = Math.max(1, Math.round(((Number(test.max_marks) || 20) / qCount) * 10) / 10);
        S.currentTestQuestions = [];
        for (let i = 1; i <= qCount; i++) {
          S.currentTestQuestions.push({ num: i, label: 'Q' + i, max: marksPerQ, text: '' });
        }
      }

      // Initialize instructions breakdown
      let initialInstructions = null;
      if (test.instructions) {
        try {
          initialInstructions = typeof test.instructions === 'string' ? JSON.parse(test.instructions) : test.instructions;
        } catch {}
      }
      if (!Array.isArray(initialInstructions) || initialInstructions.length === 0) {
        const firstSavedInst = Object.values(scores).find(s => Array.isArray(s.instructions) && s.instructions.length > 0)?.instructions;
        if (firstSavedInst && firstSavedInst.length > 0) initialInstructions = firstSavedInst;
      }
      S.currentTestInstructions = (Array.isArray(initialInstructions) && initialInstructions.length > 0) ? [...initialInstructions] : [...DEFAULT_TEST_INSTRUCTIONS];

      if (!S.marksColumnsVisibility) {
        S.marksColumnsVisibility = { srNo: false, enrollmentNo: false, registrationNo: false };
      }
      updateColumnsVisibilityUI();

      const savedMode = localStorage.getItem('vidyaos_marks_view_mode');
      S.marksViewMode = savedMode || ((window.innerWidth >= 900) ? 'excel' : 'table');
      updateViewModeUI();
      renderMarksEntryTable(false);
      openModal('modal-enter-marks');
    }

    function setMarksModalView(mode){
      S.marksViewMode = mode;
      updateViewModeUI();
      renderMarksEntryTable(true);
    }

    function updateViewModeUI(){
      const btnExcel = ById('btn-view-excel');
      const btnTable = ById('btn-view-table');
      if (btnExcel) btnExcel.classList.toggle('active', S.marksViewMode === 'excel');
      if (btnTable) btnTable.classList.toggle('active', S.marksViewMode === 'table');
    }

    function saveCurrentViewAsDefault(){
      localStorage.setItem('vidyaos_marks_view_mode', S.marksViewMode);
      toast((S.marksViewMode === 'excel' ? 'Excel Sheet' : 'Normal Table') + ' saved as default view!');
      const btn = ById('btn-set-default-view');
      if (btn) {
        btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.35rem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--status-present)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Saved as Default</span></span>';
        setTimeout(() => {
          if (btn) btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.35rem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Set as Default</span></span>';
        }, 2200);
      }
    }

    function addModalQuestion(){
      const nextNum = S.currentTestQuestions.length + 1;
      const testMax = Number(S.currentTest?.max_marks) || 20;
      const defaultPerQ = Math.max(1, Math.round((testMax / nextNum) * 10) / 10);
      S.currentTestQuestions.push({ num: nextNum, label: 'Q' + nextNum, max: defaultPerQ, text: '' });
      renderMarksEntryTable(true);
    }

    function removeModalQuestion(){
      if (S.currentTestQuestions.length <= 1) return;
      S.currentTestQuestions.pop();
      renderMarksEntryTable(true);
    }

    function extractUnitTestNumber(title) {
      if (!title) return 'Unit Test';
      const str = String(title).trim();
      // Match Unit Test <num>, Test <num>, or UT <num>
      const m = str.match(/^(?:Unit\s*Test|Test|UT)\s*\d+/i);
      if (m) return m[0].replace(/^UT\s*/i, 'Unit Test ').replace(/^Test\s*/i, 'Unit Test ');
      // Otherwise take first part before dash, em-dash, or colon
      const parts = str.split(/[—–\:\-]/);
      if (parts.length > 1 && parts[0].trim().length > 0) return parts[0].trim();
      return str;
    }

    function getSessionStorageKey(sessionKey) {
      const k = sessionKey ? String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_') : 'current';
      return `vidyaos_inst_header_session_${k}`;
    }

    function getGlobalInstituteHeader(sessionKey) {
      const defaultHeader = 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026 Session';
      const key = getSessionStorageKey(sessionKey);
      return localStorage.getItem(key) || localStorage.getItem('vidyaos_institution_marks_header') || defaultHeader;
    }

    function updateGlobalInstituteHeader(newText, sessionKey) {
      const clean = (newText || '').trim().replace(/\s+/g, ' ');
      if (!clean) return;
      const key = getSessionStorageKey(sessionKey);
      localStorage.setItem(key, clean);
      localStorage.setItem('vidyaos_institution_marks_header', clean);

      // Async backend sync for persistent database storage
      if (typeof apiFetch === 'function') {
        const ayId = S.group?.academic_year_id;
        apiFetch('/api/v1/faculty/session-header', {
          method: 'PUT',
          body: JSON.stringify({ header: clean, academic_year_id: ayId })
        }).catch(() => {});
      }

      document.querySelectorAll('.excel-editable-inst-header').forEach(el => {
        if (el.innerText !== clean) el.innerText = clean;
      });
      toast('Institution header updated for this session across all sheets!');
    }

    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('vidyaos_inst_header_session_') && e.newValue) {
        document.querySelectorAll('.excel-editable-inst-header').forEach(el => {
          el.innerText = e.newValue;
        });
      }
    });

    function renderMarksEntryTable(preserveInputs = false){
      const table = ById('marks-entry-table');
      const thead = ById('marks-entry-thead');
      const tbody = ById('marks-entry-tbody');
      const tfoot = ById('marks-entry-tfoot');
      if (!table || !thead || !tbody) return;

      const totalMax = S.currentTestQuestions.reduce((sum, q) => sum + (Number(q.max) || 0), 0);
      if (ById('marks-footer-max')) ById('marks-footer-max').textContent = totalMax;
      if (ById('btn-remove-q')) ById('btn-remove-q').disabled = S.currentTestQuestions.length <= 1;

      // Save input values before regenerating DOM if preserving
      const savedInputValues = {};
      if (preserveInputs) {
        document.querySelectorAll('.q-score-input').forEach(inp => {
          const sid = inp.getAttribute('data-student');
          const q = inp.getAttribute('data-q');
          if (!savedInputValues[sid]) savedInputValues[sid] = {};
          savedInputValues[sid][q] = inp.value;
        });
      }

      const test = S.currentTest || {};
      const g = S.group || {};
      const sessionKey = g.academic_year_id || g.academic_year_label || '2026';
      const deptCode = esc(g.department_code || '');
      const deptName = esc(g.department_name || (g.department_code ? `Dept of ${g.department_code}` : 'Department'));
      const subName = esc(g.subject_name || g.name || 'Subject');
      const yr = g.semester ? Math.ceil(g.semester / 2) : 1;
      const sem = g.semester || 1;
      const rawTitle = test.name || test.title || 'Unit Test';
      const unitTestOnly = esc(extractUnitTestNumber(rawTitle));
      const testDate = test.test_date ? new Date(test.test_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const instHeader = esc(getGlobalInstituteHeader(sessionKey));

      const showSr = Boolean(S.marksColumnsVisibility?.srNo);
      const showEnroll = Boolean(S.marksColumnsVisibility?.enrollmentNo);
      const showReg = Boolean(S.marksColumnsVisibility?.registrationNo);
      const extraCols = (showSr ? 1 : 0) + (showEnroll ? 1 : 0) + (showReg ? 1 : 0);

      if (S.marksViewMode === 'excel') {
        table.className = 'excel-table sheet-table data-subtable';
        const totalCols = 4 + extraCols + S.currentTestQuestions.length;

        // Multi-row institutional Excel thead matching Attendance Register
        thead.innerHTML = `
          <tr class="excel-hdr-blue row-1">
            <th colspan="${totalCols}" style="padding:0.4rem 0.75rem">
              <div style="display:flex;align-items:center;justify-content:center;gap:0.45rem;position:relative">
                <h3 class="excel-editable-inst-header"
                    contenteditable="true"
                    spellcheck="false"
                    title="Click to edit institute header (changes sync automatically across all tests & registers in this session)"
                    onblur="updateGlobalInstituteHeader(this.innerText, '${sessionKey}')"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                    style="margin:0;font-size:1.02rem;font-weight:700;letter-spacing:0.02em;color:var(--text-main);outline:none;cursor:text;padding:0.15rem 0.5rem;border-radius:var(--radius-sm);border:1px dashed transparent;transition:all 0.15s ease"
                    onfocus="this.style.borderColor='var(--color-primary)';this.style.background='var(--bg-card)';"
                >${instHeader}</h3>
                <span title="Click text to edit header. Automatically updates all tests." style="cursor:pointer;display:inline-flex;align-items:center;opacity:0.75;" onclick="const h=this.previousElementSibling;if(h)h.focus()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </span>
              </div>
            </th>
          </tr>
          <tr class="excel-hdr-blue row-2">
            <th colspan="${totalCols}">
              Internal Evaluation - ${unitTestOnly} | Subject : ${subName}
            </th>
          </tr>
          <tr class="excel-hdr-blue row-3">
            <th colspan="${totalCols}">
              ${deptCode ? deptCode + ' ' : (deptName ? deptName + ' ' : '')}Year ${yr} | Semester ${sem}
            </th>
          </tr>
          <tr class="excel-hdr-tan">
            ${showSr ? '<th rowspan="2" style="width:48px;vertical-align:middle">SR. NO.</th>' : ''}
            <th rowspan="2" style="width:75px;vertical-align:middle">ROLL NO.</th>
            ${showEnroll ? '<th rowspan="2" style="width:115px;vertical-align:middle">ENROLLMENT NO.</th>' : ''}
            ${showReg ? '<th rowspan="2" style="width:115px;vertical-align:middle">REGISTRATION NO.</th>' : ''}
            <th rowspan="2" style="min-width:180px;vertical-align:middle">STUDENT NAME</th>
            <th colspan="${S.currentTestQuestions.length}">${unitTestOnly} (Total Marks : ${totalMax})</th>
            <th style="width:75px">Total</th>
            <th style="min-width:320px">Unit Test Details (Mode : OFFLINE)</th>
          </tr>
          <tr class="excel-hdr-sub">
            ${S.currentTestQuestions.map(q => `
              <th style="min-width:54px;font-weight:800">
                <span>${esc(q.label)}</span><br>
                <span style="font-size:0.72rem;font-weight:600;opacity:0.85">( ${q.max} )</span>
              </th>
            `).join('')}
            <th style="font-weight:800">(${totalMax})</th>
            <th style="font-size:0.74rem;font-weight:700;padding:0.35rem 0.6rem;text-align:center">
              Maximum Marks : ${totalMax} | Date : ${testDate}
            </th>
          </tr>
        `;

        if (!S.members.length) {
          tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center;padding:2rem;color:var(--text-muted)">No students enrolled in this group.</td></tr>`;
          if (tfoot) tfoot.innerHTML = '';
          return;
        }

        tbody.innerHTML = S.members.map((m, rIdx) => {
          const ex = S.cachedTestScores[m.student_id] || {};
          const isAb = Boolean(ex.is_absent);
          let qTds = '';
          S.currentTestQuestions.forEach((q, qIdx) => {
            let val = '';
            if (preserveInputs && savedInputValues[m.student_id]?.[qIdx] !== undefined) {
              val = savedInputValues[m.student_id][qIdx];
            } else if (Array.isArray(ex.question_scores) && ex.question_scores[qIdx] !== undefined && ex.question_scores[qIdx] !== null) {
              val = ex.question_scores[qIdx];
            } else if (!preserveInputs && ex.marks_obtained != null && S.currentTestQuestions.length === 1 && qIdx === 0) {
              val = ex.marks_obtained;
            }
            qTds += `<td><input type="number" class="sheet-cell-input q-score-input" id="q-${m.student_id}-${qIdx}" data-student="${m.student_id}" data-q="${qIdx}" min="0" max="${q.max}" step="0.5" value="${isAb ? 0 : val}" ${isAb ? 'disabled' : ''} placeholder="0" oninput="recalcStudentTotal(${m.student_id})"></td>`;
          });

          const rollStr = String(m.class_roll_no || (rIdx + 1)).replace(/^#/, '');

          // Side details card only on row 0, spanning all student rows
          const sideDetailsTd = (rIdx === 0) ? `
            <td rowspan="${S.members.length}" style="vertical-align:top;background:var(--bg-card);text-align:left;padding:0.75rem;font-size:0.75rem;line-height:1.55;color:var(--text-muted);border:1px solid var(--border-color)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem">
                <strong style="color:var(--text-main);font-size:0.8rem">Instructions:</strong>
                <button type="button" onclick="addModalInstruction()" style="background:none;border:none;color:var(--color-primary);font-size:0.72rem;font-weight:700;cursor:pointer;padding:0" title="Add an instruction line">+ Add Line</button>
              </div>
              <ol class="sheet-instructions-box" style="margin:0 0 0.75rem 1.2rem;padding:0;font-size:0.75rem;color:var(--text-muted)">
                ${S.currentTestInstructions.map((ins, iIdx) => `
                  <li style="margin-bottom:0.25rem">
                    <span contenteditable="true"
                          spellcheck="false"
                          title="Click to edit instruction"
                          onblur="updateModalInstruction(${iIdx}, this.innerText)"
                          style="outline:none;border-bottom:1px dashed transparent;transition:border-color 0.15s ease"
                          onfocus="this.style.borderBottomColor='var(--color-primary)'">${esc(ins)}</span>
                    ${S.currentTestInstructions.length > 1 ? `<span onclick="removeModalInstruction(${iIdx})" style="cursor:pointer;margin-left:4px;color:var(--text-muted);opacity:0.6;font-size:0.75rem" title="Remove this line">&times;</span>` : ''}
                  </li>
                `).join('')}
              </ol>

              <strong style="color:var(--text-main);font-size:0.8rem;display:block;margin-bottom:0.35rem">Questions Breakdown:</strong>
              <div style="font-size:0.75rem;line-height:1.5">
                ${S.currentTestQuestions.map((q, qIdx) => `
                  <div style="margin-bottom:0.35rem;display:flex;align-items:flex-start;gap:0.3rem">
                    <strong style="white-space:nowrap">${esc(q.label)}:</strong>
                    <span contenteditable="true"
                          spellcheck="false"
                          title="Click to edit question statement / topic"
                          onblur="updateModalQuestionText(${qIdx}, this.innerText)"
                          style="flex:1;outline:none;border-bottom:1px dashed var(--border-color);padding:0 2px"
                          onfocus="this.style.borderBottomColor='var(--color-primary)'">${esc(q.text || ('(Click to set topic)'))}</span>
                    <strong style="white-space:nowrap;color:var(--color-primary)">(${q.max} pts)</strong>
                  </div>
                `).join('')}
              </div>

              <div style="margin-top:0.75rem;color:var(--status-absent);font-weight:700;font-size:0.74rem">
                NOTE : All marked as AB were absent.
              </div>

              <div style="margin-top:0.75rem;padding:0.4rem;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.72rem;display:flex;align-items:center;gap:0.35rem">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Totals calculate automatically as marks are entered.</span>
              </div>
            </td>
          ` : '';

          return `
            <tr class="${isAb ? 'is-absent' : ''}" style="${isAb ? 'background:var(--status-absent-bg);' : ''}">
              ${showSr ? `<td class="excel-cell-sr">${rIdx + 1}</td>` : ''}
              <td class="cell-roll">${esc(rollStr)}</td>
              ${showEnroll ? `<td style="font-family:var(--font-family-mono);font-size:0.74rem;text-align:center">${esc(m.official_enrollment_no || '--')}</td>` : ''}
              ${showReg ? `<td style="font-family:var(--font-family-mono);font-size:0.74rem;text-align:center">${esc(m.registration_no || '--')}</td>` : ''}
              <td class="cell-student-name">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem">
                  <span style="font-weight:700;color:var(--text-main)">${esc(m.full_name)}</span>
                  <button type="button" 
                          class="btn-sheet-att-toggle ${isAb ? 'is-absent' : ''}" 
                          onclick="toggleModalStudentAbsent(${m.student_id})" 
                          title="${isAb ? 'Marked Absent. Click to mark Present' : 'Click to mark Absent'}"
                          style="font-size:0.7rem;padding:0.12rem 0.4rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-surface);color:${isAb ? 'var(--status-absent)' : 'var(--text-muted)'};cursor:pointer;font-weight:700">
                    ${isAb ? 'AB' : 'P'}
                  </button>
                </div>
              </td>
              ${qTds}
              <td><span id="tot-${m.student_id}" class="excel-cell-total" style="${isAb ? 'color:var(--status-absent);font-weight:800' : ''}">${isAb ? '0 (AB)' : '--'}</span></td>
              ${sideDetailsTd}
            </tr>
          `;
        }).join('');

        if (tfoot) {
          tfoot.innerHTML = `
            <tr>
              <th colspan="${1 + extraCols + 1 + 1}" style="text-align:right;padding:.5rem .75rem;background:var(--bg-surface);font-weight:800;border:1px solid var(--border-color)">
                Average of the class (Only present students)
              </th>
              <th colspan="${S.currentTestQuestions.length + 1}" style="background:var(--bg-surface);font-weight:800;color:var(--color-primary);text-align:center;border:1px solid var(--border-color)" id="excel-class-avg">
                -- / ${totalMax}
              </th>
              <th style="background:var(--bg-surface);font-size:.76rem;color:var(--text-muted);text-align:center;border:1px solid var(--border-color)" id="excel-class-tally">
                Total: ${S.members.length} Students
              </th>
            </tr>
          `;
        }

      } else {
        // Normal List Table View
        table.className = 'marks-table';
        if (tfoot) tfoot.innerHTML = '';

        thead.innerHTML = `
          <tr id="marks-table-header-row">
            ${showSr ? '<th style="width:48px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">SR</th>' : ''}
            <th style="width:55px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">Roll</th>
            ${showEnroll ? '<th style="width:115px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">Enrollment No.</th>' : ''}
            ${showReg ? '<th style="width:115px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">Reg No.</th>' : ''}
            <th style="min-width:180px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">Student Name</th>
            ${S.currentTestQuestions.map(q => `
              <th style="width:75px;text-align:center;position:sticky;top:0;z-index:10;background:var(--bg-surface)">
                ${esc(q.label)} <span style="font-size:.72rem;color:var(--text-muted);display:block;font-weight:normal">max ${q.max}</span>
              </th>
            `).join('')}
            <th style="width:90px;text-align:center;background:var(--bg-surface);font-weight:800;color:var(--color-primary);position:sticky;top:0;z-index:10">
              TOTAL <span style="font-size:.72rem;display:block;font-weight:normal">/${totalMax}</span>
            </th>
          </tr>
        `;

        if (!S.members.length) {
          tbody.innerHTML = `<tr><td colspan="${S.currentTestQuestions.length + 3 + extraCols}" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No students enrolled.</td></tr>`;
          return;
        }

        tbody.innerHTML = S.members.map((m, rIdx) => {
          const ex = S.cachedTestScores[m.student_id] || {};
          const isAb = Boolean(ex.is_absent);
          let qTds = '';
          S.currentTestQuestions.forEach((q, qIdx) => {
            let val = '';
            if (preserveInputs && savedInputValues[m.student_id]?.[qIdx] !== undefined) {
              val = savedInputValues[m.student_id][qIdx];
            } else if (Array.isArray(ex.question_scores) && ex.question_scores[qIdx] !== undefined && ex.question_scores[qIdx] !== null) {
              val = ex.question_scores[qIdx];
            } else if (!preserveInputs && ex.marks_obtained != null && S.currentTestQuestions.length === 1 && qIdx === 0) {
              val = ex.marks_obtained;
            }
            qTds += `<td style="text-align:center"><input type="number" class="marks-input-cell q-score-input" id="q-${m.student_id}-${qIdx}" data-student="${m.student_id}" data-q="${qIdx}" min="0" max="${q.max}" step="0.5" value="${isAb ? 0 : val}" ${isAb ? 'disabled' : ''} placeholder="0" oninput="recalcStudentTotal(${m.student_id})" style="width:65px"></td>`;
          });

          const rollStr = String(m.class_roll_no || (rIdx + 1)).replace(/^#/, '');

          return `
            <tr class="${isAb ? 'is-absent' : ''}" style="${isAb ? 'background:var(--status-absent-bg);' : ''}">
              ${showSr ? `<td style="font-weight:700;color:var(--text-muted)">${rIdx + 1}</td>` : ''}
              <td style="font-weight:700;color:var(--text-muted)">${esc(rollStr)}</td>
              ${showEnroll ? `<td style="font-family:var(--font-family-mono);font-size:0.75rem">${esc(m.official_enrollment_no || '--')}</td>` : ''}
              ${showReg ? `<td style="font-family:var(--font-family-mono);font-size:0.75rem">${esc(m.registration_no || '--')}</td>` : ''}
              <td style="font-weight:600">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem">
                  <span>${esc(m.full_name)}</span>
                  <button type="button" 
                          onclick="toggleModalStudentAbsent(${m.student_id})" 
                          title="${isAb ? 'Marked Absent. Click to mark Present' : 'Click to mark Absent'}"
                          style="font-size:0.7rem;padding:0.12rem 0.4rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-surface);color:${isAb ? 'var(--status-absent)' : 'var(--text-muted)'};cursor:pointer;font-weight:700">
                    ${isAb ? 'AB' : 'P'}
                  </button>
                </div>
              </td>
              ${qTds}
              <td style="text-align:center;background:var(--bg-surface)"><span id="tot-${m.student_id}" class="auto-total-badge" style="${isAb ? 'color:var(--status-absent);border-color:var(--status-absent)' : ''}">${isAb ? '0 (AB)' : '--'}</span></td>
            </tr>
          `;
        }).join('');
      }

      // Recalculate totals for all students
      S.members.forEach(m => recalcStudentTotal(m.student_id));
    }

    function recalcStudentTotal(sid){
      const isAb = Boolean(S.cachedTestScores[sid]?.is_absent);
      let sum = 0;
      let hasAny = false;
      document.querySelectorAll(`.q-score-input[data-student="${sid}"]`).forEach(inp => {
        const v = parseFloat(inp.value);
        if (!isNaN(v)) {
          sum += v;
          hasAny = true;
        }
      });
      const totEl = ById('tot-' + sid);
      if (totEl) {
        if (isAb) {
          totEl.textContent = '0 (AB)';
          totEl.style.color = 'var(--status-absent)';
          totEl.style.borderColor = 'var(--status-absent)';
          totEl.title = 'Student marked Absent';
        } else {
          const rounded = Math.round(sum * 10) / 10;
          totEl.textContent = hasAny ? rounded : '--';
          const totalMax = S.currentTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);
          if (hasAny && sum > totalMax) {
            totEl.style.color = 'var(--status-absent)';
            totEl.style.borderColor = 'var(--status-absent)';
            totEl.title = 'Total exceeds maximum marks (' + totalMax + ')';
          } else {
            totEl.style.color = 'var(--color-primary)';
            totEl.style.borderColor = 'var(--border-color)';
            totEl.title = '';
          }
        }
      }

      // Update class average and tally
      const avgEl = ById('excel-class-avg');
      const tallyEl = ById('excel-class-tally');
      const totalMax = S.currentTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);
      const allScores = [];
      let presentCount = 0;
      let absentCount = 0;

      S.members.forEach(m => {
        const mAbsent = Boolean(S.cachedTestScores[m.student_id]?.is_absent);
        if (mAbsent) {
          absentCount++;
        } else {
          presentCount++;
          let sTot = 0, sHas = false;
          document.querySelectorAll(`.q-score-input[data-student="${m.student_id}"]`).forEach(inp => {
            const v = parseFloat(inp.value);
            if (!isNaN(v)) { sTot += v; sHas = true; }
          });
          if (sHas) allScores.push(sTot);
        }
      });

      if (avgEl) {
        if (allScores.length > 0) {
          const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
          avgEl.textContent = (Math.round(avg * 10) / 10) + ' / ' + totalMax;
        } else {
          avgEl.textContent = '-- / ' + totalMax;
        }
      }

      if (tallyEl) {
        tallyEl.innerHTML = `P: <strong>${presentCount}</strong> | AB: <strong style="color:var(--status-absent)">${absentCount}</strong> | Tot: <strong>${S.members.length}</strong>`;
      }
    }

    async function exportGroupTestMarks(format) {
      closeAllMarksDropdowns();
      const test = S.currentTest;
      if (!test) return;
      const g = S.group || {};
      const sessionKey = g.academic_year_id || g.academic_year_label || '2026';
      const instHeader = getGlobalInstituteHeader(sessionKey);
      const sessionLabel = g.academic_year_label ? `Internal Evaluation Sheet ${g.academic_year_label}` : 'Internal Evaluation Sheet 2026 Session';
      const totalMax = S.currentTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);

      // In export, SR. NO. is always included in Col 1 as requested!
      const roster = S.members.map((m, rIdx) => {
        const isAb = Boolean(S.cachedTestScores[m.student_id]?.is_absent);
        const qScores = S.currentTestQuestions.map((q, qIdx) => {
          const inp = document.getElementById(`q-${m.student_id}-${qIdx}`);
          const v = inp ? parseFloat(inp.value) : null;
          return isAb ? 0 : (isNaN(v) || v === null ? 0 : v);
        });
        const total = isAb ? 0 : qScores.reduce((a, b) => a + b, 0);
        return {
          student_id: m.student_id,
          class_roll_no: String(m.class_roll_no || (rIdx + 1)).replace(/^#/, ''),
          official_enrollment_no: m.official_enrollment_no || '',
          registration_no: m.registration_no || '',
          full_name: m.full_name,
          is_absent: isAb,
          question_scores: qScores,
          marks_obtained: isAb ? 0 : (Math.round(total * 10) / 10)
        };
      });

      const payload = {
        institution_name: instHeader,
        session_label: sessionLabel,
        department_name: g.department_name || '',
        department_code: g.department_code || '',
        subject_name: g.subject_name || test.name || 'Subject',
        year: g.semester ? Math.ceil(g.semester / 2) : 1,
        semester: g.semester || 1,
        title: test.name || test.title || 'Unit Test',
        max_marks: totalMax,
        exam_date: test.test_date || new Date().toISOString().slice(0, 10),
        duration: '50 minutes',
        mode: 'OFFLINE',
        questions: S.currentTestQuestions,
        instructions: S.currentTestInstructions,
        question_texts: S.currentTestQuestions.map(q => `${q.label}: ${q.text || ''}`),
        roster
      };

      const btn = ById('btn-marks-export');
      const origHtml = btn ? btn.innerHTML : '';
      if (btn) btn.innerHTML = '<span style="opacity:0.8">Exporting...</span>';

      try {
        const res = await fetch(`/api/v1/teaching-groups/${S.groupId}/tests/${test.id}/export/${format}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to export marksheet');
        const blob = await res.blob();
        const safeTitle = (payload.title || 'Unit_Test').replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = format === 'pdf' ? 'pdf' : (format === 'doc' || format === 'docx' || format === 'word' ? 'doc' : 'xlsx');
        downloadBlob(blob, `${safeTitle}_Marksheet.${ext}`);
        toast(`Marksheet exported as ${ext.toUpperCase()} successfully!`);
      } catch (err) {
        toast('Export failed: ' + err.message);
      } finally {
        if (btn) btn.innerHTML = origHtml;
      }
    }

    async function saveMarksEntry(){
      const test = S.currentTest;
      if (!test) return;
      const btn = ById('btn-save-marks-entry');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const entries = S.members.map(m => {
        const isAb = Boolean(S.cachedTestScores[m.student_id]?.is_absent);
        const qInputs = document.querySelectorAll(`.q-score-input[data-student="${m.student_id}"]`);
        const qScores = Array.from(qInputs).map(inp => {
          const v = parseFloat(inp.value);
          return isNaN(v) ? null : v;
        });
        const hasAny = qScores.some(v => v !== null);
        const total = hasAny ? qScores.reduce((sum, v) => sum + (v || 0), 0) : null;
        return {
          student_id: m.student_id,
          marks_obtained: isAb ? 0 : (total !== null ? (Math.round(total * 10) / 10) : null),
          is_absent: isAb,
          question_scores: qScores,
          questions: S.currentTestQuestions
        };
      });

      try {
        await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + test.id + '/scores', {
          method: 'POST',
          body: JSON.stringify({
            scores: entries,
            questions: S.currentTestQuestions,
            instructions: S.currentTestInstructions
          })
        });
        toast('Marks saved successfully!');
        closeModal('modal-enter-marks');
        await loadTests();
      } catch (e) {
        toast(e.message || 'Failed to save marks');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Save Marks</span>';
      }
    }
    function onAssignNumChange(val){
      const titleInp = ById('assign-title');
      if (!titleInp) return;
      if (val && val !== 'CUSTOM') {
        const curVal = titleInp.value.trim();
        if (!curVal || /^Assignment\s*\d+/i.test(curVal)) {
          titleInp.value = `Assignment ${val}`;
        }
      }
    }

    async function submitCreateAssignment(){
      const numVal = ById('assign-num')?.value || '1';
      let title = ById('assign-title').value.trim();
      const desc = ById('assign-desc').value.trim();
      const due = ById('assign-due').value;
      const marks = parseInt(ById('assign-marks').value);
      if(!title||!marks){toast('Title and marks are required');return;}
      if (numVal !== 'CUSTOM' && !/^(?:Assignment|Assign|A)\s*\d+/i.test(title)) {
        title = `Assignment ${numVal}: ${title}`;
      }
      try{
        await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/assignments',{method:'POST',body:JSON.stringify({title,description:desc,due_date:due||null,max_marks:marks})});
        toast('Assignment published!');
        closeModal('modal-create-assignment');
        ById('assign-title').value='';
        ById('assign-desc').value='';
        ById('assign-due').value='';
        await loadAssignments();
      }catch(e){toast(e.message);}
    }
    function onTestTypeOrNumChange(){
      const typeEl = ById('test-unit-type');
      const numEl = ById('test-number-input');
      const hiddenNo = ById('test-unit-no');
      const titleInp = ById('test-title');
      if (!typeEl || !titleInp) return;

      const type = typeEl.value;
      const num = numEl ? numEl.value.trim() : '1';

      if (type === 'MT') {
        if (numEl) numEl.style.display = 'none';
        if (hiddenNo) hiddenNo.value = 'MT';
        titleInp.value = 'Mid-Term Exam';
      } else if (type === 'PB') {
        if (numEl) numEl.style.display = 'none';
        if (hiddenNo) hiddenNo.value = 'PB';
        titleInp.value = 'Pre-Board Exam';
      } else if (type === 'CUSTOM') {
        if (numEl) { numEl.style.display = 'block'; numEl.placeholder = 'Code'; }
        if (hiddenNo) hiddenNo.value = num || 'CUSTOM';
        titleInp.placeholder = 'e.g. Special Evaluation';
      } else {
        if (numEl) { numEl.style.display = 'block'; numEl.placeholder = 'No.'; }
        const typeLabel = type === 'CT' ? 'Class Test' : 'Unit Test';
        const testNum = num || '1';
        if (hiddenNo) hiddenNo.value = `${type}${testNum}`;
        titleInp.value = `${typeLabel} ${testNum}`;
      }
    }
    function onTestUnitChange(val){
      onTestTypeOrNumChange();
    }

    function updateScheduleTestQPreview(){
      const marksInp = ById('test-marks');
      const numQInp = ById('test-num-questions');
      const totalMarks = marksInp ? (parseFloat(marksInp.value) || 20) : 20;
      const numQ = numQInp ? Math.max(1, Math.min(50, parseInt(numQInp.value, 10) || 4)) : 4;
      const perQ = Math.round((totalMarks / numQ) * 10) / 10;

      S.scheduleTestQuestions = Array.from({ length: numQ }, (_, i) => ({
        num: i + 1,
        label: 'Q' + (i + 1),
        max: perQ
      }));

      const dispEl = ById('test-marks-per-q-display');
      if (dispEl) dispEl.textContent = perQ + ' pts / question';

      const sumBadge = ById('test-q-summary-badge');
      if (sumBadge) sumBadge.textContent = numQ + ' questions • ' + totalMarks + ' marks total';

      renderScheduleQChips();
    }

    function renderScheduleQChips(){
      const container = ById('test-schedule-q-chips');
      if (!container) return;
      container.innerHTML = S.scheduleTestQuestions.map((q, idx) => `
        <span class="q-chip" style="display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .45rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm)">
          <span style="font-weight:700;color:var(--text-main);font-size:.8rem">${esc(q.label)}</span>
          <input type="number" min="0.5" max="500" step="0.5" value="${q.max}" style="width:46px;padding:.12rem .2rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--color-primary);font-weight:700;font-size:.8rem;text-align:center" onchange="updateScheduleQChip(${idx}, this.value)" title="Marks for ${esc(q.label)}">
          <span style="font-size:.7rem;color:var(--text-muted);font-weight:600">pts</span>
        </span>
      `).join('');
    }

    function updateScheduleQChip(idx, val){
      const q = S.scheduleTestQuestions[idx];
      if (!q) return;
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        toast('Please enter a valid positive number');
        renderScheduleQChips();
        return;
      }
      q.max = Math.round(num * 10) / 10;
      const newTotal = S.scheduleTestQuestions.reduce((sum, item) => sum + (Number(item.max) || 0), 0);
      const roundedTotal = Math.round(newTotal * 10) / 10;
      if (ById('test-marks')) ById('test-marks').value = roundedTotal;
      const sumBadge = ById('test-q-summary-badge');
      if (sumBadge) sumBadge.textContent = S.scheduleTestQuestions.length + ' questions • ' + roundedTotal + ' marks total';
    }

    async function submitScheduleTest(){
      const type = ById('test-unit-type')?.value || 'UT';
      const num = ById('test-number-input')?.value?.trim() || '1';
      let prefixLabel = type === 'CT' ? `Class Test ${num}` : `Unit Test ${num}`;
      let prefixCode = type === 'CT' ? `CT${num}` : `UT${num}`;
      if (type === 'MT') { prefixLabel = 'Mid-Term Exam'; prefixCode = 'MT'; }
      else if (type === 'PB') { prefixLabel = 'Pre-Board Exam'; prefixCode = 'PB'; }
      else if (type === 'CUSTOM') { prefixLabel = num || 'Custom'; prefixCode = num || 'CUSTOM'; }

      let name = ById('test-title').value.trim();
      const date = ById('test-date').value;
      const marks = parseFloat(ById('test-marks').value);
      const numQ = parseInt(ById('test-num-questions')?.value, 10) || (S.scheduleTestQuestions?.length || 4);
      const desc = ById('test-desc').value.trim();
      if (!name || !date || !marks) {
        toast('Title, date and marks are required');
        return;
      }
      if (type !== 'CUSTOM' && !name.toLowerCase().includes(prefixLabel.toLowerCase()) && !name.toLowerCase().includes(prefixCode.toLowerCase())) {
        name = `${prefixLabel}: ${name}`;
      }

      const questions = (S.scheduleTestQuestions && S.scheduleTestQuestions.length > 0)
        ? S.scheduleTestQuestions
        : Array.from({ length: numQ }, (_, i) => ({
            num: i + 1,
            label: 'Q' + (i + 1),
            max: Math.round((marks / numQ) * 10) / 10
          }));

      try {
        await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests', {
          method: 'POST',
          body: JSON.stringify({
            name,
            test_date: date,
            max_marks: marks,
            num_questions: numQ,
            questions,
            description: desc || null
          })
        });
        toast('Test scheduled with ' + questions.length + ' questions!');
        closeModal('modal-schedule-test');
        ById('test-title').value = '';
        ById('test-date').value = '';
        ById('test-marks').value = '20';
        if (ById('test-num-questions')) ById('test-num-questions').value = '4';
        await loadTests();
        switchTab('marks');
      } catch (e) {
        toast(e.message || 'Failed to schedule test');
      }
    }
    let _workToDelete = null;

    function delWork(type, id){
      const isTest = type === 'test';
      const label = type === 'practical' ? 'Practical Work' : type === 'finaldocs' ? 'Final Documents Request' : isTest ? 'Class Test' : 'Assignment';
      const item = isTest ? S.tests.find(t => t.id === id) : S.assignments.find(a => a.id === id);
      const title = item ? (item.title || item.name) : label;

      _workToDelete = { type, id, isTest, label, title };
      ById('del-work-title').textContent = title;
      ById('del-work-type-label').textContent = label;
      openModal('modal-delete-work-direct');
    }

    async function confirmDirectDeleteWork(){
      if (!_workToDelete) return;
      const { isTest, id, label } = _workToDelete;
      const btn = ById('btn-confirm-delete-work');
      btn.disabled = true;
      btn.textContent = 'Deleting...';
      try {
        const deleteFiles = Boolean(document.getElementById('del-work-delete-files')?.checked);
        const ep = isTest 
          ? '/api/v1/teaching-groups/' + S.groupId + '/tests/' + id + '?delete_files=' + deleteFiles
          : '/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id + '?delete_files=' + deleteFiles;
        await apiFetch(ep, { method: 'DELETE' });
        toast(label + ' deleted successfully');
        closeModal('modal-delete-work-direct');
        if (isTest) await loadTests(); else await loadAssignments();
      } catch (err) {
        toast(err.message || 'Failed to delete');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
        _workToDelete = null;
      }
    }

    function proceedDeleteStep2(){
      ById('del-step-1').style.display = 'none';
      ById('del-step-2').style.display = '';
    }

    function backDeleteStep1(){
      ById('del-step-1').style.display = '';
      ById('del-step-2').style.display = 'none';
    }

    async function executeConfirmedDelete(){
      if (!_pendingDelete || typeof _pendingDelete.execute !== 'function') return;
      const btn = ById('btn-final-delete-confirm');
      btn.disabled = true;
      btn.textContent = 'Processing...';
      try {
        await _pendingDelete.execute();
        closeModal('modal-confirm-delete');
      } catch (err) {
        toast(err.message || 'Action failed');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm & Remove';
        _pendingDelete = null;
      }
    }
    function populateSidebarStats(){const g=S.group;
      ById('stat-assignments').textContent=g.assignment_count??'--';ById('stat-register-id').textContent=g.register_id?'#'+g.register_id:'--';
      if(g.register_id)loadAttStat(g.register_id);
    }
    async function loadAttStat(rid){try{const r=await apiFetch('/api/v1/attendance/registers/'+rid+'/summary');const pct=r.data?.avg_attendance_pct??null;ById('stat-attendance').textContent=pct!=null?parseFloat(pct).toFixed(1)+'%':'--';}catch{}}
    function openLinkedRegister(){const rid=S.group?.register_id;if(rid)location.href='/faculty/registers.html?register='+rid+'&group='+S.groupId;else toast('No linked register found');}
    function openSheetStudio(sheetName){
      const gid=S.groupId||new URLSearchParams(location.search).get('id')||1;
      let url='/faculty/sheets.html?id='+encodeURIComponent(gid);
      if(sheetName)url+='&sheet='+encodeURIComponent(sheetName);
      location.href=url;
    }
    function openCreateAssignmentModal(){openModal('modal-create-assignment');}

    function openCreatePracticalModal(){
      ById('practical-title').value = '';
      ById('practical-desc').value = '';
      ById('practical-due').value = '';
      ById('practical-marks').value = '25';
      openModal('modal-create-practical');
    }

    async function submitCreatePractical(){
      const title = ById('practical-title').value.trim();
      if (!title) { toast('Please enter practical title'); return; }
      const desc = ById('practical-desc').value.trim();
      const due = ById('practical-due').value;
      const marks = parseFloat(ById('practical-marks').value) || 25;
      const postStream = ById('practical-post-stream').checked;

      const btn = ById('btn-submit-practical');
      btn.disabled = true;
      btn.textContent = 'Publishing...';
      try {
        await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments', {
          method: 'POST',
          body: JSON.stringify({
            title,
            description: desc,
            due_date: due || null,
            max_marks: marks,
            type: 'PRACTICAL',
            post_to_stream: postStream
          })
        });
        toast('Practical work published & announcement sent!');
        closeModal('modal-create-practical');
        await loadAssignments();
        if (postStream) await loadStream();
      } catch (e) {
        toast(e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M10 2v7.31L4.65 18.23A2 2 0 0 0 6.38 21h11.24a2 2 0 0 0 1.73-2.77L14 9.31V2"/></svg><span>Publish Practical Work</span>';
      }
    }

    S.finalDocReqs = [
      'Total Assignments PDF Records (Consolidated)',
      'Class Test Records / Question Paper Solutions',
      'Practical / Lab Journal Records & Implementation',
      'Viva Voce / Micro-Project Documentation'
    ];
    S.editingFinalDocIdx = null;

    function renderFinalDocRequirements(){
      const container = ById('finaldocs-req-items');
      if (!container) return;
      if (!S.finalDocReqs.length) {
        container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);padding:0.35rem 0">No document requirements added yet. Type a requirement and click Add.</div>';
        return;
      }
      container.innerHTML = S.finalDocReqs.map((req, idx) => {
        if (S.editingFinalDocIdx === idx) {
          return `
            <div class="req-item-pill" style="padding:0.35rem 0.5rem;background:var(--bg-card);border:1px solid var(--color-primary);display:flex;gap:0.4rem;align-items:center;">
              <input type="text" id="input-create-req-${idx}" class="form-input" value="${esc(req)}" style="font-size:0.82rem;padding:0.3rem 0.5rem;flex:1;background:var(--bg-surface);color:var(--text-main);" onkeydown="if(event.key==='Enter'){event.preventDefault();saveCreateFinalDocRequirement(${idx});}if(event.key==='Escape'){event.preventDefault();cancelEditCreateFinalDocRequirement();}">
              <button type="button" class="btn btn-primary btn-sm" onclick="saveCreateFinalDocRequirement(${idx})" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Save</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="cancelEditCreateFinalDocRequirement()" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Cancel</button>
            </div>
          `;
        }
        return `
          <div class="req-item-pill">
            <span style="font-weight:600;font-size:0.82rem;word-break:break-word;flex:1;cursor:pointer;" onclick="startEditCreateFinalDocRequirement(${idx})" title="Click to edit">• ${esc(req)}</span>
            <div style="display:flex;align-items:center;gap:0.35rem;">
              <button type="button" class="req-item-edit-btn" onclick="startEditCreateFinalDocRequirement(${idx})" title="Edit requirement" style="background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:2px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" class="req-item-del-btn" onclick="removeFinalDocRequirement(${idx})" title="Remove requirement">
                ${GD_ICONS.close}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function startEditCreateFinalDocRequirement(idx){
      S.editingFinalDocIdx = idx;
      renderFinalDocRequirements();
      const inp = ById(`input-create-req-${idx}`);
      if (inp) { inp.focus(); inp.select(); }
    }

    function saveCreateFinalDocRequirement(idx){
      const inp = ById(`input-create-req-${idx}`);
      const val = (inp?.value || '').trim();
      if (!val) { toast('Requirement title cannot be empty'); return; }
      S.finalDocReqs[idx] = val;
      S.editingFinalDocIdx = null;
      renderFinalDocRequirements();
    }

    function cancelEditCreateFinalDocRequirement(){
      S.editingFinalDocIdx = null;
      renderFinalDocRequirements();
    }

    function addFinalDocRequirement(){
      const inp = ById('finaldocs-new-req-input');
      const val = (inp?.value || '').trim();
      if (!val) { toast('Please type requirement title'); return; }
      S.finalDocReqs.push(val);
      inp.value = '';
      renderFinalDocRequirements();
    }

    function removeFinalDocRequirement(idx){
      S.finalDocReqs.splice(idx, 1);
      if (S.editingFinalDocIdx === idx) S.editingFinalDocIdx = null;
      renderFinalDocRequirements();
    }

    function openFinalDocsModal(){
      ById('finaldocs-title').value = 'Semester-End Final Academic Documents Submission';
      ById('finaldocs-desc').value = 'Please compile and upload your total semester coursework records.';
      ById('finaldocs-due').value = '';
      S.editingFinalDocIdx = null;
      if (!Array.isArray(S.finalDocReqs) || S.finalDocReqs.length === 0) {
        S.finalDocReqs = [
          'Total Assignments PDF Records (Consolidated)',
          'Class Test Records / Question Paper Solutions',
          'Practical / Lab Journal Records & Implementation',
          'Viva Voce / Micro-Project Documentation'
        ];
      }
      renderFinalDocRequirements();
      openModal('modal-create-finaldocs');
    }

    async function submitCreateFinalDocs(){
      const title = ById('finaldocs-title').value.trim();
      if (!title) { toast('Please enter request title'); return; }
      if (!S.finalDocReqs || S.finalDocReqs.length === 0) {
        toast('Please add at least one required document');
        return;
      }
      const due = ById('finaldocs-due').value;
      const customDesc = ById('finaldocs-desc').value.trim();
      const postStream = ById('finaldocs-post-stream').checked;

      const btn = ById('btn-submit-finaldocs');
      btn.disabled = true;
      btn.textContent = 'Publishing...';
      try {
        await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments', {
          method: 'POST',
          body: JSON.stringify({
            title,
            description: customDesc || null,
            due_date: due || null,
            type: 'FINAL_DOCS',
            questions: S.finalDocReqs,
            post_to_stream: postStream
          })
        });
        toast('Final documents request published & students notified!');
        closeModal('modal-create-finaldocs');
        await loadAssignments();
        if (postStream) await loadStream();
      } catch (e) {
        toast(e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Request Final Documents';
      }
    }

    /* ════════════════════════════════════════════════════════════════
       EDIT CLASSWORK MODAL LOGIC (ALL WORK TYPES)
     ════════════════════════════════════════════════════════════════ */
    S.editWorkItem = null;
    S.editFinalDocReqs = [];
    S.editingEditFinalDocIdx = null;

    function renderEditFinalDocRequirements(){
      const container = ById('edit-finaldocs-req-items');
      if (!container) return;
      if (!S.editFinalDocReqs.length) {
        container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);padding:0.35rem 0">No document requirements. Type and click Add.</div>';
        return;
      }
      container.innerHTML = S.editFinalDocReqs.map((req, idx) => {
        if (S.editingEditFinalDocIdx === idx) {
          return `
            <div class="req-item-pill" style="padding:0.35rem 0.5rem;background:var(--bg-card);border:1px solid var(--color-primary);display:flex;gap:0.4rem;align-items:center;">
              <input type="text" id="input-edit-req-${idx}" class="form-input" value="${esc(req)}" style="font-size:0.82rem;padding:0.3rem 0.5rem;flex:1;background:var(--bg-surface);color:var(--text-main);" onkeydown="if(event.key==='Enter'){event.preventDefault();saveEditFinalDocRequirement(${idx});}if(event.key==='Escape'){event.preventDefault();cancelEditFinalDocRequirement();}">
              <button type="button" class="btn btn-primary btn-sm" onclick="saveEditFinalDocRequirement(${idx})" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Save</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="cancelEditFinalDocRequirement()" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Cancel</button>
            </div>
          `;
        }
        return `
          <div class="req-item-pill">
            <span style="font-weight:600;font-size:0.82rem;word-break:break-word;flex:1;cursor:pointer;" onclick="startEditFinalDocRequirement(${idx})" title="Click to edit">• ${esc(req)}</span>
            <div style="display:flex;align-items:center;gap:0.35rem;">
              <button type="button" class="req-item-edit-btn" onclick="startEditFinalDocRequirement(${idx})" title="Edit requirement" style="background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:2px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" class="req-item-del-btn" onclick="removeEditFinalDocRequirement(${idx})" title="Remove requirement">
                ${GD_ICONS.close}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function startEditFinalDocRequirement(idx){
      S.editingEditFinalDocIdx = idx;
      renderEditFinalDocRequirements();
      const inp = ById(`input-edit-req-${idx}`);
      if (inp) { inp.focus(); inp.select(); }
    }

    function saveEditFinalDocRequirement(idx){
      const inp = ById(`input-edit-req-${idx}`);
      const val = (inp?.value || '').trim();
      if (!val) { toast('Requirement title cannot be empty'); return; }
      S.editFinalDocReqs[idx] = val;
      S.editingEditFinalDocIdx = null;
      renderEditFinalDocRequirements();
    }

    function cancelEditFinalDocRequirement(){
      S.editingEditFinalDocIdx = null;
      renderEditFinalDocRequirements();
    }

    function addEditFinalDocRequirement(){
      const inp = ById('edit-finaldocs-new-req-input');
      const val = (inp?.value || '').trim();
      if (!val) { toast('Please type requirement title'); return; }
      S.editFinalDocReqs.push(val);
      inp.value = '';
      renderEditFinalDocRequirements();
    }

    function removeEditFinalDocRequirement(idx){
      S.editFinalDocReqs.splice(idx, 1);
      if (S.editingEditFinalDocIdx === idx) S.editingEditFinalDocIdx = null;
      renderEditFinalDocRequirements();
    }

    function openEditWorkModal(type, id){
      const isTest = type === 'test';
      const item = isTest ? S.tests.find(t => t.id === id) : S.assignments.find(a => a.id === id);
      if (!item) { toast('Item not found'); return; }
      S.editWorkItem = item;

      ById('edit-work-id').value = id;
      ById('edit-work-type').value = type;
      ById('edit-work-title').value = item.title || item.name || '';
      ById('edit-work-desc').value = item.description || '';

      const due = item.due_date || item.test_date;
      ById('edit-work-due').value = due ? due.slice(0, 10) : '';

      ById('edit-work-date-label').textContent = isTest ? 'Test Date' : 'Due Date (Optional)';
      ById('edit-work-modal-heading').textContent = isTest ? 'Edit Class Test' : type === 'finaldocs' ? 'Edit Final Documents Request' : type === 'practical' ? 'Edit Practical Work' : 'Edit Assignment';

      if (type === 'finaldocs') {
        ById('edit-work-marks-wrap').style.display = 'none';
        ById('edit-work-req-container').style.display = 'block';
        S.editingEditFinalDocIdx = null;

        let reqs = [];
        if (Array.isArray(item.questions)) reqs = [...item.questions];
        else if (typeof item.questions === 'string') {
          try { reqs = JSON.parse(item.questions); } catch (_) { reqs = []; }
        }
        if (!reqs.length) {
          reqs = ['Consolidated Assignments PDF Records', 'Class Test Records & Solutions', 'Practical / Lab Journal Records'];
        }
        S.editFinalDocReqs = reqs;
        renderEditFinalDocRequirements();
      } else {
        ById('edit-work-marks-wrap').style.display = 'block';
        ById('edit-work-req-container').style.display = 'none';
        ById('edit-work-marks').value = item.max_marks !== null && item.max_marks !== undefined ? item.max_marks : 100;
      }

      openModal('modal-edit-classwork');
    }

    async function submitEditWork(){
      const id = Number(ById('edit-work-id').value);
      const type = ById('edit-work-type').value;
      const isTest = type === 'test';
      const title = ById('edit-work-title').value.trim();
      if (!title) { toast('Title is required'); return; }

      const desc = ById('edit-work-desc').value.trim();
      const due = ById('edit-work-due').value;
      const marks = ById('edit-work-marks').value;

      const btn = ById('btn-save-edit-work');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        if (isTest) {
          await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + id, {
            method: 'PUT',
            body: JSON.stringify({
              name: title,
              description: desc || null,
              test_date: due || null,
              max_marks: marks ? parseFloat(marks) : null
            })
          });
          toast('Class test updated successfully');
          closeModal('modal-edit-classwork');
          await loadTests();
        } else {
          const bodyPayload = {
            title,
            description: desc || null,
            due_date: due || null,
            max_marks: type === 'finaldocs' ? null : (marks ? parseFloat(marks) : null)
          };
          if (type === 'finaldocs') {
            bodyPayload.questions = S.editFinalDocReqs;
          }
          await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id, {
            method: 'PUT',
            body: JSON.stringify(bodyPayload)
          });
          toast('Classwork updated successfully');
          closeModal('modal-edit-classwork');
          await loadAssignments();
        }
      } catch (err) {
        toast(err.message || 'Failed to update item');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    }

    /* ════════════════════════════════════════════════════════════════
       ACCORDION SUBMISSIONS ROSTER & FILTER LOGIC
    ════════════════════════════════════════════════════════════════ */
    S.expandedRosters = {};

    async function toggleWorkSubmissionsExpand(id, type){
      const pane = ById('work-expand-pane-' + id);
      if (!pane) return;

      if (pane.style.display !== 'none' && pane.innerHTML.trim().length > 0) {
        pane.style.display = 'none';
        return;
      }

      pane.style.display = 'block';
      pane.innerHTML = `
        <div style="padding:1.25rem;text-align:center;color:var(--text-muted);font-size:0.85rem">
          Loading student submissions roster...
        </div>
      `;

      try {
        const isTest = type === 'test';
        let data = null;

        if (isTest) {
          const sr = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + id + '/scores');
          const scoreMap = {};
          (sr.data || []).forEach(s => { scoreMap[s.student_id] = s; });

          const testObj = S.tests.find(t => t.id === id);
          const roster = (S.members || []).map((m, idx) => {
            const sc = scoreMap[m.student_id];
            const hasGraded = sc && sc.marks_obtained !== null && sc.marks_obtained !== undefined;
            return {
              student_id: m.student_id,
              class_roll_no: m.class_roll_no || (idx + 1),
              full_name: m.full_name,
              official_enrollment_no: m.official_enrollment_no,
              is_submitted: Boolean(hasGraded),
              status: hasGraded ? 'GRADED' : 'PENDING',
              submitted_at: sc?.updated_at || null,
              marks_obtained: sc?.marks_obtained,
              documents: []
            };
          });

          const subCount = roster.filter(r => r.is_submitted).length;
          data = {
            assignment_id: id,
            title: testObj?.name || 'Class Test',
            type: 'EXAM',
            total_students: roster.length,
            submitted_count: subCount,
            not_submitted_count: roster.length - subCount,
            roster
          };
        } else {
          const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id + '/submissions');
          data = res.data;
        }

        S.expandedRosters[id] = { data, filter: 'all' };
        renderWorkSubmissionsPanel(id);

        const statSub = ById('stat-sub-' + id);
        const statPend = ById('stat-pend-' + id);
        if (statSub) statSub.textContent = data.submitted_count;
        if (statPend) statPend.textContent = data.not_submitted_count;
      } catch (err) {
        pane.innerHTML = `
          <div style="padding:1rem;color:var(--status-absent);font-size:0.83rem;text-align:center">
            Failed to load submissions: ${esc(err.message)}
          </div>
        `;
      }
    }

    function renderWorkSubmissionsPanel(id){
      const state = S.expandedRosters[id];
      if (!state) return;
      const { data, filter } = state;
      const pane = ById('work-expand-pane-' + id);
      if (!pane) return;

      const roster = data.roster || [];
      const filtered = roster.filter(s => {
        if (filter === 'submitted') return s.is_submitted;
        if (filter === 'notsubmitted') return !s.is_submitted;
        return true;
      });

      const tot = data.total_students || roster.length;
      const sub = data.submitted_count || 0;
      const unSub = data.not_submitted_count || 0;

      pane.innerHTML = `
        <div class="expand-filter-bar">
          <div style="font-size:0.85rem;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:0.4rem">
            ${GD_ICONS.users}
            <span>Student Submissions Roster</span>
          </div>
          <div class="expand-filter-btns">
            <button type="button" class="expand-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="filterSubmissionsRoster(${id}, 'all')">
              <span>All Students</span>
              <span class="badge-count">${tot}</span>
            </button>
            <button type="button" class="expand-filter-btn ${filter === 'submitted' ? 'active' : ''}" onclick="filterSubmissionsRoster(${id}, 'submitted')">
              <span>Submitted</span>
              <span class="badge-count">${sub}</span>
            </button>
            <button type="button" class="expand-filter-btn ${filter === 'notsubmitted' ? 'active' : ''}" onclick="filterSubmissionsRoster(${id}, 'notsubmitted')">
              <span>Not Submitted</span>
              <span class="badge-count">${unSub}</span>
            </button>
          </div>
        </div>

        <div style="overflow-x:auto">
          <table class="expand-roster-table">
            <thead>
              <tr>
                <th style="width:40px;text-align:center">#</th>
                <th style="width:65px">Roll</th>
                <th style="min-width:160px">Student Name</th>
                <th style="width:120px">Status</th>
                <th style="width:140px">Submitted On</th>
                <th>Submitted Document(s)</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No students match this filter.</td></tr>
              ` : filtered.map((st, idx) => {
                const roll = String(st.class_roll_no || (idx + 1)).replace(/^#/, '');
                const subDate = st.submitted_at ? new Date(st.submitted_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
                const statusBadge = st.is_submitted
                  ? `<span class="badge" style="background:var(--status-present-bg);color:var(--status-present);border:1px solid var(--status-present);font-weight:700;padding:0.2rem 0.5rem;border-radius:var(--radius-sm);font-size:0.75rem">Submitted</span>`
                  : `<span class="badge" style="background:var(--status-absent-bg);color:var(--status-absent);border:1px solid var(--status-absent);font-weight:700;padding:0.2rem 0.5rem;border-radius:var(--radius-sm);font-size:0.75rem">Not Submitted</span>`;

                let docsHtml = '';
                if (st.documents && st.documents.length > 0) {
                  docsHtml = st.documents.map(d => `
                    <a href="${esc(d.file_path)}" target="_blank" class="doc-link-pill" title="Click to view/download ${esc(d.requirement_name || d.original_filename)}">
                      ${GD_ICONS.file}
                      <span>${esc(d.requirement_name || d.original_filename || 'Document')}</span>
                    </a>
                  `).join(' ');
                } else if (st.is_submitted && st.marks_obtained !== null && st.marks_obtained !== undefined) {
                  docsHtml = `<span style="font-weight:700;color:var(--color-primary)">Scored ${st.marks_obtained} pts</span>`;
                } else {
                  docsHtml = `<span style="color:var(--text-muted);font-size:0.78rem">No document uploaded</span>`;
                }

                return `
                  <tr>
                    <td style="text-align:center;font-weight:600;color:var(--text-muted)">${idx + 1}</td>
                    <td style="font-family:var(--font-family-mono);font-weight:700">${esc(roll)}</td>
                    <td style="font-weight:700;color:var(--text-main)">${esc(st.full_name)}</td>
                    <td>${statusBadge}</td>
                    <td style="font-size:0.76rem;color:var(--text-muted)">${subDate}</td>
                    <td>${docsHtml}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function filterSubmissionsRoster(id, filterMode){
      if (!S.expandedRosters[id]) return;
      S.expandedRosters[id].filter = filterMode;
      renderWorkSubmissionsPanel(id);
    }
    function openScheduleTestModal(){
      updateScheduleTestQPreview();
      openModal('modal-schedule-test');
    }
    function openArchiveModal(){openModal('modal-archive');}
    function openEditGroupModal(){
      if(!S.group) return;
      ById('edit-group-id').value = S.group.id;
      ById('edit-group-name').value = S.group.name || '';
      ById('edit-group-subject').value = S.group.subject_name || '';
      ById('edit-group-component').value = S.group.component || 'THEORY';
      openModal('modal-edit-group');
    }
    async function submitEditGroup(e){
      e.preventDefault();
      const btn = ById('btn-save-edit-group');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const name = ById('edit-group-name').value.trim();
      const subject_name = ById('edit-group-subject').value.trim();
      const component = ById('edit-group-component').value;
      try {
        const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId, {
          method: 'PUT',
          body: JSON.stringify({ name, subject_name, component })
        });
        if (res.success) {
          toast('Class settings updated!');
          closeModal('modal-edit-group');
          S.group.name = name;
          S.group.subject_name = subject_name;
          S.group.component = component;
          renderBanner(S.group);
        } else {
          toast(res.error?.message || 'Failed to update class settings');
        }
      } catch(err) {
        toast(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    }
    let unenrolledList = [];
    async function openAddUnenrolledModal(){
      const tbody = ById('unenrolled-checklist-tbody');
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Finding unenrolled students...</td></tr>';
      ById('search-unenrolled-input').value = '';
      openModal('modal-add-unenrolled');
      try {
        const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/unenrolled-students');
        if (res.success) {
          unenrolledList = res.data || [];
          renderUnenrolledStudents();
        } else {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--status-absent)">Failed to load unenrolled students</td></tr>';
        }
      } catch(err) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--status-absent)">' + esc(err.message) + '</td></tr>';
      }
    }
    function renderUnenrolledStudents(){
      const tbody = ById('unenrolled-checklist-tbody');
      const q = (ById('search-unenrolled-input').value || '').trim().toLowerCase();
      const filtered = unenrolledList.filter(s => {
        if (!q) return true;
        const name = (s.full_name || '').toLowerCase();
        const eno = (s.official_enrollment_no || '').toLowerCase();
        const roll = String(s.class_roll_no || '');
        return name.includes(q) || eno.includes(q) || roll.includes(q);
      });
      ById('unenrolled-count').textContent = filtered.length;
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No unenrolled students found for this cohort.</td></tr>';
        updateUnenrolledTally();
        return;
      }
      tbody.innerHTML = filtered.map(s => `
        <tr>
          <td style="text-align:center">
            <input type="checkbox" class="unenrolled-student-chk" value="${s.student_id}" onchange="updateUnenrolledTally()">
          </td>
          <td style="font-weight:700">${s.class_roll_no || '—'}</td>
          <td style="font-weight:600">${esc(s.full_name)}</td>
          <td><code>${esc(s.official_enrollment_no)}</code></td>
          <td style="text-align:right">
            <button type="button" class="btn btn-secondary" style="padding:.25rem .55rem;font-size:.75rem" onclick="enrollSingleStudent(${s.student_id})">+ Enroll</button>
          </td>
        </tr>
      `).join('');
      ById('unenrolled-select-all').checked = false;
      updateUnenrolledTally();
    }
    function filterUnenrolledStudents(){ renderUnenrolledStudents(); }
    function toggleUnenrolledSelectAll(checked){
      document.querySelectorAll('.unenrolled-student-chk').forEach(c => c.checked = checked);
      updateUnenrolledTally();
    }
    function updateUnenrolledTally(){
      const chks = document.querySelectorAll('.unenrolled-student-chk');
      const selected = Array.from(chks).filter(c => c.checked).length;
      ById('unenrolled-selected-tally').textContent = selected;
      const batchBtn = ById('btn-batch-enroll-unenrolled');
      if (batchBtn) batchBtn.disabled = selected === 0;
    }
    async function enrollSingleStudent(studentId){
      await executeEnrollBatch([studentId]);
    }
    async function submitBatchEnrollUnenrolled(){
      const chks = document.querySelectorAll('.unenrolled-student-chk:checked');
      const ids = Array.from(chks).map(c => Number(c.value));
      if (!ids.length) return;
      await executeEnrollBatch(ids);
    }
    async function executeEnrollBatch(studentIds){
      try {
        const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/members', {
          method: 'POST',
          body: JSON.stringify({ student_ids: studentIds })
        });
        if (res.success) {
          toast('Enrolled ' + studentIds.length + ' student(s) successfully!');
          closeModal('modal-add-unenrolled');
          await loadMembers();
        } else {
          toast(res.error?.message || 'Failed to enroll students');
        }
      } catch(err) {
        toast(err.message);
      }
    }
    function openPromoteModal(){location.href='/faculty/groups.html?action=promote&id='+S.groupId;}
    function copyInviteCode(){const code=S.group?.invite_code;if(!code)return;navigator.clipboard.writeText(location.origin+'/student/groups.html?join='+code).then(()=>toast('Invite link copied!'));}
    async function executeArchive(){try{await apiFetch('/api/v1/teaching-groups/'+S.groupId+'/archive',{method:'POST'});toast('Group archived!');closeModal('modal-archive');setTimeout(()=>location.href='/faculty/groups.html',1500);}catch(e){toast(e.message);}}
    function openModal(id){
      const el=ById(id);
      if(!el)return;
      el.classList.add('open');
      el.style.display='flex';
      document.body.classList.add('modal-open');
    }
    function closeModal(id){
      const el=ById(id);
      if(!el)return;
      el.classList.remove('open');
      el.style.display='none';
      if(!document.querySelector('.modal-backdrop.open')) {
        document.body.classList.remove('modal-open');
      }
    }
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        ['modal-create-assignment','modal-create-practical','modal-create-finaldocs','modal-edit-classwork','modal-delete-work-direct','modal-schedule-test','modal-enter-marks','modal-archive','modal-edit-group','modal-add-unenrolled','modal-confirm-delete','modal-work-filter'].forEach(closeModal);
        if(typeof closeAllWorkCardMenus==='function')closeAllWorkCardMenus();
      }
    });
    document.querySelectorAll('.modal-backdrop').forEach(m=>{
      m.addEventListener('click',e=>{
        if(e.target===m){
          m.classList.remove('open');
          m.style.display='none';
          if(!document.querySelector('.modal-backdrop.open')) {
            document.body.classList.remove('modal-open');
          }
        }
      });
    });
    function renderUserAvatar(){
      const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      const init = initials(u?.full_name || u?.username || 'T');
      if (ById('compose-av-initials')) ById('compose-av-initials').textContent = init;
      const av = ById('gc-user-avatar');
      if (av) av.textContent = init;
      // Also update mobile header avatar
      const avMobile = ById('gc-user-avatar-mobile');
      if (avMobile) avMobile.textContent = init;
      const pName = ById('popover-user-name');
      if (pName && u) pName.textContent = u.full_name || u.username || 'Teacher';
      const pRole = ById('popover-user-role');
      if (pRole && u) pRole.textContent = u.role || 'Faculty';
      const pAv = ById('popover-user-avatar');
      if (pAv) pAv.textContent = init;
    }
    function ById(id){return document.getElementById(id);}
    function initials(name){if(!name)return '?';const p=name.trim().split(/[\s]+/);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}
    function relTime(ds){if(!ds)return '';const d=new Date(ds),now=new Date(),ms=now-d,min=Math.floor(ms/60000);if(min<1)return 'Just now';if(min<60)return min+'m ago';const hr=Math.floor(min/60);if(hr<24)return hr+'h ago';const day=Math.floor(hr/24);if(day<7)return day+'d ago';return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
    function esc(s){if(s==null)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
    function focusMobileAnnouncement() {
      switchTab('stream');
      const ta = ById('stream-compose-text');
      if (ta) {
        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ta.focus();
        if (ById('compose-toolbar')) ById('compose-toolbar').style.display = 'flex';
      }
    }

    /* ════════════════════════════════════════════════════════════════
       CLASSWORK FILTER MODAL & MINIMAL ANCHORED CARD MENU
    ════════════════════════════════════════════════════════════════ */
    function updateCwFilterCount(f) {
      f = f || S.cwFilter || 'all';
      const mappedAssigns = (S.assignments || []).map(a => {
        const rawType = (a.type || 'ASSIGNMENT').toLowerCase();
        const normType = rawType === 'final_docs' ? 'finaldocs' : rawType;
        return { ...a, _type: normType };
      });
      const mappedTests = (S.tests || []).map(t => ({ ...t, _type: 'test' }));
      let filteredCount = 0;
      if (f === 'all') filteredCount = mappedAssigns.length + mappedTests.length;
      else if (f === 'assignments') filteredCount = mappedAssigns.filter(a => a._type === 'assignment').length;
      else if (f === 'practicals') filteredCount = mappedAssigns.filter(a => a._type === 'practical').length;
      else if (f === 'finaldocs') filteredCount = mappedAssigns.filter(a => a._type === 'finaldocs').length;
      else if (f === 'tests') filteredCount = mappedTests.length;
      if (ById('cw-mobile-filter-count')) ById('cw-mobile-filter-count').textContent = filteredCount;
    }

    function openWorkFilterModal() {
      const container = ById('cw-filter-modal-list');
      if (!container) return;

      const mappedAssigns = (S.assignments || []).map(a => {
        const rawType = (a.type || 'ASSIGNMENT').toLowerCase();
        const normType = rawType === 'final_docs' ? 'finaldocs' : rawType;
        return { ...a, _type: normType };
      });
      const mappedTests = (S.tests || []).map(t => ({ ...t, _type: 'test' }));

      const counts = {
        all: mappedAssigns.length + mappedTests.length,
        assignments: mappedAssigns.filter(a => a._type === 'assignment').length,
        practicals: mappedAssigns.filter(a => a._type === 'practical').length,
        finaldocs: mappedAssigns.filter(a => a._type === 'finaldocs').length,
        tests: mappedTests.length,
        materials: 0
      };

      const cats = [
        { key: 'all', label: 'All Work', icon: GD_ICONS.all },
        { key: 'assignments', label: 'Assignments', icon: GD_ICONS.assignment },
        { key: 'practicals', label: 'Practical Work', icon: GD_ICONS.practical },
        { key: 'finaldocs', label: 'Final Documents', icon: GD_ICONS.finaldocs },
        { key: 'tests', label: 'Class Tests', icon: GD_ICONS.test },
        { key: 'materials', label: 'Materials', icon: GD_ICONS.file }
      ];

      const current = S.cwFilter || 'all';

      container.innerHTML = cats.map(c => {
        const isActive = c.key === current;
        const count = counts[c.key] || 0;
        return `
          <button type="button" class="cw-filter-modal-item ${isActive ? 'active' : ''}" onclick="selectWorkFilter('${c.key}')">
            <div class="cw-filter-modal-item-left">
              <span style="display:inline-flex;align-items:center;color:${isActive ? 'var(--color-primary)' : 'var(--text-muted)'}">${c.icon}</span>
              <span>${esc(c.label)}</span>
            </div>
            <div class="cw-filter-modal-item-right">
              <span class="cw-filter-count-chip">${count}</span>
              ${isActive ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary)"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
            </div>
          </button>
        `;
      }).join('');

      openModal('modal-work-filter');
    }

    function selectWorkFilter(key) {
      closeModal('modal-work-filter');
      filterCW(key);
    }

    /* Minimal Anchored Dropdown (close to dot btn minimal) */
    function toggleWorkCardMenu(e, id) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const dd = ById('work-card-dd-' + id);
      if (!dd) return;
      const wasOpen = dd.style.display !== 'none';
      closeAllWorkCardMenus();
      if (!wasOpen) {
        dd.style.display = 'flex';
      }
    }

    function closeAllWorkCardMenus() {
      document.querySelectorAll('.work-card-dropdown').forEach(d => {
        d.style.display = 'none';
      });
    }

    function handleCardMenuChoice(action, type, id) {
      closeAllWorkCardMenus();
      if (action === 'edit') {
        openEditWorkModal(type, id);
      } else if (action === 'delete') {
        delWork(type, id);
      } else if (action === 'marks') {
        const isTest = type === 'test';
        const item = isTest ? S.tests.find(t => t.id === id) : S.assignments.find(a => a.id === id);
        if (item) openMarksModal(item);
      }
    }

    function toggleCwFabMenu(forceState) {
      const menu = ById('cw-mobile-fab-menu');
      const fab = ById('classwork-mobile-fab');
      if (!menu) return;
      const isOpen = menu.style.display !== 'none';
      const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
      menu.style.display = shouldOpen ? 'flex' : 'none';
      if (fab) fab.classList.toggle('menu-open', shouldOpen);
    }

    function toggleMobileClassroomOverflow(e) {
      if (e) e.stopPropagation();
      const menu = ById('mobile-classroom-overflow-menu');
      if (!menu) return;
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    function toggleDesktopClassSettings(e) {
      if (e) e.stopPropagation();
      const menu = ById('desktop-class-settings-dropdown');
      if (!menu) return;
      menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }

    function closeDesktopClassSettings() {
      const menu = ById('desktop-class-settings-dropdown');
      if (menu) menu.style.display = 'none';
    }

    function copyClassInviteCode() {
      const code = S.group?.invite_code;
      if (!code) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => toast('Class code copied: ' + code));
      } else {
        toast('Class code: ' + code);
      }
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.work-card-menu-wrap')) {
        closeAllWorkCardMenus();
      }
      const menu = ById('mobile-classroom-overflow-menu');
      const btn = ById('btn-mobile-overflow');
      if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        menu.style.display = 'none';
      }
      const desktopMenu = ById('desktop-class-settings-dropdown');
      const desktopBtn = ById('btn-desktop-class-settings');
      if (desktopMenu && desktopMenu.style.display !== 'none' && !desktopMenu.contains(e.target) && (!desktopBtn || !desktopBtn.contains(e.target))) {
        desktopMenu.style.display = 'none';
      }
      const fabMenu = ById('cw-mobile-fab-menu');
      const fab = ById('classwork-mobile-fab');
      if (fabMenu && fabMenu.style.display !== 'none' && !fabMenu.contains(e.target) && (!fab || !fab.contains(e.target))) {
        toggleCwFabMenu(false);
      }
    });

    function emptyState(icon,title,desc){
      const svg = (window.getSvgIcon ? window.getSvgIcon(icon, 36) : '') || icon;
      return '<div class="empty-state"><div class="empty-icon">'+svg+'</div><div class="empty-title">'+title+'</div><p class="empty-desc">'+desc+'</p></div>';
    }
    function autoResizeTA(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,200)+'px';}
    let toastT;function toast(msg){const t=ById('gd-toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3500);}

    window.toggleDesktopClassSettings = toggleDesktopClassSettings;
    window.closeDesktopClassSettings = closeDesktopClassSettings;
    window.copyClassInviteCode = copyClassInviteCode;
    window.handleModalAnnouncementFileSelect = handleModalAnnouncementFileSelect;
    window.clearModalAnnouncementFile = clearModalAnnouncementFile;
    window.handleComposeStreamFileSelect = handleComposeStreamFileSelect;
    window.clearComposeStreamFile = clearComposeStreamFile;
    window.downloadAttachment = downloadAttachment;
    window.openNewAnnouncementModal = openNewAnnouncementModal;
    window.submitModalAnnouncement = submitModalAnnouncement;
    window.postAnnouncement = postAnnouncement;
    window.openSheetStudio = openSheetStudio;
    window.openLinkedRegister = openLinkedRegister;

