'use strict';

/**
 * ui.js — every function that touches the DOM.
 *
 * Rules:
 *  • No fetch() calls here — data always arrives as a parameter.
 *  • No direct state mutations — call back into app.js via events or by returning values.
 *  • Escaping is always applied before inserting untrusted text.
 */

/* ── Escaping & sanitising ───────────────────────────────── */

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function clean(str = '') {
  return escapeHtml(String(str).trim());
}

/* ── Screen switcher ─────────────────────────────────────── */

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add('active');
}

/* ── Add-Item form builders ──────────────────────────────── */

export function buildTypeRadios(categories) {
  const container = document.getElementById('type-radios');
  container.innerHTML = categories.map((cat, i) =>
    `<label class="clabel"><input type="radio" name="itype" value="${cat.id}" data-name="${clean(cat.name)}" ${i === 0 ? 'checked' : ''}>${clean(cat.name)}</label>`
  ).join('');
}

const OCCASIONS = [
  'BUSINESS_FORMAL', 'CASUAL', 'FORMAL_EVENTS',
  'SEMI_FORMAL', 'WEDDINGS', 'CASUAL_EVENTS', 'FUNERALS', 'EVENING_WEAR', 'OUTDOOR',
];

export function buildOccasionChecks() {
  const container = document.getElementById('occasion-checks');
  container.innerHTML = OCCASIONS.map(o =>
    `<label class="clabel"><input type="checkbox" name="occasion" value="${escapeHtml(o)}">${escapeHtml(o)}</label>`
  ).join('');
}

const SEASONS = ['SUMMER', 'WINTER', 'SPRING', 'FALL', 'ANY'];

export function buildSeasonRadios() {
  const container = document.getElementById('Season-radios');
  container.innerHTML = SEASONS.map(s =>
    `<label class="clabel"><input type="radio" name="season" value="${escapeHtml(s)}">${escapeHtml(s)}</label>`
  ).join('');
}

/* ── Browse-Mode picker ──────────────────────────────────── */

export function buildBrowseModeGrid(onSelect) {
  const MODES = [
    { key: 'category', label: 'BY CATEGORY' },
    { key: 'occasion', label: 'BY OCCASION' },
    { key: 'season',   label: 'BY SEASON'   },
    { key: 'comfort',  label: 'BY COMFORT'  },
    { key: 'all',      label: 'ALL ITEMS'   },
  ];
  const grid = document.getElementById('browse-mode-grid');
  grid.innerHTML = MODES.map(m =>
    `<button class="wbtn cat-btn" data-mode="${m.key}">${m.label}</button>`
  ).join('');

  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    onSelect(btn.dataset.mode);
  });
}

/* ── Browse-Filter picker ────────────────────────────────── */

export function buildFilterGrid(mode, categories, onSelect) {
  const title = document.getElementById('filter-title');
  const grid  = document.getElementById('filter-grid');

  const FILTER_OCCASIONS = [
    'BUSINESS_FORMAL', 'CASUAL', 'FORMAL_EVENTS', 'SEMI_FORMAL',
    'WEDDINGS', 'CASUAL_EVENTS', 'FUNERALS', 'EVENING_WEAR', 'OUTDOOR',
  ];
  const FILTER_SEASONS = ['SUMMER', 'WINTER', 'SPRING', 'FALL' , 'ANY'];
  const COMFORT = [
    { value: 'true',  label: 'COMFORTABLE'    },
    { value: 'false', label: 'NOT COMFORTABLE' },
  ];

  let items = [];

  switch (mode) {
    case 'category':
      title.textContent = 'SELECT CATEGORY';
      items = categories.map(c => ({ value: String(c.id), label: c.name.trim() }));
      break;
    case 'occasion':
      title.textContent = 'SELECT OCCASION';
      items = FILTER_OCCASIONS.map(o => ({ value: o, label: o.replace(/_/g, ' ') }));
      break;
    case 'season':
      title.textContent = 'SELECT SEASON';
      items = FILTER_SEASONS.map(s => ({ value: s, label: s }));
      break;
    case 'comfort':
      title.textContent = 'SELECT TYPE OF COMFORT';
      items = COMFORT;
      break;
  }

  grid.innerHTML = items.map(item =>
    `<button class="wbtn cat-btn" data-value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`
  ).join('');

  // Clone to wipe stale listeners
  const fresh = grid.cloneNode(false);
  fresh.innerHTML = grid.innerHTML;
  grid.parentNode.replaceChild(fresh, grid);

  fresh.addEventListener('click', e => {
    const btn = e.target.closest('[data-value]');
    if (!btn) return;
    onSelect(btn.dataset.value, btn.dataset.label);
  });
}

/* ── Taskbar quick-nav ───────────────────────────────────── */

export function buildTaskbar(categories, onSelect) {
  const bar = document.getElementById('taskbar');
  bar.innerHTML =
    categories.map(cat =>
      `<button class="wbtn task-btn" data-catid="${cat.id}" data-catname="${clean(cat.name)}">${clean(cat.name)}</button>`
    ).join('') +
    `<button class="wbtn task-btn task-btn--mode" id="mode-btn">MODE</button>`;

  bar.addEventListener('click', e => {
    const btn = e.target.closest('[data-catid]');
    if (!btn) return;
    onSelect({ id: Number(btn.dataset.catid), name: btn.dataset.catname });
  });
}

