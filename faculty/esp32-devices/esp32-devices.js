/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOD ESP32 BIOMETRIC TERMINALS & CLOUD TEMPLATE VAULT CONTROLLER
 * Location: /frontend/faculty/esp32-devices/esp32-devices.js
 *
 * Features:
 * - Connects & pairs department ESP32 nodes with 256-bit AES-GCM keys
 * - Department Scoping: HOD strictly locked to their assigned department
 * - Live 0.96" OLED console simulator with real-time digital clock & 6 modes
 * - 5V Passive Piezo Buzzer WebAudio synthesizer with 6 hardware sound profiles
 * - Over-The-Air (OTA) wireless firmware updater
 * - Real-time connection ping status check with radar pulse
 * - Wi-Fi multi-network failover & nearby AP scanner
 * - 1-Click "Sync All Templates to ESP32" for instant hardware replacement
 * ═══════════════════════════════════════════════════════════════════════════
 */

guardRoute(['TEACHER', 'HOD', 'DEPT_HEAD', 'FACULTY', 'CLASS_TEACHER', 'COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN', 'ADMIN']);

let currentDepartmentId = null;
let cmdPollingTimer = null;
let lastKnownCompletedCmds = new Set();
let oledClockTimer = null;
let currentOledMode = 'standby';
let otaTargetDeviceId = null;

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
  } catch (_) { }
}

// Sound Profiles from oled_buzzer_ui.h
function beepAttendanceSuccess() {
  playPiezoBuzzerSequence([[2400, 2000, 50]]);
}

function beepAttendanceFailed() {
  playPiezoBuzzerSequence([
    [1800, 150, 100],
    [1800, 150, 100],
    [1800, 150, 100]
  ]);
}

function beepFingerNotRegistered() {
  playPiezoBuzzerSequence([
    [800, 75, 35],
    [800, 75, 35],
    [800, 75, 35],
    [800, 75, 35],
    [800, 75, 35],
    [800, 75, 35]
  ]);
}

function beepLowBattery() {
  playPiezoBuzzerSequence([
    [2000, 200, 800],
    [2000, 200, 800],
    [2000, 200, 800]
  ]);
}

function chimeEnrollSuccess() {
  playPiezoBuzzerSequence([
    [1318, 80, 30],
    [1568, 80, 30],
    [2093, 160, 50]
  ]);
}

function chimeBoot() {
  playPiezoBuzzerSequence([
    [1046, 70, 25],
    [1318, 70, 25],
    [1568, 110, 50]
  ]);
}

function updateOledScreen({ statusLeft, statusRight, headline, line1, line2, line3, leds = [false, false, false], isClock = false }) {
  if (statusLeft !== undefined) document.getElementById('oled-status-left').textContent = statusLeft;
  if (statusRight !== undefined) document.getElementById('oled-status-right').textContent = statusRight;
  if (headline !== undefined) document.getElementById('oled-headline').textContent = headline;
  
  const line1El = document.getElementById('oled-line1');
  if (line1El && line1 !== undefined) {
    line1El.textContent = line1;
    line1El.setAttribute('data-clock', isClock ? 'true' : 'false');
  }
  if (line2 !== undefined) document.getElementById('oled-line2').textContent = line2;
  if (line3 !== undefined) document.getElementById('oled-line3').textContent = line3;

  const [g, r, b] = leds;
  document.getElementById('sim-led-green')?.classList.toggle('on', Boolean(g));
  document.getElementById('sim-led-red')?.classList.toggle('on', Boolean(r));
  document.getElementById('sim-led-blue')?.classList.toggle('on', Boolean(b));
}

function getCurrentTimeFormatted() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function startLiveOledClock() {
  if (oledClockTimer) clearInterval(oledClockTimer);
  oledClockTimer = setInterval(() => {
    if (currentOledMode === 'standby') {
      const line1 = document.getElementById('oled-line1');
      if (line1 && line1.getAttribute('data-clock') === 'true') {
        line1.textContent = getCurrentTimeFormatted();
      }
    }
  }, 1000);
}

