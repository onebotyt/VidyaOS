/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOD ESP32 BIOMETRIC TERMINALS & CLOUD TEMPLATE VAULT CONTROLLER
 * Location: /frontend/faculty/esp32-devices/esp32-devices.js
 *
 * Features:
 * - Connects & pairs department ESP32 nodes with 256-bit AES-GCM keys
 * - Displays live 2S 3.7V battery voltage/%, W25Q32 offline flash queue,
 *   and AS608 template counts
 * - Queues remote student fingerprint enrollment commands to ESP32
 * - 1-Click "Sync All Templates to ESP32" for instant hardware replacement
 *   without re-registering students
 * - Built-in 0.96" OLED + 5V Passive Piezo Buzzer WebAudio simulator
 * ═══════════════════════════════════════════════════════════════════════════
 */

guardRoute(['TEACHER', 'HOD', 'DEPT_HEAD', 'FACULTY', 'CLASS_TEACHER', 'COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN', 'ADMIN']);

let currentDepartmentId = null;
let cmdPollingTimer = null;
let lastKnownCompletedCmds = new Set();

let espOverviewData = {
  department: null,
  departments: [],
  devices: [],
  students: [],
  commands: [],
  recent_scans: []
};
let selectedDeviceId = null;

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── WebAudio 5V Passive Piezoelectric Buzzer Synthesizer ──────────────────
function playPiezoBuzzerSequence(notes) {
  const chk = document.getElementById('chk-buzzer-audio');
  if (chk && !chk.checked) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    let offset = ctx.currentTime;
    notes.forEach(([freq, durMs, gapMs = 25]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, offset);
      gain.gain.setValueAtTime(0.08, offset);
      gain.gain.exponentialRampToValueAtTime(0.001, offset + durMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + durMs / 1000);
      offset += (durMs + gapMs) / 1000;
    });
  } catch (_) {}
}

function updateOledScreen({ statusLeft, statusRight, headline, line1, line2, line3, leds = [false, false, false] }) {
  if (statusLeft !== undefined) document.getElementById('oled-status-left').textContent = statusLeft;
  if (statusRight !== undefined) document.getElementById('oled-status-right').textContent = statusRight;
  if (headline !== undefined) document.getElementById('oled-headline').textContent = headline;
  if (line1 !== undefined) document.getElementById('oled-line1').textContent = line1;
  if (line2 !== undefined) document.getElementById('oled-line2').textContent = line2;
  if (line3 !== undefined) document.getElementById('oled-line3').textContent = line3;

  const [g, r, b] = leds;
  document.getElementById('sim-led-green')?.classList.toggle('on', Boolean(g));
  document.getElementById('sim-led-red')?.classList.toggle('on', Boolean(r));
  document.getElementById('sim-led-blue')?.classList.toggle('on', Boolean(b));
}

async function loadEsp32Overview(deptIdOverride) {
  try {
    const targetDept = deptIdOverride !== undefined ? deptIdOverride : currentDepartmentId;
    const url = targetDept ? `/devices/hod/overview?department_id=${targetDept}` : '/devices/hod/overview';
    const res = await fetchApi(url);
    if (!res || !res.success || !res.data) {
      renderLoadError(res?.message || 'Failed to load department hardware data.');
      return;
    }

    espOverviewData = res.data;
    const { department, departments = [], devices = [], students = [], commands = [], recent_scans = [] } = espOverviewData;

    if (department && department.id) {
      currentDepartmentId = department.id;
    }

    // Populate Department Switcher in header
    const deptSwitcher = document.getElementById('dept-switcher-select');
    if (deptSwitcher && departments.length > 0) {
      deptSwitcher.innerHTML = departments.map(d =>
        `<option value="${d.id}" ${Number(d.id) === Number(currentDepartmentId) ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.code)})</option>`
      ).join('');
    }

    // Populate Department Selector in Connect Modal
    const modalDeptSel = document.getElementById('esp-dept-input');
    if (modalDeptSel && departments.length > 0) {
      modalDeptSel.innerHTML = departments.map(d =>
        `<option value="${d.id}" ${Number(d.id) === Number(currentDepartmentId) ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.code)})</option>`
      ).join('');
    }

    const deptPill = document.getElementById('dept-code-pill');
    if (deptPill && department) {
      deptPill.textContent = `${department.code || 'DEPT'} • AES-256-GCM ENCRYPTED`;
    }

    if (!selectedDeviceId && devices.length > 0) {
      selectedDeviceId = devices[0].id;
    } else if (devices.length > 0 && !devices.some(d => Number(d.id) === Number(selectedDeviceId))) {
      selectedDeviceId = devices[0].id;
    }

    // Populate device selector
    const sel = document.getElementById('active-device-select');
    if (sel) {
      sel.innerHTML = devices.length
        ? devices.map(d => `<option value="${d.id}" ${Number(d.id) === Number(selectedDeviceId) ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.device_uid)})</option>`).join('')
        : `<option value="">No ESP32 Connected Yet</option>`;
      if (selectedDeviceId) sel.value = String(selectedDeviceId);
    }

    updateKpiCards(devices, students);
    renderDevicesList(devices);
    renderStudentsBiometricTable();
    renderRecentScans(recent_scans);
    renderCommandQueue(commands);

    // Auto-polling management: check for pending commands
    manageCommandPolling(commands);

    if (selectedDeviceId) {
      await loadDeviceWifiNetworks(selectedDeviceId);
    }
  } catch (err) {
    console.error('[ESP32 Portal] Failed to load overview:', err);
    renderLoadError(err.message);
  }
}