/* ── Browse-Items grid ───────────────────────────────────── */

export function renderItemsGrid(items, categoryLabel, onDelete,onEdit) {
 document.getElementById('bi-title').textContent = categoryLabel;
  document.getElementById('bi-count').textContent = `${items.length} item${items.length!==1?'s':''}`;
  const grid = document.getElementById('bi-grid');
  if (items.length === 0) { grid.innerHTML=`<div class="bi-empty win-raised">No items in ${escapeHtml(categoryLabel)} yet.<br>Go back and add some!</div>`; return; }
 
  grid.innerHTML = items.map(item => `
    <div class="item-card win-raised">
      <div class="item-thumb win-inset">
        ${item.imgUrl ? `<img src="${clean(item.imgUrl)}" alt="${clean(item.categoryName)}" class="item-img">` : `<div class="item-color-fill" style="background:${clean(item.color)}"></div>`}
      </div>
      <div class="item-info">
        <span class="item-itype">${clean(item.categoryName??'')}</span>
        <div class="item-row">
          <span class="item-dot" style="background:${clean(item.color)}"></span>
           <span class="item-comf">${(item.isComfortable===true||item.comfortable===true)?'✓ Comfy':'✗ Not comfy'}</span>
          ${item.season?`<span class="item-season">${clean(item.season)}</span>`:''}
        </div>
        ${item.note ? `<div class="item-note">${clean(item.note)}</div>` : ''}
        <div class="item-occs">
          ${(item.ocassionList??[]).slice(0,10).map(o=>`<span class="occ-chip">${clean(o)}</span>`).join('')}
        </div>
      </div>
      <button class="item-edit-btn"  data-edit-id="${item.id}"   title="Edit item">✏</button>
      <button class="item-delete-btn" data-delete-id="${item.id}" title="Delete item">✕</button>
    </div>
  `).join('');
 
  const fresh=grid.cloneNode(true);grid.parentNode.replaceChild(fresh,grid);
fresh.addEventListener('click',e=>{
  const delBtn=e.target.closest('[data-delete-id]');
  if(delBtn){
    const id=Number(delBtn.dataset.deleteId);
    openConfirmDialog('Delete this item? This cannot be undone.', () => onDelete(id),
      { title: 'DELETE ITEM?', okLabel: 'DELETE' });
    return;
  }
  const editBtn=e.target.closest('[data-edit-id]');
  if(editBtn&&onEdit){
    const id=Number(editBtn.dataset.editId);
    const item=items.find(i=>i.id===id);
    if(item)onEdit(item);
  }
});
}

/* ── Loading / error banners ─────────────────────────────── */

export function showGridLoading(message = 'Loading…') {
  const grid = document.getElementById('bi-grid');
  if (grid) grid.innerHTML = `<div class="bi-empty win-raised">${escapeHtml(message)}</div>`;
}

export function showGridError(message = 'Something went wrong.') {
  const grid = document.getElementById('bi-grid');
  if (grid) grid.innerHTML = `<div class="bi-empty win-raised" style="color:#8B0000">${escapeHtml(message)}</div>`;
}

/* ── Find-Outfit slots ───────────────────────────────────── */


export function renderOutfitSlot(which,items,idx){
  const elId=which==='top'?'slot-top':which==='bottom'?'slot-bot':which==='dress'?'slot-dress':'slot-acc';
  const el=document.getElementById(elId);
  if(!el)return;
  const item=items.length>0?items[idx%items.length]:null;
  if(!item){
    el.innerHTML=`<div class="slot-empty"><span>NO ${which.toUpperCase()}</span><small>ADD ITEMS FIRST</small></div>`;
    return;
  }
  el.innerHTML=item.imgUrl?`<img src="${clean(item.imgUrl)}" alt="${clean(item.categoryName??'')}" class="slot-photo">`:`<div class="slot-color" style="background:${clean(item.color)}"></div>`;
}

/* ── Carousel button helpers ─────────────────────────────── */

export function setSideBtn(text) {
  const btn = document.getElementById('side-btn');
  if (btn) btn.textContent = text;
}

export function setAccPlayBtn(text) {
  const btn = document.getElementById('acc-play-btn');
  if (btn) btn.textContent = text;
}
/* ── Outfit name/description dialog ─────────────────────────
   A Win98-style modal with two inputs (name + description).
   openOutfitDialog(callback) opens it.
   The callback receives { name, description } on confirm,
   or is never called on cancel.
─────────────────────────────────────────────────────────────── */
 
let _outfitDialogCallback = null;
 
export function openOutfitDialog(onConfirm) {
  _outfitDialogCallback = onConfirm;
  document.getElementById('outfit-name-input').value = '';
  document.getElementById('outfit-desc-input').value = '';
  document.getElementById('outfit-dialog-back').style.display = 'flex';
  // Focus the name field after the browser has painted
  setTimeout(() => document.getElementById('outfit-name-input').focus(), 50);
}
 