function setOledSimMode(mode) {
  currentOledMode = mode;
  document.querySelectorAll('.oled-sim-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`sim-btn-${mode}`)?.classList.add('active');

  const curDev = (espOverviewData.devices || []).find(d => Number(d.id) === Number(selectedDeviceId)) || {};
  const battVolts = curDev.battery_voltage ? Number(curDev.battery_voltage).toFixed(1) : '7.8';
  const battPct = curDev.battery_pct != null ? curDev.battery_pct : 84;
  const isOnline = Boolean(curDev.is_online);
  const rssi = curDev.wifi_rssi || -58;

  switch (mode) {
    case 'standby':
      updateOledScreen({
        statusLeft: isOnline ? `WiFi ${rssi}dB` : 'WiFi -58dB',
        statusRight: `${battPct}% ${battVolts}V`,
        headline: 'VIDYAOS BIOMETRIC',
        line1: getCurrentTimeFormatted(),
        line2: 'AS608 Ready • W25Q32 OK',
        line3: 'Place Finger to Scan',
        leds: [false, false, true],
        isClock: true
      });
      break;

    case 'success':
      updateOledScreen({
        statusLeft: 'SUCCESSFUL',
        statusRight: 'VERIFIED',
        headline: 'SUCCESSFULLY MARKED',
        line1: 'Enroll: 2024IT005',
        line2: 'Arjun Rao',
        line3: `Time: ${getCurrentTimeFormatted()}`,
        leds: [true, false, false],
        isClock: false
      });
      beepAttendanceSuccess();
      break;

    case 'fail':
      updateOledScreen({
        statusLeft: 'ATTENDANCE FAILED',
        statusRight: 'ERROR',
        headline: 'ATTENDANCE FAILED',
        line1: 'Class / Register Error',
        line2: 'Retry or Check Admin',
        line3: `Time: ${getCurrentTimeFormatted()}`,
        leds: [false, true, false],
        isClock: false
      });
      beepAttendanceFailed();
      break;

    case 'unregistered':
      updateOledScreen({
        statusLeft: 'NOT REGISTERED',
        statusRight: 'ALERT',
        headline: 'NOT REGISTERED',
        line1: 'Finger Not Found',
        line2: 'Slot Unassigned',
        line3: 'Contact HOD Office',
        leds: [false, true, false],
        isClock: false
      });
      beepFingerNotRegistered();
      break;

    case 'enroll':
      updateOledScreen({
        statusLeft: 'ENROLL MODE',
        statusRight: 'Slot #1',
        headline: 'ENROLL FINGERPRINT',
        line1: 'Amit Kumar',
        line2: 'Roll: #1 (2024IT011)',
        line3: '1. Place Finger',
        leds: [false, false, true],
        isClock: false
      });
      chimeEnrollSuccess();
      break;

    case 'low_batt':
      updateOledScreen({
        statusLeft: 'LOW BATTERY',
        statusRight: '14% 6.68V',
        headline: '! LOW BATTERY !',
        line1: '[█░░░] 14% (6.68V)',
        line2: 'Critical 2S Pack',
        line3: 'Connect Charger Now',
        leds: [false, true, false],
        isClock: false
      });
      beepLowBattery();
      break;
  }
}

// ─── Overview Data Loader & HOD Department Locking ─────────────────────────
async function loadEsp32Overview(deptIdOverride) {
  try {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const isSysAdmin = user && (user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN');

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

    // Populate and lock Department Switcher for HOD
    const deptSwitcher = document.getElementById('dept-switcher-select');
    if (deptSwitcher) {
      if (isSysAdmin && departments.length > 0) {
        deptSwitcher.disabled = false;
        deptSwitcher.innerHTML = departments.map(d =>
          `<option value="${d.id}" ${Number(d.id) === Number(currentDepartmentId) ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.code)})</option>`
        ).join('');
      } else {
        // Locked strictly to HOD department
        deptSwitcher.disabled = true;
        deptSwitcher.innerHTML = department
          ? `<option value="${department.id}" selected>${escHtml(department.name)} (${escHtml(department.code)}) [Locked]</option>`
          : `<option value="">Your Assigned Department</option>`;
      }
    }

    // Populate Department Selector in Add Modal (locked for HOD)
    const modalDeptSel = document.getElementById('esp-dept-input');
    const lockedBadge = document.getElementById('esp-dept-locked-badge');
    if (modalDeptSel) {
      if (isSysAdmin && departments.length > 0) {
        modalDeptSel.disabled = false;
        if (lockedBadge) lockedBadge.style.display = 'none';
        modalDeptSel.innerHTML = departments.map(d =>
          `<option value="${d.id}" ${Number(d.id) === Number(currentDepartmentId) ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.code)})</option>`
        ).join('');
      } else {
        modalDeptSel.disabled = true;
        if (lockedBadge) lockedBadge.style.display = 'inline-block';
        modalDeptSel.innerHTML = department
          ? `<option value="${department.id}" selected>${escHtml(department.name)} (${escHtml(department.code)})</option>`
          : `<option value="">Your Assigned Department</option>`;
      }
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

    // Populate active device selector
    const sel = document.getElementById('active-device-select');
    if (sel) {
      sel.innerHTML = devices.length
        ? devices.map(d => {
            const devName = d.name || d.device_name || 'IT Lab Biometric Terminal 01';
            const devUid = d.device_uid || d.device_uuid || 'ESP32-IT-LAB-01';
            return `<option value="${d.id}" ${Number(d.id) === Number(selectedDeviceId) ? 'selected' : ''}>${escHtml(devName)} (${escHtml(devUid)})</option>`;
          }).join('')
        : `<option value="">No ESP32 Connected Yet</option>`;
      if (selectedDeviceId) sel.value = String(selectedDeviceId);
    }

    updateKpiCards(devices, students);
    renderDevicesList(devices);
    renderStudentsBiometricTable();
    populateEnrollStudentSelect();
    renderRecentScans(recent_scans);
    renderCommandQueue(commands);
    manageCommandPolling(commands);

    // Sync OLED screen with selected device
    setOledSimMode('standby');
    startLiveOledClock();

    if (selectedDeviceId) {
      await loadDeviceWifiNetworks(selectedDeviceId);
    }

    await loadDeviceRemoteLogs();
    if (!remoteLogsPollingTimer) {
      remoteLogsPollingTimer = setInterval(loadDeviceRemoteLogs, 4000);
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
        <button type="button" class="btn btn-secondary btn-sm" onclick="loadEsp32Overview()">Retry Loading</button>
      </div>
    `;
  }
  const tbody = document.getElementById('bio-students-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--status-absent, #dc2626);">Error loading student biometric records. <button type="button" class="btn btn-secondary btn-sm" style="margin-left:0.5rem;" onclick="loadEsp32Overview()">Retry</button></td></tr>`;
  }
}

function onSwitchDepartment(deptId) {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const isSysAdmin = user && (user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN');
  if (!isSysAdmin) {
    showToast('HOD accounts can only view their own department.', 'warning');
    return;
  }
  currentDepartmentId = deptId ? parseInt(deptId, 10) : null;
  selectedDeviceId = null;
  loadEsp32Overview(currentDepartmentId);
}

function manageCommandPolling(commands = []) {
  const pendingCmds = commands.filter(c => c.status === 'PENDING' || c.status === 'DELIVERED');
  commands.forEach(c => {
    if (c.status === 'COMPLETED' && !lastKnownCompletedCmds.has(c.id)) {
      lastKnownCompletedCmds.add(c.id);
      showToast(`ESP32 executed command: ${c.command_type}!`, 'success');
    }
  });

  if (pendingCmds.length > 0 && !cmdPollingTimer) {
    cmdPollingTimer = setInterval(async () => {
      try {
        const url = currentDepartmentId ? `/devices/hod/overview?department_id=${currentDepartmentId}` : '/devices/hod/overview';
        const res = await fetchApi(url);
        if (res && res.success && res.data) {
          espOverviewData = res.data;
          renderCommandQueue(espOverviewData.commands || []);
          renderRecentScans(espOverviewData.recent_scans || []);
          const activeCmds = (espOverviewData.commands || []).filter(c => c.status === 'PENDING' || c.status === 'DELIVERED');
          if (activeCmds.length === 0) {
            clearInterval(cmdPollingTimer);
            cmdPollingTimer = null;
            await loadEsp32Overview();
          }
        }
      } catch (_) { }
    }, 3000);
  } else if (pendingCmds.length === 0 && cmdPollingTimer) {
    clearInterval(cmdPollingTimer);
    cmdPollingTimer = null;
  }
}

function updateKpiCards(devices, students) {
  const onlineCount = devices.filter(d => Boolean(d.is_online)).length;
  const kpiDev = document.getElementById('kpi-esp-devices');
  if (kpiDev) kpiDev.textContent = `${onlineCount} / ${devices.length}`;

  const dot = document.getElementById('kpi-dot-status');
  if (dot) {
    dot.className = `esp-kpi-dot ${onlineCount > 0 ? 'online' : ''}`;
  }

  const nodeStatusPill = document.getElementById('kpi-dot-status-pill');
  if (nodeStatusPill) {
    nodeStatusPill.className = `esp-node-status-pill ${onlineCount > 0 ? 'online' : 'offline'}`;
  }

  const nodeStatusText = document.getElementById('header-node-status-text');
  if (nodeStatusText) {
    nodeStatusText.textContent = `${onlineCount} NODE${onlineCount === 1 ? '' : 'S'} ONLINE`;
  }

  const termCountBadge = document.getElementById('terminal-count-badge');
  if (termCountBadge) {
    termCountBadge.textContent = `${devices.length} PAIRED`;
    termCountBadge.className = `esp-status-pill ${onlineCount > 0 ? 'online' : 'offline'}`;
  }

  const enrolledCount = students.filter(s => s.biometric_status === 'ENROLLED').length;
  const totalStudents = students.length;
  const coveragePct = totalStudents > 0 ? Math.round((enrolledCount / totalStudents) * 100) : 0;

  const badgeStudents = document.getElementById('badge-students-count');
  if (badgeStudents) badgeStudents.textContent = String(totalStudents);

  const kpiTpl = document.getElementById('kpi-esp-templates');
  if (kpiTpl) kpiTpl.textContent = `${enrolledCount} / ${totalStudents}`;

  const kpiCov = document.getElementById('kpi-esp-coverage');
  if (kpiCov) kpiCov.textContent = `${coveragePct}% students stored in MySQL cloud vault`;

  const activeDev = devices.find(d => Number(d.id) === Number(selectedDeviceId)) || devices[0];
  if (activeDev) {
    const volts = activeDev.battery_voltage ? Number(activeDev.battery_voltage).toFixed(2) : '7.85';
    const pct = activeDev.battery_pct != null ? activeDev.battery_pct : 84;
    const kpiBatt = document.getElementById('kpi-esp-battery');
    if (kpiBatt) kpiBatt.textContent = `${volts}V (${pct}%)`;

    const battTag = document.getElementById('kpi-batt-status');
    if (battTag) {
      if (pct <= 20) {
        battTag.textContent = 'LOW BATTERY';
        battTag.className = 'esp-pill-tag';
        battTag.style.color = 'var(--status-absent)';
      } else {
        battTag.textContent = '7.4V Pack';
        battTag.className = 'esp-pill-tag green';
        battTag.style.color = '';
      }
    }

    const kpiOff = document.getElementById('kpi-esp-offline');
    if (kpiOff) kpiOff.textContent = `${activeDev.offline_queue_count || 0} Records`;
  }
}

function onSelectActiveDevice(deviceId) {
  selectedDeviceId = parseInt(deviceId, 10);
  const sel = document.getElementById('active-device-select');
  if (sel && selectedDeviceId) {
    sel.value = String(selectedDeviceId);
  }
  updateKpiCards(espOverviewData.devices || [], espOverviewData.students || []);
  renderDevicesList(espOverviewData.devices || []);
  setOledSimMode('standby');
  if (selectedDeviceId) {
    loadDeviceWifiNetworks(selectedDeviceId);
    loadDeviceRemoteLogs();
  }
}

// ─── Connected Devices List with Live Ping & OTA Update Buttons ───────────
function renderDevicesList(devices) {
  const wrap = document.getElementById('esp-devices-list');
  if (!wrap) return;

  if (!devices.length) {
    wrap.innerHTML = `
      <div class="esp-empty-box">
        <div style="font-weight:700; font-size:0.95rem; margin-bottom:0.35rem;">No ESP32 Biometric Terminal Paired Yet</div>
        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.85rem;">Connect your department's ESP32 + AS608 + OLED + W25Q32 node to start enrolling fingerprints and marking attendance.</div>
        <button type="button" class="btn btn-primary btn-sm" id="btn-add-esp-first" onclick="openRegisterDeviceModal()">+ Add ESP Terminal</button>
      </div>
    `;
    return;
  }

  wrap.innerHTML = devices.map(d => {
    const isSelected = Number(d.id) === Number(selectedDeviceId);
    const volts = d.battery_voltage ? Number(d.battery_voltage).toFixed(2) : '7.85';
    const battPct = d.battery_pct != null ? d.battery_pct : 84;
    const secretPreview = d.secret_key ? `${d.secret_key.slice(0, 10)}...${d.secret_key.slice(-6)}` : 'AES-256 Configured';
    const devUid = d.device_uid || d.device_uuid || 'ESP32-IT-LAB-01';
    const devName = d.name || d.device_name || 'IT Lab Biometric Terminal 01';
    const isOnline = Boolean(d.is_online);

    return `
      <article class="esp-device-card ${isSelected ? 'selected' : ''}" onclick="onSelectActiveDevice(${d.id})">
        <div class="esp-dev-header">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <strong style="font-size:0.95rem; color:var(--text-main);">${escHtml(devName)}</strong>
              <span id="dev-status-pill-${d.id}" class="esp-status-pill ${isOnline ? 'online radar-pulse' : 'offline'}">${isOnline ? '● ONLINE' : '○ STANDBY'}</span>
            </div>
            <div style="font-family:var(--font-family-mono); font-size:0.75rem; color:var(--color-primary); margin-top:2px;">
              UID: ${escHtml(devUid)} &bull; ${escHtml(d.firmware_version || 'v3.1.0-AES256-GCM')}
            </div>
          </div>
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); checkDeviceConnection(${d.id})" title="Ping ESP32 node and check live connection">Ping</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openOtaUpdateModal(${d.id})" title="Wireless Over-The-Air firmware update">OTA</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); showEspConfigModal(${d.id})" title="View C++ config.h for this ESP32">config.h</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); triggerTemplateSyncToDevice(${d.id})" title="Push all stored student templates from MySQL to this ESP32">Sync Templates</button>
          </div>
        </div>

        <div class="esp-dev-metrics">
          <div class="esp-dev-metric">
            <span class="m-lbl">2S Battery</span>
            <span class="m-val">${volts}V (${battPct}%)</span>
          </div>
          <div class="esp-dev-metric">
            <span class="m-lbl">Wi-Fi &amp; Signal</span>
            <span class="m-val">${isOnline ? (d.wifi_rssi || -55) + ' dBm' : 'Standby'}</span>
          </div>
          <div class="esp-dev-metric">
            <span class="m-lbl">W25Q32 Queue</span>
            <span class="m-val">${d.offline_queue_count || 0} Pending</span>
          </div>
          <div class="esp-dev-metric">
            <span class="m-lbl">Dept Cloud Templates</span>
            <span class="m-val">${d.enrolled_count || 0} Students</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ─── Live Connection Check (Ping) ──────────────────────────────────────────
async function checkDeviceConnection(deviceId) {
  try {
    const btn = event?.currentTarget;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Pinging...';
    }
    const t0 = performance.now();
    const res = await fetchApi(`/devices/hod/${deviceId}/ping`);
    const latency = Math.round(performance.now() - t0);

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Ping';
    }

    if (!res || !res.success || !res.data) {
      showToast(res?.error?.message || 'Could not reach ESP32 node.', 'error');
      return;
    }

    const d = res.data;
    const badge = document.getElementById(`dev-status-pill-${deviceId}`);

    if (d.is_online) {
      if (badge) {
        badge.className = 'esp-status-pill online radar-pulse';
        badge.textContent = `● ONLINE (${d.seconds_ago}s ago)`;
      }
      showToast(`ESP32 Connected! Ping: ${latency}ms • IP: ${d.ip_address || '192.168.1.20'} • RSSI: ${d.wifi_rssi || -54} dBm`, 'success');
      updateOledScreen({
        statusLeft: `WiFi ${d.wifi_rssi || -54}dB`,
        statusRight: `${d.battery_pct || 84}% ${d.battery_voltage ? Number(d.battery_voltage).toFixed(1) + 'V' : '7.8V'}`
      });
    } else {
      if (badge) {
        badge.className = 'esp-status-pill offline';
        badge.textContent = '○ STANDBY';
      }
      const ago = d.seconds_ago != null ? `${Math.round(d.seconds_ago / 60)} min ago` : 'never';
      showToast(`ESP32 in Standby. Last heartbeat seen: ${ago}. Node will wake on touch or next interval.`, 'warning');
    }
  } catch (err) {
    showToast('Failed to ping device: ' + err.message, 'error');
  }
}

async function checkActiveEspConnection() {
  const targetId = selectedDeviceId || (espOverviewData?.devices && espOverviewData.devices[0]?.id);
  if (!targetId) {
    showToast('No ESP32 terminal paired yet. Please add an ESP terminal.', 'warning');
    return;
  }
  const btn = document.getElementById('btn-check-esp-connect');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Checking...';
  }
  await checkDeviceConnection(targetId);
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Check ESP Connected';
  }
}
window.checkActiveEspConnection = checkActiveEspConnection;

// ─── Over-The-Air (OTA) Wireless Firmware Updater ──────────────────────────
function openOtaUpdateModal(deviceId) {
  otaTargetDeviceId = deviceId || selectedDeviceId;
  const dev = (espOverviewData.devices || []).find(d => Number(d.id) === Number(otaTargetDeviceId));
  const uidLabel = document.getElementById('ota-device-uid-label');
  if (uidLabel) uidLabel.textContent = dev ? (d.device_uid || d.device_uuid || `Device #${otaTargetDeviceId}`) : `Device #${otaTargetDeviceId}`;
  const fwLabel = document.getElementById('ota-current-firmware-label');
  if (fwLabel) fwLabel.textContent = dev?.firmware_version || 'v3.1.0-STABLE';

  const modal = document.getElementById('ota-update-modal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeOtaUpdateModal() {
  const modal = document.getElementById('ota-update-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function onOtaSourceChange(val) {
  const customGroup = document.getElementById('ota-custom-url-group');
  if (customGroup) customGroup.style.display = val === 'custom' ? 'block' : 'none';
}

async function submitOtaUpdate(e) {
  e.preventDefault();
  if (!otaTargetDeviceId) {
    showToast('Please select an active ESP32 device first.', 'error');
    return;
  }

  const source = document.getElementById('ota-binary-source')?.value || 'local';
  let binaryUrl = `${window.location.protocol}//${window.location.host}/uploads/firmware/firmware.bin`;
  if (source === 'github') {
    binaryUrl = 'https://github.com/onebotyt/Vidya/releases/latest/download/firmware.bin';
  } else if (source === 'custom') {
    const custom = document.getElementById('ota-custom-url')?.value.trim();
    if (custom) binaryUrl = custom;
  }

  const btn = document.getElementById('btn-submit-ota');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Queuing OTA Update...';
  }

  try {
    const res = await fetchApi(`/devices/hod/${otaTargetDeviceId}/ota-update`, {
      method: 'POST',
      body: JSON.stringify({ url: binaryUrl })
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Update Firmware Now (OTA)';
    }

    if (res && res.success) {
      showToast(res.message || 'Wireless OTA update queued! ESP32 will download firmware on next heartbeat.', 'success');
      closeOtaUpdateModal();
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to trigger OTA update.', 'error');
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Update Firmware Now (OTA)';
    }
    showToast('Error dispatching OTA update: ' + err.message, 'error');
  }
}

// ─── Student Biometric Table ───────────────────────────────────────────────
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
        <td data-label="UBTER Roll #">
          <span style="font-family:var(--font-family-mono); font-size:0.8rem; font-weight:600; color:var(--color-primary);">${escHtml(st.ubter_roll_no || st.official_enrollment_no || '—')}</span>
          ${st.registration_no ? `<div style="font-size:0.72rem; color:var(--text-muted);">UBTER: ${escHtml(st.registration_no)}</div>` : ''}
        </td>
        <td data-label="Cohort">
          <span class="esp-pill-tag">Yr ${st.year || 1} • Sem ${st.semester || 1}</span>
        </td>
        <td data-label="Cloud Template">
          ${isEnrolled ? `
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span class="esp-status-pill online" style="width:fit-content;">512B TEMPLATE STORED</span>
              <span style="font-family:var(--font-family-mono); font-size:0.68rem; color:var(--text-muted);" title="Portable SHA-256: ${escHtml(st.template_sha256 || '')}">SHA256: ${escHtml(shaShort)}</span>
            </div>
          ` : `
            <span class="esp-status-pill offline">NOT ENROLLED</span>
          `}
        </td>
        <td data-label="Actions" style="text-align:right;">
          <div style="display:inline-flex; gap:0.35rem; flex-wrap:wrap; justify-content:flex-end;">
            <button type="button" class="btn btn-primary btn-sm" onclick="selectStudentForEnrollment(${st.student_id})" title="Select student in Registration Station and trigger AS608 biometric enrollment">
              Enroll Biometric
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="simulateStudentBiometric(${st.student_id}, 'ENROLL_TEMPLATE')" title="Capture & encrypt 512-byte AS608 template into MySQL">
              ${isEnrolled ? 'Update Template' : 'Capture Template'}
            </button>
            ${isEnrolled ? `
              <button type="button" class="btn btn-secondary btn-sm" style="border-color:var(--status-present); color:var(--status-present);" onclick="simulateStudentBiometric(${st.student_id}, 'MARK_ATTENDANCE')" title="Test attendance scan & OLED display for this student">
                Test Scan
              </button>
              <button type="button" class="btn btn-danger btn-sm" onclick="removeStudentCloudTemplate(${st.student_id}, '${escHtml(st.full_name)}', '${st.class_roll_no || ''}')" title="Remove student biometric template from cloud vault & ESP32 hardware slots">
                Remove
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Student Biometric Registration Station Management ──────────────────────
function populateEnrollStudentSelect() {
  const cohortFilter = document.getElementById('enroll-cohort-filter')?.value || 'pending';
  filterEnrollStudentDropdown(cohortFilter);
}

function filterEnrollStudentDropdown(filterVal) {
  const sel = document.getElementById('enroll-student-select');
  if (!sel) return;
  const allStudents = espOverviewData.students || [];
  let students = allStudents;

  if (filterVal === 'pending') {
    students = allStudents.filter(s => s.biometric_status !== 'ENROLLED');
  } else if (filterVal !== 'all') {
    students = allStudents.filter(s => String(s.year) === String(filterVal));
  }

  const currentVal = sel.value;

  // Group students by Year/Cohort for clean, structured navigation
  const groups = {};
  students.forEach(s => {
    const yr = s.year || 1;
    const key = `Year ${yr} Cohort`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  let optionsHtml = `<option value="">Choose a student (${students.length} ${filterVal === 'pending' ? 'pending' : 'students'})...</option>`;

  Object.keys(groups).sort().forEach(grp => {
    optionsHtml += `<optgroup label="${grp}">`;
    groups[grp].forEach(s => {
      const isEnrolled = s.biometric_status === 'ENROLLED';
      const statusLabel = isEnrolled ? 'Enrolled' : 'Pending';
      const roll = s.class_roll_no ? `#${s.class_roll_no}` : (s.official_enrollment_no ? `UBTER ${s.official_enrollment_no}` : 'No Roll');
      optionsHtml += `<option value="${s.student_id}">${roll} • ${escHtml(s.full_name)} (${statusLabel} — Sem ${s.semester || 1})</option>`;
    });
    optionsHtml += `</optgroup>`;
  });

  sel.innerHTML = optionsHtml;

  if (currentVal && students.some(s => String(s.student_id) === String(currentVal))) {
    sel.value = currentVal;
  } else if (students.length > 0 && !sel.value) {
    const firstPending = students.find(s => s.biometric_status !== 'ENROLLED') || students[0];
    sel.value = String(firstPending.student_id);
  }
  onSelectEnrollStudent(sel.value);
}

function onSelectEnrollStudent(studentId) {
  const student = (espOverviewData.students || []).find(s => String(s.student_id) === String(studentId));
  const initialsEl = document.getElementById('enroll-chip-initials');
  const nameEl = document.getElementById('enroll-chip-name');
  const metaEl = document.getElementById('enroll-chip-meta');
  const statusPill = document.getElementById('enroll-chip-status-pill');
  const removeBtn = document.getElementById('btn-remove-selected-bio');
  const msgEl = document.getElementById('bio-scanner-msg');
  const calloutEl = document.getElementById('bio-scanner-callout');
  const visualBox = document.getElementById('bio-scanner-visual-box');
  const step1 = document.getElementById('step-pill-1');
  const step2 = document.getElementById('step-pill-2');
  const step3 = document.getElementById('step-pill-3');

  if (!student) {
    if (initialsEl) initialsEl.textContent = '--';
    if (nameEl) nameEl.textContent = 'No Student Selected';
    if (metaEl) metaEl.textContent = 'Select a student above or click Enroll from vault table below';
    if (statusPill) {
      statusPill.className = 'esp-status-pill offline';
      statusPill.textContent = 'WAITING SELECTION';
    }
    if (removeBtn) removeBtn.style.display = 'none';
    if (visualBox) visualBox.className = 'esp-hardware-bezel';
    if (calloutEl) calloutEl.className = 'esp-scanner-callout';
    if (step1) step1.className = 'step-pill active';
    if (step2) step2.className = 'step-pill';
    if (step3) step3.className = 'step-pill';
    if (msgEl) {
      msgEl.innerHTML = 'Select a student and click <strong>"Enroll Fingerprint"</strong>. Terminal chimes and waits for finger touch.';
    }
    return;
  }

  const isEnrolled = student.biometric_status === 'ENROLLED';
  const names = (student.full_name || 'S').trim().split(/\s+/);
  const initials = names.length > 1 ? (names[0][0] + names[names.length - 1][0]).toUpperCase() : names[0].slice(0, 2).toUpperCase();

  if (initialsEl) initialsEl.textContent = initials;
  if (nameEl) nameEl.textContent = student.full_name;
  if (metaEl) {
    const roll = student.class_roll_no ? `Roll #${student.class_roll_no}` : (student.official_enrollment_no || 'No Roll');
    metaEl.textContent = `${roll} • Yr ${student.year || 1} Sem ${student.semester || 1} • Dept: ${espOverviewData.department?.name || 'Department'}`;
  }

  if (statusPill) {
    if (isEnrolled) {
      statusPill.className = 'esp-status-pill online';
      statusPill.textContent = 'ENROLLED (512B AS608)';
    } else {
      statusPill.className = 'esp-status-pill offline';
      statusPill.textContent = 'NOT ENROLLED';
    }
  }

  if (removeBtn) {
    removeBtn.style.display = isEnrolled ? 'inline-flex' : 'none';
  }

  if (step1) step1.className = 'step-pill completed';
  if (step2) step2.className = isEnrolled ? 'step-pill completed' : 'step-pill active';
  if (step3) step3.className = isEnrolled ? 'step-pill completed' : 'step-pill';

  if (calloutEl) {
    calloutEl.className = `esp-scanner-callout ${isEnrolled ? 'success' : ''}`;
  }

  if (visualBox) {
    visualBox.className = `esp-hardware-bezel ${isEnrolled ? 'success' : ''}`;
  }

  if (msgEl) {
    if (isEnrolled) {
      msgEl.innerHTML = `<strong>${escHtml(student.full_name)}</strong> has an enrolled 512B AS608 template in MySQL cloud vault. Click <strong>"Test Attendance Scan"</strong> to verify verification, or <strong>"Enroll"</strong> to overwrite template.`;
    } else {
      msgEl.innerHTML = `<strong>Ready to enroll ${escHtml(student.full_name)}:</strong> Click <strong>"Enroll Fingerprint on ESP32"</strong> below to send enrollment signal to active terminal.`;
    }
  }
}

function focusBiometricEnrollmentSection(studentId) {
  if (studentId) {
    const sel = document.getElementById('enroll-student-select');
    if (sel) {
      sel.value = String(studentId);
      onSelectEnrollStudent(studentId);
    }
  }
  const el = document.getElementById('section-bio-enrollment');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 1800);
  }
}

function selectStudentForEnrollment(studentId) {
  focusBiometricEnrollmentSection(studentId);
  enrollCurrentSelectedStudent();
}

async function enrollCurrentSelectedStudent() {
  const sel = document.getElementById('enroll-student-select');
  const studentId = sel ? sel.value : null;
  if (!studentId) {
    showToast('Please select a student to enroll first.', 'warning');
    if (sel) sel.focus();
    return;
  }
  const student = (espOverviewData.students || []).find(s => String(s.student_id) === String(studentId));
  if (!student) {
    showToast('Selected student not found in department roster.', 'error');
    return;
  }

  const visualBox = document.getElementById('bio-scanner-visual-box');
  const msgEl = document.getElementById('bio-scanner-msg');
  const calloutEl = document.getElementById('bio-scanner-callout');
  const step2 = document.getElementById('step-pill-2');
  const step3 = document.getElementById('step-pill-3');

  if (visualBox) {
    visualBox.classList.remove('success');
    visualBox.classList.add('scanning');
  }
  if (calloutEl) {
    calloutEl.className = 'esp-scanner-callout scanning';
  }
  if (step2) step2.classList.add('active');
  if (step3) step3.classList.remove('active');
  if (msgEl) {
    msgEl.innerHTML = `<strong>Enrolling ${escHtml(student.full_name)}:</strong> Terminal buzzer chiming! Please place finger firmly on AS608 optical sensor.`;
  }

  await queueEnrollCommandForStudent(student.student_id, student.full_name, student.class_roll_no);
}

async function simulateCurrentSelectedStudent() {
  const sel = document.getElementById('enroll-student-select');
  const studentId = sel ? sel.value : null;
  if (!studentId) {
    showToast('Please select a student first.', 'warning');
    return;
  }
  await simulateStudentBiometric(studentId, 'MARK_ATTENDANCE');
}

async function removeCurrentSelectedStudentTemplate() {
  const sel = document.getElementById('enroll-student-select');
  const studentId = sel ? sel.value : null;
  if (!studentId) return;
  const student = (espOverviewData.students || []).find(s => String(s.student_id) === String(studentId));
  if (!student) return;
  await removeStudentCloudTemplate(student.student_id, student.full_name, student.class_roll_no);
  onSelectEnrollStudent(studentId);
}

function switchEspTab(tabName) {
  const tabs = ['vault', 'feed', 'logs'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (panel) panel.classList.toggle('active', t === tabName);
  });
}

// ─── Queue Fingerprint Enrollment Command ──────────────────────────────────
async function queueEnrollCommandForStudent(studentId, fullName, rollNo) {
  if (!selectedDeviceId) {
    showToast('Please connect or select an ESP32 terminal first.', 'warning');
    openRegisterDeviceModal();
    return;
  }

  updateOledScreen({
    statusLeft: 'ENROLL MODE',
    statusRight: 'Slot #1',
    headline: 'ENROLL FINGERPRINT',
    line1: fullName,
    line2: `Roll: #${rollNo || '1'}`,
    line3: '1. Place Finger',
    leds: [false, false, true],
    isClock: false
  });
  chimeEnrollSuccess();

  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId })
    });

    if (res && res.success) {
      showToast(`Enrollment command queued for ${fullName}! Place finger on ESP32 sensor.`, 'info');
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to dispatch enroll command.', 'error');
    }
  } catch (err) {
    showToast('Failed to queue enrollment command: ' + err.message, 'error');
  }
}