function renderLoadError(msg) {
  const wrap = document.getElementById('esp-devices-list');
  if (wrap) {
    wrap.innerHTML = `
      <div class="esp-empty-box" style="border-color:var(--status-absent, #dc2626);">
        <div style="font-weight:700; font-size:0.95rem; margin-bottom:0.35rem; color:var(--status-absent, #dc2626);">Unable to Load Department ESP32 Data</div>
        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.85rem;">${escHtml(msg || 'Server did not respond with device telemetry.')}</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="loadEsp32Overview()">↻ Retry Loading</button>
      </div>
    `;
  }
  const tbody = document.getElementById('bio-students-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--status-absent, #dc2626);">Error loading student biometric records. <button type="button" class="btn btn-secondary btn-sm" style="margin-left:0.5rem;" onclick="loadEsp32Overview()">Retry</button></td></tr>`;
  }
}

function onSwitchDepartment(deptId) {
  currentDepartmentId = deptId ? parseInt(deptId, 10) : null;
  selectedDeviceId = null;
  loadEsp32Overview(currentDepartmentId);
}

function manageCommandPolling(commands = []) {
  const pendingCmds = commands.filter(c => c.status === 'PENDING' || c.status === 'DELIVERED');

  // Check if any command just completed
  commands.forEach(c => {
    if (c.status === 'COMPLETED' && !lastKnownCompletedCmds.has(c.id)) {
      lastKnownCompletedCmds.add(c.id);
      if (c.command_type === 'ENROLL_STUDENT') {
        showToast(`✓ Fingerprint enrolled successfully for ${c.student_name || 'student'}! 512B template stored in MySQL.`, 'success');
        playPiezoBuzzerSequence([[1318, 80], [1568, 80], [2093, 160]]);
        updateOledScreen({
          statusLeft: '🔒 AES256 SAVED',
          headline: 'ENROLLED SUCCESS ✓',
          line1: c.student_name || 'Student Enrolled',
          line2: '512B Template Stored',
          line3: 'Ready for Attendance Scans',
          leds: [true, false, true]
        });
      }
    }
  });

  if (pendingCmds.length > 0) {
    if (!cmdPollingTimer) {
      cmdPollingTimer = setInterval(async () => {
        const targetDept = currentDepartmentId;
        const url = targetDept ? `/devices/hod/overview?department_id=${targetDept}` : '/devices/hod/overview';
        try {
          const res = await fetchApi(url);
          if (res && res.success && res.data) {
            espOverviewData = res.data;
            updateKpiCards(res.data.devices || [], res.data.students || []);
            renderDevicesList(res.data.devices || []);
            renderStudentsBiometricTable();
            renderRecentScans(res.data.recent_scans || []);
            renderCommandQueue(res.data.commands || []);
            manageCommandPolling(res.data.commands || []);
          }
        } catch (_) {}
      }, 3500);
    }
  } else {
    if (cmdPollingTimer) {
      clearInterval(cmdPollingTimer);
      cmdPollingTimer = null;
    }
  }
}

function updateKpiCards(devices, students) {
  const onlineCount = devices.filter(d => d.is_online).length;
  document.getElementById('kpi-esp-devices').textContent = `${onlineCount} / ${devices.length}`;

  const enrolledCount = students.filter(s => s.biometric_status === 'ENROLLED').length;
  const pct = students.length ? Math.round((enrolledCount / students.length) * 100) : 0;
  document.getElementById('kpi-esp-templates').textContent = `${enrolledCount} / ${students.length}`;
  document.getElementById('kpi-esp-coverage').textContent = `${pct}% students stored in MySQL cloud vault`;

  const activeDev = devices.find(d => Number(d.id) === Number(selectedDeviceId)) || devices[0];
  const volts = activeDev?.battery_voltage ? Number(activeDev.battery_voltage).toFixed(2) : '7.85';
  const battPct = activeDev?.battery_pct != null ? activeDev.battery_pct : 84;
  document.getElementById('kpi-esp-battery').textContent = `${volts}V (${battPct}%)`;

  const totalOffline = devices.reduce((sum, d) => sum + (Number(d.offline_queue_count) || 0), 0);
  document.getElementById('kpi-esp-offline').textContent = `${totalOffline} Records`;
}

function onSelectActiveDevice(val) {
  selectedDeviceId = Number(val) || null;
  const sel = document.getElementById('active-device-select');
  if (sel && selectedDeviceId) {
    sel.value = String(selectedDeviceId);
  }
  updateKpiCards(espOverviewData.devices || [], espOverviewData.students || []);
  renderDevicesList(espOverviewData.devices || []);
  if (selectedDeviceId) {
    loadDeviceWifiNetworks(selectedDeviceId);
  }
}

