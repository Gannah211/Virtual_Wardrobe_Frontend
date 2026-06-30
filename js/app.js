'use strict';
 
import { state } from './state.js';
import * as api  from './api.js';
import * as ui   from './ui.js';
 

 /* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
 
/** Show login or register screen, hiding the other */
function showAuthScreen(which) {
  ['auth-landing','login','register'].forEach(s => {
    document.getElementById(`screen-${s}`)?.classList.remove('active');
  });
  document.getElementById(`screen-${which}`)?.classList.add('active');
  // Clear errors and inputs when switching
  document.getElementById('login-error').style.display    = 'none';
  document.getElementById('register-error').style.display = 'none';
  if (which === 'login') {
    document.getElementById('login-email').value    = '';
    document.getElementById('login-password').value = '';
  } else if (which === 'register') {
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value    = '';
    document.getElementById('register-password').value = '';
  }
}
window.showAuthScreen = showAuthScreen;
 
/** Toggle password visibility */
function toggleAuthPassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector('.eye-icon');

  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons(); // re-render the swapped icon
}
window.toggleAuthPassword = toggleAuthPassword;
 
/** Show an auth error message */
function showAuthError(errorId, message) {
  const el = document.getElementById(errorId);
  if (el) { el.textContent = message; el.style.display = 'block'; }
}

 
/**
 * Save token and user info.
 * rememberMe=true → localStorage (persists across browser closes)
 * rememberMe=false → sessionStorage (cleared when tab closes)
 */
function saveAuthSession(response, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage;
  // If switching storage, clear the other one
  if (rememberMe) sessionStorage.removeItem('token');
  else            localStorage.removeItem('token');
 
  storage.setItem('token',      response.token);
  storage.setItem('email',      response.email);
  storage.setItem('username',   response.username);
  storage.setItem('rememberMe', String(rememberMe));
}
 
/** Check if user is already logged in (checks both storages) */
function isLoggedIn() {
  return !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
}
 
/** Get stored token from whichever storage has it */
function getStoredToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}
 
/** Clear auth from both storages (used for logout) */
function clearAuthSession() {
  ['token','email','username','rememberMe'].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}
/* ══════════════════════════════════════════════════════════
   FORGOT PASSWORD (3-step dialog)
══════════════════════════════════════════════════════════ */

let fpState = { step: 'email', email: '' };

function openForgotPasswordDialog() {
  fpState = { step: 'email', email: '' };
  document.getElementById('fp-email-input').value   = '';
  document.getElementById('fp-otp-input').value     = '';
  document.getElementById('fp-newpass-input').value = '';
  showFpStep('email');
  document.getElementById('fp-dialog-back').style.display = 'flex';
  setTimeout(() => document.getElementById('fp-email-input')?.focus(), 50);
}
window.openForgotPasswordDialog = openForgotPasswordDialog;

function cancelForgotPasswordDialog() {
  document.getElementById('fp-dialog-back').style.display = 'none';
}
window.cancelForgotPasswordDialog = cancelForgotPasswordDialog;

function showFpStep(step) {
  fpState.step = step;
  ['email', 'otp', 'reset', 'success'].forEach(s => {
    document.getElementById(`fp-step-${s}`).style.display = s === step ? 'block' : 'none';
  });
  ['fp-email-error', 'fp-otp-error', 'fp-reset-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const title      = document.getElementById('fp-dialog-title');
  const confirmBtn = document.getElementById('fp-confirm-btn');
  const cancelBtn  = document.getElementById('fp-cancel-btn');

  if (step === 'email') {
    title.textContent = '🔑 RESET PASSWORD';
    confirmBtn.textContent = 'SEND OTP';
    confirmBtn.style.display = '';
    cancelBtn.textContent = 'CANCEL';
  } else if (step === 'otp') {
    title.textContent = '📩 ENTER OTP';
    confirmBtn.textContent = 'VERIFY';
    confirmBtn.style.display = '';
    cancelBtn.textContent = 'CANCEL';
    document.getElementById('fp-otp-email-display').textContent = fpState.email;
  } else if (step === 'reset') {
    title.textContent = '🔒 NEW PASSWORD';
    confirmBtn.textContent = 'RESET PASSWORD';
    confirmBtn.style.display = '';
    cancelBtn.textContent = 'CANCEL';
  } else if (step === 'success') {
    title.textContent = '✅ DONE';
    confirmBtn.style.display = 'none';
    cancelBtn.textContent = 'CLOSE';
  }
}

function showFpError(step, message) {
  const el = document.getElementById(`fp-${step}-error`);
  if (el) { el.textContent = message; el.style.display = 'block'; }
}
async function handleFpConfirm() {
 const btn = document.getElementById('fp-confirm-btn');

  if (fpState.step === 'email') {
    const email = document.getElementById('fp-email-input').value.trim();
    if (!email) { showFpError('email', 'Email is required.'); return; }

    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'SENDING…';
    try {
      await api.forgotPassword({ email });
      fpState.email = email;
      showFpStep('otp'); // sets the correct new label — don't touch it after this
    } catch (err) {
      showFpError('email', err.message?.includes('404') ? 'No account found with that email.' : 'Could not send OTP. Try again.');
      btn.textContent = originalText; // only restore label on failure
    } finally {
      btn.disabled = false;
    }

  } else if (fpState.step === 'otp') {
    const otp = document.getElementById('fp-otp-input').value.trim();
    if (!otp) { showFpError('otp', 'Please enter the OTP.'); return; }

    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'VERIFYING…';
    try {
      await api.verifyOtp({ email: fpState.email, otp });
      showFpStep('reset');
    } catch (err) {
      showFpError('otp', 'Invalid or expired OTP. Please try again.');
      btn.textContent = originalText;
    } finally {
      btn.disabled = false;
    }

  } else if (fpState.step === 'reset') {
    const newPassword = document.getElementById('fp-newpass-input').value;
    if (!newPassword || newPassword.length < 6) {
      showFpError('reset', 'Password must be at least 6 characters.');
      return;
    }

    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'SAVING…';
    try {
      await api.resetPassword({ email: fpState.email, newPassword });
      showFpStep('success');
    } catch (err) {
      showFpError('reset', 'Could not reset password. Try again.');
      btn.textContent = originalText;
    } finally {
      btn.disabled = false;
    }
  }
}

function setupForgotPasswordDialogEvents() {
  const backdrop = document.getElementById('fp-dialog-back');
  if (backdrop) backdrop.addEventListener('click', e => { if (e.target === backdrop) cancelForgotPasswordDialog(); });

  const confirmBtn = document.getElementById('fp-confirm-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', handleFpConfirm);

  const cancelBtn = document.getElementById('fp-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    if (fpState.step === 'success') cancelForgotPasswordDialog();
    else cancelForgotPasswordDialog();
  });

  // Enter key support per step
  ['fp-email-input', 'fp-otp-input', 'fp-newpass-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleFpConfirm();
    });
  });
}
 