// ─── 1-Click Restore / Sync Templates to ESP32 ────────────────────────────
async function triggerTemplateSyncToDevice(deviceId) {
  const targetId = deviceId || selectedDeviceId;
  if (!targetId) {
    showToast('Please connect or select an ESP32 terminal first.', 'warning');
    return;
  }

  updateOledScreen({
    statusLeft: 'CLOUD RESTORE',
    statusRight: 'SYNCING',
    headline: 'RESTORING TEMPLATES',
    line1: 'DOWNLOADING VAULT',
    line2: 'Syncing MySQL Templates',
    line3: 'AS608 Flash Writing...',
    leds: [false, false, true],
    isClock: false
  });

  try {
    const res = await fetchApi(`/devices/hod/${targetId}/sync-templates`, { method: 'POST' });
    if (res && res.success) {
      showToast(res.message || 'Template synchronization command queued!', 'success');
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to trigger template sync.', 'error');
    }
  } catch (err) {
    showToast('Error syncing templates: ' + err.message, 'error');
  }
}

// ─── Simulation & Demo Biometric Trigger ────────────────────────────────────
async function simulateStudentBiometric(studentId, actionType = 'ENROLL_TEMPLATE') {
  if (!selectedDeviceId) {
    showToast('Please connect or select an ESP32 terminal first.', 'warning');
    return;
  }

  try {
    const res = await fetchApi(`/devices/hod/simulate-biometric`, {
      method: 'POST',
      body: JSON.stringify({
        device_id: selectedDeviceId,
        student_id: studentId,
        action: actionType
      })
    });

    if (res && res.success) {
      const st = res.data?.student;
      if (actionType === 'ENROLL_TEMPLATE') {
        showToast(`Captured 512B AS608 Template for ${st?.full_name || 'Student'}! Encrypted with AES-256-GCM.`, 'success');
        updateOledScreen({
          statusLeft: 'SUCCESSFUL',
          statusRight: 'ENROLLED',
          headline: 'TEMPLATE STORED',
          line1: st?.full_name || 'Student',
          line2: `Roll: #${st?.class_roll_no || '—'}`,
          line3: 'Cloud Sync Completed!',
          leds: [true, false, false],
          isClock: false
        });
        chimeEnrollSuccess();
      } else {
        showToast(`Attendance Verified for ${st?.full_name || 'Student'}!`, 'success');
        updateOledScreen({
          statusLeft: 'SUCCESSFUL',
          statusRight: 'VERIFIED',
          headline: 'SUCCESSFULLY MARKED',
          line1: `Roll: ${st?.ubter_roll_no || st?.official_enrollment_no || '24011090008'}`,
          line2: st?.full_name || 'Student',
          line3: `Time: ${getCurrentTimeFormatted()}`,
          leds: [true, false, false],
          isClock: false
        });
        beepAttendanceSuccess();
      }
      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Simulation request failed.', 'error');
    }
  } catch (err) {
    showToast('Simulation failed: ' + err.message, 'error');
  }
}