function renderDevicesList(devices) {
  const wrap = document.getElementById('esp-devices-list');
  if (!wrap) return;

  if (!devices.length) {
    wrap.innerHTML = `
      <div class="esp-empty-box">
        <div style="font-weight:700; font-size:0.95rem; margin-bottom:0.35rem;">No ESP32 Biometric Terminal Paired Yet</div>
        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.85rem;">Connect your department's ESP32 + AS608 + OLED + W25Q32 node to start enrolling fingerprints and marking attendance.</div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openRegisterDeviceModal()">+ Connect First ESP32 Terminal</button>
      </div>
    `;
    return;
  }

  wrap.innerHTML = devices.map(d => {
    const isSelected = Number(d.id) === Number(selectedDeviceId);
    const volts = d.battery_voltage ? Number(d.battery_voltage).toFixed(2) : '7.85';
    const battPct = d.battery_pct != null ? d.battery_pct : 84;
    const secretPreview = d.secret_key ? `${d.secret_key.slice(0, 10)}...${d.secret_key.slice(-6)}` : 'AES-256 Configured';

    return `
      <article class="esp-device-card ${isSelected ? 'selected' : ''}" onclick="onSelectActiveDevice(${d.id})">
        <div class="esp-dev-header">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <strong style="font-size:0.95rem; color:var(--text-main);">${escHtml(d.name)}</strong>
              <span class="esp-status-pill ${d.is_online ? 'online' : 'offline'}">${d.is_online ? '● ONLINE' : '○ STANDBY'}</span>
            </div>
            <div style="font-family:var(--font-family-mono); font-size:0.75rem; color:var(--color-primary); margin-top:2px;">
              UID: ${escHtml(d.device_uid)} • ${escHtml(d.firmware_version || 'v3.0-AES256-GCM')}
            </div>
          </div>
          <div style="display:flex; gap:0.4rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); showEspConfigModal(${d.id})" title="View C++ config.h for this ESP32">config.h</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); triggerTemplateSyncToDevice(${d.id})" title="Push all stored student templates from MySQL to this ESP32">↻ Sync Templates</button>
          </div>
        </div>

        <div class="esp-dev-metrics">
          <div class="esp-dev-metric">
            <span class="m-lbl">2S Battery</span>
            <span class="m-val">${volts}V (${battPct}%)</span>
          </div>
          <div class="esp-dev-metric">
            <span class="m-lbl">W25Q32 Offline Queue</span>
            <span class="m-val">${d.offline_queue_count || 0} Pending</span>
          </div>
          <div class="esp-dev-metric">
            <span class="m-lbl">Dept Cloud Templates</span>
            <span class="m-val">${d.enrolled_count || 0} Students</span>
          </div>
          <div class="esp-dev-metric">
            <span class="m-lbl">AES-256 Key</span>
            <span class="m-val" style="font-family:var(--font-family-mono); font-size:0.72rem;">${escHtml(secretPreview)}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderStudentsBiometricTable() {
  const tbody = document.getElementById('bio-students-tbody');
  if (!tbody) return;

  const yearFilter = document.getElementById('filter-bio-year')?.value || 'all';
  const statusFilter = document.getElementById('filter-bio-status')?.value || 'all';
  const searchQ = (document.getElementById('search-bio-student')?.value || '').trim().toLowerCase();

  const filtered = (espOverviewData.students || []).filter(s => {
    if (yearFilter !== 'all' && String(s.year) !== String(yearFilter)) return false;
    if (statusFilter !== 'all' && s.biometric_status !== statusFilter) return false;
    if (searchQ) {
      const hay = `${s.full_name || ''} ${s.class_roll_no || ''} ${s.official_enrollment_no || ''} ${s.registration_no || ''}`.toLowerCase();
      if (!hay.includes(searchQ)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No matching students found in department roster.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(st => {
    const isEnrolled = st.biometric_status === 'ENROLLED';
    const shaShort = st.template_sha256 ? `${st.template_sha256.slice(0, 12)}…` : '';

    return `
      <tr>
        <td data-label="Roll #">
          <span class="esp-roll-badge">#${st.class_roll_no || '—'}</span>
        </td>
        <td data-label="Student Name">
          <div style="font-weight:700; color:var(--text-main);">${escHtml(st.full_name)}</div>
        </td>
        <td data-label="Enrollment #">
          <span style="font-family:var(--font-family-mono); font-size:0.8rem; font-weight:600; color:var(--color-primary);">${escHtml(st.official_enrollment_no || '—')}</span>
          ${st.registration_no ? `<div style="font-size:0.72rem; color:var(--text-muted);">UBTER: ${escHtml(st.registration_no)}</div>` : ''}
        </td>
        <td data-label="Cohort">
          <span class="esp-pill-tag">Yr ${st.year || 1} • Sem ${st.semester || 1}</span>
        </td>
        <td data-label="Cloud Template">
          ${isEnrolled ? `
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span class="esp-status-pill online" style="width:fit-content;">✓ 512B TEMPLATE STORED</span>
              <span style="font-family:var(--font-family-mono); font-size:0.68rem; color:var(--text-muted);" title="Portable SHA-256: ${escHtml(st.template_sha256 || '')}">SHA256: ${escHtml(shaShort)}</span>
            </div>
          ` : `
            <span class="esp-status-pill offline">NOT ENROLLED</span>
          `}
        </td>
        <td data-label="Actions" style="text-align:right;">
          <div style="display:inline-flex; gap:0.4rem; flex-wrap:wrap; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="queueEnrollCommandForStudent(${st.student_id}, '${escHtml(st.full_name)}', ${st.class_roll_no || 0})" title="Send remote ENROLL_STUDENT command to selected ESP32">
              Enroll on ESP32
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="simulateStudentBiometric(${st.student_id}, 'ENROLL_TEMPLATE')" title="Capture & encrypt 512-byte AS608 template into MySQL">
              ${isEnrolled ? 'Update Template' : 'Capture Template'}
            </button>
            ${isEnrolled ? `
              <button type="button" class="btn btn-secondary btn-sm" style="border-color:var(--status-present); color:var(--status-present);" onclick="simulateStudentBiometric(${st.student_id}, 'MARK_ATTENDANCE')" title="Test attendance scan & OLED display for this student">
                ✓ Test Scan
              </button>
              <button type="button" class="btn btn-secondary btn-sm" style="color:var(--status-absent);" onclick="removeStudentCloudTemplate(${st.student_id})" title="Delete cloud template">
                ✕
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function queueEnrollCommandForStudent(studentId, fullName, rollNo) {
  if (!selectedDeviceId) {
    showToast('Please connect or select an ESP32 terminal first.', 'warning');
    openRegisterDeviceModal();
    return;
  }

  updateOledScreen({
    statusLeft: '🔒 ENROLL MODE',
    headline: 'ENROLL FINGERPRINT',
    line1: fullName,
    line2: `Roll No: #${rollNo || '—'}`,
    line3: 'Place Finger on AS608...',
    leds: [false, false, true]
  });
  playPiezoBuzzerSequence([[1400, 90]]);

  const res = await fetchApi('/devices/hod/command', {
    method: 'POST',
    body: JSON.stringify({
      device_id: selectedDeviceId,
      command_type: 'ENROLL_STUDENT',
      student_id: studentId,
      finger_index: 1
    })
  });

  if (res && res.success) {
    showToast(res.message || `ESP32 prompted to scan ${fullName}`, 'success');
    await loadEsp32Overview();
    if (!cmdPollingTimer) {
      manageCommandPolling([{ id: res.data?.command_id, status: 'PENDING' }]);
    }
  }
}

async function triggerTemplateSyncToDevice(deviceId) {
  updateOledScreen({
    statusLeft: '🔒 AES256 SYNC',
    headline: 'CLOUD TEMPLATE SYNC',
    line1: 'Downloading 512B Templates',
    line2: 'Writing AS608 + W25Q32...',
    line3: 'Zero Re-Registration Needed',
    leds: [true, false, true]
  });
  playPiezoBuzzerSequence([[1200, 70], [1600, 70], [2000, 120]]);

  const res = await fetchApi('/devices/hod/command', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      command_type: 'SYNC_TEMPLATES'
    })
  });

  if (res && res.success) {
    showToast('Queued full department template bundle sync to ESP32!', 'success');
    await loadEsp32Overview();
  }
}

