/**
 * Universal Login View
 */

import { Auth } from '../../core/auth.js';
import { Router } from '../../core/router.js';
import { Platform } from '../../core/platform.js';
import { showToast } from '../../components/toast/toast.js';
import { getIcon } from '../../assets/icons/icons.js';

let selectedRole = 'student';

export async function renderLoginView(container) {
  container.innerHTML = `
    <div class="login-viewport">
      <div class="login-card">
        <div class="login-brand-header">
          <div class="login-logo-badge">
            ${getIcon('graduationCap')}
          </div>
          <h1 class="login-title">Welcome to VidyaOS</h1>
          <p class="login-subtitle">Next-generation Academic ERP & Classroom</p>
        </div>

        <div class="login-role-tabs">
          <button class="login-role-tab ${selectedRole === 'student' ? 'active' : ''}" data-role="student">Student</button>
          <button class="login-role-tab ${selectedRole === 'faculty' ? 'active' : ''}" data-role="faculty">Faculty</button>
          <button class="login-role-tab ${selectedRole === 'admin' ? 'active' : ''}" data-role="admin">Admin</button>
        </div>

        <form id="universal-login-form">
          <div class="form-group">
            <label class="form-label" id="login-identifier-label">Email or Registration No.</label>
            <input class="form-input" id="login-identifier" type="text" placeholder="e.g. gdhami115@gmail.com" required autocomplete="username" />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" id="login-password" type="password" placeholder="••••••••" required autocomplete="current-password" />
          </div>

          <button type="submit" class="btn btn-primary login-submit-btn" id="login-btn">
            Sign In
          </button>
        </form>
      </div>
    </div>
  `;

  // Role tab switching
  const tabs = container.querySelectorAll('.login-role-tab');
  const labelEl = container.querySelector('#login-identifier-label');
  const inputEl = container.querySelector('#login-identifier');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      Platform.hapticFeedback('light');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;

      if (selectedRole === 'student') {
        labelEl.textContent = 'Email or Registration No.';
        inputEl.placeholder = 'e.g. gdhami115@gmail.com';
      } else {
        labelEl.textContent = 'Institutional Email';
        inputEl.placeholder = 'e.g. faculty@gp.ac.in';
      }
    });
  });

  // Submit handling
  const form = container.querySelector('#universal-login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = inputEl.value.trim();
    const password = container.querySelector('#login-password').value;
    const btn = container.querySelector('#login-btn');

    if (!identifier || !password) {
      showToast('Please fill in both fields', 'warning');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const res = await Auth.login(selectedRole, { identifier, email: identifier, password });
      if (res.success) {
        Platform.hapticFeedback('success');
        showToast('Login successful!', 'success');
        Router.navigate('student/home');
      } else {
        Platform.hapticFeedback('error');
        showToast(res.error?.message || 'Login failed. Please verify credentials.', 'error');
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Sign In';
      showToast('Connection error during login', 'error');
    }
  });
}

export default renderLoginView;
