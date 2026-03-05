// auth-simple.js
// Sistema de autenticação interna simples
// Sem dependência de Microsoft Entra ID / MSAL
// Usa SubtleCrypto (SHA-256) para hash de senha
// Armazena utilizadores em localStorage
// Sessão em sessionStorage

(function () {
  'use strict';

  const USERS_KEY   = 'nms_users';
  const SESSION_KEY = 'nms_session';

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function initDefaultAdmin() {
    const users = getUsers();
    if (users.length === 0) {
      const hash = await sha256('nms!2023');
      saveUsers([{
        username: 'elainecifoni',
        password_hash: hash,
        role: 'admin',
        created_at: new Date().toISOString()
      }]);
    }
  }

  async function login(username, password) {
    const users = getUsers();
    const hash  = await sha256(password);
    const user  = users.find(u => u.username === username && u.password_hash === hash);
    if (!user) return false;
    const session = {
      username: user.username,
      role:     user.role,
      loginAt:  new Date().toISOString(),
      token:    await sha256(user.username + Date.now() + Math.random())
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  function isLoggedIn() { return getSession() !== null; }
  function isAdmin() { const s = getSession(); return s && s.role === 'admin'; }

  function requireAuth() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    return true;
  }

  function requireAdmin() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (!isAdmin()) { window.location.href = 'index.html'; return false; }
    return true;
  }

  async function createUser(username, password, role) {
    if (!isAdmin()) throw new Error('Acesso negado.');
    const users = getUsers();
    if (users.find(u => u.username === username)) throw new Error('Utilizador já existe.');
    const hash = await sha256(password);
    users.push({ username, password_hash: hash, role: role || 'user', created_at: new Date().toISOString() });
    saveUsers(users);
  }

  function listUsers() {
    if (!isAdmin()) throw new Error('Acesso negado.');
    return getUsers().map(u => ({ username: u.username, role: u.role, created_at: u.created_at }));
  }

  function removeUser(username) {
    if (!isAdmin()) throw new Error('Acesso negado.');
    const session = getSession();
    if (session && session.username === username) throw new Error('Não pode remover o utilizador com sessão activa.');
    saveUsers(getUsers().filter(u => u.username !== username));
  }

  function updateUI() {
    const session = getSession();
    if (!session) return;
    const avatarEl = document.querySelector('.avatar');
    if (avatarEl) avatarEl.textContent = session.username.slice(0, 2).toUpperCase();
    document.querySelectorAll('.user-name').forEach(el => { el.textContent = session.username; });
    document.querySelectorAll('.admin-only').forEach(el => { el.style.display = isAdmin() ? '' : 'none'; });
  }

  window.Auth = { initDefaultAdmin, login, logout, getSession, isLoggedIn, isAdmin, requireAuth, requireAdmin, createUser, listUsers, removeUser, updateUI };
  window.initAuth = async function () { await initDefaultAdmin(); return requireAuth(); };
  window.logout = logout;
  window.getAccessToken = async function () { return (getSession() || {}).token || null; };
  window.getCurrentUser = function () { const s = getSession(); return s ? { username: s.username, name: s.username, role: s.role } : null; };

})();