async function simulateStudentBiometric(studentId, actionType) {
  if (!selectedDeviceId) {
    showToast('Please connect an ESP32 terminal first.', 'warning');
    openRegisterDeviceModal();
    return;
  }

  const res = await fetchApi('/devices/hod/simulate-esp32', {
    method: 'POST',
    body: JSON.stringify({
      device_id: selectedDeviceId,
      action_type: actionType,
      student_id: studentId,
      battery_voltage: 7.88,
      battery_pct: 86
    })
  });

  if (res && res.success && res.data) {
    const d = res.data;
    if (actionType === 'ENROLL_TEMPLATE') {
      playPiezoBuzzerSequence([[1318, 80], [1568, 80], [2093, 160]]);
      updateOledScreen({
        statusLeft: '🔒 AES256 SAVED',
        statusRight: '🔋 7.9V 86%',
        headline: 'ENROLLED SUCCESS ✓',
        line1: d.full_name || 'Student',
        line2: `Roll No: #${d.class_roll_no || '—'}`,
        line3: `512B Template -> MySQL`,
        leds: [true, false, true]
      });
    } else {
      playPiezoBuzzerSequence([[1850, 85], [2480, 140]]);
      updateOledScreen({
        statusLeft: '🔒 AES256 ONLINE',
        statusRight: '🔋 7.9V 86%',
        headline: 'ATTENDANCE MARKED!',
        line1: d.full_name || 'Student',
        line2: `Roll No: #${d.class_roll_no || '—'}`,
        line3: `${d.official_enrollment_no || ''} • Verified`,
        leds: [true, false, false]
      });
    }
    showToast(res.message, 'success');
    await loadEsp32Overview();
  }
}

