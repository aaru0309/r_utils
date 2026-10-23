// バックアップ機能は地図ライブラリの読み込み可否に左右されないよう、独立して実行します。
(() => {
  'use strict';
  const STORAGE_KEY = 'property-map-data-v1';
  const $ = id => document.getElementById(id);
  const headers = ['タイトル', '間取り', '価格', 'メモ', '住所', 'URL'];

  function readProperties() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) throw new Error('保存データの形式が想定と異なります。');
      return parsed;
    } catch (err) {
      setStatus('保存データを読み取れないため、バックアップを作成できませんでした。ブラウザの保存領域が利用可能かご確認ください。', 'error');
      throw err;
    }
  }
  function csvEscape(value) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
  }
  function buildCsv() {
    const properties = readProperties();
    const rows = [headers, ...properties.map(p => [
      p.title || '', p.layout || '', p.price || '', p.memo || '', p.address || '', p.url || ''
    ])];
    return { csv: rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), count: properties.length };
  }
  function setStatus(message, kind = 'info') {
    const el = $('backupStatus');
    if (!el) return;
    el.className = 'status show ' + kind + ' backup-status';
    el.textContent = message;
  }
  function localDateStamp() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function exportCsv() {
    let data;
    try { data = buildCsv(); } catch (err) { return; }
    const blob = new Blob(['\uFEFF', data.csv], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'property-map-backup-' + localDateStamp() + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    setStatus(data.count
      ? data.count + '件の物件情報をCSVに保存しました。ダウンロードフォルダーをご確認ください。'
      : '物件はまだありません。見出しのみのCSVを保存しました。', 'success');
  }
  function legacyCopy(text, textarea = null) {
    const area = textarea || document.createElement('textarea');
    const temporary = !textarea;
    if (temporary) {
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-10000px';
      area.style.top = '0';
      document.body.appendChild(area);
    }
    area.value = text;
    area.focus();
    area.select();
    area.setSelectionRange(0, area.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    if (temporary) area.remove();
    return copied;
  }
  function openFallbackModal(csv) {
    $('backupCsvText').value = csv;
    $('backupCopyStatus').className = 'status';
    $('backupModal').classList.add('open');
    $('backupCsvText').focus();
    $('backupCsvText').select();
    $('backupCsvText').setSelectionRange(0, $('backupCsvText').value.length);
  }
  async function copyCsv() {
    let data;
    try { data = buildCsv(); } catch (err) { return; }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(data.csv);
        setStatus(data.count + '件分のCSV内容をコピーしました。テキストエディタなどに貼り付けて保存できます。', 'success');
        return;
      }
    } catch (err) { console.warn('Clipboard APIでコピーできませんでした。代替方法を試します。', err); }
    if (legacyCopy(data.csv)) {
      setStatus(data.count + '件分のCSV内容をコピーしました。テキストエディタなどに貼り付けて保存できます。', 'success');
      return;
    }
    openFallbackModal(data.csv);
    setStatus('自動コピーが許可されませんでした。表示された画面からコピーしてください。', 'info');
  }
  async function retryCopy() {
    const area = $('backupCsvText');
    const csv = area.value;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(csv);
        $('backupCopyStatus').className = 'status show success';
        $('backupCopyStatus').textContent = 'CSV内容をコピーしました。テキストエディタなどに貼り付けて保存できます。';
        setStatus('CSV内容をコピーしました。', 'success');
        return;
      }
    } catch (err) { console.warn('Clipboard APIで再コピーできませんでした。', err); }
    if (legacyCopy(csv, area)) {
      $('backupCopyStatus').className = 'status show success';
      $('backupCopyStatus').textContent = 'CSV内容をコピーしました。テキストエディタなどに貼り付けて保存できます。';
      setStatus('CSV内容をコピーしました。', 'success');
    } else {
      $('backupCopyStatus').className = 'status show info';
      $('backupCopyStatus').textContent = '自動コピーできませんでした。テキスト欄をクリックして Ctrl+C（Macは⌘+C）でコピーしてください。';
      area.focus(); area.select(); area.setSelectionRange(0, area.value.length);
    }
  }
  function closeModal() { $('backupModal').classList.remove('open'); }

  $('exportCsvBtn').addEventListener('click', exportCsv);
  $('copyCsvBtn').addEventListener('click', copyCsv);
  $('closeBackupModalBtn').addEventListener('click', closeModal);
  $('closeBackupModalBtn2').addEventListener('click', closeModal);
  $('retryCopyBtn').addEventListener('click', retryCopy);
  $('backupModal').addEventListener('click', e => { if (e.target === $('backupModal')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();