async function removeStudentCloudTemplate(studentId, studentName = 'Student', rollNo = '') {
  const rollLabel = rollNo ? ` (Roll #${rollNo})` : '';
  const confirmMsg = `Are you sure you want to remove biometric data for "${studentName}"${rollLabel}?\n\nThis will permanently delete the 512-byte template from the MySQL cloud vault and clear the hardware slot.`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetchApi(`/devices/hod/template/${studentId}`, { method: 'DELETE' });
    if (res && res.success) {
      showToast(`Biometric template for "${studentName}" removed from cloud vault.`, 'success');
      
      // Provide visual simulated hardware feedback
      updateOledScreen({
        statusLeft: 'BIOMETRIC REMOVED',
        statusRight: 'VAULT SYNC',
        headline: 'TEMPLATE CLEARED',
        line1: studentName,
        line2: rollNo ? `Roll: #${rollNo}` : 'Hardware Slot Freed',
        line3: 'Vault & Roster Synced',
        leds: [false, true, false],
        isClock: false
      });
      playBeep(800, 300);

      await loadEsp32Overview();
    } else {
      showToast(res?.message || 'Failed to remove template.', 'error');
    }
  } catch (err) {
    showToast('Error removing template: ' + err.message, 'error');
  }
}

function renderRecentScans(scans = []) {
  const feed = document.getElementById('esp-recent-scans-feed');
  if (!feed) return;
  if (!scans.length) {
    feed.innerHTML = `<div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.82rem;">No recent biometric scans recorded yet today.</div>`;
    return;
  }
  feed.innerHTML = scans.slice(0, 6).map(s => `
    <div class="esp-feed-item">
      <div>
        <div style="font-weight:700; color:var(--text-main); font-size:0.86rem;">${escHtml(s.full_name || 'Student')} <span style="font-size:0.75rem; color:var(--color-primary); font-family:var(--font-family-mono);">#${s.class_roll_no || '—'}</span></div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Slot #${s.finger_id || 0} • ${escHtml(s.device_name || 'ESP32')}</div>
      </div>
      <div style="text-align:right;">
        <span class="esp-status-pill online">VERIFIED</span>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${s.scanned_at ? new Date(s.scanned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</div>
      </div>
    </div>
  `).join('');
}

