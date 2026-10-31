(()=>{
const $=id=>document.getElementById(id);let records=[],outputMode='copy';
const fields=['title','layout','price','memo','address','url'];
function csvCell(v){v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function csv(){return '\uFEFF'+[['タイトル','間取り','価格','メモ','住所','URL'],...records.map(r=>fields.map(k=>r[k]||''))].map(row=>row.map(csvCell).join(',')).join('\r\n')}
function render(){ $('count').textContent=records.length;$('empty').hidden=records.length>0;$('items').innerHTML='';records.forEach((r,i)=>{let el=document.createElement('div');el.className='item';let info=document.createElement('div');let strong=document.createElement('strong');strong.textContent=r.title;let small=document.createElement('small');small.textContent=[r.layout,r.price,r.address].filter(Boolean).join(' / ');info.append(strong,small);let del=document.createElement('button');del.className='remove';del.textContent='削除';del.onclick=()=>{records.splice(i,1);render()};el.append(info,del);$('items').append(el)});$('copyBtn').disabled=!records.length;$('downloadBtn').disabled=!records.length;$('csvPreview').value=records.length?csv().replace(/^\uFEFF/,''):'';}
function add(r){records.push(Object.fromEntries(fields.map(k=>[k,String(r[k]||'').trim()])));render()}
$('propertyForm').addEventListener('submit',e=>{e.preventDefault();add(Object.fromEntries(['title','layout','price','memo','address'].map(k=>[k,$(k).value])));e.target.reset()});
$('clearBtn').onclick=()=>{if(records.length&&confirm('登録した物件をすべて削除しますか？')){records=[];render()}};
function setOutput(mode){outputMode=mode;document.querySelectorAll('.output-mode').forEach(b=>b.classList.toggle('active',b.dataset.output===mode));$('copyBtn').hidden=mode!=='copy';$('downloadBtn').hidden=mode!=='file';$('copyStatus').textContent=mode==='copy'?'コピーが選択されています。ボタンを押すとCSV形式データをコピーします。':'ファイル保存が選択されています。ボタンを押すとCSVファイルを保存します。'}
document.querySelectorAll('.output-mode').forEach(b=>b.onclick=()=>setOutput(b.dataset.output));
$('copyBtn').onclick=async()=>{if(!records.length)return;let text=csv().replace(/^\uFEFF/,'');try{await navigator.clipboard.writeText(text)}catch(e){$('csvPreview').focus();$('csvPreview').select();if(!document.execCommand('copy')){$('copyStatus').textContent='コピーできませんでした。下のCSVデータを選択してコピーしてください。';$('copyStatus').className='status error';return}}$('copyStatus').textContent='CSV形式データをコピーしました。物件マップのCSV入力欄に貼り付けてください。';$('copyStatus').className='status success'};
$('downloadBtn').onclick=()=>{if(!records.length)return;let blob=new Blob([csv()],{type:'text/csv;charset=utf-8;'}),a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download='物件マップ用データ.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));$('manualPanel').hidden=b.dataset.mode!=='manual';$('urlPanel').hidden=b.dataset.mode!=='url'});
function parseText(raw){const text=String(raw||'').replace(/\u00a0/g,' ').replace(/\r/g,'\n').replace(/[\t ]+/g,' ').replace(/\n{2,}/g,'\n');const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);function pick(re){let m=text.match(re);return m?m[1].trim():''}
let title=pick(/^\s*#\s*([^\n#]+)$/m)||pick(/SUUMO\(スーモ\)[^\n]*?は、([^\n]+?)\s*の新築/m)||pick(/<title[^>]*>([^<]+)<\/title>/i);
title=title.replace(/\s*[\d,]+万円.*$/,'').replace(/^千年２/,'千年２').trim();
let price=pick(/価格\s*(?:ヒント)?\s*[|｜]?\s*([\d,]+\s*万円)/)||pick(/(?:^|\n)([\d,]+\s*万円)\s*\n\s*愛知県/m)||pick(/([\d,]+\s*万円)(?=、\s*[1-9][LDK])/);
let layout=pick(/間取り\s*(?:ヒント)?\s*[|｜]?\s*([1-9][^\n|｜]{0,30}?)(?=\s{2,}|\s*\||\s*土地面積|$)/m)||pick(/([1-9]LDK(?:\+S(?:（[^）]+）)?|\+納戸)?)/);
let address=pick(/(?:住所|所在地)\s*[|｜]\s*(愛知県[^\n|｜\[]+)/)||pick(/(愛知県[^\n|｜]+?)(?=\s*\[|\s*交通|$)/m);
if(!address){let m=text.match(/愛知県名古屋市[^\n|｜]*/);if(m)address=m[0].trim()}
let land=pick(/土地面積[^\n|｜]*[|｜]\s*([\d,.]+\s*m[^\s|｜]*)/);
let building=pick(/建物面積[^\n|｜]*[|｜]\s*([\d,.]+\s*m[^\s|｜]*)/);
let traffic=pick(/交通\s*[|｜]\s*([^\n|｜]+)/)||pick(/(地下鉄[^\n]{0,55}?歩\d+分)/)||pick(/(ＪＲ[^\n]{0,55}?歩\d+分)/);
if(!title){let h=lines.find(x=>/\d[\d,]*万円/.test(x)&&/(駅|丁目|\d)/.test(x));if(h)title=h.replace(/^#+\s*/,'').replace(/[\d,]+万円.*/, '').trim()}
let memo=[land?'土地面積：'+land.replace(/\s+/g,''):'',building?'建物面積：'+building.replace(/\s+/g,''):'',traffic?'交通：'+traffic:''].filter(Boolean).join(' / ');
return {title,layout:layout.replace(/[|｜].*$/,'').trim(),price:price.replace(/\s+/g,''),address:address.replace(/\s*\[[\s\S]*$/,'').trim(),memo};}
function showParsed(r){$('pTitle').value=r.title||'';$('pLayout').value=r.layout||'';$('pPrice').value=r.price||'';$('pAddress').value=r.address||'';$('pMemo').value=r.memo||'';$('pUrl').value=r.url||'';$('parsedPreview').hidden=false;$('fetchStatus').textContent='読み取りました。内容を確認・修正してから追加してください。';$('fetchStatus').className='status success'}
function parseFrom(text,sourceUrl=''){let r=parseText(text);r.url=sourceUrl;if(!r.title||!r.address){throw Error('物件タイトルまたは住所を読み取れませんでした。SUUMOのページ本文を貼り付けてください。')}showParsed(r)}
$('parsedForm').onsubmit=e=>{e.preventDefault();add({title:$('pTitle').value,layout:$('pLayout').value,price:$('pPrice').value,address:$('pAddress').value,memo:$('pMemo').value,url:$('pUrl').value});$('parsedPreview').hidden=true};
$('fetchBtn').onclick=async()=>{let url=$('pageUrl').value.trim();if(!/^https?:\/\/suumo\.jp\//i.test(url)){ $('fetchStatus').textContent='SUUMOの物件ページURL（https://suumo.jp/...）を入力してください。';$('fetchStatus').className='status error';return} $('fetchBtn').disabled=true;$('fetchStatus').textContent='SUUMOのページ情報を取得しています…';$('fetchStatus').className='status';try{let endpoint='https://r.jina.ai/'+url;let res=await fetch(endpoint,{headers:{'Accept':'text/plain'}});if(!res.ok)throw Error('読み取りサービスからHTTP '+res.status+' が返されました');let text=await res.text();if(!text||text.length<100)throw Error('取得したページ情報が空でした');parseFrom(text,url)}catch(err){$('fetchStatus').textContent='自動取得に失敗しました（'+(err.message||'通信エラー')+'）。SUUMOの仕様や外部サービスの制限が考えられます。下の「自動取得ができない場合」からページ本文を貼り付けてください。';$('fetchStatus').className='status error'}finally{$('fetchBtn').disabled=false}};
$('parseTextBtn').onclick=()=>{try{if(!$('pageText').value.trim())throw Error('ページ本文を貼り付けてください。');parseFrom($('pageText').value,$('pageUrl').value.trim())}catch(e){$('fetchStatus').textContent=e.message;$('fetchStatus').className='status error'}};
// SUUMO sample text pattern regression check (sample values are not prefilled in the UI)
render();setOutput('copy');
})();