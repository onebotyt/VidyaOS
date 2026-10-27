/**
 * ══════════════════════════════════════════════════════════════
 * GOOGLE CLASSROOM PC CREATOR CONTROLLER (SCREEN-FIT)
 * frontend/faculty/classwork/classwork-create.js
 * ══════════════════════════════════════════════════════════════
 * Features:
 * - 100% SVG Icon registry in JS (clean HTML with zero inline SVG bloat)
 * - Zero emojis (professional institutional standard)
 * - Minimal prefill: ONLY question numbers ("1. \n2. \n3. \n4. ")
 * - Two-way sync: changing Question Count box adds/removes numbers in textarea
 * - Fixed OCR with authenticated Bearer access_token
 * - Viewport-fit layout with dynamic question division
 */

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // 1. SVG ICON REGISTRY (Injected via JS, zero HTML clutter)
  // ══════════════════════════════════════════════════════════════
  const CW_ICONS = {
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    assignment: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
    test: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>',
    lab: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="6.5" y1="15" x2="17.5" y2="15"></line></svg>',
    upload: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
    scan: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
    filePdf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
    sparkle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path></svg>',
    users: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    template: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    calendar: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    unit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    plus: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    folder: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
  };

  function renderSvgIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconKey = el.getAttribute('data-icon');
      if (CW_ICONS[iconKey]) {
        el.innerHTML = CW_ICONS[iconKey];
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // 2. INSTITUTIONAL INSTRUCTION TEMPLATES
  // ══════════════════════════════════════════════════════════════
  const INSTRUCTION_TEMPLATES = {
    assignment: [
      'All the questions are compulsory.',
      'Each question carry 2 marks',
      'Total assignment marks  = 10 marks',
      'Please find the attached pdf for the assignment.',
      'Last Date of check answer pdf submission is 19/08/2026. After due date no submission is allowed.',
      'For assignment every student must buy similar assignment copy.'
    ].join('\n'),

    test: [
      'Instructions :',
      '1. Students must write answers only on the A4 answer sheets.',
      '2. Attempt any 4 questions.',
      '3. This question paper carrying a total of 10 marks. Each question is of 2.5 marks.',
      '4. The time duration for this test is 50 minutes.',
      '5. Students must read all questions carefully before answering.',
      '6. Answers should be clear, neat and to the point.',
      '7. Use of unfair means is strictly prohibited.',
      '8. Write the question number clearly before answering each question.'
    ].join('\n'),

    lab: [
      'Instructions :',
      '1. Submit executed source code and screenshot of outputs.',
      '2. Document algorithm, complexity analysis and conclusion.',
      '3. Viva-voce questions must be answered individually.'
    ].join('\n'),

    finaldocs: [
      'Instructions :',
      '1. Ensure all documents are merged in order, legible PDF format.',
      '2. Roll number and student name must be clearly watermarked on page 1.',
      '3. Verify all signatures before final submission.'
    ].join('\n')
  };

  // ══════════════════════════════════════════════════════════════
  // 3. STATE & INITIALIZATION
  // ══════════════════════════════════════════════════════════════
  const state = {
    type: 'assignment',
    groupId: null,
    registerId: null,
    group: null,
    existingItemsCount: 0,
    attachedFile: null,
    ocrData: null,
    suppressSync: false
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    // 1. Guard route
    if (typeof guardRoute === 'function') {
      try { guardRoute({ requireHOD: false }); } catch (e) {}
    }

    // 2. Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const rawType = (urlParams.get('type') || 'assignment').toLowerCase();
    state.type = (rawType === 'test' || rawType === 'exam') ? 'test'
      : (rawType === 'lab' || rawType === 'practical') ? 'lab'
      : (rawType === 'finaldocs' || rawType === 'final_docs') ? 'finaldocs'
      : 'assignment';
    state.groupId = urlParams.get('group') || urlParams.get('groupId') || urlParams.get('id') || null;
    state.registerId = urlParams.get('register') || urlParams.get('registerId') || null;

    // 3. Render icons via JS into HTML
    renderSvgIcons();

    // 4. Configure UI elements and prefill ONLY question numbers
    setupTypeUi();

    // 5. Bind event listeners
    bindEvents();

    // 6. Load class context
    await loadClassContext();

    // 7. Set default due date
    setDefaultDueDate();

    // 8. Analyze marks auto-division
    analyzeQuestionsAndDivideMarks();

    // 9. Initialize collapsible state (collapsed by default on mobile <= 860px)
    initCollapsibleState();
  }

  /**
   * Helper to retrieve authenticated JWT token
   */
  function getSafeToken() {
    if (typeof getAuthToken === 'function') {
      const t = getAuthToken();
      if (t) return t;
    }
    return localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  /**
   * Configures type labels, default count, and populates Instructions & Questions fields
   */
  function setupTypeUi() {
    const headerTitle = document.getElementById('cw-header-title');
    const headerIcon = document.getElementById('cw-header-icon');
    const numLabel = document.getElementById('cw-num-label');
    const labelWorkNum = document.getElementById('label-work-num');
    const labelDate = document.getElementById('label-work-date');
    const publishText = document.getElementById('cw-publish-text');
    const maxMarksInput = document.getElementById('work-max-marks');
    const qCountInput = document.getElementById('work-questions-count');
    const titleInput = document.getElementById('work-title');
    const instructionsInput = document.getElementById('work-instructions');
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');

    let initialQCount = 4;
    let initialMaxMarks = 10;

    const questionsCard = document.getElementById('cw-questions-collapse');
    const autoDividerBadge = document.getElementById('cw-auto-divider-badge');

    if (state.type === 'test') {
      document.title = 'Schedule Class Test - VidyaOS';
      if (headerTitle) headerTitle.textContent = 'Class Test';
      if (numLabel) numLabel.textContent = 'Test #';
      if (labelWorkNum) labelWorkNum.textContent = 'Test No.';
      if (labelDate) labelDate.textContent = 'Exam Date & Time';
      if (publishText) publishText.textContent = 'Schedule Test';
      if (titleInput) titleInput.placeholder = 'e.g. Unit Test 1';
      if (headerIcon) headerIcon.innerHTML = CW_ICONS.test;
      if (instructionsInput && !instructionsInput.value.trim()) {
        instructionsInput.value = INSTRUCTION_TEMPLATES.test;
      }
      initialQCount = 4; // 4 questions x 2.5 marks = 10 marks
      initialMaxMarks = 10;
      if (questionsCard) questionsCard.style.display = '';
      if (autoDividerBadge) autoDividerBadge.style.display = '';

    } else if (state.type === 'lab') {
      document.title = 'Create Lab Practical - VidyaOS';
      if (headerTitle) headerTitle.textContent = 'Lab Practical';
      if (numLabel) numLabel.textContent = 'Lab #';
      if (labelWorkNum) labelWorkNum.textContent = 'Practical No.';
      if (labelDate) labelDate.textContent = 'Submission Due Date';
      if (publishText) publishText.textContent = 'Publish Lab';
      if (titleInput) titleInput.placeholder = 'e.g. Experiment 1: B-Tree Indexing';
      if (headerIcon) headerIcon.innerHTML = CW_ICONS.lab;
      if (instructionsInput && !instructionsInput.value.trim()) {
        instructionsInput.value = INSTRUCTION_TEMPLATES.lab;
      }
      initialQCount = 0;
      initialMaxMarks = 25;

      // Lab practicals have no questions box or auto-divider
      if (questionsCard) questionsCard.style.display = 'none';
      if (autoDividerBadge) autoDividerBadge.style.display = 'none';

    } else if (state.type === 'finaldocs') {
      document.title = 'Final Documents Request - VidyaOS';
      if (headerTitle) headerTitle.textContent = 'Final Documents';
      if (numLabel) numLabel.textContent = 'Req #';
      if (labelWorkNum) labelWorkNum.textContent = 'Request No.';
      if (labelDate) labelDate.textContent = 'Final Deadline';
      if (publishText) publishText.textContent = 'Request Final Documents';
      if (titleInput) titleInput.placeholder = 'e.g. Semester-End Final Academic Documents Submission';
      if (headerIcon) headerIcon.innerHTML = CW_ICONS.folder;
      if (instructionsInput && !instructionsInput.value.trim()) {
        instructionsInput.value = INSTRUCTION_TEMPLATES.finaldocs;
      }
      initialQCount = 0;
      initialMaxMarks = 100;

      // Final documents have no questions box or auto-divider
      if (questionsCard) questionsCard.style.display = 'none';
      if (autoDividerBadge) autoDividerBadge.style.display = 'none';

    } else {
      document.title = 'Create Assignment - VidyaOS';
      if (headerTitle) headerTitle.textContent = 'Assignment';
      if (numLabel) numLabel.textContent = 'No.';
      if (labelWorkNum) labelWorkNum.textContent = 'Assignment No.';
      if (labelDate) labelDate.textContent = 'Due Date & Time';
      if (publishText) publishText.textContent = 'Assign';
      if (titleInput) titleInput.placeholder = 'e.g. Assignment 1: Relational Algebra';
      if (headerIcon) headerIcon.innerHTML = CW_ICONS.assignment;
      if (instructionsInput && !instructionsInput.value.trim()) {
        instructionsInput.value = INSTRUCTION_TEMPLATES.assignment;
      }
      initialQCount = 5; // 5 questions x 2 marks = 10 marks
      initialMaxMarks = 10;
      if (questionsCard) questionsCard.style.display = '';
      if (autoDividerBadge) autoDividerBadge.style.display = '';
    }

    if (maxMarksInput) maxMarksInput.value = initialMaxMarks;
    if (qCountInput) qCountInput.value = initialQCount;

    // Fill ONLY numbers: "1. \n2. \n3. \n4. " (No dummy paragraphs!)
    if (state.type !== 'lab' && state.type !== 'finaldocs' && questionsTextarea && !questionsTextarea.value.trim()) {
      questionsTextarea.value = generateNumberedSlots(initialQCount);
    }

    updateQuestionHint();
    updateCollapsePreviews();
    autoResizeTextarea(instructionsInput);
    autoResizeTextarea(questionsTextarea);
  }

  /**
   * Generates clean question number slots: "1. \n2. \n3. \n4. "
   */
  function generateNumberedSlots(count) {
    const lines = [];
    for (let i = 1; i <= count; i++) {
      lines.push(`${i}. `);
    }
    return lines.join('\n');
  }

  /**
   * Binds user interaction events.
   */
  function bindEvents() {
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    const instructionsInput = document.getElementById('work-instructions');
    const maxMarksInput = document.getElementById('work-max-marks');
    const qCountInput = document.getElementById('work-questions-count');
    const btnBack = document.getElementById('cw-btn-back');

    if (questionsTextarea) {
      questionsTextarea.addEventListener('input', () => {
        autoResizeTextarea(questionsTextarea);
        onQuestionsInput();
      });
    }
    if (instructionsInput) {
      instructionsInput.addEventListener('input', () => {
        autoResizeTextarea(instructionsInput);
        updateCollapsePreviews();
      });
    }
    if (maxMarksInput) maxMarksInput.addEventListener('input', analyzeQuestionsAndDivideMarks);
    if (qCountInput) qCountInput.addEventListener('input', onQuestionCountBoxChange);

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        window.cwHandleCancel();
      });
    }

    // Dropzone Drag & Drop for OCR
    const dropzone = document.getElementById('ocr-dropzone');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          const fileInput = document.getElementById('input-ocr-file');
          fileInput.files = dt.files;
          window.cwHandleOcrFileSelect(fileInput);
        }
      });
    }
  }

  /**
   * WHEN QUESTION NO INCREASES/DECREASES IN BOX:
   * Main questions text box number slots also increase or decrease!
   */
  function onQuestionCountBoxChange() {
    if (state.suppressSync) return;
    const qCountInput = document.getElementById('work-questions-count');
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    if (!qCountInput || !questionsTextarea) return;

    const targetCount = Math.max(1, Math.min(50, parseInt(qCountInput.value, 10) || 1));
    const currentText = questionsTextarea.value;

    // Detect currently existing question numbers in the questions textarea
    const lines = currentText.split(/\r?\n/);
    const existingQIndices = [];
    lines.forEach((line, idx) => {
      if (/^\s*(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\)\-]/i.test(line)) {
        existingQIndices.push({ lineIndex: idx, raw: line });
      }
    });

    const currentCount = existingQIndices.length;

    if (targetCount > currentCount) {
      // Need to add more numbered lines (e.g. from 4 to 5: add "5. ")
      state.suppressSync = true;
      let addition = '';
      for (let i = currentCount + 1; i <= targetCount; i++) {
        addition += (currentText.endsWith('\n') || currentText.length === 0 ? '' : '\n') + `${i}. `;
      }
      questionsTextarea.value = currentText + addition;
      state.suppressSync = false;

    } else if (targetCount < currentCount) {
      // If decreased, remove trailing empty question lines
      state.suppressSync = true;
      let newLines = [...lines];
      for (let i = currentCount; i > targetCount; i--) {
        const lastQ = existingQIndices[i - 1];
        if (lastQ) {
          // If the line is just "X." or "X. ", safely remove it
          if (/^\s*(?:Q(?:uestion)?\.?\s*)?\d+[\.\:\)\-]\s*$/i.test(newLines[lastQ.lineIndex])) {
            newLines.splice(lastQ.lineIndex, 1);
          }
        }
      }
      questionsTextarea.value = newLines.join('\n');
      state.suppressSync = false;
    }

    updateQuestionHint();
    analyzeQuestionsAndDivideMarks();
  }

  /**
   * WHEN TEACHER TYPES IN QUESTIONS TEXTAREA:
   * Auto-detect question count and update the Number of Questions box!
   */
  function onQuestionsInput() {
    if (state.suppressSync) return;
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    const qCountInput = document.getElementById('work-questions-count');
    if (!questionsTextarea) return;

    const text = questionsTextarea.value || '';
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const detected = [];
    for (const line of lines) {
      if (/^(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\)\-]/i.test(line)) {
        detected.push(line);
      }
    }

    if (detected.length > 0 && qCountInput) {
      state.suppressSync = true;
      qCountInput.value = detected.length;
      state.suppressSync = false;
    }

    updateQuestionHint();
    analyzeQuestionsAndDivideMarks();
  }

  function updateQuestionHint() {
    const qCountInput = document.getElementById('work-questions-count');
    const hint = document.getElementById('questions-count-hint');
    if (!qCountInput || !hint) return;
    const count = parseInt(qCountInput.value, 10) || 1;
    hint.textContent = count > 1 ? `Q1..Q${count}` : `Q1`;
  }

  /**
   * Real-time Marks Auto-Divider (NO EMOJIS, pure SVG and text).
   */
  function analyzeQuestionsAndDivideMarks() {
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    const maxMarksInput = document.getElementById('work-max-marks');
    const qCountInput = document.getElementById('work-questions-count');
    const headline = document.getElementById('divider-headline-text');
    const badge = document.getElementById('cw-questions-badge');
    const icon = document.getElementById('divider-icon');

    const text = (questionsTextarea && questionsTextarea.value) || '';
    const maxMarks = parseFloat(maxMarksInput ? maxMarksInput.value : 10) || 0;

    // Detect questions in text
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const detected = [];
    for (const line of lines) {
      if (/^(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\)\-]/i.test(line)) {
        detected.push(line);
      }
    }

    const qCount = detected.length > 0
      ? detected.length
      : (parseInt(qCountInput ? qCountInput.value : 4, 10) || 4);

    if (icon) icon.innerHTML = CW_ICONS.sparkle;

    if (qCount > 0 && maxMarks > 0) {
      const rawSplit = maxMarks / qCount;
      const splitMark = (rawSplit % 1 === 0) ? rawSplit : parseFloat(rawSplit.toFixed(2));
      const summaryText = `${qCount} Question${qCount > 1 ? 's' : ''} configured • ${splitMark} marks each (auto-divided from ${maxMarks} Max Marks)`;
      if (headline) headline.textContent = summaryText;
      if (badge) badge.textContent = `${splitMark} marks each`;
    } else if (qCount > 0) {
      if (headline) headline.textContent = `${qCount} Question${qCount > 1 ? 's' : ''} configured • Enter Max Marks to auto-divide`;
      if (badge) badge.textContent = `${qCount} Questions`;
    } else {
      if (headline) headline.textContent = `Set Number of Questions to automatically divide marks across questions`;
      if (badge) badge.textContent = `0 Questions`;
    }
  }

  /**
   * Automatically expands textarea height to full length of text (no internal scrollbar)
   */
  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    if (el.scrollHeight > 0) {
      el.style.height = (el.scrollHeight + 4) + 'px';
    }
  }

  /**
   * Formatting Toolbar Actions (Supports both Questions & Instructions)
   */
  window.cwFormatText = function (formatType, targetId) {
    const target = targetId
      ? document.getElementById(targetId)
      : (document.activeElement && (document.activeElement.id === 'work-instructions' || document.activeElement.id === 'work-questions'))
        ? document.activeElement
        : document.getElementById('work-questions');
    if (!target) return;

    const start = target.selectionStart;
    const end = target.selectionEnd;
    const selText = target.value.substring(start, end);
    let replacement = '';

    if (formatType === 'bold') {
      replacement = `**${selText || 'bold text'}**`;
    } else if (formatType === 'italic') {
      replacement = `*${selText || 'italic text'}*`;
    } else if (formatType === 'underline') {
      replacement = `__${selText || 'underlined text'}__`;
    } else if (formatType === 'numlist') {
      if (target.id === 'work-questions') {
        const qNum = (parseInt(document.getElementById('work-questions-count')?.value, 10) || 0) + 1;
        replacement = `\n${qNum}. ${selText}`;
        const qInput = document.getElementById('work-questions-count');
        if (qInput) qInput.value = qNum;
      } else {
        const lines = target.value.split('\n').filter(Boolean);
        replacement = `\n${lines.length + 1}. ${selText}`;
      }
    }

    target.setRangeText(replacement, start, end, 'end');
    target.focus();
    autoResizeTextarea(target);
    if (target.id === 'work-questions') {
      onQuestionsInput();
    } else {
      updateCollapsePreviews();
    }
  };

  /**
   * Reset to simple question numbers (1., 2., 3., 4.)
   */
  window.cwResetQuestionSlots = function () {
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    const qCountInput = document.getElementById('work-questions-count');
    if (!questionsTextarea) return;
    const count = parseInt(qCountInput ? qCountInput.value : 4, 10) || 4;
    questionsTextarea.value = generateNumberedSlots(count);
    questionsTextarea.focus();
    autoResizeTextarea(questionsTextarea);
    updateQuestionHint();
    analyzeQuestionsAndDivideMarks();
    showToast('Reset to question numbers');
  };

  window.cwClearText = function () {
    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    if (questionsTextarea) {
      questionsTextarea.value = '';
      questionsTextarea.focus();
      autoResizeTextarea(questionsTextarea);
      onQuestionsInput();
      showToast('Questions cleared');
    }
  };

  window.cwClearInstructions = function () {
    const instructionsInput = document.getElementById('work-instructions');
    if (instructionsInput) {
      instructionsInput.value = '';
      instructionsInput.focus();
      autoResizeTextarea(instructionsInput);
      updateCollapsePreviews();
      showToast('Instructions cleared');
    }
  };

  /**
   * Inserts the official institutional instruction template
   */
  window.cwInsertInstructionTemplate = function () {
    const instructionsInput = document.getElementById('work-instructions');
    const template = INSTRUCTION_TEMPLATES[state.type] || INSTRUCTION_TEMPLATES.assignment;
    if (instructionsInput) {
      instructionsInput.value = template;
      instructionsInput.focus();
      autoResizeTextarea(instructionsInput);
      updateCollapsePreviews();
      showToast('Inserted instruction template');
    }
  };

  /**
   * Collapsible Box Controls for Mobile & Desktop
   */
  window.cwToggleCollapse = function (section) {
    const card = document.getElementById(section === 'instructions' ? 'cw-instructions-collapse' : 'cw-questions-collapse');
    if (card) {
      card.classList.toggle('is-collapsed');
      if (!card.classList.contains('is-collapsed')) {
        const textarea = document.getElementById(section === 'instructions' ? 'work-instructions' : 'work-questions');
        if (textarea) {
          requestAnimationFrame(() => autoResizeTextarea(textarea));
        }
      }
    }
  };

  function initCollapsibleState() {
    const isMobile = window.innerWidth <= 860;
    const instCard = document.getElementById('cw-instructions-collapse');
    const qCard = document.getElementById('cw-questions-collapse');
    const autoDividerBadge = document.getElementById('cw-auto-divider-badge');

    if (state.type === 'lab' || state.type === 'finaldocs') {
      if (qCard) qCard.style.display = 'none';
      if (autoDividerBadge) autoDividerBadge.style.display = 'none';
    }

    if (state.type === 'lab') {
      // In Lab: By default instructions text box stays open on mobile as well as desktop!
      if (instCard) instCard.classList.remove('is-collapsed');
      if (qCard) qCard.classList.add('is-collapsed');
    } else if (isMobile) {
      if (instCard) instCard.classList.add('is-collapsed');
      if (qCard) qCard.classList.add('is-collapsed');
    } else {
      if (instCard) instCard.classList.remove('is-collapsed');
      if (qCard) qCard.classList.remove('is-collapsed');
    }
    updateCollapsePreviews();

    // Ensure textarea height fits properly when open
    const instArea = document.getElementById('work-instructions');
    if (instArea && (!instCard || !instCard.classList.contains('is-collapsed'))) {
      requestAnimationFrame(() => autoResizeTextarea(instArea));
    }
  }

  function updateCollapsePreviews() {
    const instructionsInput = document.getElementById('work-instructions');
    const previewEl = document.getElementById('cw-instructions-preview');
    if (instructionsInput && previewEl) {
      const val = (instructionsInput.value || '').trim();
      if (!val) {
        previewEl.textContent = 'None';
      } else {
        const lines = val.split('\n').filter(l => l.trim().length > 0);
        previewEl.textContent = `${lines.length} ${lines.length === 1 ? 'guideline' : 'guidelines'}`;
      }
    }
  }

  /**
   * Loads class information and cohort data
   */
  async function loadClassContext() {
    const infoText = document.getElementById('cw-class-info-text');
    const unitSelect = document.getElementById('work-unit');
    const courseSelect = document.getElementById('work-course-select');

    if (!state.groupId && !state.registerId) {
      if (infoText) infoText.textContent = 'General Academic Subject';
      return;
    }

    try {
      const token = getSafeToken();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      if (state.groupId) {
        const res = await fetch(`/api/v1/teaching-groups/${state.groupId}`, { headers });
        if (res.ok) {
          const json = await res.json();
          const g = json.data || {};
          state.group = g;

          const subj = g.subject_name || g.name || 'Subject';
          const dept = g.department_name || g.department_code || '';
          const sem = g.semester ? `Sem ${g.semester}` : '';
          const count = g.member_count !== undefined ? ` • ${g.member_count} Students` : '';
          const contextString = `${subj}${dept ? ' • ' + dept : ''}${sem ? ' (' + sem + ')' : ''}${count}`;

          if (infoText) infoText.textContent = contextString;
          if (courseSelect) {
            courseSelect.innerHTML = `<option value="${g.id}">${escapeHtml(contextString)}</option>`;
          }

          if (unitSelect) {
            let options = '<option value="">No Topic</option>';
            if (Array.isArray(g.syllabus_units) && g.syllabus_units.length > 0) {
              options += g.syllabus_units.map(u => {
                const tag = u.name || u.unit_name || (typeof u === 'string' ? u : `Unit ${u.num}`);
                const title = u.title ? ` - ${u.title}` : '';
                return `<option value="${escapeHtml(tag)}">${escapeHtml(tag + title)}</option>`;
              }).join('');
            } else if (g.total_units) {
              options += Array.from({ length: g.total_units }, (_, i) => `<option value="Unit ${i + 1}">Unit ${i + 1}</option>`).join('');
            }
            options += '<option value="__ADD_NEW_UNIT__">+ Add Syllabus Unit...</option>';
            unitSelect.innerHTML = options;
          }

          await autoIncrementNumber(g);
        }
      }
    } catch (err) {
      console.warn('Failed to load class context:', err);
      if (infoText) infoText.textContent = 'Classroom Subject Register';
    }
  }

  async function autoIncrementNumber(g) {
    try {
      const token = getSafeToken();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      let count = 0;

      if (state.type === 'test') {
        const r = await fetch(`/api/v1/teaching-groups/${state.groupId}/tests`, { headers });
        if (r.ok) {
          const j = await r.json();
          count = (j.data || []).length;
        }
      } else {
        const r = await fetch(`/api/v1/teaching-groups/${state.groupId}/assignments`, { headers });
        if (r.ok) {
          const j = await r.json();
          const items = j.data || [];
          count = state.type === 'finaldocs'
            ? items.filter(it => it.type === 'FINAL_DOCS').length
            : state.type === 'lab'
              ? items.filter(it => it.type === 'PRACTICAL').length
              : items.filter(it => it.type !== 'PRACTICAL' && it.type !== 'FINAL_DOCS').length;
        }
      }

      state.existingItemsCount = count;
      const nextNum = count + 1;
      const numberInput = document.getElementById('work-number');
      if (numberInput) numberInput.value = nextNum;
    } catch (_) {}
  }

  // ══════════════════════════════════════════════════════════════
  // GOOGLE CLASSROOM DUE DATE CONTROLLER (OPTIONAL & MODAL)
  // ══════════════════════════════════════════════════════════════
  function formatDueDateDisplay(isoString) {
    if (!isoString) return 'No due date';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'No due date';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()];
    const date = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${date}, ${year} ${hours}:${mins} ${ampm}`;
  }

  function updateDueDateDisplay() {
    const hiddenInp = document.getElementById('work-due-date');
    const textEl = document.getElementById('cw-due-display-text');
    const clearBtn = document.getElementById('btn-due-date-clear');
    const triggerBtn = document.getElementById('btn-due-date-trigger');
    const val = (hiddenInp?.value || '').trim();

    if (val) {
      if (textEl) textEl.textContent = formatDueDateDisplay(val);
      if (clearBtn) clearBtn.style.display = 'inline-flex';
      if (triggerBtn) triggerBtn.classList.add('has-due-date');
    } else {
      if (textEl) textEl.textContent = 'No due date';
      if (clearBtn) clearBtn.style.display = 'none';
      if (triggerBtn) triggerBtn.classList.remove('has-due-date');
    }
  }

  function setDefaultDueDate() {
    const dateInput = document.getElementById('work-due-date');
    if (!dateInput) return;

    const d = new Date();
    if (state.type === 'test') {
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
    } else if (state.type === 'finaldocs') {
      d.setDate(d.getDate() + 14);
      d.setHours(23, 59, 0, 0);
    } else {
      d.setDate(d.getDate() + 7);
      d.setHours(23, 59, 0, 0);
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    dateInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
    updateDueDateDisplay();
  }

  window.cwOpenDueDateModal = function () {
    const modal = document.getElementById('modal-set-due-date');
    const hiddenInp = document.getElementById('work-due-date');
    const dateInp = document.getElementById('modal-due-date-input');
    const timeInp = document.getElementById('modal-due-time-input');

    const val = (hiddenInp?.value || '').trim();
    if (val) {
      const parts = val.split('T');
      if (parts[0] && dateInp) dateInp.value = parts[0];
      if (parts[1] && timeInp) timeInp.value = parts[1].substring(0, 5);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (dateInp) dateInp.value = `${year}-${month}-${day}`;
      if (timeInp) timeInp.value = '23:59';
    }

    if (modal) modal.classList.add('open');
  };

  window.cwCloseDueDateModal = function () {
    const modal = document.getElementById('modal-set-due-date');
    if (modal) modal.classList.remove('open');
  };

  window.cwSaveDueDateModal = function () {
    const hiddenInp = document.getElementById('work-due-date');
    const dateInp = document.getElementById('modal-due-date-input');
    const timeInp = document.getElementById('modal-due-time-input');

    const dateVal = (dateInp?.value || '').trim();
    const timeVal = (timeInp?.value || '23:59').trim();

    if (dateVal) {
      if (hiddenInp) hiddenInp.value = `${dateVal}T${timeVal.length === 5 ? timeVal : '23:59'}`;
    } else {
      if (hiddenInp) hiddenInp.value = '';
    }

    updateDueDateDisplay();
    window.cwCloseDueDateModal();
    showToast(dateVal ? 'Due date saved' : 'Due date cleared');
  };

  window.cwClearDueDate = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const hiddenInp = document.getElementById('work-due-date');
    if (hiddenInp) hiddenInp.value = '';
    updateDueDateDisplay();
    showToast('Due date removed');
  };

  // ══════════════════════════════════════════════════════════════
  // ADD SYLLABUS UNIT MODAL CONTROLLER (User Image 1)
  // ══════════════════════════════════════════════════════════════
  window.cwOpenAddUnitModal = function () {
    const modal = document.getElementById('modal-add-unit');
    const tagInp = document.getElementById('unit-modal-tag');
    const titleInp = document.getElementById('unit-modal-title');
    const descInp = document.getElementById('unit-modal-desc');

    // Calculate next unit number from existing options
    const unitSelect = document.getElementById('work-unit');
    let maxUnitNum = 0;
    if (unitSelect) {
      Array.from(unitSelect.options).forEach(opt => {
        const m = (opt.value || '').match(/Unit\s*(\d+)/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxUnitNum) maxUnitNum = num;
        }
      });
    }
    const nextUnitTag = `Unit ${maxUnitNum ? maxUnitNum + 1 : 1}`;

    if (tagInp) tagInp.value = nextUnitTag;
    if (titleInp) titleInp.value = '';
    if (descInp) descInp.value = '';

    if (modal) modal.classList.add('open');
    if (titleInp) setTimeout(() => titleInp.focus(), 120);
  };

  window.cwCloseAddUnitModal = function () {
    const modal = document.getElementById('modal-add-unit');
    if (modal) modal.classList.remove('open');
  };

  window.cwHandleTopicSelectChange = function (select) {
    if (select.value === '__ADD_NEW_UNIT__') {
      window.cwOpenAddUnitModal();
      select.value = '';
    }
  };

  window.cwSubmitAddUnit = async function () {
    const tagInp = document.getElementById('unit-modal-tag');
    const titleInp = document.getElementById('unit-modal-title');
    const descInp = document.getElementById('unit-modal-desc');
    const btn = document.getElementById('btn-submit-add-unit');

    const tag = (tagInp?.value || '').trim();
    const title = (titleInp?.value || '').trim();
    const desc = (descInp?.value || '').trim();

    if (!tag) {
      showToast('Please enter a Unit Tag (e.g. Unit 6)');
      tagInp?.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Adding...';
    }

    try {
      if (state.groupId) {
        const token = getSafeToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/v1/teaching-groups/${state.groupId}/units`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: tag, title, description: desc })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok && json.error) {
          throw new Error(json.error.message || 'Failed to save syllabus unit');
        }
      }

      // Add to select options
      const unitSelect = document.getElementById('work-unit');
      if (unitSelect) {
        const addOpt = unitSelect.querySelector('option[value="__ADD_NEW_UNIT__"]');
        if (addOpt) addOpt.remove();

        const label = title ? `${tag} - ${title}` : tag;
        const newOpt = document.createElement('option');
        newOpt.value = tag;
        newOpt.textContent = label;
        newOpt.selected = true;
        unitSelect.appendChild(newOpt);

        const reAddOpt = document.createElement('option');
        reAddOpt.value = '__ADD_NEW_UNIT__';
        reAddOpt.textContent = '+ Add Syllabus Unit...';
        unitSelect.appendChild(reAddOpt);

        unitSelect.value = tag;
      }

      window.cwCloseAddUnitModal();
      showToast(`Added ${tag} successfully`);

    } catch (err) {
      console.error('Error saving unit:', err);
      showToast(err.message || 'Error adding syllabus unit');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Add Unit';
      }
    }
  };

  /**
   * Parses structured questions. If teacher only entered numbers (or attached a PDF),
   * builds pure question objects with auto-split marks!
   */
  function extractStructuredDataFromText(text, maxMarks, explicitQCount) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const instructions = [];
    const questions = [];

    let currentQ = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const qMatch = line.match(/^(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\)\-]\s*(.*)$/i);
      if (qMatch) {
        if (currentQ) questions.push(currentQ);
        const qNum = parseInt(qMatch[1], 10);
        const qText = qMatch[2].trim() || `Question ${qNum}`;
        currentQ = {
          num: qNum,
          label: `Q${qNum}`,
          text: qText
        };
      } else if (currentQ) {
        currentQ.text += ' ' + line;
      } else {
        const cleanIns = line.replace(/^[\-•*]\s*/, '').trim();
        if (cleanIns) instructions.push(cleanIns);
      }
    }

    if (currentQ) questions.push(currentQ);

    // Fallback: if no text questions matched, use the explicit count
    if (questions.length === 0 && explicitQCount > 0) {
      for (let q = 1; q <= explicitQCount; q++) {
        questions.push({
          num: q,
          label: `Q${q}`,
          text: `Question ${q}`
        });
      }
    }

    // Auto-divide marks
    if (questions.length > 0 && maxMarks > 0) {
      const splitMark = Math.round((maxMarks / questions.length) * 10) / 10;
      questions.forEach(q => {
        q.max = splitMark;
      });
    }

    return { instructions, questions };
  }

  // ══════════════════════════════════════════════════════════════
  // 4. ATTACH DOCUMENT HANDLERS
  // ══════════════════════════════════════════════════════════════
  window.cwTriggerAttachDoc = function () {
    document.getElementById('input-attach-doc').click();
  };

  window.cwHandleDocFileSelected = function (input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (file.size > 50 * 1024 * 1024) {
      showToast('File exceeds 50MB limit');
      input.value = '';
      return;
    }

    state.attachedFile = file;

    const card = document.getElementById('attached-doc-card');
    const nameEl = document.getElementById('attached-doc-name');
    const sizeEl = document.getElementById('attached-doc-size');

    if (nameEl) nameEl.textContent = file.name;
    const sizeKb = (file.size / 1024).toFixed(0);
    const ext = file.name.split('.').pop().toUpperCase();
    if (sizeEl) sizeEl.textContent = `(${sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB'})`;
    if (card) card.style.display = 'inline-flex';

    showToast(`Attached: ${file.name}`);
  };

  window.cwRemoveAttachedDoc = function () {
    state.attachedFile = null;
    const input = document.getElementById('input-attach-doc');
    if (input) input.value = '';
    const card = document.getElementById('attached-doc-card');
    if (card) card.style.display = 'none';
    showToast('Attachment removed');
  };

  // ══════════════════════════════════════════════════════════════
  // 5. OCR & QUESTION PAPER SCANNER (FIXED AUTH & NO EMOJIS)
  // ══════════════════════════════════════════════════════════════
  window.cwOpenOcrModal = function () {
    const modal = document.getElementById('ocr-scanner-modal');
    modal.classList.add('open');

    document.getElementById('ocr-dropzone').style.display = 'block';
    document.getElementById('ocr-scanning-indicator').style.display = 'none';
    document.getElementById('ocr-results-area').style.display = 'none';
    document.getElementById('btn-ingest-ocr').style.display = 'none';
    const ocrInput = document.getElementById('input-ocr-file');
    if (ocrInput) ocrInput.value = '';
  };

  window.cwCloseOcrModal = function () {
    const modal = document.getElementById('ocr-scanner-modal');
    modal.classList.remove('open');
  };

  window.cwHandleOcrFileSelect = async function (input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const dropzone = document.getElementById('ocr-dropzone');
    const scanningIndicator = document.getElementById('ocr-scanning-indicator');
    const resultsArea = document.getElementById('ocr-results-area');
    const btnIngest = document.getElementById('btn-ingest-ocr');
    const previewText = document.getElementById('ocr-preview-text');
    const pillQCount = document.getElementById('ocr-pill-qcount');
    const pillMarks = document.getElementById('ocr-pill-marks');

    dropzone.style.display = 'none';
    scanningIndicator.style.display = 'block';

    try {
      const formData = new FormData();
      formData.append('document', file);

      // Fix: Use correct access_token so OCR never fails with 401
      const token = getSafeToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/v1/ocr/extract-questions', {
        method: 'POST',
        headers,
        body: formData
      });

      let json;
      const cType = response.headers.get('content-type') || '';
      if (cType.includes('application/json')) {
        json = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned status ${response.status}: ${text.slice(0, 80)}`);
      }

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'OCR extraction failed.');
      }

      state.ocrData = json.data;
      scanningIndicator.style.display = 'none';
      resultsArea.style.display = 'block';
      btnIngest.style.display = 'inline-flex';

      const qCount = json.data.questions?.length || 0;
      pillQCount.textContent = `${qCount} Question${qCount !== 1 ? 's' : ''} Isolated`;
      pillMarks.textContent = json.data.detectedMaxMarks ? `Max Marks: ${json.data.detectedMaxMarks}` : 'Equal Marks';

      previewText.textContent = json.data.formattedText || 'Questions extracted successfully.';
      showToast(`Extracted ${qCount} questions from ${file.name}`);

    } catch (err) {
      console.error('OCR Error:', err);
      scanningIndicator.style.display = 'none';
      dropzone.style.display = 'block';
      showToast(`OCR: ${err.message}`);
    }
  };

  /**
   * Ingests OCR questions and auto-syncs textarea and question count box
   */
  window.cwIngestOcrQuestions = function () {
    if (!state.ocrData) return;

    const questionsTextarea = document.getElementById('work-questions') || document.getElementById('work-instructions-questions');
    const instructionsInput = document.getElementById('work-instructions');
    const maxMarksInput = document.getElementById('work-max-marks');
    const qCountInput = document.getElementById('work-questions-count');

    const qs = state.ocrData.questions || [];
    if (qs.length > 0 && questionsTextarea) {
      // Ingest questions neatly formatted
      questionsTextarea.value = qs.map((q, idx) => `${idx + 1}. ${q.text}`).join('\n');
    } else if (state.ocrData.formattedText && questionsTextarea) {
      questionsTextarea.value = state.ocrData.formattedText;
    }

    // Ingest instructions if extracted from paper
    if (state.ocrData.instructions && instructionsInput) {
      const insText = Array.isArray(state.ocrData.instructions)
        ? state.ocrData.instructions.join('\n')
        : state.ocrData.instructions;
      if (insText.trim()) {
        instructionsInput.value = insText.trim();
      }
    }

    if (state.ocrData.detectedMaxMarks && maxMarksInput) {
      maxMarksInput.value = state.ocrData.detectedMaxMarks;
    }

    if (qs.length > 0 && qCountInput) {
      qCountInput.value = qs.length;
    }

    updateQuestionHint();
    analyzeQuestionsAndDivideMarks();
    window.cwCloseOcrModal();
    showToast('Extracted questions ingested into form');
  };

  // ══════════════════════════════════════════════════════════════
  // 6. CANCEL & PUBLISH ACTIONS
  // ══════════════════════════════════════════════════════════════
  window.cwHandleCancel = function () {
    if (state.groupId) {
      window.location.href = `/faculty/group-detail/?id=${state.groupId}&tab=classwork#classwork`;
    } else if (state.registerId) {
      const tab = state.type === 'test' ? 'marks' : 'assignments';
      window.location.href = `/faculty/registers.html?register=${state.registerId}&tab=${tab}`;
    } else {
      window.history.back();
    }
  };

  window.cwHandlePublish = async function () {
    const publishBtn = document.getElementById('cw-btn-publish');
    const num = document.getElementById('work-number').value || '1';
    const rawTitle = (document.getElementById('work-title').value || '').trim();
    const unit = (document.getElementById('work-unit').value || '').trim();
    const maxMarks = parseFloat(document.getElementById('work-max-marks').value) || 0;
    const dueDate = (document.getElementById('work-due-date')?.value || '').trim() || null;
    const instructionsVal = (document.getElementById('work-instructions')?.value || '').trim();
    const questionsVal = (document.getElementById('work-questions')?.value || document.getElementById('work-instructions-questions')?.value || '').trim();
    const qCount = parseInt(document.getElementById('work-questions-count').value, 10) || 4;

    if (!rawTitle) {
      showToast('Please enter a title');
      document.getElementById('work-title').focus();
      return;
    }

    // Note: Due Date is optional ("can be add and can not be both way" - Google Classroom pattern)

    let prefix = 'Assignment ';
    if (state.type === 'test') prefix = 'Class Test ';
    if (state.type === 'lab') prefix = 'Experiment ';
    if (state.type === 'finaldocs') prefix = 'Final Document ';

    let compoundTitle = rawTitle;
    if (!rawTitle.toLowerCase().startsWith(prefix.toLowerCase().trim())) {
      compoundTitle = `${prefix}${num}: ${rawTitle}`;
    }

    const isLab = state.type === 'lab';
    const isFinalDocs = state.type === 'finaldocs';
    const fullDescription = instructionsVal + (isLab || isFinalDocs || !questionsVal ? '' : `\n\n${questionsVal}`);
    const { instructions: parsedIns, questions } = (isLab || isFinalDocs)
      ? { instructions: [instructionsVal], questions: [] }
      : extractStructuredDataFromText(questionsVal, maxMarks, qCount);
    const finalInstructions = instructionsVal || parsedIns.join('\n') || (isLab ? 'Complete laboratory practical experiment.' : isFinalDocs ? 'Submit semester-end academic documents.' : 'Attempt all questions.');

    publishBtn.disabled = true;
    publishBtn.style.opacity = '0.7';
    publishBtn.innerHTML = `<span>Publishing...</span>`;

    try {
      const token = getSafeToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (state.type === 'test') {
        const examPayload = {
          name: compoundTitle,
          group_id: state.groupId ? Number(state.groupId) : null,
          subject_id: (state.group && state.group.subject_id) || null,
          department_id: (state.group && state.group.teacher_department_id) || null,
          year: (state.group && state.group.year) || null,
          semester: (state.group && state.group.semester) || null,
          academic_year_id: (state.group && state.group.academic_year_id) || null,
          exam_date: dueDate,
          max_marks: maxMarks,
          unit_name: unit || null,
          instructions: finalInstructions,
          questions: questions
        };

        const res = await fetch('/api/v1/exams', {
          method: 'POST',
          headers,
          body: JSON.stringify(examPayload)
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to schedule class test');
        }

        showToast('Class Test scheduled & marksheet generated');
        setTimeout(() => {
          if (state.groupId) {
            window.location.href = `/faculty/group-detail/?id=${state.groupId}&tab=classwork#classwork`;
          } else {
            window.location.href = `/faculty/registers.html?tab=marks`;
          }
        }, 700);

      } else if (state.type === 'finaldocs') {
        const targetGroupId = state.groupId || 1;
        const finalDocsPayload = {
          title: compoundTitle,
          description: instructionsVal || 'Submit semester-end academic documents.',
          due_date: dueDate,
          max_marks: maxMarks || 100,
          type: 'FINAL_DOCS',
          unit_name: unit || null
        };

        const res = await fetch(`/api/v1/teaching-groups/${targetGroupId}/assignments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(finalDocsPayload)
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to request final documents');
        }

        showToast('Final documents request published successfully');
        setTimeout(() => {
          if (state.groupId) {
            window.location.href = `/faculty/group-detail/?id=${state.groupId}&tab=classwork#classwork`;
          } else {
            window.location.href = `/faculty/registers.html?tab=assignments`;
          }
        }, 700);

      } else {
        const targetGroupId = state.groupId || 1;
        const assignmentPayload = {
          title: compoundTitle,
          description: fullDescription,
          due_date: dueDate,
          max_marks: maxMarks,
          type: state.type === 'lab' ? 'PRACTICAL' : 'ASSIGNMENT',
          unit_name: unit || null,
          questions: questions
        };

        const res = await fetch(`/api/v1/teaching-groups/${targetGroupId}/assignments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(assignmentPayload)
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to publish classwork');
        }

        showToast(`${state.type === 'lab' ? 'Lab practical' : 'Assignment'} published successfully`);
        setTimeout(() => {
          if (state.groupId) {
            window.location.href = `/faculty/group-detail/?id=${state.groupId}&tab=classwork#classwork`;
          } else {
            window.location.href = `/faculty/registers.html?tab=assignments`;
          }
        }, 700);
      }

    } catch (err) {
      console.error('Publish error:', err);
      showToast(`Error: ${err.message}`);
      publishBtn.disabled = false;
      publishBtn.style.opacity = '1';
      publishBtn.textContent = 'Publish';
    }
  };

  function showToast(msg) {
    const toast = document.getElementById('cw-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._cwToastTimeout);
    window._cwToastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

})();