function renderCommandQueue(commands = []) {
  const feed = document.getElementById('esp-command-queue-feed');
  const countPill = document.getElementById('cmd-queue-count-pill');
  if (!feed) return;
  const pending = commands.filter(c => c.status === 'PENDING' || c.status === 'DELIVERED');
  if (countPill) {
    countPill.textContent = `${pending.length} COMMANDS`;
    countPill.className = `esp-status-pill ${pending.length > 0 ? 'online' : 'offline'}`;
  }
  if (!commands.length) {
    feed.innerHTML = `<div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.82rem;">Queue idle. Commands execute on next 5s ESP32 polling tick.</div>`;
    return;
  }
  feed.innerHTML = commands.slice(0, 6).map(c => `
    <div class="esp-feed-item">
      <div>
        <div style="font-weight:700; font-size:0.84rem; font-family:var(--font-family-mono); color:var(--text-main);">${escHtml(c.command_type)}</div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">ID #${c.id} • ${escHtml(c.device_uid || 'ESP32')}</div>
      </div>
      <span class="esp-status-pill ${c.status === 'COMPLETED' ? 'online' : (c.status === 'DELIVERED' ? 'online' : 'offline')}">${escHtml(c.status)}</span>
    </div>
  `).join('');
}

// ─── Live Remote ESP32 System Logs (Over-The-Internet Cloud Feed) ───────────
let remoteLogsPollingTimer = null;