async function submitLogin() {
  const email      = document.getElementById('login-email').value.trim();
  const password   = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('login-remember')?.checked ?? false;
  const btn        = document.getElementById('login-submit-btn');
  const errorId    = 'login-error';
 
  document.getElementById(errorId).style.display = 'none';
 
  if (!email)    { showAuthError(errorId, 'Email is required.');    return; }
  if (!password) { showAuthError(errorId, 'Password is required.'); return; }
 
  btn.disabled    = true;
  btn.textContent = 'LOGGING IN…';
  try {
    const response = await api.login({ email, password, rememberMe });
    saveAuthSession(response, rememberMe);
    await enterApp();
  } catch (err) {
    const msg = err.message?.includes('401') || err.message?.includes('403')
      ? 'Invalid email or password.'
      : 'Could not connect. Is the server running?';
    showAuthError(errorId, msg);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'LOG IN';
  }
}
window.submitLogin = submitLogin;
 
async function submitRegister() {
  const username = document.getElementById('register-username').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const btn      = document.getElementById('register-submit-btn');
  const errorId  = 'register-error';
 
  document.getElementById(errorId).style.display = 'none';
 
  if (!username)             { showAuthError(errorId, 'Username is required.');              return; }
  if (!email)                { showAuthError(errorId, 'Email is required.');                 return; }
  if (password.length < 6)   { showAuthError(errorId, 'Password must be at least 6 characters.'); return; }
 
  btn.disabled    = true;
  btn.textContent = 'CREATING…';
  try {
    const response = await api.register({ username, email, password });

    saveAuthSession(response);
    await enterApp();
  } catch (err) {
    const msg = err.message?.includes('409') || err.message?.includes('400')
      ? 'Email already in use. Try logging in.'
      : 'Could not register. Is the server running?';
    showAuthError(errorId, msg);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'CREATE ACCOUNT';
  }
}
window.submitRegister = submitRegister;
 
/** Called after successful login/register — loads app data and shows home */
async function enterApp() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log('enterApp token:', token); 
  try {
    const [categories, items] = await Promise.all([
      api.fetchCategories(),
      api.fetchAllItems(),
    ]);
    state.categories = categories;
    state.items      = items;
  } catch (err) {
    console.error('Failed to load data after login:', err);
  }
  ui.buildTypeRadios(state.categories);
  ui.buildTaskbar(state.categories, handleTaskbarCategorySelect);
  // Show taskbar now that user is logged in
  document.getElementById('taskbar').style.display = '';
  document.getElementById('logout-btn').style.display = 'flex'; // ← add this
  // Navigate to home
  ['auth-landing','login','register'].forEach(s => {
    document.getElementById(`screen-${s}`)?.classList.remove('active');
  });
  ui.showScreen('home');
  updateBackButton('home');
}
 /* ══════════════════════════════════════════════════════════
   ENTER APPLICATION
══════════════════════════════════════════════════════════ */
async function init() {
  applyLeopardBg();
  lucide.createIcons();
 
 // Build static UI parts that don't need auth
  ui.buildOccasionChecks();
  ui.buildSeasonRadios();
  ui.buildBrowseModeGrid(handleBrowseModeSelect);
  setupImageUpload();
  setupOutfitDialogEvents();
  setupDialogEvents();
  setupSuitMeDialogEvents();
  setupEditItemDialogEvents();
  setupEditOutfitDialogEvents();
  setupForgotPasswordDialogEvents();
 
  // Enter key support for auth forms
  document.getElementById('login-password')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
  document.getElementById('login-email')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
 
  // Pre-fill email if user had rememberMe checked last time
  const remembered = localStorage.getItem('rememberMe') === 'true';
  if (remembered && localStorage.getItem('email')) {
    const emailInput = document.getElementById('login-email');
    const rememberCb = document.getElementById('login-remember');
    if (emailInput) emailInput.value = localStorage.getItem('email');
    if (rememberCb) rememberCb.checked = true;
  }
  document.getElementById('register-password')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') submitRegister(); });
 
  // Already logged in? Skip auth screens
  if (isLoggedIn()) {
    document.getElementById('taskbar').style.display = '';
    document.getElementById('logout-btn').style.display = 'flex'; // ← add this
    await enterApp();
  } else {
    document.getElementById('taskbar').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none'; // ← add this
    ui.showScreen('auth-landing');
  }
}

 /* ══════════════════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════════════════ */