async function removeStudentCloudTemplate(studentId) {
  const res = await fetchApi(`/devices/hod/templates/${studentId}`, { method: 'DELETE' });
  if (res && res.success) {
    showToast('Removed student fingerprint template from cloud vault.', 'info');
    await loadEsp32Overview();
  }
}

function renderRecentScans(scans) {
  const wrap = document.getElementById('esp-recent-scans');
  if (!wrap) return;
  if (!scans || !scans.length) {
    wrap.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No attendance scans recorded yet. Click "✓ Test Scan" on any enrolled student to test.</div>`;
    return;
  }
  wrap.innerHTML = scans.slice(0, 10).map(sc => `
    <div class="esp-feed-item">
      <div>
        <div style="font-weight:700; font-size:0.86rem; color:var(--text-main);">
          ${escHtml(sc.student_name)} <span class="esp-roll-badge" style="margin-left:4px;">Roll #${sc.class_roll_no || '—'}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          ${escHtml(sc.official_enrollment_no || '')} • Terminal: <strong>${escHtml(sc.device_uid)}</strong>
        </div>
      </div>
      <div style="text-align:right;">
        <span class="esp-status-pill online">${sc.event_type === 'W25Q32_OFFLINE_SYNC' ? 'W25Q32 SYNCED' : 'LIVE VERIFIED'}</span>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${sc.scan_time ? new Date(sc.scan_time).toLocaleTimeString('en-IN') : ''}</div>
      </div>
    </div>
  `).join('');
}

function renderCommandQueue(commands) {
  const wrap = document.getElementById('esp-command-log');
  if (!wrap) return;
  if (!commands || !commands.length) {
    wrap.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No remote ESP32 commands queued yet.</div>`;
    return;
  }
  wrap.innerHTML = commands.slice(0, 10).map(c => `
    <div class="esp-feed-item">
      <div>
        <div style="font-weight:700; font-size:0.84rem; color:var(--text-main);">
          ${escHtml(c.command_type)} ${c.student_name ? `— ${escHtml(c.student_name)}` : ''}
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          ${escHtml(c.result_message || `Target: ${c.device_uid}`)}
        </div>
      </div>
      <span class="esp-status-pill ${c.status === 'COMPLETED' ? 'online' : 'offline'}">${escHtml(c.status)}</span>
    </div>
  `).join('');
}

// ─── Modals: Pair ESP32 & Generate C++ config.h ────────────────────────────
function generateRandomHexSecret() {
  const arr = new Uint8Array(32);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  }
  const hex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  const input = document.getElementById('esp-secret-input');
  if (input) input.value = hex;
}

function openRegisterDeviceModal() {
  generateRandomHexSecret();
  document.getElementById('register-esp-modal').style.display = 'flex';
}

function closeRegisterDeviceModal() {
  document.getElementById('register-esp-modal').style.display = 'none';
}

async function submitRegisterEspDevice(e) {
  e.preventDefault();
  const department_id = document.getElementById('esp-dept-input')?.value ? parseInt(document.getElementById('esp-dept-input').value, 10) : undefined;
  const device_uid = document.getElementById('esp-uid-input').value.trim().toUpperCase();
  const name = document.getElementById('esp-name-input').value.trim();
  const year = parseInt(document.getElementById('esp-year-input').value, 10) || 3;
  const semester = parseInt(document.getElementById('esp-sem-input').value, 10) || 5;
  const secret_key = document.getElementById('esp-secret-input').value.trim();

  const res = await fetchApi('/devices', {
    method: 'POST',
    body: JSON.stringify({ device_uid, name, department_id, year, semester, secret_key })
  });

  if (res && res.success) {
    showToast('ESP32 Terminal paired with AES-256-GCM encryption!', 'success');
    closeRegisterDeviceModal();
    selectedDeviceId = res.data?.id || null;
    await loadEsp32Overview(department_id || currentDepartmentId);
    if (selectedDeviceId) {
      showEspConfigModal(selectedDeviceId);
    }
  }
}

function showEspConfigModal(deviceId) {
  const dev = (espOverviewData.devices || []).find(d => Number(d.id) === Number(deviceId));
  if (!dev) return;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const serverOrigin = isLocal ? 'http://192.168.1.15:3000' : window.location.origin;
  const secret = dev.secret_key || '8f4b2e9a1c7d6035a9e8f12b34c56d7890ab12cd34ef567890abcdef12345678';
  const localWarning = isLocal
    ? `// ⚠️ LOCAL TESTING NOTICE:\n// The ESP32 is a physical device and cannot reach "localhost".\n// Use your PC's local Wi-Fi IP address below (change 192.168.1.15 if your LAN IP is different):\n`
    : '';

  const code = `// Ready-to-Flash VidyaOS ESP32 Configuration for ${dev.name}
${localWarning}#define WIFI_SSID               "YOUR_LOCAL_WIFI_OR_HOTSPOT"
#define WIFI_PASSWORD           "YOUR_WIFI_PASSWORD"
#define VIDYAOS_SERVER_BASE_URL "${serverOrigin}/api/v1/devices/esp32"

#define DEVICE_UID              "${dev.device_uid}"
#define DEVICE_AES_SECRET       "${secret}"
#define FIRMWARE_VERSION        "v3.1.0-SECURE-BIOMETRIC-TERMINAL"

// Hardware Pins: AS608(RX=16,TX=17,Touch=33) | OLED(SDA=21,SCL=22) | W25Q32(CS=5,SCK=18,MISO=19,MOSI=23)
// Passive Buzzer(GPIO14) | LEDs(Blue=27,Green=25,Red=26,Amber=4) | 2S 7.4V Battery Divider(GPIO34)`;

  document.getElementById('esp-config-code').textContent = code;
  document.getElementById('esp-config-modal').style.display = 'flex';
}

