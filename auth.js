// frontend/src/auth.js
// Autenticação com Microsoft Entra ID via MSAL.js 2.x
// Apenas utilizadores institucionais (@nms.unl.pt) são aceites.

const MSAL_CONFIG = {
  auth: {
    clientId:    window.APP_CONFIG?.clientId    || '__CLIENT_ID__',
    authority:   `https://login.microsoftonline.com/${window.APP_CONFIG?.tenantId || '__TENANT_ID__'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

const TOKEN_REQUEST = {
  scopes: [`api://${window.APP_CONFIG?.clientId || '__CLIENT_ID__'}/Recruitment.Read`],
};

let _msalInstance = null;

async function initAuth() {
  _msalInstance = new msal.PublicClientApplication(MSAL_CONFIG);
  await _msalInstance.initialize();

  // Processar resposta de redirect do Azure AD
  const response = await _msalInstance.handleRedirectPromise();
  if (response) {
    // Login bem-sucedido via redirect
    _msalInstance.setActiveAccount(response.account);
  }

  const accounts = _msalInstance.getAllAccounts();
  if (!accounts.length) {
    // Não autenticado — iniciar login com redirect
    await _msalInstance.loginRedirect(TOKEN_REQUEST);
    return false; // não chega aqui (redirect ocorre)
  }

  _msalInstance.setActiveAccount(accounts[0]);

  // Atualizar UI com dados do utilizador
  const user = accounts[0];
  const parts    = (user.name || '').split(' ').filter(Boolean);
  const initials = parts.map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const avatarEl = document.querySelector('.avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEls = document.querySelectorAll('.user-name');
  nameEls.forEach(el => { el.textContent = user.name || user.username; });

  return true;
}

async function getAccessToken() {
  if (!_msalInstance) throw new Error('Auth não inicializado.');
  const account = _msalInstance.getActiveAccount();
  if (!account) throw new Error('Utilizador não autenticado.');

  try {
    const result = await _msalInstance.acquireTokenSilent({ ...TOKEN_REQUEST, account });
    return result.accessToken;
  } catch (err) {
    if (err instanceof msal.InteractionRequiredAuthError) {
      await _msalInstance.loginRedirect(TOKEN_REQUEST);
    }
    throw err;
  }
}

function getCurrentUser() {
  return _msalInstance?.getActiveAccount() || null;
}

async function logout() {
  await _msalInstance?.logoutRedirect();
}

// Expor globalmente (dashboard usa funções globais)
window.initAuth      = initAuth;
window.getAccessToken = getAccessToken;
window.getCurrentUser = getCurrentUser;
window.logout         = logout;
