export type AuthUser = {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  isAdmin?: boolean;
  redirectTo?: string;
};

type AuthResponse = {
  user: AuthUser | null;
  token?: string;
  redirectTo?: string;
  message?: string;
};

let inMemoryToken: string | null = null;

// Remove any legacy unsigned localStorage user entry from earlier versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('yakaji-auth-user');
  } catch {
    // ignore storage access issues
  }
}

function setSessionState(user: AuthUser | null, token?: string | null) {
  if (token !== undefined) {
    inMemoryToken = token;
  } else if (!user) {
    inMemoryToken = null;
  }
}

async function request<T = any>(
  method: string,
  url: string,
  body?: unknown
): Promise<{ data: T }> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'yakaji-web',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (inMemoryToken) headers['Authorization'] = `Bearer ${inMemoryToken}`;

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (res.ok && contentType.includes('text/html')) {
        throw new Error('Server returned an unexpected HTML response for ' + url);
      }
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(message) as Error & {
      response?: { status: number; data: any };
    };
    err.response = { status: res.status, data };
    throw err;
  }

  return { data: data as T };
}

type ModalMode = 'login' | 'register' | 'forgot' | 'admin-setup';

function openSignInModal(opts?: { initialMode?: 'login' | 'register' }): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('yakaji-local-auth-modal');
    if (existing) existing.remove();

    let mode: ModalMode = opts?.initialMode === 'register' ? 'register' : 'login';
    let forgotStep: 'request' | 'verify' = 'request';
    let accountSetupEmail = '';
    let busy = false;

    const overlay = document.createElement('div');
    overlay.id = 'yakaji-local-auth-modal';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(11,33,25,0.72);backdrop-filter:blur(5px);font-family:"DM Sans",Arial,sans-serif;overflow-y:auto;';

    const card = document.createElement('div');
    card.style.cssText =
      'width:min(460px,100%);background:#fff;border-radius:16px;padding:24px;box-shadow:0 24px 64px rgba(0,23,15,0.35);border:1px solid #e3ece6;color:#17251f;margin:auto;';

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.12em;color:#087b50;">YAKAJI DIGITAL HUB</div>
          <h2 id="yakaji-auth-title" style="margin:4px 0 6px;font-size:21px;font-weight:800;color:#183b2b;">Sign in to your account</h2>
          <p id="yakaji-auth-subtitle" style="margin:0;font-size:12px;color:#718078;line-height:1.5;">Access your saved profile, wallet, and marketplace orders.</p>
        </div>
        <button type="button" id="yakaji-auth-close" aria-label="Close sign in" style="border:1px solid #e5ebe6;background:#fff;border-radius:9px;width:34px;height:34px;cursor:pointer;font-size:16px;color:#506258;flex-shrink:0;">✕</button>
      </div>

      <div id="yakaji-auth-tabs" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;background:#f3f7f4;border-radius:10px;margin-bottom:14px;">
        <button type="button" id="yakaji-tab-login" style="min-height:36px;border:0;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;">Sign In</button>
        <button type="button" id="yakaji-tab-register" style="min-height:36px;border:0;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;">Create Account</button>
      </div>

      <div id="yakaji-auth-error" hidden style="margin-bottom:12px;padding:10px 12px;border-radius:9px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12px;font-weight:600;line-height:1.45;">
        <div id="yakaji-auth-error-text"></div>
        <button type="button" id="yakaji-err-go-login" hidden style="margin-top:8px;min-height:34px;padding:6px 12px;border:1px solid #087b50;border-radius:8px;background:#087b50;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Go back to Sign In &rarr;</button>
      </div>
      <div id="yakaji-auth-info" hidden style="margin-bottom:12px;padding:10px 12px;border-radius:9px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:12px;line-height:1.45;"></div>

      <form id="yakaji-auth-form" style="display:grid;gap:11px;">
        <label id="yakaji-field-name" style="display:none;gap:5px;font-size:11px;font-weight:700;color:#405348;">
          Full name *
          <input id="yakaji-auth-name" type="text" autocomplete="name" placeholder="e.g. Amina Bello" style="min-height:40px;padding:9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;" />
        </label>

        <label style="display:grid;gap:5px;font-size:11px;font-weight:700;color:#405348;">
          Email address *
          <input id="yakaji-auth-email" type="email" autocomplete="email" required placeholder="name@example.com" style="min-height:40px;padding:9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;" />
        </label>

        <div id="yakaji-field-phone-wrap" style="display:none;grid-template-columns:1fr 1fr;gap:10px;">
          <label style="display:grid;gap:5px;font-size:11px;font-weight:700;color:#405348;">
            Phone number
            <input id="yakaji-auth-phone" type="tel" autocomplete="tel" placeholder="+234 800 000 0000" style="min-height:40px;padding:9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;" />
          </label>
          <label style="display:grid;gap:5px;font-size:11px;font-weight:700;color:#405348;">
            Delivery address
            <input id="yakaji-auth-address" type="text" autocomplete="street-address" placeholder="Street & city" style="min-height:40px;padding:9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;" />
          </label>
        </div>

        <label id="yakaji-field-code" style="display:none;gap:5px;font-size:11px;font-weight:700;color:#405348;">
          6-digit verification code *
          <input id="yakaji-auth-code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Enter 6-digit code" style="min-height:40px;padding:9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.18em;width:100%;box-sizing:border-box;" />
        </label>

        <label id="yakaji-field-password" style="display:grid;gap:5px;font-size:11px;font-weight:700;color:#405348;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span id="yakaji-password-label">Password *</span>
            <button type="button" id="yakaji-btn-forgot" style="border:0;background:transparent;color:#087b50;font-size:11px;font-weight:700;cursor:pointer;padding:0;text-decoration:underline;">Forgot password?</button>
          </div>
          <div style="position:relative;display:flex;align-items:center;">
            <input id="yakaji-auth-password" type="password" autocomplete="current-password" required placeholder="Enter your password" style="min-height:40px;padding:9px 60px 9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;" />
            <button type="button" id="yakaji-toggle-pw" style="position:absolute;right:8px;border:0;background:transparent;color:#4d6156;font-size:11px;font-weight:700;cursor:pointer;padding:4px 6px;">Show</button>
          </div>
        </label>

        <label id="yakaji-field-confirm" style="display:none;gap:5px;font-size:11px;font-weight:700;color:#405348;">
          Confirm password *
          <input id="yakaji-auth-confirm" type="password" autocomplete="new-password" placeholder="Re-enter password" style="min-height:40px;padding:9px 11px;border:1px solid #dfe8e0;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;" />
        </label>

        <button type="submit" id="yakaji-auth-submit" style="min-height:42px;border:0;border-radius:10px;background:#087b50;color:#fff;font-size:13px;font-weight:800;cursor:pointer;margin-top:2px;">Sign In</button>
        <button type="button" id="yakaji-btn-forgot-step" hidden style="min-height:36px;border:1px solid #d5e2da;border-radius:9px;background:#f7fbf8;color:#087b50;font-size:12px;font-weight:700;cursor:pointer;">I already have a 6-digit verification code</button>
      </form>

      <div id="yakaji-back-to-login" hidden style="margin-top:12px;padding-top:12px;border-top:1px solid #edf1ed;text-align:center;">
        <button type="button" id="yakaji-btn-back-login" style="border:0;background:transparent;color:#087b50;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;">Back to Sign In</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const titleEl = card.querySelector('#yakaji-auth-title') as HTMLElement;
    const subtitleEl = card.querySelector('#yakaji-auth-subtitle') as HTMLElement;
    const tabsEl = card.querySelector('#yakaji-auth-tabs') as HTMLElement;
    const tabLoginBtn = card.querySelector('#yakaji-tab-login') as HTMLButtonElement;
    const tabRegisterBtn = card.querySelector('#yakaji-tab-register') as HTMLButtonElement;
    const errEl = card.querySelector('#yakaji-auth-error') as HTMLElement;
    const errTextEl = card.querySelector('#yakaji-auth-error-text') as HTMLElement;
    const errGoLoginBtn = card.querySelector('#yakaji-err-go-login') as HTMLButtonElement;
    const infoEl = card.querySelector('#yakaji-auth-info') as HTMLElement;
    const fieldName = card.querySelector('#yakaji-field-name') as HTMLElement;
    const nameInput = card.querySelector('#yakaji-auth-name') as HTMLInputElement;
    const emailInput = card.querySelector('#yakaji-auth-email') as HTMLInputElement;
    const fieldPhoneWrap = card.querySelector('#yakaji-field-phone-wrap') as HTMLElement;
    const phoneInput = card.querySelector('#yakaji-auth-phone') as HTMLInputElement;
    const addressInput = card.querySelector('#yakaji-auth-address') as HTMLInputElement;
    const fieldCode = card.querySelector('#yakaji-field-code') as HTMLElement;
    const codeInput = card.querySelector('#yakaji-auth-code') as HTMLInputElement;
    const fieldPassword = card.querySelector('#yakaji-field-password') as HTMLElement;
    const passwordLabel = card.querySelector('#yakaji-password-label') as HTMLElement;
    const forgotBtn = card.querySelector('#yakaji-btn-forgot') as HTMLButtonElement;
    const passwordInput = card.querySelector('#yakaji-auth-password') as HTMLInputElement;
    const togglePwBtn = card.querySelector('#yakaji-toggle-pw') as HTMLButtonElement;
    const fieldConfirm = card.querySelector('#yakaji-field-confirm') as HTMLElement;
    const confirmInput = card.querySelector('#yakaji-auth-confirm') as HTMLInputElement;
    const submitBtn = card.querySelector('#yakaji-auth-submit') as HTMLButtonElement;
    const forgotStepBtn = card.querySelector('#yakaji-btn-forgot-step') as HTMLButtonElement;
    const backToLoginWrap = card.querySelector('#yakaji-back-to-login') as HTMLElement;
    const backToLoginBtn = card.querySelector('#yakaji-btn-back-login') as HTMLButtonElement;

    const showError = (msg: string, offerSignIn = false) => {
      errTextEl.textContent = msg;
      errEl.hidden = !msg;
      errGoLoginBtn.hidden = !msg || !offerSignIn;
    };

    const showInfo = (msg: string) => {
      infoEl.textContent = msg;
      infoEl.hidden = !msg;
    };

    const syncUi = (preserveInfo = false) => {
      showError('');
      const isLogin = mode === 'login';
      const isRegister = mode === 'register';
      const isForgot = mode === 'forgot';
      const isForgotVerify = isForgot && forgotStep === 'verify';
      const isAdminSetup = mode === 'admin-setup';

      tabsEl.style.display = isAdminSetup || isForgot ? 'none' : 'grid';
      tabLoginBtn.style.background = isLogin ? '#fff' : 'transparent';
      tabLoginBtn.style.color = isLogin ? '#087b50' : '#53655b';
      tabLoginBtn.style.boxShadow = isLogin ? '0 1px 4px rgba(0,0,0,0.08)' : 'none';

      tabRegisterBtn.style.background = isRegister ? '#fff' : 'transparent';
      tabRegisterBtn.style.color = isRegister ? '#087b50' : '#53655b';
      tabRegisterBtn.style.boxShadow = isRegister ? '0 1px 4px rgba(0,0,0,0.08)' : 'none';

      fieldName.style.display = isRegister ? 'grid' : 'none';
      nameInput.required = isRegister;
      fieldPhoneWrap.style.display = isRegister ? 'grid' : 'none';

      fieldCode.style.display = isForgotVerify ? 'grid' : 'none';
      codeInput.required = isForgotVerify;

      const showPasswordField = !isForgot || isForgotVerify;
      fieldPassword.style.display = showPasswordField ? 'grid' : 'none';
      passwordInput.required = showPasswordField;
      forgotBtn.style.display = isLogin ? 'inline-block' : 'none';

      const showConfirmField = isRegister || isAdminSetup || isForgotVerify;
      fieldConfirm.style.display = showConfirmField ? 'grid' : 'none';
      confirmInput.required = showConfirmField;

      emailInput.readOnly = isAdminSetup;
      emailInput.style.background = isAdminSetup ? '#f5f8f6' : '#fff';

      forgotStepBtn.hidden = !isForgot;
      if (isForgot) {
        forgotStepBtn.textContent = isForgotVerify
          ? 'Need a new code? Send verification code again'
          : 'I already have a 6-digit verification code';
      }

      if (isRegister) {
        titleEl.textContent = 'Create your customer account';
        subtitleEl.textContent = 'Your account details, wallet, and orders will be saved for future logins.';
        passwordLabel.textContent = 'Create password (min 8 characters) *';
        passwordInput.autocomplete = 'new-password';
        passwordInput.placeholder = 'Enter your password';
        submitBtn.textContent = 'Create Account & Continue';
        if (!preserveInfo) showInfo('');
      } else if (isForgot) {
        if (isForgotVerify) {
          titleEl.textContent = 'Verify code & set new password';
          subtitleEl.textContent = 'Enter your 6-digit verification code and choose a new password (min 8 characters).';
          passwordLabel.textContent = 'New password (min 8 characters) *';
          passwordInput.autocomplete = 'new-password';
          passwordInput.placeholder = 'Create a new password';
          submitBtn.textContent = 'Verify & Save New Password';
        } else {
          titleEl.textContent = 'Reset your password';
          subtitleEl.textContent = 'Enter your registered email address to receive a 6-digit verification code.';
          submitBtn.textContent = 'Send Verification Code';
        }
        if (!preserveInfo) showInfo('');
      } else if (isAdminSetup) {
        titleEl.textContent = 'Confirm your account password';
        subtitleEl.textContent = 'Re-enter your password once to save your account credentials.';
        if (accountSetupEmail) emailInput.value = accountSetupEmail;
        passwordLabel.textContent = 'Password (min 8 characters) *';
        passwordInput.autocomplete = 'new-password';
        passwordInput.placeholder = 'Enter your password';
        submitBtn.textContent = 'Save Password & Sign In';
        showInfo('Confirm your password to save your credentials for future logins.');
      } else {
        titleEl.textContent = 'Sign in to your account';
        subtitleEl.textContent = 'Sign in with your saved email address and password.';
        passwordLabel.textContent = 'Password *';
        passwordInput.autocomplete = 'current-password';
        passwordInput.placeholder = 'Enter your password';
        submitBtn.textContent = 'Sign In';
        if (!preserveInfo) showInfo('');
      }

      backToLoginWrap.hidden = !isAdminSetup && !isForgot;
    };

    syncUi();

    togglePwBtn.addEventListener('click', () => {
      const nextType = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = nextType;
      confirmInput.type = nextType;
      togglePwBtn.textContent = nextType === 'text' ? 'Hide' : 'Show';
    });

    tabLoginBtn.addEventListener('click', () => {
      mode = 'login';
      syncUi();
    });

    tabRegisterBtn.addEventListener('click', () => {
      mode = 'register';
      syncUi();
    });

    forgotBtn.addEventListener('click', () => {
      mode = 'forgot';
      forgotStep = 'request';
      passwordInput.value = '';
      confirmInput.value = '';
      codeInput.value = '';
      syncUi();
    });

    forgotStepBtn.addEventListener('click', () => {
      forgotStep = forgotStep === 'request' ? 'verify' : 'request';
      syncUi();
    });

    const switchToLoginWithEmail = () => {
      mode = 'login';
      forgotStep = 'request';
      passwordInput.value = '';
      confirmInput.value = '';
      syncUi(true);
      showInfo('This email is already registered. Enter your password below to sign in (or click Forgot password?).');
      passwordInput.focus();
    };

    errGoLoginBtn.addEventListener('click', switchToLoginWithEmail);

    backToLoginBtn.addEventListener('click', () => {
      mode = 'login';
      forgotStep = 'request';
      syncUi();
    });

    let lastCheckedRegisterEmail = '';
    let emailAlreadyTaken = false;
    const checkRegisterEmail = async () => {
      if (mode !== 'register') return false;
      const candidate = emailInput.value.trim().toLowerCase();
      if (!candidate || !candidate.includes('@')) {
        emailAlreadyTaken = false;
        return false;
      }
      if (candidate === lastCheckedRegisterEmail && emailAlreadyTaken) {
        showError('This email address is already registered. Only one account is allowed per email — please go back to Sign In.', true);
        return true;
      }
      try {
        const res = await request<{ registered?: boolean; message?: string }>('POST', '/api/auth/check-email', { email: candidate });
        lastCheckedRegisterEmail = candidate;
        emailAlreadyTaken = Boolean(res.data?.registered);
        if (mode === 'register' && emailAlreadyTaken) {
          showError(
            res.data?.message || 'This email address is already registered. Only one account is allowed per email — please go back to Sign In.',
            true
          );
          return true;
        }
      } catch {
        // fallback to server validation on submit
      }
      return false;
    };

    emailInput.addEventListener('blur', () => {
      if (mode === 'register') void checkRegisterEmail();
    });

    emailInput.addEventListener('input', () => {
      if (mode === 'register' && emailAlreadyTaken) {
        emailAlreadyTaken = false;
        lastCheckedRegisterEmail = '';
        showError('');
      }
    });

    const cancel = () => {
      overlay.remove();
      reject(new Error('Sign in cancelled.'));
    };

    card.querySelector('#yakaji-auth-close')?.addEventListener('click', cancel);
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) cancel();
    });

    card.querySelector('#yakaji-auth-form')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (busy) return;
      showError('');

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;
      const codeVal = codeInput.value.trim();

      if (!email) {
        showError('Please enter your email address.');
        return;
      }

      if (mode === 'forgot' && forgotStep === 'request') {
        busy = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending code...';
        try {
          const res = await request<{ sent?: boolean; emailed?: boolean; message?: string }>(
            'POST',
            '/api/auth/forgot-password',
            { email }
          );
          forgotStep = 'verify';
          passwordInput.value = '';
          confirmInput.value = '';
          syncUi(true);
          showInfo(res.data?.message || 'Enter your 6-digit verification code and new password below.');
        } catch (err: any) {
          showError(err?.message || 'Could not start password reset. Please try again.');
        } finally {
          busy = false;
          submitBtn.disabled = false;
          if (submitBtn.isConnected && mode === 'forgot' && forgotStep === 'request') {
            submitBtn.textContent = 'Send Verification Code';
          }
        }
        return;
      }

      if (mode === 'forgot' && forgotStep === 'verify') {
        if (!/^\d{6}$/.test(codeVal)) {
          showError('Please enter the 6-digit verification code.');
          return;
        }
        if (password.length < 8) {
          showError('New password must be at least 8 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          showError('Passwords do not match.');
          return;
        }
      } else {
        if (!password) {
          showError('Please enter your email address and password.');
          return;
        }
        if ((mode === 'register' || mode === 'admin-setup') && password.length < 8) {
          showError('Password must be at least 8 characters long.');
          return;
        }
        if ((mode === 'register' || mode === 'admin-setup') && password !== confirmPassword) {
          showError('Passwords do not match.');
          return;
        }
      }

      if (mode === 'register') {
        const taken = await checkRegisterEmail();
        if (taken) return;
      }

      busy = true;
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent || 'Continue';
      submitBtn.textContent =
        mode === 'register'
          ? 'Saving account...'
          : mode === 'forgot'
            ? 'Verifying & saving...'
            : mode === 'admin-setup'
              ? 'Saving credentials...'
              : 'Signing in...';

      try {
        let res: { data: AuthResponse };
        if (mode === 'register') {
          res = await request<AuthResponse>('POST', '/api/auth/register', {
            fullName: nameInput.value.trim(),
            email,
            phone: phoneInput.value.trim(),
            address: addressInput.value.trim(),
            password,
          });
        } else if (mode === 'forgot') {
          res = await request<AuthResponse>('POST', '/api/auth/reset-password', {
            email,
            code: codeVal,
            newPassword: password,
            confirmPassword,
          });
        } else if (mode === 'admin-setup') {
          res = await request<AuthResponse>('POST', '/api/auth/admin-setup', {
            email,
            password,
            confirmPassword,
          });
        } else {
          res = await request<AuthResponse>('POST', '/api/auth/login', {
            email,
            password,
          });
        }

        const loggedIn = res.data?.user;
        if (!loggedIn?.userId) {
          throw new Error('Authentication did not return an account session.');
        }

        setSessionState(
          { ...loggedIn, ...(res.data?.redirectTo ? { redirectTo: res.data.redirectTo } : {}) },
          res.data?.token || null
        );
        overlay.remove();
        resolve({
          ...loggedIn,
          ...(res.data?.redirectTo ? { redirectTo: res.data.redirectTo } : {}),
        });
      } catch (err: any) {
        const code = err?.response?.data?.code;
        if (code === 'ADMIN_SETUP_REQUIRED') {
          accountSetupEmail = email;
          mode = 'admin-setup';
          syncUi();
          confirmInput.value = password;
          showInfo('Confirm your password below and click "Save Password & Sign In".');
        } else if (code === 'EMAIL_ALREADY_REGISTERED' || (mode === 'register' && err?.response?.status === 409)) {
          emailAlreadyTaken = true;
          lastCheckedRegisterEmail = email;
          showError(
            err?.message || 'This email address is already registered. Only one account is allowed per email — please go back to Sign In.',
            true
          );
        } else {
          showError(err?.message || 'Could not sign in. Please check your details.');
        }
      } finally {
        busy = false;
        submitBtn.disabled = false;
        if (submitBtn.isConnected && mode !== 'admin-setup') {
          submitBtn.textContent = originalLabel;
        }
      }
    });
  });
}

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    try {
      const res = await request<AuthResponse>('GET', '/api/auth/me');
      const user = res.data?.user || null;
      setSessionState(user, res.data?.token || null);
      return user;
    } catch {
      setSessionState(null, null);
      return null;
    }
  },
  async signInWithRedirect(opts?: { initialMode?: 'login' | 'register' }): Promise<AuthUser> {
    return openSignInModal(opts);
  },
  async signOut(): Promise<void> {
    try {
      await request('POST', '/api/auth/logout', {});
    } catch {
      // ignore network error on signout
    }
    setSessionState(null, null);
    try {
      localStorage.removeItem('yakaji-auth-user');
    } catch {
      // ignore
    }
  },
};