function closeEspConfigModal() {
  document.getElementById('esp-config-modal').style.display = 'none';
}

function copyEspConfigCode() {
  const text = document.getElementById('esp-config-code')?.textContent || '';
  navigator.clipboard?.writeText(text);
  showToast('Copied ESP32 config.h to clipboard!', 'success');
}

// ─── Wi-Fi Management & Nearby Scan Studio ─────────────────────────────────
async function loadDeviceWifiNetworks(deviceId) {
  const targetId = deviceId || selectedDeviceId;
  const tbody = document.getElementById('wifi-networks-tbody');
  const badge = document.getElementById('wifi-active-badge');
  if (!targetId) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Please connect or select an ESP32 terminal to manage Wi-Fi.</td></tr>`;
    if (badge) badge.textContent = 'NO TERMINAL SELECTED';
    return;
  }

  try {
    const res = await fetchApi(`/devices/hod/${targetId}/wifi`);
    if (!res || !res.success || !res.data) return;

    const { networks = [], active_device } = res.data;
    if (badge) {
      if (active_device && active_device.is_online) {
        badge.textContent = `ONLINE: ${escHtml(active_device.ip_address || 'Connected')} (RSSI: ${active_device.wifi_rssi || -60} dBm)`;
        badge.classList.remove('offline');
        badge.classList.add('online');
      } else {
        badge.textContent = `STANDBY: READY TO CONNECT`;
      }
    }

    if (!tbody) return;
    if (!networks.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No custom Wi-Fi networks stored. Node is using default firmware credentials.</td></tr>`;
      return;
    }

    tbody.innerHTML = networks.map(net => {
      const isDef = Boolean(net.is_default);
      const rssi = net.last_rssi != null ? net.last_rssi : -65;
      let signalClass = 'medium';
      if (rssi >= -60) signalClass = 'strong';
      else if (rssi < -75) signalClass = 'weak';

      return `
        <tr>
          <td data-label="SSID">
            <div style="font-weight:700; color:var(--text-main); font-family:var(--font-family-mono);">${escHtml(net.ssid)}</div>
            ${net.bssid ? `<div style="font-size:0.7rem; color:var(--text-muted);">BSSID: ${escHtml(net.bssid)}</div>` : ''}
          </td>
          <td data-label="Security">
            <span class="wifi-security-badge ${net.encryption_type !== 'OPEN' ? 'secure' : ''}">${escHtml(net.encryption_type || 'WPA2_PSK')}</span>
          </td>
          <td data-label="Signal">
            <span class="wifi-signal-pill ${signalClass}">
              📶 ${rssi} dBm
            </span>
          </td>
          <td data-label="Default Status">
            ${isDef ? `<span class="esp-status-pill online">★ PRIMARY DEFAULT</span>` : `<span class="esp-status-pill offline">SECONDARY</span>`}
          </td>
          <td data-label="Added On">
            <span style="font-size:0.75rem; color:var(--text-muted);">${net.created_at ? new Date(net.created_at).toLocaleDateString('en-IN') : '—'}</span>
          </td>
          <td data-label="Actions" style="text-align:right;">
            <div style="display:inline-flex; gap:0.4rem; justify-content:flex-end;">
              ${!isDef ? `<button type="button" class="btn btn-secondary btn-sm" onclick="setWifiAsDefault(${net.id})" title="Set as default failover network">Set Default</button>` : ''}
              <button type="button" class="btn btn-primary btn-sm" onclick="switchDeviceWifiTo(${net.id}, '${escHtml(net.ssid)}')" title="Switch ESP32 to this network immediately">Switch Now</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteWifiNetwork(${net.id}, '${escHtml(net.ssid)}')" title="Remove Wi-Fi credentials">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('[ESP32 Portal] Failed to load Wi-Fi networks:', err);
  }
}

let wifiScanPollingTimer = null;

async function triggerScanNearbyWifi(forceRescan = false) {
  if (!selectedDeviceId) {
    showToast('Please select an active ESP32 terminal first.', 'error');
    return;
  }

  const modal = document.getElementById('scan-wifi-modal');
  const list = document.getElementById('scanned-wifi-list');
  if (modal) modal.style.display = 'flex';
  if (list) list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">🔍 Command dispatched to ESP32 radio... Scanning 2.4GHz channels...</div>`;

  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/scan`, { method: 'POST' });
    if (!res || !res.success) {
      showToast(res?.message || 'Failed to dispatch scan command.', 'error');
      return;
    }

    showToast('Wi-Fi scan initiated on ESP32 radio!', 'info');

    // Poll for scan results up to 4 times
    let attempts = 0;
    clearInterval(wifiScanPollingTimer);
    wifiScanPollingTimer = setInterval(async () => {
      attempts++;
      const scansRes = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/scans`);
      if (scansRes && scansRes.success && scansRes.data && scansRes.data.scans && scansRes.data.scans.length > 0) {
        clearInterval(wifiScanPollingTimer);
        renderScannedWifiList(scansRes.data.scans);
      } else if (attempts >= 4) {
        clearInterval(wifiScanPollingTimer);
        if (list) {
          list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No scan report received within timeout. Node may be offline or scanning. Try manual entry or rescan.</div>`;
        }
      }
    }, 1500);
  } catch (err) {
    console.error('[ESP32 Portal] Error initiating Wi-Fi scan:', err);
    if (list) list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--status-absent);">Error scanning networks.</div>`;
  }
}

function renderScannedWifiList(scans) {
  const list = document.getElementById('scanned-wifi-list');
  if (!list) return;

  if (!scans.length) {
    list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Zero nearby access points detected.</div>`;
    return;
  }

  list.innerHTML = scans.map(sc => {
    const rssi = sc.rssi != null ? sc.rssi : -70;
    let signalClass = 'medium';
    if (rssi >= -60) signalClass = 'strong';
    else if (rssi < -75) signalClass = 'weak';

    return `
      <div class="scanned-wifi-item" onclick="selectScannedWifi('${escHtml(sc.ssid)}')">
        <div>
          <div style="font-weight:700; color:var(--text-main); font-family:var(--font-family-mono); font-size:0.88rem;">${escHtml(sc.ssid)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            Ch ${sc.channel || 1} • ${escHtml(sc.bssid || 'AP')}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="wifi-security-badge ${sc.encryption_type !== 'OPEN' ? 'secure' : ''}">${escHtml(sc.encryption_type || 'WPA2_PSK')}</span>
          <span class="wifi-signal-pill ${signalClass}">📶 ${rssi} dBm</span>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:0.2rem 0.5rem;" onclick="event.stopPropagation(); selectScannedWifi('${escHtml(sc.ssid)}')">Select</button>
        </div>
      </div>
    `;
  }).join('');
}

function selectScannedWifi(ssid) {
  const ssidInput = document.getElementById('scanned-wifi-ssid');
  const passInput = document.getElementById('scanned-wifi-password');
  if (ssidInput) ssidInput.value = ssid;
  if (passInput) passInput.focus();

  document.querySelectorAll('.scanned-wifi-item').forEach(el => {
    const isTarget = el.textContent.includes(ssid);
    el.classList.toggle('active-selection', isTarget);
  });
}

function closeScanWifiModal() {
  clearInterval(wifiScanPollingTimer);
  const modal = document.getElementById('scan-wifi-modal');
  if (modal) modal.style.display = 'none';
}

async function submitConnectScannedWifi(e) {
  e.preventDefault();
  if (!selectedDeviceId) return;

  const ssid = document.getElementById('scanned-wifi-ssid').value.trim();
  const password = document.getElementById('scanned-wifi-password').value.trim();
  const is_default = document.getElementById('scanned-wifi-is-default').checked;

  if (!ssid) {
    showToast('Please select or enter an SSID.', 'error');
    return;
  }

  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/switch`, {
      method: 'POST',
      body: JSON.stringify({ ssid, password, is_default })
    });

    if (res && res.success) {
      showToast(`Wi-Fi switch command dispatched for "${ssid}"!`, 'success');
      closeScanWifiModal();
      await loadDeviceWifiNetworks(selectedDeviceId);
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to dispatch switch command.', 'error');
    }
  } catch (err) {
    showToast('Failed to switch Wi-Fi network.', 'error');
  }
}

function openAddWifiModal() {
  if (!selectedDeviceId) {
    showToast('Please select an active ESP32 terminal first.', 'error');
    return;
  }
  document.getElementById('manual-wifi-ssid').value = '';
  document.getElementById('manual-wifi-password').value = '';
  document.getElementById('manual-wifi-is-default').checked = false;
  document.getElementById('manual-wifi-switch-now').checked = true;
  document.getElementById('add-wifi-modal').style.display = 'flex';
}

function closeAddWifiModal() {
  document.getElementById('add-wifi-modal').style.display = 'none';
}

async function submitAddWifiManual(e) {
  e.preventDefault();
  if (!selectedDeviceId) return;

  const ssid = document.getElementById('manual-wifi-ssid').value.trim();
  const password = document.getElementById('manual-wifi-password').value.trim();
  const is_default = document.getElementById('manual-wifi-is-default').checked;
  const switch_now = document.getElementById('manual-wifi-switch-now').checked;

  if (!ssid) {
    showToast('Please enter network SSID.', 'error');
    return;
  }

  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi`, {
      method: 'POST',
      body: JSON.stringify({ ssid, password, is_default })
    });

    if (res && res.success) {
      if (switch_now) {
        await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/switch`, {
          method: 'POST',
          body: JSON.stringify({ ssid, password, is_default })
        });
        showToast(`Saved & dispatched immediate switch to "${ssid}"!`, 'success');
      } else {
        showToast(`Saved Wi-Fi network "${ssid}" to ESP32!`, 'success');
      }
      closeAddWifiModal();
      await loadDeviceWifiNetworks(selectedDeviceId);
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to save Wi-Fi network.', 'error');
    }
  } catch (err) {
    showToast('Error saving Wi-Fi network.', 'error');
  }
}