function logout() {
  clearAuthSession();           // wipes token/email/username from both storages
  state.categories      = [];
  state.items           = [];
  state.savedOutfits    = [];
  state.pendingOutfit   = null;
  state.selectedAccIds  = [];
  navHistory.length     = 0;    // clear back-button history

  document.getElementById('taskbar').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none'; // ← add this

  ui.showScreen('auth-landing');
  updateBackButton('auth-landing');
}
window.logout = logout;
function confirmLogout() {
ui.openConfirmDialog(
    'Are you sure you want to log out?',
    logout,
    { title: 'LOG OUT?', okLabel: 'LOG OUT', cancelLabel: 'STAY' }
  );}
window.confirmLogout = confirmLogout;
/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
 
const navHistory = [];
 
async function showScreen(name) {
  const current = document.querySelector('.screen.active')?.id?.replace('screen-', '');
  if (current && current !== name) navHistory.push(current);
 
  ui.showScreen(name);
  updateBackButton(name);
 
  if (name === 'browse-items') await loadAndRenderBrowseItems();
  if (name === 'find')             { ui.showScreen('find-mode'); updateBackButton('find-mode'); return; }
  if (name === 'find-topbottom')   await loadAndRenderOutfit('topbottom');
  if (name === 'find-dress')       await loadAndRenderOutfit('dress');
    if (name === 'prev-outfits') await loadAndRenderPrevOutfits();
  if (name === 'analysis-history')  await loadAndRenderAnalysisHistory();

}
window.showScreen = showScreen;
 
function updateBackButton(screenName) {
  const btn = document.getElementById('back-btn');
  if (!btn) return;
  const noBackScreens = ['home', 'auth-landing', 'login', 'register'];
  btn.style.display = noBackScreens.includes(screenName)? 'none' : 'flex';
}
 
function goBack() {
  const prev = navHistory.pop() ?? 'home';
  ui.showScreen(prev);
  updateBackButton(prev);
  if (prev === 'browse-items') loadAndRenderBrowseItems();
 if (prev === 'find')             loadAndRenderOutfit('topbottom');
  if (prev === 'find-topbottom')   loadAndRenderOutfit('topbottom');
  if (prev === 'find-dress')       loadAndRenderOutfit('dress'); 
   if (prev === 'prev-outfits') loadAndRenderPrevOutfits();
  if (prev === 'analysis-history') loadAndRenderAnalysisHistory();

}
window.goBack = goBack;
 
/* ══════════════════════════════════════════════════════════
   BROWSE MODE  (screen-browse-mode → screen-browse-filter)
══════════════════════════════════════════════════════════ */
 
async function handleBrowseModeSelect(mode) {
  state.browseMode = mode;
 
  if (mode === 'all') {
    state.currentCategoryId   = null;
    state.currentFilterValue  = null;
    state.currentCategoryName = 'ALL ITEMS';
    await showScreen('browse-items');
    return;
  }
 
  // Build second-level filter buttons then go to filter screen
  ui.buildFilterGrid(mode, state.categories, handleFilterSelect);
  await showScreen('browse-filter');
}
 
async function handleFilterSelect(value, label) {
  state.currentFilterValue  = value;
  state.currentCategoryName = label;
  state.currentCategoryId   = state.browseMode === 'category' ? Number(value) : null;
  await showScreen('browse-items');
}
 
/** Taskbar shortcuts go straight to a category without the mode picker. */
async function handleTaskbarCategorySelect(cat) {
  state.browseMode          = 'category';
  state.currentCategoryId   = cat.id;
  state.currentFilterValue  = String(cat.id);
  state.currentCategoryName = cat.name ?? 'ALL ITEMS';
  await showScreen('browse-items');
}
 
/* ══════════════════════════════════════════════════════════
   BROWSE ITEMS
══════════════════════════════════════════════════════════ */
 
async function loadAndRenderBrowseItems() {
  ui.showGridLoading();
 
  try {
    let items;
    const v = state.currentFilterValue;
 
    switch (state.browseMode) {
      case 'category':
        items = state.currentCategoryId !== null
          ? await api.fetchItemsByCategory(state.currentCategoryId)
          : await api.fetchAllItems();
        break;
      case 'occasion':
        items = await api.fetchItemsByOccasion(v);
        break;
      case 'season':
        items = await api.fetchItemsBySeason(v);
        break;
      case 'comfort':
        items = await api.fetchItemsByComfort(v === 'true');
        break;
      default:
        items = await api.fetchAllItems();
    }
 
    state.items = items;
    ui.renderItemsGrid(items, state.currentCategoryName, handleDeleteItem,handleEditItem);
  } catch (err) {
    console.error('Failed to load items:', err);
    ui.showGridError('Could not load items. Is the server running?');
  }
}
 
/* ══════════════════════════════════════════════════════════
   DELETE ITEM
══════════════════════════════════════════════════════════ */
 
async function handleDeleteItem(id) {
  try {
    await api.deleteItem(id);
    state.items = state.items.filter(item => item.id !== id);
    ui.renderItemsGrid(state.items, state.currentCategoryName, handleDeleteItem,handleEditItem);
  } catch (err) {
    console.error('Failed to delete item:', err);
     ui.openDialog('Could not delete the item. Please try again.', { title: '⚠️ ERROR' });
  }
}
 
/* ── EDIT ITEM ─────────────────────────────────────────── */
function handleEditItem(item) {
  state.editingItem = item;
  ui.openEditItemDialog(item);
}
 
function setupEditItemDialogEvents() {
  const backdrop = document.getElementById('edit-item-dialog-back');
  if (!backdrop) return;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) ui.closeEditItemDialog(); });
}
 
