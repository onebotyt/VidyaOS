/**
 * VidyaOS Multi-OS Universal Frontend Application Orchestrator
 */

import { Platform } from './core/platform.js';
import { Auth } from './core/auth.js';
import { Router } from './core/router.js';
import { Bus } from './core/event-bus.js';

// Components
import { Titlebar } from './components/titlebar/titlebar.js';
import { AppHeader } from './components/header/header.js';
import { NavigationManager } from './components/navigation/navigation.js';
import { ToastManager } from './components/toast/toast.js';

// Views
import { renderLoginView } from './views/auth/login.js';
import { renderStudentHome } from './views/student/home/home.js';
import { renderStudentClasses } from './views/student/classes/classes.js';
import { renderStudentRoutine } from './views/student/routine/routine.js';
import { renderStudentAttendance } from './views/student/attendance/attendance.js';
import { renderStudentScores } from './views/student/scores/scores.js';
import { renderStudentClasswork } from './views/student/classwork/classwork.js';
import { renderStudentProfile } from './views/student/profile/profile.js';
import { renderStudentSettings } from './views/student/settings/settings.js';

class VidyaApp {
  async init() {
    console.log(`[VidyaOS] Initializing Multi-OS Application... [OS: ${Platform.os}, Runtime: ${Platform.runtime}]`);

    // 1. Initialize UI Singletons
    this.toastManager = new ToastManager('#toast-container');
    this.titlebar = new Titlebar('#desktop-titlebar');
    this.header = new AppHeader('#app-header');
    this.navigation = new NavigationManager();

    // 2. Initialize Authentication State
    await Auth.init();

    // 3. Register Application Routes
    Router.register('auth/login', renderLoginView, {
      requireAuth: false,
      title: 'Sign In'
    });

    Router.register('student/home', renderStudentHome, {
      requireAuth: true,
      role: 'student',
      title: 'Home Cockpit'
    });

    Router.register('student/classes', renderStudentClasses, {
      requireAuth: true,
      role: 'student',
      title: 'My Classes'
    });

    Router.register('student/routine', renderStudentRoutine, {
      requireAuth: true,
      role: 'student',
      title: 'Routine & Timetable'
    });

    Router.register('student/attendance', renderStudentAttendance, {
      requireAuth: true,
      role: 'student',
      title: 'Attendance Studio'
    });

    Router.register('student/scores', renderStudentScores, {
      requireAuth: true,
      role: 'student',
      title: 'Academic Scores'
    });

    Router.register('student/classwork', renderStudentClasswork, {
      requireAuth: true,
      role: 'student',
      title: 'Classwork & Assignments'
    });

    Router.register('student/profile', renderStudentProfile, {
      requireAuth: true,
      role: 'student',
      title: 'Student Profile'
    });

    Router.register('student/settings', renderStudentSettings, {
      requireAuth: true,
      role: 'student',
      title: 'Settings & Account'
    });

    // 4. Initialize Router
    Router.init('#view-mount-point', 'student/home');

    // 5. Hide splash screen if Capacitor plugin is available
    try {
      if (window.Capacitor?.Plugins?.SplashScreen) {
        window.Capacitor.Plugins.SplashScreen.hide();
      }
    } catch (_) {}

    console.log('[VidyaOS] Application boot complete.');
  }
}

const app = new VidyaApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

export default app;