async function setWifiAsDefault(wifiId) {
  if (!selectedDeviceId) return;
  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/${wifiId}/default`, {
      method: 'PUT'
    });
    if (res && res.success) {
      showToast('Default failover Wi-Fi network updated!', 'success');
      await loadDeviceWifiNetworks(selectedDeviceId);
    } else {
      showToast(res?.message || 'Failed to update default network.', 'error');
    }
  } catch (err) {
    showToast('Error updating default network.', 'error');
  }
}

async function switchDeviceWifiTo(wifiId, ssid) {
  if (!selectedDeviceId) return;
  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/switch`, {
      method: 'POST',
      body: JSON.stringify({ ssid })
    });
    if (res && res.success) {
      showToast(`Dispatched switch command to "${ssid}"!`, 'success');
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to dispatch switch command.', 'error');
    }
  } catch (err) {
    showToast('Error dispatching switch command.', 'error');
  }
}

async function deleteWifiNetwork(wifiId, ssid) {
  if (!selectedDeviceId) return;
  if (!confirm(`Are you sure you want to remove Wi-Fi network "${ssid}" from this ESP32?`)) {
    return;
  }
  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/${wifiId}`, {
      method: 'DELETE'
    });
    if (res && res.success) {
      showToast(`Removed Wi-Fi network "${ssid}".`, 'success');
      await loadDeviceWifiNetworks(selectedDeviceId);
    } else {
      showToast(res?.message || 'Failed to delete Wi-Fi network.', 'error');
    }
  } catch (err) {
    showToast('Error deleting Wi-Fi network.', 'error');
  }
}

async function triggerWifiFallback() {
  if (!selectedDeviceId) {
    showToast('Please select an active ESP32 terminal first.', 'error');
    return;
  }
  if (!confirm('Trigger ESP32 to immediately fall back to its primary default Wi-Fi network?')) {
    return;
  }
  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/fallback`, {
      method: 'POST'
    });
    if (res && res.success) {
      showToast('Fallback command queued! Node will re-associate with default Wi-Fi.', 'success');
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to trigger fallback.', 'error');
    }
  } catch (err) {
    showToast('Error triggering fallback.', 'error');
  }
}