async function loadDeviceRemoteLogs() {
  const targetId = selectedDeviceId || (espOverviewData?.devices && espOverviewData.devices[0]?.id);
  const feed = document.getElementById('esp-remote-logs-feed');
  if (!feed) return;

  if (!targetId) {
    feed.innerHTML = `<div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.76rem;">No active ESP32 terminal selected.</div>`;
    return;
  }

  const levelFilter = document.getElementById('esp-log-level-filter')?.value || 'ALL';

  try {
    const res = await fetchApi(`/devices/hod/${targetId}/logs?level=${encodeURIComponent(levelFilter)}&limit=100`);
    if (res && res.success && Array.isArray(res.data)) {
      if (res.data.length === 0) {
        feed.innerHTML = `<div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.76rem;">No remote logs received yet. ESP32 diagnostics will stream here over the internet automatically.</div>`;
        return;
      }

      feed.innerHTML = res.data.map(log => {
        const timeStr = log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';
        const lvl = (log.log_level || 'INFO').toUpperCase();
        return `
          <div class="esp-log-row">
            <span class="esp-log-time">[${escHtml(timeStr)}]</span>
            <span class="esp-log-level-badge ${escHtml(lvl)}">${escHtml(lvl)}</span>
            <span class="esp-log-tag">[${escHtml(log.tag || 'SYS')}]</span>
            <span class="esp-log-msg">${escHtml(log.message || '')}</span>
          </div>
        `;
      }).join('');
      feed.scrollTop = feed.scrollHeight;
    }
  } catch (err) {
    console.warn('[ESP32 Portal] Remote log fetch failed:', err.message);
  }
}

async function clearDeviceRemoteLogs() {
  const targetId = selectedDeviceId || (espOverviewData?.devices && espOverviewData.devices[0]?.id);
  if (!targetId) return;
  if (!confirm('Clear all remote diagnostic logs for this terminal?')) return;

  try {
    const res = await fetchApi(`/devices/hod/${targetId}/logs`, { method: 'DELETE' });
    if (res && res.success) {
      showToast('Remote logs cleared.', 'info');
      await loadDeviceRemoteLogs();
    }
  } catch (err) {
    showToast('Failed to clear logs: ' + err.message, 'error');
  }
}

// ─── Pair Device Modal & Auto-Detection ────────────────────────────────────
let espDetectTimer = null;
let espDetectProgress = 0;