async function confirmEditItemDialog() {
  const item = state.editingItem;
  if (!item) return;
  const payload = ui.readEditItemForm(item);
  const btn = document.getElementById('edit-item-confirm-btn');
  if (btn) btn.disabled = true;
  try {
    const updated = await api.updateItem(item.id, payload);
    state.items = state.items.map(i => i.id === updated.id ? updated : i);
    ui.closeEditItemDialog();
    ui.renderItemsGrid(state.items, state.currentCategoryName, handleDeleteItem, handleEditItem);
    state.editingItem = null;
  } catch (err) { console.error('Failed to update item:', err);  ui.openDialog('Could not update item. Please try again.', { title: 'ERROR' });
  } finally { if (btn) btn.disabled = false; }
}
window.confirmEditItemDialog = confirmEditItemDialog;
window.cancelEditItemDialog  = () => { ui.closeEditItemDialog(); state.editingItem = null; };
 
/* ── EDIT OUTFIT ───────────────────────────────────────── */
function handleEditOutfit(outfit) {
  state.editingOutfit = { ...outfit, selectedItemIds: (outfit.items ?? []).map(i => i.id) };
  ui.openEditOutfitDialog(outfit, state.items);
}
 
function setupEditOutfitDialogEvents() {
  const backdrop = document.getElementById('edit-outfit-dialog-back');
  if (!backdrop) return;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) ui.closeEditOutfitDialog(); });

 const dialogBody = document.querySelector('#edit-outfit-dialog-back .outfit-dialog-body');
  if (!dialogBody) return;
  dialogBody.addEventListener('click', e => {
    const card = e.target.closest('[data-toggle-item-id]');
    if (!card) return;
    const id  = Number(card.dataset.toggleItemId);
    const ids = state.editingOutfit?.selectedItemIds;
    if (!ids) return;
    const idx = ids.indexOf(id);
    if (idx === -1) ids.push(id); else ids.splice(idx, 1);
    ui.updateEditOutfitSelection(ids);
  });
}
 
async function confirmEditOutfitDialog() {
  const outfit = state.editingOutfit;
  if (!outfit) return;
  if (outfit.selectedItemIds.length === 0) { ui.openDialog('Please select at least one item.', { title: 'HOLD ON' }); return; }
  const name = document.getElementById('edit-outfit-name').value.trim() || outfit.name;
  const desc = document.getElementById('edit-outfit-desc').value.trim();
  const btn  = document.getElementById('edit-outfit-confirm-btn');
  if (btn) btn.disabled = true;
  try {
    const updated = await api.updateOutfit(outfit.id, { name, description: desc, clothingItemsIds: outfit.selectedItemIds });
    state.savedOutfits = state.savedOutfits.map(o => o.id === updated.id ? updated : o);
    ui.closeEditOutfitDialog();
    ui.renderPrevOutfits(state.savedOutfits, handleDeleteOutfit, handleEditOutfit);
    state.editingOutfit = null;
  } catch (err) { console.error('Failed to update outfit:', err);  ui.openDialog('Could not update outfit. Please try again.', { title: 'ERROR' });
  } finally { if (btn) btn.disabled = false; }
}
window.confirmEditOutfitDialog = confirmEditOutfitDialog;
window.cancelEditOutfitDialog  = () => { ui.closeEditOutfitDialog(); state.editingOutfit = null; }
 
/* ══════════════════════════════════════════════════════════
   ADD ITEM
══════════════════════════════════════════════════════════ */
 
async function addItem() {
  const payload = ui.readAddForm(state.pendingImageUrl);
 
  if (!payload.categoryId)            { ui.openDialog('Please select a category.', { title: 'HOLD ON' });             return; }
  if (!payload.imgUrl)                { ui.openDialog('Please upload a photo.', { title: 'HOLD ON' });                return; }
  if (payload.ocassionList.length === 0) { ui.openDialog('Please select at least one occasion.', { title: 'HOLD ON' });   return;}
 
  const addBtn = document.querySelector('.add-btn');
  if (addBtn) addBtn.disabled = true;
 
  try {
    const created = await api.addItem(payload);
    state.items.push(created);
    ui.resetAddForm();
    state.pendingImageUrl     = null;
    state.browseMode          = 'category';
    state.currentCategoryId   = payload.categoryId;
    state.currentFilterValue  = String(payload.categoryId);
    state.currentCategoryName =
      state.categories.find(c => c.id === payload.categoryId)?.name?.trim() ?? 'ITEMS';
    await showScreen('browse-items');
  } catch (err) {
    console.error('Failed to add item:', err);
    // alert('Could not save the item. Please check the server and try again.');
    ui.openDialog(err.message);
  } finally {
    if (addBtn) addBtn.disabled = false;
  }
}
window.addItem = addItem;
 
/* ══════════════════════════════════════════════════════════
   FIND OUTFIT
══════════════════════════════════════════════════════════ */
 // Non-clothing categories — anything that isn't a top/bottom/dress/outerwear is treated as accessory
const CLOTHING_CATEGORIES = ['tops','bottoms','dresses','outerwear','activewear','loungewear','swimwear'];
function getTops()        { return state.items.filter(i => i.categoryName?.trim().toUpperCase() === 'TOPS'); }
function getBottoms()     { return state.items.filter(i => i.categoryName?.trim().toUpperCase() === 'BOTTOMS'); }
function getDresses()     { return state.items.filter(i => i.categoryName?.trim().toUpperCase() === 'DRESSES'); }
function getAccessories() { return state.items.filter(i => !CLOTHING_CATEGORIES.includes(i.categoryName?.trim().toLowerCase())); }
 
const carousel = (() => {
  const timers = {}; const SPEED = 1200;
  function start(slot, getItems, getIdx, setIdx, renderFn) {
    if (timers[slot]) return;
    timers[slot] = setInterval(() => { const items = getItems(); if (!items.length) return stop(slot); setIdx((getIdx()+1)%items.length); renderFn(); }, SPEED);
  }
  function stop(slot) { if (timers[slot]) { clearInterval(timers[slot]); delete timers[slot]; } }
  function isRunning(slot) { return !!timers[slot]; }
  return { start, stop, isRunning };
})();
 
