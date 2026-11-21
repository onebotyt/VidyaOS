/**
 * VidyaOS Universal Auth Store
 * Lightweight reactive store compatible with React & React Native.
 */

import { api } from '../api/client';
import type { User, AuthResponse } from '../types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthListener = (state: AuthState) => void;

class AuthStore {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };

  private listeners: Set<AuthListener> = new Set();

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cachedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (cachedUser && token) {
          const user = JSON.parse(cachedUser);
          this.state = {
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          };
          this.notify();
          return;
        }
      }
    } catch (_) {}

    this.state.isLoading = false;
    this.notify();
  }

  public getState(): AuthState {
    return { ...this.state };
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  public async loginWithCredentials(identifier: string, password: string):Promise<AuthResponse> {
    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        identifier,
        password,
      });

      if (res && res.access_token) {
        api.setToken(res.access_token);
        this.setUser(res.user);
      }

      this.state.isLoading = false;
      this.notify();
      return res;
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.error = err.message || 'Login failed';
      this.notify();
      throw err;
    }
  }

  public async loginWithGoogle(credential: string, passwordLink?: string): Promise<AuthResponse> {
    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const res = await api.post<AuthResponse>('/auth/google/verify', {
        credential,
        password: passwordLink,
      });

      if (res && res.access_token) {
        api.setToken(res.access_token);
        this.setUser(res.user);
      }

      this.state.isLoading = false;
      this.notify();
      return res;
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.error = err.message || 'Google sign-in failed';
      this.notify();
      throw err;
    }
  }

  public setUser(user: User | null) {
    this.state.user = user;
    this.state.isAuthenticated = Boolean(user);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          localStorage.removeItem('user');
        }
      }
    } catch (_) {}
    this.notify();
  }

  public logout() {
    api.setToken(null);
    this.setUser(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (_) {}
  }
}

export const authStore = new AuthStore();
export default authStore;