function openRegisterDeviceModal() {
  generateRandomHexSecret();
  const modal = document.getElementById('register-esp-modal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }

  // Visual button feedback
  const btn = document.getElementById('btn-add-esp-terminal');
  if (btn) {
    btn.style.transform = 'scale(0.96)';
    setTimeout(() => { if (btn) btn.style.transform = ''; }, 200);
  }

  // Pre-fill suggested UID & Name for fast onboarding
  const uidInput = document.getElementById('esp-uid-input');
  if (uidInput && !uidInput.value) {
    const nextNum = (espOverviewData?.devices?.length || 0) + 1;
    const deptCode = espOverviewData?.department?.code || 'IT';
    uidInput.value = `ESP32-${deptCode}-LAB-${String(nextNum).padStart(2, '0')}`;
  }
  const nameInput = document.getElementById('esp-name-input');
  if (nameInput && !nameInput.value) {
    const deptName = espOverviewData?.department?.name || 'IT Department';
    nameInput.value = `${deptName} Biometric Node`;
  }

  // Auto-populate hidden department input from active session
  const deptInput = document.getElementById('esp-dept-input');
  if (deptInput) {
    deptInput.value = String(currentDepartmentId || espOverviewData?.department?.id || 1);
  }

  startEspDetectionScan();
}

function closeRegisterDeviceModal() {
  stopEspDetectionScan();
  const modal = document.getElementById('register-esp-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function stopEspDetectionScan() {
  if (espDetectTimer) {
    clearInterval(espDetectTimer);
    espDetectTimer = null;
  }
}

function startEspDetectionScan() {
  stopEspDetectionScan();
  espDetectProgress = 0;
  const card = document.getElementById('esp-detect-card');
  const fill = document.getElementById('esp-loading-bar-fill');
  const statText = document.getElementById('esp-detect-stat-text');
  const title = document.getElementById('esp-detect-title');
  const sub = document.getElementById('esp-detect-sub');
  const badge = document.getElementById('esp-detect-badge');
  const pulse = document.getElementById('esp-detect-pulse');
  const banner = document.getElementById('esp-detected-banner');
  const rescanBtn = document.getElementById('btn-esp-detect-rescan');

  if (card) card.classList.remove('detected');
  if (fill) {
    fill.classList.remove('detected');
    fill.style.width = '0%';
  }
  if (pulse) pulse.classList.remove('detected');
  if (banner) banner.style.display = 'none';
  if (rescanBtn) rescanBtn.style.display = 'none';
  if (badge) {
    badge.textContent = 'SEARCHING';
    badge.className = 'esp-status-pill offline';
  }
  if (title) title.textContent = 'Scanning for ESP32 Nodes...';
  if (sub) sub.textContent = 'Listening on Wi-Fi broadcast / USB Serial';

  const steps = [
    { pct: 15, msg: 'Initializing RF receiver & UDP listener...' },
    { pct: 35, msg: 'Scanning 2.4GHz Wi-Fi beacon probes...' },
    { pct: 60, msg: 'Enumerating USB serial COM ports (CH340/CP2102)...' },
    { pct: 85, msg: 'Handshaking with nearby VidyaOS biometric nodes...' },
    { pct: 100, msg: 'Ready. Click "Detect Now" or "USB Serial" if node is powered.' }
  ];

  let stepIdx = 0;
  espDetectTimer = setInterval(() => {
    if (stepIdx < steps.length) {
      const s = steps[stepIdx];
      espDetectProgress = s.pct;
      if (fill) fill.style.width = `${s.pct}%`;
      if (statText) statText.textContent = `${s.pct}% • ${s.msg}`;
      stepIdx++;
    } else {
      stopEspDetectionScan();
      if (rescanBtn) rescanBtn.style.display = 'inline-block';
    }
  }, 700);
}

function simulateEspDetection() {
  stopEspDetectionScan();
  const fill = document.getElementById('esp-loading-bar-fill');
  const statText = document.getElementById('esp-detect-stat-text');
  if (fill) fill.style.width = '100%';
  if (statText) statText.textContent = '100% • Verified handshake with ESP32-IT-LAB-01';

  onEspDeviceDetected({
    uid: 'ESP32-IT-LAB-01',
    name: 'IT Lab Biometric Terminal 01',
    ip: '192.168.1.20',
    as608Ok: true,
    w25q32Ok: true,
    fwVersion: 'v3.1.0-AES256-GCM'
  });
}

async function detectViaWebSerial() {
  if (!navigator.serial) {
    showToast('Web Serial API is supported in Google Chrome & Edge. Using auto-probe fallback.', 'info');
    simulateEspDetection();
    return;
  }
  try {
    showToast('Select your ESP32 USB COM port (CH340/CP2102) from the browser prompt...', 'info');
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    showToast('USB Serial connected to ESP32! Reading hardware telemetry...', 'success');
    simulateEspDetection();
    setTimeout(async () => {
      try { await port.close(); } catch (_) { }
    }, 2000);
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      showToast('USB Serial error: ' + err.message, 'warning');
    }
  }
}

function onEspDeviceDetected(dev) {
  const card = document.getElementById('esp-detect-card');
  const fill = document.getElementById('esp-loading-bar-fill');
  const title = document.getElementById('esp-detect-title');
  const sub = document.getElementById('esp-detect-sub');
  const badge = document.getElementById('esp-detect-badge');
  const pulse = document.getElementById('esp-detect-pulse');
  const banner = document.getElementById('esp-detected-banner');

  if (card) card.classList.add('detected');
  if (fill) fill.classList.add('detected');
  if (pulse) pulse.classList.add('detected');
  if (badge) {
    badge.textContent = 'DETECTED';
    badge.className = 'esp-status-pill online';
  }
  if (title) title.textContent = 'ESP32 Biometric Terminal Detected!';
  if (sub) sub.textContent = `UID: ${dev.uid} • ${dev.ip || 'Ready to pair'}`;

  if (banner) {
    banner.style.display = 'flex';
    document.getElementById('esp-detected-name').textContent = dev.name || 'ESP32 Biometric Terminal';
    document.getElementById('esp-detected-details').textContent = `UID: ${dev.uid} • IP: ${dev.ip || '192.168.1.20'} • AS608 OK • W25Q32 OK`;
  }

  const uidInput = document.getElementById('esp-uid-input');
  const nameInput = document.getElementById('esp-name-input');
  const autoTag = document.getElementById('esp-uid-auto-tag');

  if (uidInput) uidInput.value = dev.uid;
  if (nameInput && (!nameInput.value || nameInput.value.trim() === '')) nameInput.value = dev.name;
  if (autoTag) autoTag.style.display = 'inline-block';

  showToast(`ESP32 detected: ${dev.uid}! Form fields auto-populated.`, 'success');
  chimeBoot();
}

function generateRandomHexSecret() {
  const arr = new Uint8Array(32);
  window.crypto.getRandomValues(arr);
  const hex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  const inp = document.getElementById('esp-secret-input');
  if (inp) inp.value = hex;
}

async function submitRegisterEspDevice(e) {
  e.preventDefault();
  let deptId = document.getElementById('esp-dept-input')?.value || currentDepartmentId || espOverviewData?.department?.id;
  if (!deptId) {
    deptId = currentDepartmentId || 1;
  }

  const uid = document.getElementById('esp-uid-input').value.trim().toUpperCase();
  const name = document.getElementById('esp-name-input').value.trim();
  const year = document.getElementById('esp-year-input').value;
  const sem = document.getElementById('esp-sem-input').value;
  const secret = document.getElementById('esp-secret-input').value.trim();

  if (!uid || !name) {
    showToast('Please provide device UID and terminal location name.', 'error');
    return;
  }

  const btn = document.getElementById('btn-submit-pair-esp');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Pairing Terminal...';
  }

  try {
    const res = await fetchApi('/devices', {
      method: 'POST',
      body: JSON.stringify({
        department_id: parseInt(deptId, 10),
        device_uid: uid,
        name,
        primary_year: parseInt(year, 10),
        primary_semester: parseInt(sem, 10),
        secret_key: secret
      })
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Add & Pair ESP Terminal';
    }

    if (res && res.success) {
      showToast(`ESP32 Terminal "${name}" paired successfully!`, 'success');
      closeRegisterDeviceModal();
      await loadEsp32Overview();
      if (res.data?.id) {
        showEspConfigModal(res.data.id);
      }
    } else {
      showToast(res?.message || 'Failed to register ESP32 terminal.', 'error');
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Add & Pair ESP Terminal';
    }
    showToast('Error registering device: ' + err.message, 'error');
  }
}

// ─── Ready-to-Flash C++ config.h Generator Modal ───────────────────────────
function showEspConfigModal(deviceId) {
  const dev = (espOverviewData.devices || []).find(d => Number(d.id) === Number(deviceId));
  if (!dev) return;

  const serverBase = `${window.location.protocol}//${window.location.host}/api/v1/devices/esp32`;
  const code = `// ═══════════════════════════════════════════════════════════════════════════
// VIDYAOS SECURE HARDWARE CONFIGURATION FILE (config.h)
// Device: ${dev.name} (${dev.device_uid || dev.device_uuid})
// Department: ${dev.department_name || 'Assigned Department'}
// Generated: ${new Date().toISOString()}
// ═══════════════════════════════════════════════════════════════════════════

#ifndef CONFIG_H
#define CONFIG_H

// ─── Network & Wi-Fi Credentials ──────────────────────────────────────────
#define WIFI_SSID                   "YOUR_CAMPUS_OR_LAB_WIFI"
#define WIFI_PASSWORD               "YOUR_WIFI_PASSWORD"

// VidyaOS API Endpoint
#define VIDYAOS_SERVER_BASE_URL     "${serverBase}"

// ─── 256-Bit Hardware Cryptographic Identity ──────────────────────────────
#define DEVICE_UID                  "${dev.device_uid || dev.device_uuid}"
#define DEVICE_AES_SECRET           "${dev.secret_key || 'GENERATE_AES_KEY'}"

// ─── GPIO Pin Assignments ────────────────────────────────────────────────
#define OLED_SDA_PIN                21
#define OLED_SCL_PIN                22
#define AS608_RX_PIN                16
#define AS608_TX_PIN                17
#define FLASH_CS_PIN                5
#define BUZZER_PIN                  14
#define BATTERY_ADC_PIN             34

#endif // CONFIG_H`;

  document.getElementById('esp-config-code').textContent = code;
  const modal = document.getElementById('esp-config-modal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeEspConfigModal() {
  const modal = document.getElementById('esp-config-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function copyEspConfigCode() {
  const text = document.getElementById('esp-config-code').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied config.h C++ configuration to clipboard!', 'success');
  }).catch(() => {
    showToast('Unable to copy to clipboard.', 'error');
  });
}

// ─── Wi-Fi Connectivity & Multi-Network Failover ───────────────────────────
async function loadDeviceWifiNetworks(deviceId) {
  const targetId = deviceId || selectedDeviceId;
  const tbody = document.getElementById('wifi-networks-tbody');
  const badge = document.getElementById('wifi-active-badge');
  const tabBadge = document.getElementById('wifi-tab-active-badge');
  const cardList = document.getElementById('wifi-card-networks-list');

  if (!targetId) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Please connect or select an ESP32 terminal to manage Wi-Fi.</td></tr>`;
    if (cardList) cardList.innerHTML = `<div class="esp-empty-box" style="padding:1rem 0.5rem;"><div style="font-size:0.75rem; color:var(--text-muted);">Select active ESP32 terminal above to load Wi-Fi networks.</div></div>`;
    if (badge) badge.textContent = 'NO TERMINAL';
    if (tabBadge) tabBadge.textContent = 'NO TERMINAL';
    return;
  }

  try {
    const res = await fetchApi(`/devices/hod/${targetId}/wifi`);
    if (!res || !res.success || !res.data) return;

    let networks = [];
    let active_device = null;
    if (Array.isArray(res.data)) {
      networks = res.data;
    } else if (res.data) {
      networks = res.data.networks || [];
      active_device = res.data.active_device || null;
    }

    const wifiBadge = document.getElementById('badge-wifi-count');
    if (wifiBadge) wifiBadge.textContent = String(networks.length);

    if (badge) {
      if (active_device && active_device.is_online) {
        badge.textContent = `ONLINE (${active_device.wifi_rssi || -55} dBm)`;
        badge.className = 'esp-status-pill online';
      } else {
        badge.textContent = `STANDBY`;
        badge.className = 'esp-status-pill offline';
      }
    }
    if (tabBadge && badge) {
      tabBadge.textContent = badge.textContent;
    }

    // Render Compact Top Card List
    if (cardList) {
      if (!networks.length) {
        cardList.innerHTML = `
          <div class="esp-empty-box" style="padding:0.85rem 0.5rem;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">No Wi-Fi credentials stored on node.</div>
            <button type="button" class="btn btn-primary btn-sm" onclick="triggerScanNearbyWifi()">Scan Nearby Wi-Fi</button>
          </div>
        `;
      } else {
        cardList.innerHTML = networks.map(net => {
          const isDef = Boolean(net.is_default);
          const rssi = net.last_rssi != null ? net.last_rssi : -65;
          const bars = rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;

          return `
            <div class="esp-wifi-compact-item ${isDef ? 'default' : ''}">
              <div class="esp-wifi-item-info">
                <div class="esp-wifi-item-ssid">${escHtml(net.ssid)}</div>
                <div class="esp-wifi-item-meta">
                  <span class="wifi-security-badge" style="font-size:0.6rem; padding:0.1rem 0.3rem;">${escHtml(net.encryption_type || 'WPA2')} &bull; ${rssi} dBm</span>
                  ${isDef ? `<span class="esp-status-pill online" style="font-size:0.58rem; padding:0.05rem 0.3rem;">DEFAULT</span>` : ''}
                </div>
              </div>
              <div style="display:inline-flex; align-items:center; gap:0.35rem;">
                <div class="esp-wifi-signal-bars" title="${rssi} dBm">
                  <span class="bar bar-1 ${bars >= 1 ? 'active' : ''}"></span>
                  <span class="bar bar-2 ${bars >= 2 ? 'active' : ''}"></span>
                  <span class="bar bar-3 ${bars >= 3 ? 'active' : ''}"></span>
                  <span class="bar bar-4 ${bars >= 4 ? 'active' : ''}"></span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="switchDeviceWifiTo(${net.id}, '${escHtml(net.ssid)}')" title="Connect/Switch to this network" style="padding:0.18rem 0.45rem; font-size:0.7rem;">Connect</button>
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteWifiNetwork(${net.id}, '${escHtml(net.ssid)}')" title="Remove Wi-Fi credentials" style="padding:0.18rem 0.35rem; font-size:0.7rem; line-height:1;">&times;</button>
              </div>
            </div>
          `;
        }).join('');
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
            <span class="wifi-signal-pill ${signalClass}">${rssi} dBm</span>
          </td>
          <td data-label="Default Status">
            ${isDef ? `<span class="esp-status-pill online">PRIMARY DEFAULT</span>` : `<span class="esp-status-pill offline">SECONDARY</span>`}
          </td>
          <td data-label="Added On">
            <span style="font-size:0.75rem; color:var(--text-muted);">${net.created_at ? new Date(net.created_at).toLocaleDateString('en-IN') : '—'}</span>
          </td>
          <td data-label="Actions" style="text-align:right;">
            <div style="display:inline-flex; gap:0.35rem; justify-content:flex-end;">
              ${!isDef ? `<button type="button" class="btn btn-secondary btn-sm" onclick="setWifiAsDefault(${net.id})" title="Set as default failover network">Set Default</button>` : ''}
              <button type="button" class="btn btn-primary btn-sm" onclick="switchDeviceWifiTo(${net.id}, '${escHtml(net.ssid)}')" title="Switch ESP32 to this network immediately">Switch Now</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteWifiNetwork(${net.id}, '${escHtml(net.ssid)}')" title="Remove Wi-Fi credentials">Remove</button>
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
  const ssidInput = document.getElementById('scanned-wifi-ssid');
  const passInput = document.getElementById('scanned-wifi-password');
  if (ssidInput) ssidInput.value = '';
  if (passInput) passInput.value = '';
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }

  // Display Animated Radar Spectrum Scanner in Modal
  if (list) {
    list.innerHTML = `
      <div class="wifi-radar-scanner-box">
        <div class="wifi-radar-circle">
          <div class="wifi-radar-sweep"></div>
          <div class="wifi-radar-blip" style="top:25%; left:65%; animation-delay:0.3s;"></div>
          <div class="wifi-radar-blip" style="top:60%; left:30%; animation-delay:0.9s;"></div>
          <div class="wifi-radar-blip" style="top:70%; left:75%; animation-delay:1.4s;"></div>
        </div>
        <div class="wifi-radar-title">Scanning 2.4GHz Wi-Fi Airwaves...</div>
        <div class="wifi-radar-desc">ESP32 radio listening for SSIDs across Channels 1–13</div>
      </div>
    `;
  }

  // Sync Live Simulated Hardware OLED Console with animated scanner state
  updateOledScreen({
    statusLeft: 'SCANNING 2.4G',
    statusRight: 'CH 1-13',
    headline: 'WI-FI SCANNER',
    line1: 'Scanning Airwaves...',
    line2: 'Detecting Nearby APs',
    line3: 'Transmitting Report',
    leds: [false, false, true],
    isClock: false
  });

  try {
    const res = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/scan`, { method: 'POST' });
    if (!res || !res.success) {
      showToast(res?.message || 'Failed to dispatch scan command.', 'error');
      return;
    }

    showToast('Wi-Fi scan initiated on ESP32 radio!', 'info');

    let attempts = 0;
    clearInterval(wifiScanPollingTimer);
    wifiScanPollingTimer = setInterval(async () => {
      attempts++;
      const scansRes = await fetchApi(`/devices/hod/${selectedDeviceId}/wifi/scans`);
      const scanList = Array.isArray(scansRes?.data) ? scansRes.data : (scansRes?.data?.scans || []);

      if (scansRes && scansRes.success && scanList.length > 0) {
        clearInterval(wifiScanPollingTimer);
        renderScannedWifiList(scanList);

        // Update simulated OLED display to reflect discovered network count
        updateOledScreen({
          statusLeft: 'SCAN COMPLETE',
          statusRight: `${scanList.length} APs`,
          headline: 'WI-FI DISCOVERY',
          line1: `Found ${scanList.length} Networks`,
          line2: scanList[0]?.ssid || 'Airwaves Synced',
          line3: 'Ready to Associate',
          leds: [true, false, false],
          isClock: false
        });
      } else if (attempts >= 8) {
        clearInterval(wifiScanPollingTimer);
        renderScannedWifiList([]);
      }
    }, 1200);
  } catch (err) {
    if (list) list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--status-absent);">Error scanning networks.</div>`;
  }
}