function renderTop()    { ui.renderOutfitSlot('top',    getTops(),        state.topIdx); }
function renderBottom() { ui.renderOutfitSlot('bottom', getBottoms(),     state.botIdx); }
function renderDress()  { ui.renderOutfitSlot('dress',  getDresses(),     state.dressIdx); }
function renderAcc()    { ui.renderOutfitSlot('acc',    getAccessories(), state.accIdx); }
let phase = 'idle';
function startTopCarousel()    { carousel.start('top',    getTops,    ()=>state.topIdx, v=>{state.topIdx=v;}, renderTop);    phase='top';    ui.setSideBtn('■ TOP'); }
function startBottomCarousel() { carousel.start('bottom', getBottoms, ()=>state.botIdx, v=>{state.botIdx=v;}, renderBottom); phase='bottom'; ui.setSideBtn('■ BOT'); }
function stopAll() { carousel.stop('top'); carousel.stop('bottom'); phase='idle'; ui.setSideBtn('▶ TOP'); }
function handleSideBtn() { if(phase==='idle') startTopCarousel(); else if(phase==='top'){carousel.stop('top');startBottomCarousel();} else stopAll(); }
window.handleSideBtn = handleSideBtn;
 
/* ── Dress carousel ─────────────────────────────────────── */
function startDressCarousel() {
  carousel.start('dress', getDresses, ()=>state.dressIdx, v=>{state.dressIdx=v;}, renderDress);
  phase = 'dress';
  const btn = document.getElementById('side-btn-dress');
  if (btn) btn.textContent = '■ DRESS';
}
function handleSideBtnDress() {
  if (phase === 'dress') {
    carousel.stop('dress'); phase = 'idle';
    const btn = document.getElementById('side-btn-dress');
    if (btn) btn.textContent = '▶ DRESS';
  } else {
    startDressCarousel();
  }
}
window.handleSideBtnDress = handleSideBtnDress;
 
/* ── Mode picker ─────────────────────────────────────────── */
async function chooseFindMode(mode) {
  state.findMode = mode;
  try { state.items = await api.fetchAllItems(); } catch { /* use cached */ }
  carousel.stop('top'); carousel.stop('bottom'); carousel.stop('dress');
  phase = 'idle';
 
    // ← record where we're coming from (the choose-mode screen) before switching
  const current = document.querySelector('.screen.active')?.id?.replace('screen-', '');
  if (current) navHistory.push(current);

  if (mode === 'topbottom') {
    ui.setSideBtn('▶ TOP');
    renderTop(); renderBottom();
    ui.showScreen('find');
    updateBackButton('find');
  } else {
    state.dressIdx = 0;
    renderDress();
    const btn = document.getElementById('side-btn-dress');
    if (btn) btn.textContent = '▶ DRESS';
    ui.showScreen('find-dress');
    updateBackButton('find-dress');
  }
}
window.chooseFindMode = chooseFindMode;
function stopSlot(which) {
  if (carousel.isRunning(which)) {
    carousel.stop(which);
    if      (which==='top'    && phase==='top')    startBottomCarousel();
    else if (which==='bottom' && phase==='bottom') { phase='idle'; ui.setSideBtn('▶ TOP'); }
    else if (which==='dress'  && phase==='dress')  { phase='idle'; document.getElementById('side-btn-dress') && (document.getElementById('side-btn-dress').textContent='▶ DRESS'); }
  } else {
    if (which==='top')    startTopCarousel();
    if (which==='bottom') startBottomCarousel();
    if (which==='dress')  startDressCarousel();
  }
}
window.stopSlot = stopSlot;
function cycleItem(which, dir) {
  if (carousel.isRunning(which)) { stopSlot(which); return; }
  let items, idx, setIdx, renderFn;
  if (which === 'top')   { items = getTops();    idx = state.topIdx;   setIdx = v => state.topIdx   = v; renderFn = renderTop; }
  else if (which === 'bottom') { items = getBottoms(); idx = state.botIdx; setIdx = v => state.botIdx = v; renderFn = renderBottom; }
  else if (which === 'dress')  { items = getDresses(); idx = state.dressIdx; setIdx = v => state.dressIdx = v; renderFn = renderDress; }
  if (!items || !items.length) return;
  setIdx((idx + dir + items.length) % items.length);
  renderFn();
}
window.cycleItem = cycleItem;
async function goAccessorize() {
  carousel.stop('top'); carousel.stop('bottom');
  // Always reload items so accessories list is fresh
  try { state.items = await api.fetchAllItems(); } catch { /* use cached */ }
 const validIds = new Set(getAccessories().map(a => a.id));
  state.selectedAccIds = (state.selectedAccIds ?? []).filter(id => validIds.has(id));
  ui.renderAccessorizeScreen(getAccessories(), state.selectedAccIds, !!state.pendingOutfit);
  showScreen('accessorize');
}
window.goAccessorize = goAccessorize;
 
// Called when user taps an accessory card
function toggleAccessory(itemId) {
  const ids = state.selectedAccIds;
  const idx = ids.indexOf(itemId);
  if (idx === -1) ids.push(itemId); else ids.splice(idx, 1);
  // Update count badge and card selection state
  ui.updateAccessorizeSelection(state.selectedAccIds);
}
window.toggleAccessory = toggleAccessory;
 