export const api = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T = any>(url: string, body?: unknown) => request<T>('PUT', url, body),
  delete: <T = any>(url: string) => request<T>('DELETE', url),
};

const notificationListeners = new Set<(payload: any) => void>();

export const notifications = {
  async subscribe(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore browser/iframe permission errors
        }
      }
    }
  },
  onMessage(cb: (payload: any) => void): () => void {
    notificationListeners.add(cb);
    return () => {
      notificationListeners.delete(cb);
    };
  },
};

export const ws = {
  connect() {
    const listeners = new Set<(msg: any) => void>();
    let resolveReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    const connObj = {
      connectionId: '',
      ready,
      onMessage(cb: (msg: any) => void) {
        listeners.add(cb);
      },
      disconnect() {
        listeners.clear();
        try {
          socket?.close();
        } catch {
          // ignore
        }
      },
    };

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl =
      `${proto}//${window.location.host}/ws` +
      (inMemoryToken ? `?token=${encodeURIComponent(inMemoryToken)}` : '');

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data || '{}'));
          if (msg.type === 'connected' && msg.connectionId) {
            connObj.connectionId = String(msg.connectionId);
            resolveReady();
            return;
          }
          if (msg.type === 'notification') {
            for (const cb of notificationListeners) cb(msg.payload);
          }
          for (const cb of listeners) cb(msg);
        } catch {
          // ignore malformed messages
        }
      };
      socket.onerror = () => {
        resolveReady();
      };
    } catch {
      resolveReady();
    }

    return connObj;
  },
};