async function triggerWifiReset() {
  if (!selectedDeviceId) {
    showToast('Please select an active ESP32 terminal first.', 'error');
    return;
  }
  if (!confirm('⚠️ WARNING: Emergency Reset will clear all custom Wi-Fi credentials from ESP32 NVS memory and revert to the factory default credentials. Proceed?')) {
    return;
  }
  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/reset`, {
      method: 'POST'
    });
    if (res && res.success) {
      showToast('Emergency Wi-Fi reset queued! Factory credentials restored.', 'success');
      await loadDeviceWifiNetworks(selectedDeviceId);
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to trigger emergency reset.', 'error');
    }
  } catch (err) {
    showToast('Error triggering emergency reset.', 'error');
  }
}

window.loadEsp32Overview = loadEsp32Overview;
window.onSwitchDepartment = onSwitchDepartment;
window.onSelectActiveDevice = onSelectActiveDevice;
window.renderStudentsBiometricTable = renderStudentsBiometricTable;
window.queueEnrollCommandForStudent = queueEnrollCommandForStudent;
window.triggerTemplateSyncToDevice = triggerTemplateSyncToDevice;
window.simulateStudentBiometric = simulateStudentBiometric;
window.removeStudentCloudTemplate = removeStudentCloudTemplate;
window.openRegisterDeviceModal = openRegisterDeviceModal;
window.closeRegisterDeviceModal = closeRegisterDeviceModal;
window.submitRegisterEspDevice = submitRegisterEspDevice;
window.generateRandomHexSecret = generateRandomHexSecret;
window.showEspConfigModal = showEspConfigModal;
window.closeEspConfigModal = closeEspConfigModal;
window.copyEspConfigCode = copyEspConfigCode;
window.loadDeviceWifiNetworks = loadDeviceWifiNetworks;
window.triggerScanNearbyWifi = triggerScanNearbyWifi;
window.selectScannedWifi = selectScannedWifi;
window.closeScanWifiModal = closeScanWifiModal;
window.submitConnectScannedWifi = submitConnectScannedWifi;
window.openAddWifiModal = openAddWifiModal;
window.closeAddWifiModal = closeAddWifiModal;
window.submitAddWifiManual = submitAddWifiManual;
window.setWifiAsDefault = setWifiAsDefault;
window.switchDeviceWifiTo = switchDeviceWifiTo;
window.deleteWifiNetwork = deleteWifiNetwork;
window.triggerWifiFallback = triggerWifiFallback;
window.triggerWifiReset = triggerWifiReset;

document.addEventListener('DOMContentLoaded', loadEsp32Overview);