async function saveBasic() {
  let itemIds;
  if (state.findMode === 'dress') {
    const dresses = getDresses();
    const dress = dresses.length > 0 ? dresses[state.dressIdx % dresses.length] : null;
    if (!dress) { ui.openDialog('Add at least one dress before saving!', { title: 'HOLD ON' }); return;}
    itemIds = [dress.id];
  } else {
    const tops=getTops(),bottoms=getBottoms();
    const top=tops.length>0?tops[state.topIdx%tops.length]:null;
    const bottom=bottoms.length>0?bottoms[state.botIdx%bottoms.length]:null;
    if(!top&&!bottom){ ui.openDialog('Add at least a top or bottom before saving!', { title: 'HOLD ON' }); return; }
    itemIds=[top?.id,bottom?.id].filter(Boolean);
  }
  const _itemIds = itemIds;
  ui.openOutfitDialog(({name,description})=>{
    state.pendingOutfit = { name, description, itemIds: _itemIds };

    const accCount = (state.selectedAccIds ?? []).length;
    const accLine = accCount > 0
      ? `You already have ${accCount} accessor${accCount===1?'y':'ies'} selected.`
      : `No accessories selected yet.`;

    ui.openDialog(`
      <div style="font-family:var(--font-head);font-size:12px;margin-bottom:10px;letter-spacing:1px;text-align:center">
        "${ui.escapeHtml(name)}" IS STAGED ✨
      </div>
      <div style="font-size:11px;text-align:center;margin-bottom:14px;color:var(--gray)">${accLine}</div>
      <button class="wbtn" style="width:100%;margin-bottom:8px" onclick="dismissDialog();createOutfit()">SAVE NOW</button>
      <button class="wbtn" style="width:100%" onclick="dismissDialog();goAccessorize()">${accCount>0?'EDIT ACCESSORIES':'ADD ACCESSORIES'}</button>
    `);
  });
}
window.saveBasic = saveBasic;


async function createOutfit() {
  let itemIds;
 
  if (state.pendingOutfit) {
    itemIds = [...state.pendingOutfit.itemIds];
  }else if (state.findMode === 'dress'){
    const dresses = getDresses();
    const dress = dresses.length > 0 ?dresses[state.dressIdx % dresses.length] : null ;
    itemIds = [dress?.id].filter(Boolean);
  } else {
    const tops    = getTops();
    const bottoms = getBottoms();
    const top    = tops.length    > 0 ? tops[state.topIdx    % tops.length]    : null;
    const bottom = bottoms.length > 0 ? bottoms[state.botIdx % bottoms.length] : null;
    itemIds = [top?.id, bottom?.id].filter(Boolean);
  }
 
  // Add selected accessories from the new grid picker
  const selectedAccs = state.selectedAccIds ?? [];
  itemIds = [...itemIds, ...selectedAccs];
 
  if (itemIds.length === 0) {
    ui.openDialog('No items selected for the outfit!');
    return;
  }

  if (state.pendingOutfit) {
    await _doSaveOutfit(state.pendingOutfit.name, state.pendingOutfit.description, itemIds);
  } else {
    ui.openOutfitDialog(({ name, description }) => _doSaveOutfit(name, description, itemIds));
  }
}
window.createOutfit = createOutfit;