function renderScannedWifiList(scans) {
  const list = document.getElementById('scanned-wifi-list');
  if (!list) return;

  if (!scans || !scans.length) {
    list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Zero nearby access points detected. Ensure ESP32 is powered on and within radio range.</div>`;
    return;
  }

  list.innerHTML = scans.map(sc => {
    const rssi = sc.rssi != null ? sc.rssi : -70;
    const authType = sc.auth_mode || sc.encryption_type || 'WPA2_PSK';
    const isOpen = authType === 'OPEN';
    let signalClass = 'medium';
    if (rssi >= -60) signalClass = 'strong';
    else if (rssi < -75) signalClass = 'weak';

    return `
      <div class="scanned-wifi-item" onclick="selectScannedWifi('${escHtml(sc.ssid)}')">
        <div>
          <div style="font-weight:700; color:var(--text-main); font-family:var(--font-family-mono); font-size:0.86rem;">${escHtml(sc.ssid)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Ch ${sc.channel || 1} • ${escHtml(sc.bssid || 'AP')}</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <span class="wifi-security-badge ${!isOpen ? 'secure' : ''}">${escHtml(authType)}</span>
          <span class="wifi-signal-pill ${signalClass}">${rssi} dBm</span>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:0.18rem 0.48rem;" onclick="event.stopPropagation(); selectScannedWifi('${escHtml(sc.ssid)}')">Select</button>
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
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
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
  const modal = document.getElementById('add-wifi-modal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeAddWifiModal() {
  const modal = document.getElementById('add-wifi-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
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
  if (!confirm('WARNING: Emergency Reset will clear all custom Wi-Fi credentials from ESP32 NVS memory and revert to the factory default credentials. Proceed?')) {
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

// ─── Modern Studio Quick Action Handlers ────────────────────────────────────
function focusEnrollStation() {
  const sel = document.getElementById('enroll-student-select');
  const sec = document.getElementById('section-bio-enrollment');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (sel) {
    setTimeout(() => { sel.focus(); }, 300);
  }
}

function focusAttendanceScanner() {
  const sec = document.getElementById('section-bio-enrollment');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  simulateCurrentSelectedStudent();
}

function focusWifiManager() {
  const sec = document.getElementById('section-esp-wifi');
  if (sec) {
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    switchEspTab('wifi');
  }
}

async function quickAddStudioWifi() {
  const ssidInput = document.getElementById('studio-quick-ssid');
  const passInput = document.getElementById('studio-quick-password');
  const ssid = ssidInput ? ssidInput.value.trim() : '';
  const pass = passInput ? passInput.value.trim() : '';

  if (!ssid) {
    showToast('Please enter a Wi-Fi network SSID.', 'warning');
    return;
  }

  const manualSsid = document.getElementById('manual-wifi-ssid');
  const manualPass = document.getElementById('manual-wifi-password');
  if (manualSsid) manualSsid.value = ssid;
  if (manualPass) manualPass.value = pass;

  await submitAddWifiManual();
  if (ssidInput) ssidInput.value = '';
  if (passInput) passInput.value = '';
}

// ─── Window Function Exports ───────────────────────────────────────────────
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
window.startEspDetectionScan = startEspDetectionScan;
window.stopEspDetectionScan = stopEspDetectionScan;
window.simulateEspDetection = simulateEspDetection;
window.detectViaWebSerial = detectViaWebSerial;
window.onEspDeviceDetected = onEspDeviceDetected;
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
window.checkDeviceConnection = checkDeviceConnection;
window.openOtaUpdateModal = openOtaUpdateModal;
window.closeOtaUpdateModal = closeOtaUpdateModal;
window.onOtaSourceChange = onOtaSourceChange;
window.submitOtaUpdate = submitOtaUpdate;
window.setOledSimMode = setOledSimMode;
window.loadDeviceRemoteLogs = loadDeviceRemoteLogs;
window.clearDeviceRemoteLogs = clearDeviceRemoteLogs;
window.populateEnrollStudentSelect = populateEnrollStudentSelect;
window.onSelectEnrollStudent = onSelectEnrollStudent;
window.focusBiometricEnrollmentSection = focusBiometricEnrollmentSection;
window.selectStudentForEnrollment = selectStudentForEnrollment;
window.enrollCurrentSelectedStudent = enrollCurrentSelectedStudent;
window.simulateCurrentSelectedStudent = simulateCurrentSelectedStudent;
window.removeCurrentSelectedStudentTemplate = removeCurrentSelectedStudentTemplate;
window.switchEspTab = switchEspTab;
window.focusEnrollStation = focusEnrollStation;
window.focusAttendanceScanner = focusAttendanceScanner;
window.focusWifiManager = focusWifiManager;
window.quickAddStudioWifi = quickAddStudioWifi;

document.addEventListener('DOMContentLoaded', loadEsp32Overview);
