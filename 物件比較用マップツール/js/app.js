(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'property-map-data-v1';

  // スマートフォンでは地図と物件一覧を切り替えて表示します。
  const workspaceEl = document.querySelector('.workspace');
  const viewToggleBtn = $('viewToggleBtn');
  const viewToggleLabel = $('viewToggleLabel');
  const mobileViewQuery = window.matchMedia('(max-width: 800px)');
  function applyMobileView(showList) {
    if (!workspaceEl) return;
    const listActive = mobileViewQuery.matches && showList;
    workspaceEl.classList.toggle('show-list', listActive);
    if (viewToggleLabel) viewToggleLabel.textContent = listActive ? '地図に戻る' : '物件一覧';
    if (viewToggleBtn) {
      viewToggleBtn.setAttribute('aria-pressed', String(listActive));
      viewToggleBtn.setAttribute('aria-label', listActive ? '地図を表示' : '物件一覧を表示');
    }
    window.dispatchEvent(new CustomEvent('property-map-view-changed', { detail: { showList: listActive } }));
  }
  if (viewToggleBtn) viewToggleBtn.addEventListener('click', () => applyMobileView(!workspaceEl.classList.contains('show-list')));
  const handleMobileBreakpointChange = () => applyMobileView(false);
  if (typeof mobileViewQuery.addEventListener === 'function') mobileViewQuery.addEventListener('change', handleMobileBreakpointChange);
  else if (typeof mobileViewQuery.addListener === 'function') mobileViewQuery.addListener(handleMobileBreakpointChange);
  applyMobileView(false);

  if (!window.L) {
    $('mapError').style.display = 'block';
    $('mapError').textContent = '地図表示用ライブラリを読み込めませんでした。ネットワークで unpkg.com / jsdelivr.net への接続が許可されているか確認してください。物件一覧と保存データは引き続き利用できます。';
    return;
  }

  // 日本国内で使いやすい国土地理院タイルを優先し、失敗時はEsriの地図に切り替えます。
  const basemaps = [
    {
      name: '国土地理院 標準地図',
      url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>',
      maxZoom: 18
    },
    {
      name: 'Esri 街路図',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri and its data providers',
      maxZoom: 18
    }
  ];
  const map = L.map('map', { zoomControl: true, minZoom: 5, maxZoom: 18 }).setView([35.1709, 136.8815], 12);
  window.addEventListener('property-map-view-changed', event => { if (!event.detail.showList) setTimeout(() => map.invalidateSize(), 80); });
  let activeTileLayer = null;
  let activeBasemapIndex = -1;
  let baseMapLoaded = false;
  let baseMapErrors = 0;
  let basemapAttempt = 0;

  function showMapError(message) {
    $('mapError').style.display = 'block';
    $('mapError').textContent = message;
  }
  function hideMapError() { $('mapError').style.display = 'none'; }
  function setBasemap(index, automatic = false) {
    if (index < 0 || index >= basemaps.length) {
      showMapError('地図画像を取得できませんでした。ネットワーク制限やセキュリティソフトにより、地図サービスへの接続が拒否されている可能性があります。物件情報はブラウザ内に保存されています。');
      return;
    }
    const attempt = ++basemapAttempt;
    if (activeTileLayer) map.removeLayer(activeTileLayer);
    activeBasemapIndex = index;
    baseMapLoaded = false;
    baseMapErrors = 0;
    const source = basemaps[index];
    activeTileLayer = L.tileLayer(source.url, {
      attribution: source.attribution,
      minZoom: 5,
      maxZoom: 18,
      maxNativeZoom: source.maxZoom,
      crossOrigin: true,
      updateWhenIdle: true,
      keepBuffer: 2
    }).addTo(map);
    activeTileLayer.on('tileload', () => {
      if (attempt !== basemapAttempt) return;
      baseMapLoaded = true;
      hideMapError();
    });
    activeTileLayer.on('tileerror', () => {
      if (attempt !== basemapAttempt) return;
      baseMapErrors += 1;
      if (!baseMapLoaded && baseMapErrors >= 4) {
        if (index + 1 < basemaps.length) {
          showMapError(source.name + ' に接続できないため、別の地図に切り替えています…');
          setTimeout(() => { if (attempt === basemapAttempt) setBasemap(index + 1, true); }, 350);
        } else {
          showMapError('複数の地図サービスから地図画像を取得できません。ネットワーク制限やセキュリティ設定で外部地図への接続が拒否されていないかご確認ください。物件情報はこのブラウザに保存されています。');
        }
      }
    });
    // タイルイベントが発火しないネットワーク障害にも対応します。
    setTimeout(() => {
      if (attempt !== basemapAttempt || baseMapLoaded) return;
      if (index + 1 < basemaps.length) {
        showMapError(source.name + ' の読み込みがタイムアウトしたため、別の地図に切り替えています…');
        setBasemap(index + 1, true);
      } else {
        showMapError('地図画像の読み込みがタイムアウトしました。ネットワーク制限やセキュリティ設定をご確認ください。物件情報はこのブラウザに保存されています。');
      }
    }, 12000);
  }
  setBasemap(0);

  let properties = loadProperties();
  let markerById = new Map();
  let selectedId = null;
  let editingId = null;
  let importing = false;

  function loadProperties() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('保存済みデータを読み込めませんでした', e);
      return [];
    }
  }
  function saveProperties() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
      return true;
    } catch (e) {
      alert('ブラウザにデータを保存できませんでした。プライベートブラウズやストレージ設定をご確認ください。');
      return false;
    }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function formatPrice(price) {
    const val = String(price ?? '').trim();
    if (!val) return '価格未入力';
    if (/万円|億円|円/.test(val)) return val;
    const numeric = Number(val.replace(/[￥¥,，\s]/g, ''));
    if (Number.isFinite(numeric) && numeric >= 100000) return (numeric / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 2 }) + '万円';
    return val;
  }
  function markerLabel(price) {
    const p = formatPrice(price);
    return p.replace(/万円$/, '万').replace(/円$/, '円');
  }
  function makeId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }
  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else {
        if (ch === '"' && field.length === 0) quoted = true;
        else if (ch === ',') { row.push(field.trim()); field = ''; }
        else if (ch === '\n') { row.push(field.trim()); if (row.some(v => v !== '')) rows.push(row); row = []; field = ''; }
        else if (ch !== '\r') field += ch;
      }
    }
    row.push(field.trim());
    if (row.some(v => v !== '')) rows.push(row);
    if (quoted) throw new Error('ダブルクォートが閉じられていません。メモなどの引用符を確認してください。');
    return rows;
  }
  function normalizeHeader(v) { return String(v || '').toLowerCase().replace(/[\s　_\-]/g, ''); }
  function rowsToProperties(rows) {
    if (!rows.length) throw new Error('CSVデータが空です。');
    const header = rows[0].map(normalizeHeader);
    const hasHeader = header.some(x => ['タイトル','title','物件名'].includes(x));
    let dataRows = rows;
    let indexes = [0,1,2,3,4,5];
    if (hasHeader) {
      const aliases = [
        ['タイトル','title','物件名','name'],
        ['間取り','layout','type','部屋タイプ'],
        ['価格','price','金額'],
        ['メモ','memo','備考','コメント'],
        ['住所','address','所在地','場所'],
        ['url','リンク','物件url','詳細url','掲載url','物件ページ','掲載ページ']
      ];
      indexes = aliases.map(list => {
        const idx = header.findIndex(h => list.map(normalizeHeader).includes(h));
        return idx >= 0 ? idx : -1;
      });
      if (indexes[0] < 0 || indexes[4] < 0) throw new Error('見出しを使用する場合は「タイトル」と「住所」の列が必要です。');
      dataRows = rows.slice(1);
    }
    const result = [];
    dataRows.forEach((r, idx) => {
      if (r.every(v => !String(v || '').trim())) return;
      const get = i => indexes[i] < 0 ? '' : String(r[indexes[i]] ?? '').trim();
      const title = get(0), layout = get(1), price = get(2), memo = get(3), address = get(4), url = normalizeUrl(get(5));
      if (!title && !address) return;
      if (!address) throw new Error((idx + (hasHeader ? 2 : 1)) + '行目：住所が空です。タイトル「' + (title || '未入力') + '」');
      result.push({ id: makeId(), title: title || '名称未設定', layout, price, memo, address, url, lat: null, lon: null, geocodeStatus: 'pending', createdAt: new Date().toISOString() });
    });
    if (!result.length) throw new Error('取り込める物件がありません。各行を「タイトル,間取り,価格,メモ,住所,URL」の順で入力してください。');
    return result;
  }
  function normalizeUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      return parsed.href;
    } catch (_) { return ''; }
  }
  function setStatus(message, kind='info') {
    const el = $('importStatus');
    el.className = 'status show ' + kind;
    el.textContent = message;
  }
  function openModal() {
    $('csvModal').classList.add('open');
    $('importStatus').className = 'status';
    $('csvText').focus();
  }
  function closeModal() { $('csvModal').classList.remove('open'); }

  function render() {
    $('countBadge').textContent = properties.length + '件';
    $('mapCount').textContent = properties.length;
    const list = $('propertyList');
    if (!properties.length) {
      list.innerHTML = '<div class="empty"><span class="empty-icon">⌖</span><strong>物件はまだ登録されていません</strong><br>右上の「＋ 物件を入力」から、CSV形式で物件情報を追加してください。</div>';
    } else {
      list.innerHTML = properties.map(p => {
        const geocoded = Number.isFinite(p.lat) && Number.isFinite(p.lon);
        const stateClass = geocoded ? 'ok' : (p.geocodeStatus === 'failed' ? 'ng' : '');
        const stateText = geocoded ? '● 地図に表示中' : (p.geocodeStatus === 'failed' ? '！位置を取得できません' : '… 位置を検索中 / 未取得');
        const safeUrl = normalizeUrl(p.url || '');
        return `<article class="property-card ${p.id === selectedId ? 'selected' : ''}" data-id="${escapeHtml(p.id)}" tabindex="0" aria-label="${escapeHtml(p.title || '名称未設定')}の物件情報">
          <div class="card-title-row"><div class="card-title">${escapeHtml(p.title || '名称未設定')}</div>${p.layout ? `<span class="card-layout">${escapeHtml(p.layout)}</span>` : ''}</div>
          <div class="card-price">${escapeHtml(formatPrice(p.price))}</div>
          <div class="card-address">⌖ ${escapeHtml(p.address)}</div>
          ${p.memo ? `<div class="card-memo">${escapeHtml(p.memo)}</div>` : '<div class="card-memo" style="color:#94a3b8">メモなし</div>'}
          <span class="geocode-state ${stateClass}">${stateText}</span>
          <div class="card-actions">
            ${safeUrl ? `<a class="card-action link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">掲載ページを開く ↗</a>` : ''}
            <button class="card-action" type="button" data-action="edit" data-id="${escapeHtml(p.id)}">編集</button>
            <button class="card-action danger" type="button" data-action="delete" data-id="${escapeHtml(p.id)}">削除</button>
          </div>
        </article>`;
      }).join('');
      list.querySelectorAll('.property-card').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.closest('button, a')) return;
          selectProperty(card.dataset.id, true);
        });
        card.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); selectProperty(card.dataset.id, true); }
        });
      });
      list.querySelectorAll('[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
      list.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', () => deleteProperty(btn.dataset.id)));
    }
    renderMarkers();
  }
  function renderMarkers() {
    markerById.forEach(marker => marker.remove());
    markerById.clear();
    properties.forEach(p => {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
      const icon = L.divIcon({
        className: 'price-marker-wrap',
        html: `<span class="marker-price">${escapeHtml(markerLabel(p.price))}</span>`,
        iconSize: [90, 34],
        iconAnchor: [45, 17]
      });
      const safeUrl = normalizeUrl(p.url || '');
      const popupHtml = `<div class="popup-title">${escapeHtml(p.title || '名称未設定')}</div><div class="popup-price">${escapeHtml(formatPrice(p.price))}</div><div class="popup-details">${p.layout ? '間取り：' + escapeHtml(p.layout) + '<br>' : ''}${escapeHtml(p.address)}${p.memo ? '<br><br>メモ：' + escapeHtml(p.memo).replace(/\n/g, '<br>') : ''}${safeUrl ? '<br><br><a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">物件掲載ページを開く ↗</a>' : ''}</div>`;
      const marker = L.marker([p.lat, p.lon], { icon, keyboard: true })
        .bindPopup(popupHtml, { maxWidth: 280 })
        .addTo(map);
      marker.on('click', () => { selectedId = p.id; highlightSelectedCard(); });
      markerById.set(p.id, marker);
    });
  }
  function highlightSelectedCard() {
    document.querySelectorAll('.property-card').forEach(el => el.classList.toggle('selected', el.dataset.id === selectedId));
  }
  function selectProperty(id, fly=false) {
    selectedId = id;
    highlightSelectedCard();
    const p = properties.find(x => x.id === id);
    if (!p) return;
    const marker = markerById.get(id);
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
      if (fly) map.flyTo([p.lat, p.lon], Math.max(map.getZoom(), 15), { duration: 0.5 });
      if (marker) marker.openPopup();
    }
  }
  function showAll() {
    const pts = properties.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).map(p => [p.lat, p.lon]);
    if (!pts.length) { map.setView([35.1709, 136.8815], 12, { animate: true }); return; }
    if (pts.length === 1 || pts.every(pt => pt[0] === pts[0][0] && pt[1] === pts[0][1])) {
      map.setView(pts[0], 15, { animate: true });
      return;
    }
    map.fitBounds(pts, { padding: [55, 55], maxZoom: 15, animate: true });
  }
  function openEditModal(id) {
    const p = properties.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    $('editTitleInput').value = p.title || '';
    $('editLayoutInput').value = p.layout || '';
    $('editPriceInput').value = p.price || '';
    $('editAddressInput').value = p.address || '';
    $('editUrlInput').value = p.url || '';
    $('editMemoInput').value = p.memo || '';
    $('editStatus').className = 'status';
    $('editModal').classList.add('open');
    $('editTitleInput').focus();
  }
  function closeEditModal() {
    $('editModal').classList.remove('open');
    editingId = null;
  }
  function deleteProperty(id) {
    const p = properties.find(x => x.id === id);
    if (!p) return;
    if (!confirm('「' + (p.title || '名称未設定') + '」を削除しますか？\nこの操作は取り消せません。')) return;
    properties = properties.filter(x => x.id !== id);
    const marker = markerById.get(id);
    if (marker) marker.remove();
    markerById.delete(id);
    if (selectedId === id) selectedId = null;
    saveProperties();
    render();
    if (properties.length) showAll();
    else map.setView([35.1709, 136.8815], 12);
  }
  function saveEditedProperty() {
    const p = properties.find(x => x.id === editingId);
    if (!p) return;
    const title = $('editTitleInput').value.trim();
    const address = $('editAddressInput').value.trim();
    if (!title) { $('editStatus').textContent = 'タイトルを入力してください。'; $('editStatus').className = 'status show error'; return; }
    if (!address) { $('editStatus').textContent = '住所を入力してください。'; $('editStatus').className = 'status show error'; return; }
    const rawUrl = $('editUrlInput').value.trim();
    const url = normalizeUrl(rawUrl);
    if (rawUrl && !url) { $('editStatus').textContent = 'URLは https:// または http:// で始まる有効なURLを入力してください。'; $('editStatus').className = 'status show error'; return; }
    const addressChanged = address !== p.address;
    p.title = title;
    p.layout = $('editLayoutInput').value.trim();
    p.price = $('editPriceInput').value.trim();
    p.address = address;
    p.url = url;
    p.memo = $('editMemoInput').value.trim();
    if (addressChanged) {
      p.lat = null; p.lon = null; p.geocodeStatus = 'pending';
      const oldMarker = markerById.get(p.id);
      if (oldMarker) oldMarker.remove();
      markerById.delete(p.id);
    }
    saveProperties();
    selectedId = p.id;
    render();
    closeEditModal();
    if (addressChanged) geocodePending([p.id]);
    else selectProperty(p.id, true);
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }
  async function geocodeProperty(p) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) return true;
    // 日本の住所は国土地理院の住所検索を先に試します。
    try {
      const gsiUrl = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(p.address);
      const data = await fetchJson(gsiUrl, { headers: { 'Accept': 'application/json' } });
      if (Array.isArray(data) && data.length && data[0].geometry && Array.isArray(data[0].geometry.coordinates)) {
        const coords = data[0].geometry.coordinates;
        if (Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))) {
          p.lon = Number(coords[0]); p.lat = Number(coords[1]); p.geocodeStatus = 'ok';
          return true;
        }
      }
    } catch (e) { console.warn('国土地理院の住所検索に失敗:', p.address, e); }
    // 国土地理院で見つからない場合のみ、Nominatimを補助として使用します。
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=jp&q=' + encodeURIComponent(p.address);
      const data = await fetchJson(url, { headers: { 'Accept': 'application/json' } });
      if (Array.isArray(data) && data.length) {
        p.lat = Number(data[0].lat); p.lon = Number(data[0].lon); p.geocodeStatus = 'ok';
        return true;
      }
    } catch (e) { console.warn('補助住所検索エラー:', p.address, e); }
    p.geocodeStatus = 'failed';
    return false;
  }
  async function geocodePending(ids) {
    for (let i = 0; i < ids.length; i++) {
      const p = properties.find(x => x.id === ids[i]);
      if (!p || (Number.isFinite(p.lat) && Number.isFinite(p.lon))) continue;
      p.geocodeStatus = 'pending';
      render();
      setStatus(`住所から位置を検索しています… (${i + 1}/${ids.length})\n${p.address}`, 'info');
      await geocodeProperty(p);
      saveProperties();
      render();
      if (i < ids.length - 1) await sleep(900);
    }
    const done = ids.map(id => properties.find(p => p.id === id)).filter(Boolean);
    const ok = done.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).length;
    const failed = done.length - ok;
    if (ok) showAll();
    setStatus(`読み込み完了：${ok}件の位置を地図に表示しました。${failed ? ` ${failed}件は位置を取得できませんでした。住所を確認して再入力してください。` : ''}`, failed ? 'info' : 'success');
  }

  $('openCsvBtn').addEventListener('click', openModal);
  $('closeModalBtn').addEventListener('click', closeModal);
  $('cancelImportBtn').addEventListener('click', closeModal);
  $('csvModal').addEventListener('click', e => { if (e.target === $('csvModal')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  $('fitBtn').addEventListener('click', showAll);
  $('closeEditModalBtn').addEventListener('click', closeEditModal);
  $('cancelEditBtn').addEventListener('click', closeEditModal);
  $('saveEditBtn').addEventListener('click', saveEditedProperty);
  $('editModal').addEventListener('click', e => { if (e.target === $('editModal')) closeEditModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditModal(); });
  $('importBtn').addEventListener('click', async () => {
    if (importing) return;
    let incoming;
    try {
      const rows = parseCsv($('csvText').value.trim());
      incoming = rowsToProperties(rows);
    } catch (e) {
      setStatus(e.message || 'CSVを読み込めませんでした。', 'error');
      return;
    }
    importing = true;
    $('importBtn').disabled = true;
    $('importBtn').textContent = '読み込み中…';
    const oldCount = properties.length;
    properties = properties.concat(incoming);
    saveProperties();
    render();
    try {
      await geocodePending(incoming.map(p => p.id));
      $('csvText').value = '';
    } finally {
      importing = false;
      $('importBtn').disabled = false;
      $('importBtn').textContent = '読み込んで地図に表示';
      if (properties.length > oldCount) render();
    }
  });

  render();
  if (properties.length) {
    const pending = properties.filter(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lon));
    if (pending.length) setTimeout(() => geocodePending(pending.map(p => p.id)), 700);
    else showAll();
  }
})();