async function _doSaveOutfit(name, description, itemIds) {
  const btn = document.getElementById('create-outfit-btn');
  if (btn) btn.disabled = true;
  try {
    await api.saveOutfit({ name, description, clothingItemsIds: itemIds });
    state.pendingOutfit = null;
    ui.openDialog(`"${name}" saved! As if you could go wrong with that look. ✨`);
  } catch (err) {
    console.error('Failed to save outfit:', err);
    ui.openDialog(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

 
/* ══════════════════════════════════════════════════════════
   PREVIOUS OUTFITS SCREEN
══════════════════════════════════════════════════════════ */
async function loadAndRenderPrevOutfits() {
  ui.showPrevOutfitsLoading();
  try {
    state.savedOutfits = await api.fetchOutfits();
    ui.renderPrevOutfits(state.savedOutfits, handleDeleteOutfit,handleEditOutfit);
  } catch (err) {
    console.error('Failed to load outfits:', err);
    ui.renderPrevOutfitsError();
  }
}
 
async function handleDeleteOutfit(id) {
  try {
    await api.deleteOutfit(id);
    state.savedOutfits = state.savedOutfits.filter(o => o.id !== id);
    ui.renderPrevOutfits(state.savedOutfits, handleDeleteOutfit,handleEditOutfit);
  } catch (err) {
    console.error('Failed to delete outfit:', err);
    ui.openDialog('Could not delete the outfit. Is the server running?');
  }
}
 
async function loadAndRenderOutfit(mode) {
  try { state.items = await api.fetchAllItems(); } catch { /* use cached */ }
  carousel.stop('top');
  carousel.stop('bottom');
  carousel.stop('dress');
  phase = 'idle';
  if(mode === 'dress'){
    renderDress();
  }else{
  ui.setSideBtn('▶ TOP');
  renderTop();
  renderBottom();
  }

}


/* ══════════════════════════════════════════════════════════
   ANALYSIS HISTORY
══════════════════════════════════════════════════════════ */
async function loadAndRenderAnalysisHistory() {
  ui.showAnalysisHistoryLoading();
  try {
    const history = await api.fetchAnalysisHistory();
    ui.renderAnalysisHistory(history, handleDeleteAnalysis);
  } catch (err) {
    console.error('Failed to load analysis history:', err);
    ui.showAnalysisHistoryError();
  }
}
 
async function handleDeleteAnalysis(id) {
  try {
    await api.deleteAnalysis(id);
    // Reload the list after deletion
    await loadAndRenderAnalysisHistory();
  } catch (err) {
    console.error('Failed to delete analysis:', err);
    ui.openDialog('Could not delete the analysis. Is the server running?');
  }
}
 
/* ══════════════════════════════════════════════════════════
   AI — CHER'S ADVICE (Gemini)
══════════════════════════════════════════════════════════ */

const CHER_PROMPTS = [
  { label: 'DO THEY MATCH?',   text: 'Do these two pieces match well together? Be honest!' },
  { label: 'WHAT OCCASION?',   text: 'What occasion is this outfit suitable for?' },
  { label: 'COLOR VIBES?',     text: 'How do the colors work together? Full color analysis please.' },
  { label: 'RATE IT',          text: 'Rate this outfit out of 10 and explain why.' },
  { label: 'HOW TO STYLE IT?', text: 'What accessories and shoes would complete this outfit?' },
];

function getCherAdvice() {
  const buttonsHtml = CHER_PROMPTS.map((p, i) =>
    `<button class="wbtn" style="width:100%;margin-bottom:6px;font-size:11px;padding:10px;letter-spacing:1px"
       onclick="askCher(${i})">${p.label}</button>`
  ).join('');

  ui.openDialog(
    `<div style="font-family:var(--font-head);font-size:12px;
                 margin-bottom:12px;letter-spacing:2px;text-align:center">
       WHAT DO YOU WANT TO KNOW?
     </div>${buttonsHtml}`
  );
}
window.getCherAdvice = getCherAdvice;

async function askCher(promptIdx) {
  // const tops    = getTops();
  // const bottoms = getBottoms();
  // const top    = tops.length    > 0 ? tops[state.topIdx    % tops.length]    : null;
  // const bottom = bottoms.length > 0 ? bottoms[state.botIdx % bottoms.length] : null;

  // ui.openDialog('<span class="dialog-loading">Mmm…Let Me See...</span>');

  // try {
  //   const result = await api.getOutfitAdvice({
  //     topImgUrl:      top?.imgUrl       ?? '',
  //     bottomImgUrl:   bottom?.imgUrl    ?? '',
  //     topColor:       top?.color        ?? 'unknown',
  //     bottomColor:    bottom?.color     ?? 'unknown',
  //     topCategory:    top?.categoryName ?? 'top',
  //     bottomCategory: bottom?.categoryName ?? 'bottom',
  //     prompt:         CHER_PROMPTS[promptIdx].text,
  //   });
  //   ui.openDialog(ui.escapeHtml(result.advice));
  // } catch (err) {
  //   console.error('Cher advice failed:', err);
  //   ui.openDialog("Oh my God, the servers are being SO unreasonable. Try again!");
  // }

  ui.openDialog('<span class="dialog-loading">Mmm…Let Me See...</span>');
 
  // Build items list based on current find mode
  let activeItems = [];
 
  if (state.findMode === 'dress') {
    // Dress mode — single dress item
    const dresses = getDresses();
    const dress = dresses.length > 0 ? dresses[state.dressIdx % dresses.length] : null;
    if (dress) activeItems.push(dress);
  } else {
    // Top & bottom mode
    const tops    = getTops();
    const bottoms = getBottoms();
    const top    = tops.length    > 0 ? tops[state.topIdx    % tops.length]    : null;
    const bottom = bottoms.length > 0 ? bottoms[state.botIdx % bottoms.length] : null;
    if (top)    activeItems.push(top);
    if (bottom) activeItems.push(bottom);
  }
 
  // Also include any selected accessories
  const selectedAccIds = state.selectedAccIds ?? [];
  if (selectedAccIds.length > 0) {
    const accItems = getAccessories().filter(a => selectedAccIds.includes(a.id));
    activeItems = [...activeItems, ...accItems];
  }
 
  if (activeItems.length === 0) {
    ui.openDialog("As if! Add some items to your outfit first, darling!");
    return;
  }
 
  try {
    const result = await api.getOutfitAdvice({
      itemsImgUrls:   activeItems.map(i => i.imgUrl      ?? ''),
      itemsCategory:  activeItems.map(i => i.categoryName ?? 'item'),
      itemsColors:    activeItems.map(i => i.color        ?? 'unknown'),
      prompt:         CHER_PROMPTS[promptIdx].text,
    });
    ui.openDialog(ui.escapeHtml(result.advice));
  } catch(err) {
    console.error('Cher advice failed:', err);
    ui.openDialog("Oh my God, the servers are being SO unreasonable. Try again!");
  }
}
window.askCher = askCher;

/* ══════════════════════════════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════════════════════════════ */
 
function setupImageUpload() {
  const area  = document.getElementById('upload-area');
  const input = document.getElementById('file-input');
  if (!area || !input) return;
 
  area.addEventListener('click', () => input.click());
  input.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.pendingImageUrl = ev.target.result;
      ui.setUploadPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}
//  /* ══════════════════════════════════════════════════════════
//    AI — DRESS ME (Virtual Try-On)
// ══════════════════════════════════════════════════════════ */

// function dressMe() {
//   const tops    = getTops();
//   const bottoms = getBottoms();
//   const accs    = getAccessories();

//   const top    = tops.length    > 0 ? tops[state.topIdx    % tops.length]    : null;
//   const bottom = bottoms.length > 0 ? bottoms[state.botIdx % bottoms.length] : null;
//   const acc    = accs.length    > 0 ? accs[state.accIdx    % accs.length]    : null;

//   const selectedIds = [top?.id, bottom?.id, acc?.id].filter(Boolean);

//   if (selectedIds.length === 0) {
//     ui.openDialog('Add at least one item to the outfit before trying it on!');
//     return;
//   }

//   state.tryOnItemIds     = selectedIds;
//   state.tryOnImageBase64 = null;
//   ui.openTryOnDialog();
// }
// window.dressMe = dressMe;

// function setupTryOnDialogEvents() {
//   const fileInput  = document.getElementById('tryon-file-input');
//   const uploadArea = document.getElementById('tryon-upload-area');
//   const generateBtn = document.getElementById('tryon-generate-btn');
//   const closeBtn   = document.getElementById('tryon-close-btn');
//   const closeBtnFoot = document.getElementById('tryon-close-btn-foot');

//   if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());

//   if (fileInput) {
//     fileInput.addEventListener('change', e => {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       const reader = new FileReader();
//       reader.onload = ev => {
//         state.tryOnImageBase64 = ev.target.result;
//         ui.setTryOnPreview(ev.target.result);
//       };
//       reader.readAsDataURL(file);
//     });
//   }

//   if (generateBtn) generateBtn.addEventListener('click', handleTryOnGenerate);
//   if (closeBtn)    closeBtn.addEventListener('click', ui.closeTryOnDialog);
//   if (closeBtnFoot) closeBtnFoot.addEventListener('click', ui.closeTryOnDialog);
// }

// async function handleTryOnGenerate() {
//   if (!state.tryOnImageBase64) {
//     ui.showTryOnError('Please upload a full-body photo first!');
//     return;
//   }

//   const ids = state.tryOnItemIds ?? [];
//   if (ids.length === 0) {
//     ui.showTryOnError('No clothing items selected.');
//     return;
//   }

//   ui.setTryOnLoading(true);

//   try {
//     const result = await api.tryOnOutfit(ids, state.tryOnImageBase64);
//     ui.showTryOnResult(result.resultImageBase64);
//   } catch (err) {
//     console.error('Try-On failed:', err);
//     ui.showTryOnError('The AI stylist is busy right now. Please try again!');
//   } finally {
//     ui.setTryOnLoading(false);
//   }
// }
// window.handleTryOnGenerate = handleTryOnGenerate;

 /* ══════════════════════════════════════════════════════════
   WILL IT SUIT ME?
══════════════════════════════════════════════════════════ */
function willItSuitMe() {
  const tops    = getTops();
  const bottoms = getBottoms();
  const accs    = getAccessories();
  const top    = tops.length    > 0 ? tops[state.topIdx    % tops.length]    : null;
  const bottom = bottoms.length > 0 ? bottoms[state.botIdx % bottoms.length] : null;
  const dresses = getDresses();
  const dress  = dresses.length > 0 ? dresses[state.dressIdx % dresses.length] : null;
  const selectedAccIds = state.selectedAccIds ?? [];
  const baseIds = state.findMode === 'dress' ? [dress?.id] : [top?.id, bottom?.id];
  const selectedIds = [...baseIds, ...selectedAccIds].filter(Boolean);

  if (selectedIds.length === 0) {
    ui.openDialog('Select at least one item before analyzing the outfit!');
    return;
  }

  state.suitMeItemIds     = selectedIds;
  state.suitMeImageBase64 = null;
  ui.openSuitMeDialog();
}
window.willItSuitMe = willItSuitMe;

function setupSuitMeDialogEvents() {
  const fileInput    = document.getElementById('suitme-file-input');
  const uploadArea   = document.getElementById('suitme-upload-area');
  const analyzeBtn   = document.getElementById('suitme-analyze-btn');
  const closeBtn     = document.getElementById('suitme-close-btn');
  const closeBtnFoot = document.getElementById('suitme-close-btn-foot');

  if (uploadArea)   uploadArea.addEventListener('click', () => fileInput?.click());

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        state.suitMeImageBase64 = ev.target.result;
        ui.setSuitMePreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  if (analyzeBtn)   analyzeBtn.addEventListener('click', handleSuitMeAnalyze);
  if (closeBtn)     closeBtn.addEventListener('click', ui.closeSuitMeDialog);
  if (closeBtnFoot) closeBtnFoot.addEventListener('click', ui.closeSuitMeDialog);
}

async function handleSuitMeAnalyze() {
  if (!state.suitMeImageBase64) { ui.showSuitMeError('Please upload a full-body photo first!'); return; }
  const ids = state.suitMeItemIds ?? [];
  if (ids.length === 0) { ui.showSuitMeError('No clothing items selected.'); return; }

  ui.setSuitMeLoading(true);
  const ph = document.getElementById('suitme-placeholder');
  if (ph) ph.style.display = 'none';

  try {
    const result = await api.willItSuitMe(ids, state.suitMeImageBase64);
    ui.showSuitMeResult(result);
  } catch (err) {
    console.error('Suit-Me analysis failed:', err);
    ui.showSuitMeError('Analysis failed. Is the server running?');
  } finally {
    ui.setSuitMeLoading(false);
  }
}
window.handleSuitMeAnalyze = handleSuitMeAnalyze;
/* ══════════════════════════════════════════════════════════
   DIALOG
══════════════════════════════════════════════════════════ */
 
function setupDialogEvents() {
  const back = document.getElementById('dialog-back');
  if (back) back.addEventListener('click', ui.closeDialog);
}
window.dismissDialog = ui.closeDialog;
window.confirmDialogOk = ui.confirmDialogOk;


// Wire the outfit dialog confirm/cancel buttons
function setupOutfitDialogEvents() {
  const confirmBtn = document.getElementById('outfit-dialog-confirm-btn');
  const cancelBtn  = document.getElementById('outfit-dialog-cancel-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', ui.confirmOutfitDialog);
  if (cancelBtn)  cancelBtn.addEventListener('click',  ui.cancelOutfitDialog);
 
  // Also allow Enter key to confirm
  const nameInput = document.getElementById('outfit-name-input');
  const descInput = document.getElementById('outfit-desc-input');
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') ui.confirmOutfitDialog(); });
  if (descInput) descInput.addEventListener('keydown', e => { if (e.key === 'Enter') ui.confirmOutfitDialog(); });
}
 
// Keep window references for inline onclick fallback
window.confirmOutfitDialog = ui.confirmOutfitDialog;
window.cancelOutfitDialog  = ui.cancelOutfitDialog;


/* ══════════════════════════════════════════════════════════
   LEOPARD BACKGROUND (SVG → CSS data URI)
══════════════════════════════════════════════════════════ */

function applyLeopardBg() {
  document.documentElement.style.setProperty('--leopard-bg', 'url("bg1.jpg")');
}
/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', init);
