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

guardRoute(['TEACHER', 'HOD', 'SYSTEM_ADMIN']);

let espOverviewData = {
  department: null,
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

async function loadEsp32Overview() {
  try {
    const res = await fetchApi('/devices/hod/overview');
    if (!res || !res.success || !res.data) return;

    espOverviewData = res.data;
    const { department, devices = [], students = [], commands = [], recent_scans = [] } = espOverviewData;

    const deptPill = document.getElementById('dept-code-pill');
    if (deptPill && department) {
      deptPill.textContent = `${department.code || 'DEPT'} • AES-256-GCM ENCRYPTED`;
    }

    if (!selectedDeviceId && devices.length > 0) {
      selectedDeviceId = devices[0].id;
    }

    // Populate device selector
    const sel = document.getElementById('active-device-select');
    if (sel) {
      sel.innerHTML = devices.length
        ? devices.map(d => `<option value="${d.id}" ${Number(d.id) === Number(selectedDeviceId) ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.device_uid)})</option>`).join('')
        : `<option value="">No ESP32 Connected Yet</option>`;
    }

    updateKpiCards(devices, students);
    renderDevicesList(devices);
    renderStudentsBiometricTable();
    renderRecentScans(recent_scans);
    renderCommandQueue(commands);
  } catch (err) {
    console.error('[ESP32 Portal] Failed to load overview:', err);
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
  updateKpiCards(espOverviewData.devices || [], espOverviewData.students || []);
  renderDevicesList(espOverviewData.devices || []);
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
  const device_uid = document.getElementById('esp-uid-input').value.trim().toUpperCase();
  const name = document.getElementById('esp-name-input').value.trim();
  const year = parseInt(document.getElementById('esp-year-input').value, 10) || 3;
  const semester = parseInt(document.getElementById('esp-sem-input').value, 10) || 5;
  const secret_key = document.getElementById('esp-secret-input').value.trim();

  const res = await fetchApi('/devices', {
    method: 'POST',
    body: JSON.stringify({ device_uid, name, year, semester, secret_key })
  });

  if (res && res.success) {
    showToast('ESP32 Terminal paired with AES-256-GCM encryption!', 'success');
    closeRegisterDeviceModal();
    selectedDeviceId = res.data?.id || null;
    await loadEsp32Overview();
    if (selectedDeviceId) {
      showEspConfigModal(selectedDeviceId);
    }
  }
}

function showEspConfigModal(deviceId) {
  const dev = (espOverviewData.devices || []).find(d => Number(d.id) === Number(deviceId));
  if (!dev) return;
  const serverOrigin = window.location.origin;
  const secret = dev.secret_key || 'REPLACE_WITH_64_HEX_AES256_SECRET';
  const code = `// Ready-to-Flash VidyaOS ESP32 Configuration for ${dev.name}
#define WIFI_SSID               "YOUR_CAMPUS_WIFI_SSID"
#define WIFI_PASSWORD           "YOUR_CAMPUS_WIFI_PASSWORD"
#define VIDYAOS_SERVER_BASE_URL "${serverOrigin}/api/v1/devices/esp32"

#define DEVICE_UID              "${dev.device_uid}"
#define DEVICE_AES_SECRET       "${secret}"
#define FIRMWARE_VERSION        "v3.0.0-AES256-W25Q32"

// Hardware Pins: AS608(RX=16,TX=17) | OLED(SDA=21,SCL=22) | W25Q32(CS=5,SCK=18,MISO=19,MOSI=23)
// Passive Buzzer(GPIO14) | LEDs(G=25,R=26,B=27) | 2S 7.4V Battery Divider(GPIO34)`;

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

window.loadEsp32Overview = loadEsp32Overview;
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

document.addEventListener('DOMContentLoaded', loadEsp32Overview);