export function confirmOutfitDialog() {
  const name = document.getElementById('outfit-name-input').value.trim() || 'My Outfit';
  const description = document.getElementById('outfit-desc-input').value.trim();
  document.getElementById('outfit-dialog-back').style.display = 'none';
  if (_outfitDialogCallback) {
    _outfitDialogCallback({ name, description });
    _outfitDialogCallback = null;
  }
}
 
export function cancelOutfitDialog() {
  document.getElementById('outfit-dialog-back').style.display = 'none';
  _outfitDialogCallback = null;
}
 

/* ── Upload area ─────────────────────────────────────────── */

export function setUploadPreview(dataUrl) {
  const preview = document.getElementById('upload-preview');
  const ph      = document.getElementById('upload-ph');
  if (dataUrl) {
    preview.src           = dataUrl;
    preview.style.display = 'block';
    ph.style.display      = 'none';
  } else {
    preview.src           = '';
    preview.style.display = 'none';
    ph.style.display      = 'flex';
    document.getElementById('file-input').value = '';
  }
}

/* ── Cher dialog ─────────────────────────────────────────── */

let _dialogOnConfirm = null;

export function openDialog(htmlContent, opts = {}) {
  _dialogOnConfirm = null;
  const titleEl = document.getElementById('dialog-title');
  if (titleEl) titleEl.textContent = opts.title ?? '📋 NOTICE';

  document.getElementById('dialog-body').innerHTML = htmlContent;

  const cancelBtn = document.getElementById('dialog-cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';

  const okBtn = document.getElementById('dialog-ok-btn');
  if (okBtn) okBtn.textContent = opts.okLabel ?? 'OK';

  document.getElementById('dialog-back').style.display = 'flex';
}

/**
 * Themed replacement for confirm().
 * @param {string} message
 * @param {Function} onConfirm  called only if user clicks OK/confirm
 */
export function openConfirmDialog(message, onConfirm, opts = {}) {
  _dialogOnConfirm = onConfirm;

  const titleEl = document.getElementById('dialog-title');
  if (titleEl) titleEl.textContent = opts.title ?? 'ARE YOU SURE?';

  document.getElementById('dialog-body').innerHTML =
    `<div style="font-size:12px;text-align:center;padding:6px 4px;line-height:1.5">${clean(message)}</div>`;

  const cancelBtn = document.getElementById('dialog-cancel-btn');
  if (cancelBtn) { cancelBtn.style.display = ''; cancelBtn.textContent = opts.cancelLabel ?? 'CANCEL'; }

  const okBtn = document.getElementById('dialog-ok-btn');
  if (okBtn) okBtn.textContent = opts.okLabel ?? 'CONFIRM';

  document.getElementById('dialog-back').style.display = 'flex';
}

export function closeDialog() {
  document.getElementById('dialog-back').style.display = 'none';
  _dialogOnConfirm = null; // closing without confirming never runs the callback
}

/** Wired to the OK button. Runs the pending confirm callback, if any. */
export function confirmDialogOk() {
  const cb = _dialogOnConfirm;
  document.getElementById('dialog-back').style.display = 'none';
  _dialogOnConfirm = null;
  if (cb) cb();
}
/* ── Add-Item form reset ─────────────────────────────────── */

export function resetAddForm() {
  const firstRadio = document.querySelector('input[name="itype"]');
  if (firstRadio) firstRadio.checked = true;

  const firstComfort = document.querySelector('input[name="comfort"]');
  if (firstComfort) firstComfort.checked = true;

  const colorPick = document.getElementById('item-color');
  if (colorPick) colorPick.value = '#ffffff';

  document.querySelectorAll('input[name="occasion"]').forEach(c => (c.checked = false));
  document.querySelectorAll('input[name="season"]').forEach(r => (r.checked = false));
  
  const noteInput = document.getElementById('item-note');
  if (noteInput) noteInput.value = '';

  setUploadPreview(null);
}

/* ── Read add-item form values ───────────────────────────── */

export function readAddForm(pendingImageUrl) {
  const checkedType   = document.querySelector('input[name="itype"]:checked');
  const categoryId    = checkedType ? Number(checkedType.value) : null;
  const color         = document.getElementById('item-color').value;
  const comfortable   = document.querySelector('input[name="comfort"]:checked')?.value ?? 'YES';
  const isComfortable = comfortable === 'YES';
  const ocassionList  = [...document.querySelectorAll('input[name="occasion"]:checked')].map(el => el.value);
  const note          = document.getElementById('item-note')?.value ?? '';
  const seasonRaw     = document.querySelector('input[name="season"]:checked')?.value ?? '';
  const season        = seasonRaw === '' ? null : seasonRaw;

  return { categoryId, color, imgUrl: pendingImageUrl ?? '', isComfortable, ocassionList, note, season };
}


/* ── Accessorize screen dynamic state ───────────────────── */
 
export function renderAccessorizeScreen(allAccessories, selectedIds, hasPending) {
  // Update button
  const btn = document.getElementById('create-outfit-btn');
  if (btn) {
    btn.textContent     = hasPending ? 'CREATE OUTFIT' : 'DONE';
    btn.style.background = hasPending ? '' : '#a0a0a0';
  }
 
  const container = document.getElementById('acc-groups-container');
  if (!container) return;
 
  if (allAccessories.length === 0) {
    container.innerHTML =
      '<div class="bi-empty win-raised">No accessories found.<br>Add shoes, bags, jewellery etc. first!</div>';
    updateAccessorizeSelection(selectedIds);
    return;
  }
 
  // Group items by category
  const groups = {};
  allAccessories.forEach(item => {
    const cat = item.categoryName?.trim() || 'OTHER';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
 
  // Each category = one card, like prev-outfit-card style
  container.innerHTML = Object.entries(groups).map(([catName, items]) => `
    <div class="acc-category-card win-raised">
      <div class="acc-category-card__title">${clean(catName.toUpperCase())}</div>
      <div class="acc-category-card__items">
        ${items.map(item => {
          const sel = selectedIds.includes(item.id);
          return `<div class="acc-item-card win-raised ${sel ? 'acc-item-card--selected' : ''}"
                       onclick="toggleAccessory(${item.id})"
                       data-acc-id="${item.id}">
            <div class="acc-item-thumb">
              ${item.imgUrl
                ? `<img src="${clean(item.imgUrl)}" class="acc-item-img" alt="">`
                : `<div class="acc-item-swatch" style="background:${clean(item.color||'#ccc')}"></div>`}
            </div>
            <div class="acc-item-check">${sel ? '✓' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
 
  updateAccessorizeSelection(selectedIds);
}
export function updateAccessorizeSelection(selectedIds) {
  const container = document.getElementById('acc-groups-container');
  if (container) {
    container.querySelectorAll('[data-acc-id]').forEach(card => {
      const id = Number(card.dataset.accId); const sel = selectedIds.includes(id);
      card.classList.toggle('acc-item-card--selected', sel);
      const check = card.querySelector('.acc-item-check'); if (check) check.textContent = sel ? '✓' : '';
    });
  }
  const countEl = document.getElementById('acc-selected-count');
  if (countEl) { const n = selectedIds.length; countEl.textContent = n === 0 ? 'none selected' : n + ' selected'; }
}
/* ── Previous outfits screen ──────────────────────────────── */
 
export function showPrevOutfitsLoading() {
  const grid = document.getElementById('prev-outfits-grid');
  if (grid) grid.innerHTML = '<span style="color:var(--gray);font-size:13px">Loading…</span>';
}
 
/**
 * @param {OutfitResponse[]} outfits
 */
export function renderPrevOutfits(outfits, onDelete, onEdit) {
const grid=document.getElementById('prev-outfits-grid');if(!grid)return;
  if(outfits.length===0){grid.innerHTML='<div class="bi-empty win-raised">No saved outfits yet.<br>Go build one!</div>';return;}
  grid.innerHTML=outfits.map(o=>`
    <div class="prev-outfit-card win-raised">
      <div class="prev-outfit-name">${clean(o.name)}</div>
      ${o.description?`<div class="prev-outfit-desc">${clean(o.description)}</div>`:''}
      <div class="prev-outfit-items">
        ${(o.items??[]).map(item=>item.imgUrl?`<img src="${clean(item.imgUrl)}" class="prev-outfit-thumb" alt="${clean(item.categoryName??'')}">`:` <div class="prev-outfit-swatch" style="background:${clean(item.color)}"></div>`).join('')}
      </div>
      <button class="item-edit-btn"   data-edit-outfit-id="${o.id}"   title="Edit outfit">✏</button>
      <button class="item-delete-btn" data-delete-outfit-id="${o.id}" title="Delete outfit">✕</button>
    </div>
  `).join('');
  const fresh=grid.cloneNode(true);grid.parentNode.replaceChild(fresh,grid);
  fresh.addEventListener('click',e=>{
    const delBtn=e.target.closest('[data-delete-outfit-id]');
if(delBtn){
  const id=Number(delBtn.dataset.deleteOutfitId);
  openConfirmDialog('Delete this outfit? This cannot be undone.', () => onDelete(id),
    { title: 'DELETE OUTFIT?', okLabel: 'DELETE' });
  return;
}
    const editBtn=e.target.closest('[data-edit-outfit-id]');
    if(editBtn&&onEdit){const id=Number(editBtn.dataset.editOutfitId);const outfit=outfits.find(o=>o.id===id);if(outfit)onEdit(outfit);}
  });
}
 
export function renderPrevOutfitsError() {
  const grid = document.getElementById('prev-outfits-grid');
  if (grid) grid.innerHTML = '<div class="bi-empty win-raised" style="color:#8B0000">Could not load outfits.</div>';
}



/* ── Try-On Dialog ───────────────────────────────────────── */

// export function openTryOnDialog() {
//   const preview    = document.getElementById('tryon-preview');
//   const fileInput  = document.getElementById('tryon-file-input');
//   const resultWrap = document.getElementById('tryon-result-wrap');
//   const loadMsg    = document.getElementById('tryon-loading');
//   const errorMsg   = document.getElementById('tryon-error');
//   const hint       = document.getElementById('tryon-upload-hint');
//   const placeholder = document.getElementById('tryon-placeholder');

//   if (preview)     { preview.src = ''; preview.style.display = 'none'; }
//   if (fileInput)   { fileInput.value = ''; }
//   if (resultWrap)  { resultWrap.style.display = 'none'; }
//   if (loadMsg)     { loadMsg.style.display = 'none'; }
//   if (errorMsg)    { errorMsg.style.display = 'none'; errorMsg.textContent = ''; }
//   if (hint)        { hint.style.display = 'flex'; }
//   if (placeholder) { placeholder.style.display = 'flex'; }

//   const btn = document.getElementById('tryon-generate-btn');
//   if (btn) { btn.disabled = false; btn.textContent = 'GENERATE'; }

//   document.getElementById('tryon-dialog-back').style.display = 'flex';
// }

// export function closeTryOnDialog() {
//   document.getElementById('tryon-dialog-back').style.display = 'none';
// }

// export function setTryOnPreview(dataUrl) {
//   const preview = document.getElementById('tryon-preview');
//   const hint    = document.getElementById('tryon-upload-hint');
//   if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
//   if (hint)    { hint.style.display = 'none'; }
// }

// export function setTryOnLoading(isLoading) {
//   const btn         = document.getElementById('tryon-generate-btn');
//   const loadMsg     = document.getElementById('tryon-loading');
//   const errorMsg    = document.getElementById('tryon-error');
//   const placeholder = document.getElementById('tryon-placeholder');

//   if (btn)     { btn.disabled = isLoading; btn.textContent = isLoading ? 'GENERATING…' : 'GENERATE'; }
//   if (loadMsg) { loadMsg.style.display = isLoading ? 'flex' : 'none'; }
//   if (errorMsg && isLoading) { errorMsg.style.display = 'none'; }
//   if (placeholder && isLoading) { placeholder.style.display = 'none'; }
// }

// export function showTryOnResult(imageUrl) {
//   const resultWrap  = document.getElementById('tryon-result-wrap');
//   const resultImg   = document.getElementById('tryon-result-img');
//   const placeholder = document.getElementById('tryon-placeholder');

//   if (resultImg)   { resultImg.src = imageUrl; }
//   if (resultWrap)  { resultWrap.style.display = 'block'; }
//   if (placeholder) { placeholder.style.display = 'none'; }
// }

// export function showTryOnError(message) {
//   const errorMsg = document.getElementById('tryon-error');
//   if (errorMsg) { errorMsg.textContent = message; errorMsg.style.display = 'block'; }
// }

 
/* ══════════════════════════════════════════════════════════
   EDIT ITEM DIALOG
══════════════════════════════════════════════════════════ */
export function openEditItemDialog(item) {
  document.getElementById('edit-item-color').value        = item.color ?? '#FF0000';
  document.getElementById('edit-item-note').value         = item.note  ?? '';
  // Comfort radio
  const comfortVal = (item.isComfortable === true || item.comfortable === true) ? 'YES' : 'NO';
  document.querySelectorAll('input[name="edit-comfort"]').forEach(r => r.checked = r.value === comfortVal);
  // Season
  document.querySelectorAll('input[name="edit-season"]').forEach(r => r.checked = r.value === (item.season ?? ''));
  // Occasions
  document.querySelectorAll('input[name="edit-occasion"]').forEach(cb => {
    cb.checked = (item.ocassionList ?? []).includes(cb.value);
  });
  document.getElementById('edit-item-dialog-back').style.display = 'flex';
}
export function closeEditItemDialog() { document.getElementById('edit-item-dialog-back').style.display = 'none'; }
export function readEditItemForm(existingItem,allCategories = []) {
  const color         = document.getElementById('edit-item-color').value;
  const note          = document.getElementById('edit-item-note').value.trim();
  const comfortVal    = document.querySelector('input[name="edit-comfort"]:checked')?.value ?? 'YES';
  const isComfortable = comfortVal === 'YES';
  const seasonRaw     = document.querySelector('input[name="edit-season"]:checked')?.value ?? '';
  const season        = seasonRaw === '' ? null : seasonRaw;
  const ocassionList  = [...document.querySelectorAll('input[name="edit-occasion"]:checked')].map(el => el.value);
   let categoryId = existingItem.categoryId ?? null;
  if (!categoryId && existingItem.categoryName && allCategories.length > 0) {
    const match = allCategories.find(c =>
      c.name.trim().toLowerCase() === existingItem.categoryName.trim().toLowerCase()
    );
    if (match) categoryId = match.id;
  }
  // Keep fields that aren't editable in the dialog unchanged
  return {
    categoryId,
    color,
    imgUrl:        existingItem.imgUrl ?? '',
    isComfortable,
    ocassionList,
    note,
    season,
  };
}
 
/* ══════════════════════════════════════════════════════════
   EDIT OUTFIT DIALOG
══════════════════════════════════════════════════════════ */
export function openEditOutfitDialog(outfit, allItems) {
  document.getElementById('edit-outfit-name').value = outfit.name        ?? '';
  document.getElementById('edit-outfit-desc').value = outfit.description ?? '';
 
  const currentIds = (outfit.items ?? []).map(i => i.id);
  const grid = document.getElementById('edit-outfit-items-grid');
  if (!grid) return;
 
  grid.innerHTML = allItems.map(item => {
    const selected = currentIds.includes(item.id);
    return `
      <div class="edit-outfit-item-card ${selected ? 'edit-outfit-item-card--selected' : ''} win-raised"
           data-toggle-item-id="${item.id}">
        <div class="edit-outfit-item-thumb">
          ${item.imgUrl
            ? `<img src="${clean(item.imgUrl)}" alt="${clean(item.categoryName??'')}" class="edit-outfit-item-img">`
            : `<div class="edit-outfit-item-swatch" style="background:${clean(item.color??'#ccc')}"></div>`}
        </div>
        <span class="edit-outfit-item-label">${clean(item.categoryName??'')}</span>
        <div class="edit-outfit-item-check">${selected ? '✓' : ''}</div>
      </div>`;
  }).join('');
 
  document.getElementById('edit-outfit-dialog-back').style.display = 'flex';
}
 
export function updateEditOutfitSelection(selectedIds) {
  const grid = document.getElementById('edit-outfit-items-grid');
  if (!grid) return;
  grid.querySelectorAll('[data-toggle-item-id]').forEach(card => {
    const id    = Number(card.dataset.toggleItemId);
    const sel   = selectedIds.includes(id);
    card.classList.toggle('edit-outfit-item-card--selected', sel);
    const check = card.querySelector('.edit-outfit-item-check');
    if (check) check.textContent = sel ? '✓' : '';
  });
}
export function closeEditOutfitDialog() { document.getElementById('edit-outfit-dialog-back').style.display = 'none'; }
 

/* ══════════════════════════════════════════════════════════
   WILL IT SUIT ME? DIALOG
══════════════════════════════════════════════════════════ */
export function openSuitMeDialog() {
  // Reset all state
  const preview    = document.getElementById('suitme-preview');
  const fileInput  = document.getElementById('suitme-file-input');
  const resultWrap = document.getElementById('suitme-result-wrap');
  const loadMsg    = document.getElementById('suitme-loading');
  const errorMsg   = document.getElementById('suitme-error');
  const hint       = document.getElementById('suitme-upload-hint');
 
  if (preview)     { preview.src = ''; preview.style.display = 'none'; }
  if (fileInput)   { fileInput.value = ''; }
  if (resultWrap)  { resultWrap.style.display = 'none'; resultWrap.innerHTML = ''; }
  if (loadMsg)     { loadMsg.style.display = 'none'; }
  if (errorMsg)    { errorMsg.style.display = 'none'; errorMsg.textContent = ''; }
  if (hint)        { hint.style.display = 'flex'; }
 
  const btn = document.getElementById('suitme-analyze-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'ANALYZE'; }
 
  document.getElementById('suitme-dialog-back').style.display = 'flex';
}
 
export function closeSuitMeDialog() {
  document.getElementById('suitme-dialog-back').style.display = 'none';
}
 
export function setSuitMePreview(dataUrl) {
  const preview = document.getElementById('suitme-preview');
  const hint    = document.getElementById('suitme-upload-hint');
  if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
  if (hint)    { hint.style.display = 'none'; }
}
 
export function setSuitMeLoading(isLoading) {
  const btn     = document.getElementById('suitme-analyze-btn');
  const loadMsg = document.getElementById('suitme-loading');
  const errorMsg = document.getElementById('suitme-error');
  if (btn)      { btn.disabled = isLoading; btn.textContent = isLoading ? 'ANALYZING…' : 'ANALYZE'; }
  if (loadMsg)  { loadMsg.style.display = isLoading ? 'flex' : 'none'; }
  if (errorMsg && isLoading) { errorMsg.style.display = 'none'; }
}
 
export function showSuitMeError(message) {
  const errorMsg = document.getElementById('suitme-error');
  if (errorMsg) { errorMsg.textContent = message; errorMsg.style.display = 'block'; }
}
 
/**
 * Renders the full analysis result into the result panel.
 * @param {OutfitAnalysisResponse} result
 */
export function showSuitMeResult(result) {
  const resultWrap = document.getElementById('suitme-result-wrap');
  if (!resultWrap) return;
 
  // Verdict color
  const verdictColor = {
    'GREAT FIT':       '#2d6a2d',
    'MIGHT WORK':      '#8a6200',
    'NOT RECOMMENDED': '#8B0000',
  }[result.verdict] ?? '#333';
 
  const verdictBg = {
    'GREAT FIT':       '#d4edda',
    'MIGHT WORK':      '#fff3cd',
    'NOT RECOMMENDED': '#f8d7da',
  }[result.verdict] ?? '#eee';
 
  // Score bar
  const score = Math.max(0, Math.min(100, result.matchScore ?? 50));
  const scoreColor = score >= 70 ? '#2d6a2d' : score >= 45 ? '#8a6200' : '#8B0000';
 
  const renderList = (items, icon) =>
    (items ?? []).map(i => `<li style="margin-bottom:4px">${icon} ${clean(i)}</li>`).join('');
 
  resultWrap.innerHTML = `
    <div style="font-family:var(--font-body);font-size:11px;line-height:1.6;overflow-y:auto;max-height:340px;padding-right:4px">
 
      <!-- Verdict badge -->
      <div style="background:${verdictBg};color:${verdictColor};
                  border:2px solid ${verdictColor};padding:8px 12px;
                  font-family:var(--font-head);font-size:13px;letter-spacing:2px;
                  text-align:center;margin-bottom:10px">
        ${clean(result.verdict)}
      </div>
 
      <!-- Score bar -->
      <div style="margin-bottom:10px">
        <div style="font-family:var(--font-head);font-size:10px;letter-spacing:1px;margin-bottom:4px">
          MATCH SCORE: <span style="color:${scoreColor}">${score}/100</span>
        </div>
        <div style="background:#ccc;height:8px;border:1px solid #999;position:relative">
          <div style="background:${scoreColor};height:100%;width:${score}%;transition:width 0.5s"></div>
        </div>
      </div>
 
      <!-- Overall opinion -->
      <div style="margin-bottom:10px;padding:8px;background:var(--silver);border:1px solid var(--gray)">
        ${clean(result.overallOpinion)}
      </div>
 
      <!-- Analysis sections -->
      ${renderSection('👤 BODY', result.bodyAnalysis)}
      ${renderSection('🎨 COLOR', result.colorAnalysis)}
      ${renderSection('👗 FIT', result.fitAnalysis)}
      ${renderSection('✨ STYLE', result.styleAnalysis)}
 
      <!-- Pros & Cons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <div style="background:#d4edda;border:1px solid #2d6a2d;padding:8px">
          <div style="font-family:var(--font-head);font-size:10px;color:#2d6a2d;margin-bottom:4px">PROS</div>
          <ul style="margin:0;padding-left:0;list-style:none">
            ${renderList(result.pros, '✓')}
          </ul>
        </div>
        <div style="background:#f8d7da;border:1px solid #8B0000;padding:8px">
          <div style="font-family:var(--font-head);font-size:10px;color:#8B0000;margin-bottom:4px">CONS</div>
          <ul style="margin:0;padding-left:0;list-style:none">
            ${renderList(result.cons, '✗')}
          </ul>
        </div>
      </div>
 
      <!-- Suggestions -->
      ${(result.suggestions ?? []).length > 0 ? `
      <div style="margin-top:8px;padding:8px;background:#fff3cd;border:1px solid #8a6200">
        <div style="font-family:var(--font-head);font-size:10px;color:#8a6200;margin-bottom:4px">💡 SUGGESTIONS</div>
        <ul style="margin:0;padding-left:0;list-style:none">
          ${renderList(result.suggestions, '→')}
        </ul>
      </div>` : ''}
 
    </div>
  `;
 
  resultWrap.style.display = 'block';
}
 
function renderSection(label, text) {
  if (!text) return '';
  return `
    <div style="margin-bottom:8px">
      <div style="font-family:var(--font-head);font-size:10px;letter-spacing:1px;
                  color:var(--gray);margin-bottom:2px">${label}</div>
      <div style="padding:6px 8px;background:var(--white);border:1px solid #ccc;font-size:11px">
        ${clean(text)}
      </div>
    </div>`;
}

 
 
/* ══════════════════════════════════════════════════════════
   ANALYSIS HISTORY SCREEN
══════════════════════════════════════════════════════════ */
 
export function showAnalysisHistoryLoading() {
  const grid = document.getElementById('analysis-history-grid');
  if (grid) grid.innerHTML = '<div class="bi-empty win-raised">Loading your style history…</div>';
  const count = document.getElementById('analysis-history-count');
  if (count) count.textContent = '';
}
 
export function showAnalysisHistoryError() {
  const grid = document.getElementById('analysis-history-grid');
  if (grid) grid.innerHTML =
    '<div class="bi-empty win-raised" style="color:#8B0000">Could not load history. Is the server running?</div>';
}
 
/**
 * @param {OutfitAnalysisHistoryResponse[]} analyses
 * @param {function(number): void} onDelete
 */
export function renderAnalysisHistory(analyses, onDelete) {
  const grid  = document.getElementById('analysis-history-grid');
  const count = document.getElementById('analysis-history-count');
  if (!grid) return;
 
  if (count) count.textContent = `${analyses.length} analyse${analyses.length !== 1 ? 's' : ''}`;
 
  if (analyses.length === 0) {
    grid.innerHTML = `
      <div class="bi-empty win-raised">
        No style analyses yet.<br>
        Go to FIND OUTFIT and hit SUIT ME?
      </div>`;
    return;
  }
 
  grid.innerHTML = `<div class="analysis-cards-row">${
    analyses.map(a => {
      const verdict     = a.result?.verdict        ?? 'UNKNOWN';
      const score       = a.result?.matchScore      ?? 0;
      const opinion     = a.result?.overallOpinion  ?? '';
      const pros        = a.result?.pros            ?? [];
      const cons        = a.result?.cons            ?? [];
      const suggestions = a.result?.suggestions     ?? [];
      const items       = a.items                   ?? [];   // ItemSummary[]
      const date        = a.createdAt
          ? new Date(a.createdAt).toLocaleDateString('en-GB',
              { day:'2-digit', month:'short', year:'numeric' })
          : '';
 
      const verdictColor = verdict === 'GREAT FIT'      ? '#2d6a2d'
                         : verdict === 'NOT RECOMMENDED' ? '#8B0000'
                         : '#8a6200';
      const verdictBg    = verdict === 'GREAT FIT'      ? '#d4edda'
                         : verdict === 'NOT RECOMMENDED' ? '#f8d7da'
                         : '#fff3cd';
      const scoreColor   = score >= 70 ? '#2d6a2d' : score >= 45 ? '#8a6200' : '#8B0000';
 
      /* ── Outfit item thumbnails ─────────────────────── */
      const itemsHtml = items.length > 0
        ? `<div class="ah-items-row">
            ${items.map(item => `
              <div class="ah-item-thumb win-inset" title="${clean(item.categoryName ?? '')}">
                ${item.imgUrl
                  ? `<img src="${clean(item.imgUrl)}"
                          alt="${clean(item.categoryName ?? '')}"
                          class="ah-item-img" />`
                  : `<div class="ah-item-swatch"
                          style="background:${clean(item.color ?? '#ccc')}"></div>`
                }
                <span class="ah-item-label">${clean(item.categoryName ?? '')}</span>
              </div>`).join('')}
           </div>`
        : `<div class="ah-items-row ah-items-row--empty">No item data</div>`;
 
      return `
       <div class="analysis-card win-raised" style="position:relative">
 
       
 
        <!-- ── Header: verdict badge + date ── -->
        <div class="analysis-card__head" style="padding-right:24px">
          <div class="analysis-verdict-badge"
               style="background:${verdictBg};color:${verdictColor};border-color:${verdictColor}">
            ${clean(verdict)}
          </div>
          <span class="analysis-card__date">${clean(date)}</span>
        </div>
 
        <!-- ── Outfit items this analysis is based on ── -->
        <div class="ah-section-label">OUTFIT ANALYZED</div>
        ${itemsHtml}
 
        <!-- ── Score bar ─────────────────────────────── -->
        <div class="analysis-score-row">
          <span class="analysis-score-label" style="color:${scoreColor}">
            MATCH ${score}/100
          </span>
          <div class="analysis-score-track">
            <div class="analysis-score-fill"
                 style="width:${score}%;background:${scoreColor}"></div>
          </div>
        </div>
 
        <!-- ── Overall opinion ───────────────────────── -->
        <div class="analysis-opinion win-inset">${clean(opinion)}</div>
 
        <!-- ── Expandable detail ─────────────────────── -->
        <div class="analysis-detail" id="analysis-detail-${a.id}" style="display:none">
 
          <div class="analysis-pills">
            ${renderPill('👤', 'BODY',  a.result?.bodyAnalysis)}
            ${renderPill('🎨', 'COLOR', a.result?.colorAnalysis)}
            ${renderPill('👗', 'FIT',   a.result?.fitAnalysis)}
            ${renderPill('✨', 'STYLE', a.result?.styleAnalysis)}
          </div>
 
          <div class="analysis-pros-cons">
            <div class="analysis-pros">
              <div class="analysis-list-head" style="color:#2d6a2d">✓ PROS</div>
              ${pros.map(p => `<div class="analysis-list-item">${clean(p)}</div>`).join('')}
            </div>
            <div class="analysis-cons">
              <div class="analysis-list-head" style="color:#8B0000">✗ CONS</div>
              ${cons.map(c => `<div class="analysis-list-item">${clean(c)}</div>`).join('')}
            </div>
          </div>
 
          ${suggestions.length > 0 ? `
          <div class="analysis-suggestions">
            <div class="analysis-list-head" style="color:#8a6200">💡 SUGGESTIONS</div>
            ${suggestions.map(s =>
              `<div class="analysis-list-item">→ ${clean(s)}</div>`).join('')}
          </div>` : ''}
 
        </div>
 
        <!-- ── Toggle ────────────────────────────────── -->
        <button class="wbtn analysis-toggle-btn"
                data-toggle-id="${a.id}">▼ DETAILS</button>
  <!-- ── ✕ Delete button — top-right corner like item/outfit cards ── -->
        <button class="item-delete-btn"
                data-delete-analysis-id="${a.id}"
                title="Delete analysis">✕</button>
      </div>`;
    }).join('')
  }</div>`;
 
  // Wire event delegation on the freshly built grid
  grid.addEventListener('click', e => {
 
    // Delete button
    const delBtn = e.target.closest('[data-delete-analysis-id]');
if (delBtn) {
  const id = Number(delBtn.dataset.deleteAnalysisId);
  openConfirmDialog('Delete this analysis? This cannot be undone.', () => onDelete(id),
    { title: 'DELETE ANALYSIS?', okLabel: 'DELETE' });
  return;
}
    // Toggle button
    const togBtn = e.target.closest('[data-toggle-id]');
    if (togBtn) {
      const id     = togBtn.dataset.toggleId;
      const detail = document.getElementById(`analysis-detail-${id}`);
      if (!detail) return;
      const open = detail.style.display !== 'none';
      detail.style.display = open ? 'none' : 'block';
      togBtn.textContent   = open ? '▼ DETAILS' : '▲ HIDE';
    }
  });
}
 
function renderPill(icon, label, text) {
  if (!text) return '';
  return `
    <div class="analysis-pill win-raised">
      <span class="analysis-pill__label">${icon} ${label}</span>
      <span class="analysis-pill__text">${clean(text)}</span>
    </div>`;
}
 