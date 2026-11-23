import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { fld, seg } from '../components.js';

const signin = () => html`<form data-form="signin" class="card">
  ${fld(t('auth_email'), html`<input name="email" type="email" required autocomplete="email" inputmode="email" dir="ltr">`)}
  ${fld(t('auth_password'), html`<input name="password" type="password" required autocomplete="current-password" dir="ltr">`)}
  <button class="btn" type="submit">${t('auth_signin')}</button>
  <button type="button" class="link" data-act="auth-mode" data-id="forgot">${t('auth_forgot')}</button></form>`;

const signup = () => html`<form data-form="signup" class="card">
  ${fld(t('auth_name'), html`<input name="name" required maxlength="80" autocomplete="name">`)}
  ${fld(t('auth_username'), html`<input name="username" required pattern="[A-Za-z0-9_]{3,30}" autocapitalize="none" autocomplete="username" dir="ltr">`, t('auth_username_hint'))}
  ${fld(t('auth_email'), html`<input name="email" type="email" required autocomplete="email" inputmode="email" dir="ltr">`)}
  ${fld(t('auth_phone_opt'), html`<input name="phone" type="tel" autocomplete="tel" inputmode="tel" dir="ltr" placeholder="05xxxxxxxx">`)}
  ${fld(t('auth_password'), html`<input name="password" type="password" required minlength="8" autocomplete="new-password" dir="ltr">`, t('auth_pw_hint'))}
  <button class="btn" type="submit">${t('auth_signup')}</button></form>`;

const forgot = () => html`<form data-form="forgot" class="card">
  ${fld(t('auth_email'), html`<input name="email" type="email" required autocomplete="email" dir="ltr">`)}
  <button class="btn" type="submit">${t('auth_forgot')}</button>
  <button type="button" class="link" data-act="auth-mode" data-id="in">${t('auth_back_signin')}</button></form>`;

export function authView(s) {
  const m = s.route.auth || 'in';
  return html`<main class="auth"><div class="logo" aria-hidden="true">🏠</div><h1>${t('appName')}</h1><p class="mut">${t('auth_tagline')}</p>
    ${m !== 'forgot' ? seg([['in', t('auth_signin')], ['up', t('auth_signup')]], m, 'auth-mode') : ''}
    ${m === 'up' ? signup() : m === 'forgot' ? forgot() : signin()}
    ${seg([['ar', 'العربية'], ['en', 'English']], s.lang, 'lang-set')}</main>`;
}

export const recoveryView = () => html`<main class="auth"><h1>${t('auth_new_password')}</h1>
  <form data-form="recovery" class="card">${fld(t('auth_new_password'), html`<input name="password" type="password" required minlength="8" autocomplete="new-password" dir="ltr">`, t('auth_pw_hint'))}
  <button class="btn" type="submit">${t('auth_save_password')}</button></form></main>`;

export const configView = () => html`<main class="auth"><div class="logo" aria-hidden="true">⚙️</div><h1>${t('cfg_title')}</h1><p class="mut">${t('cfg_body')}</p></main>`;
