let internalIdCounter = 0;

        window.onload = () => {
            initCustomDropdowns();
            addCandidate();
        };

        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>'"]/g, tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
            }[tag]));
        }

        function getWeekdayString(dateString) {
            if (!dateString) return "";
            const days = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return "";
            return days[d.getDay()];
        }

        function initCustomDropdowns() {
            const nightsSel = document.getElementById('customNights');
            nightsSel.innerHTML = '<option value="" selected>--</option>';
            for(let i=0; i<=7; i++) nightsSel.add(new Option(i, i));
            updateCustomDaysOptions();
        }

        function updateCustomDaysOptions() {
            const nightsSel = document.getElementById('customNights');
            const daysSel = document.getElementById('customDays');
            daysSel.innerHTML = '';
            if (nightsSel.value === "") {
                daysSel.add(new Option("--", ""));
            } else {
                const nights = parseInt(nightsSel.value);
                for (let i = nights; i <= 10; i++) daysSel.add(new Option(i, i));
            }
        }

        function getDurationNightsAndDays() {
            const select = document.getElementById('durationSelect');
            if (select.value === 'other') {
                const daysVal = document.getElementById('customDays').value;
                const nightsVal = document.getElementById('customNights').value;
                return {
                    days: daysVal === "" ? 0 : parseInt(daysVal),
                    nights: nightsVal === "" ? 0 : parseInt(nightsVal)
                };
            }
            const days = parseInt(select.value);
            return { days: days, nights: days - 1 };
        }

        function setDurationSelection(nights, days) {
            const select = document.getElementById('durationSelect');
            if (days === 1 && nights === 0) select.value = "1";
            else if (days === 2 && nights === 1) select.value = "2";
            else if (days === 3 && nights === 2) select.value = "3";
            else {
                select.value = "other";
                document.getElementById('customDuration').style.display = 'flex';
                const nightsSel = document.getElementById('customNights');
                nightsSel.value = nights <= 7 ? nights : 7;
                updateCustomDaysOptions();
                document.getElementById('customDays').value = days <= 10 ? days : 10;
            }
            handleDurationSelect();
        }

        function handleDurationSelect() {
            const select = document.getElementById('durationSelect');
            const custom = document.getElementById('customDuration');
            if (select.value === 'other') {
                custom.style.display = 'flex';
                if (document.getElementById('customNights').value === "") {
                    updateCustomDaysOptions();
                }
            } else {
                custom.style.display = 'none';
            }
            updateDuration();
        }

        function handleDateChange(input, internalId, dayIndex) {
            const currentWrapper = input.closest('.day-title-wrapper');
            const weekdaySpan = currentWrapper ? currentWrapper.querySelector('.day-weekday') : null;
            
            if (!input.value) {
                if(weekdaySpan) weekdaySpan.textContent = "";
                return;
            }

            if(weekdaySpan) weekdaySpan.textContent = getWeekdayString(input.value);

            const targetDays = getDurationNightsAndDays().days;
            let currentDate = new Date(input.value);
            
            for (let i = dayIndex + 1; i <= targetDays; i++) {
                currentDate.setDate(currentDate.getDate() + 1);
                const daySection = document.querySelector(`#cand${internalId}-day${i}`);
                if (daySection) {
                    const nextDateInput = daySection.querySelector('.day-date');
                    const nextWeekdaySpan = daySection.querySelector('.day-weekday');
                    if (nextDateInput) {
                        const yyyy = currentDate.getFullYear();
                        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(currentDate.getDate()).padStart(2, '0');
                        const dateStr = `${yyyy}-${mm}-${dd}`;
                        nextDateInput.value = dateStr;
                        if(nextWeekdaySpan) nextWeekdaySpan.textContent = getWeekdayString(dateStr);
                    }
                }
            }
        }

        function toggleTitleInputs(btn) { btn.closest('.candidate-card').classList.toggle('show-titles'); }
        function toggleCostInputs(btn) { btn.closest('.candidate-card').classList.toggle('show-costs'); }
        function toggleSingleUrl(btn) { btn.closest('.event-item').classList.toggle('show-url'); }

        function toggleEventType(selectElem) {
            const item = selectElem.closest('.event-item');
            const transportGroup = item.querySelector('.transport-group');
            if (selectElem.value === '観光') {
                transportGroup.style.display = 'none';
            } else {
                transportGroup.style.display = 'inline-flex';
            }
        }

        /* 予定順番変更用関数 */
        function moveEventUp(btn) {
            const currentItem = btn.closest('.event-item');
            const prevItem = currentItem.previousElementSibling;
            if (prevItem && prevItem.classList.contains('event-item')) {
                currentItem.parentNode.insertBefore(currentItem, prevItem);
            }
        }

        function moveEventDown(btn) {
            const currentItem = btn.closest('.event-item');
            const nextItem = currentItem.nextElementSibling;
            if (nextItem && nextItem.classList.contains('event-item')) {
                currentItem.parentNode.insertBefore(nextItem, currentItem);
            }
        }

        /* 任意の位置に予定を追加 */
        function insertEventRowAfter(btn) {
            const currentItem = btn.closest('.event-item');
            const newRow = createEventRow();
            currentItem.parentNode.insertBefore(newRow, currentItem.nextSibling);
        }

        /* 予定行の削除と制限 */
        function removeEventRow(btn) {
            const item = btn.closest('.event-item');
            const container = item.parentElement;
            // 同じ日（コンテナ）の中にある予定の数をチェック
            if (container.querySelectorAll('.event-item').length <= 1) {
                alert("この日の予定は最低1つ必要です。\n内容をクリアしたい場合は「R」ボタンをご利用ください。");
                return;
            }
            item.remove();
            calcCosts();
        }

        /* 時間の入力欄がフォーカスされたときに、1つ前の予定から時間を自動入力する */
        function autoFillTime(timeInput) {
            if (timeInput.value) return; // 既に入力済みの場合は何もしない

            const currentItem = timeInput.closest('.event-item');
            const prevItem = currentItem.previousElementSibling;
            
            if (prevItem && prevItem.classList.contains('event-item')) {
                const defaultTime = calculateEndTimeHHMM(prevItem);
                if (defaultTime) {
                    timeInput.value = defaultTime;
                    calcEndTime(timeInput);
                }
            }
        }

        /* 予定の終了（到着/出発）時間を計算してHH:mm形式で返すヘルパー関数 */
        function calculateEndTimeHHMM(item) {
            if (!item) return "";
            const startTime = item.querySelector('.event-time').value;
            const durationH = parseFloat(item.querySelector('.duration-time').value);
            
            if (startTime) {
                const [hours, minutes] = startTime.split(':').map(Number);
                let totalMinutes = hours * 60 + minutes;
                if (!isNaN(durationH) && durationH > 0) {
                    totalMinutes += Math.round(durationH * 60);
                }
                const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
                const endMinutes = totalMinutes % 60;
                return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
            }
            return "";
        }

        function calcEndTime(elem) {
            const item = elem.closest('.event-item');
            const startTime = item.querySelector('.event-time').value;
            const eType = item.querySelector('.event-type').value;
            const durationH = parseFloat(item.querySelector('.duration-time').value);
            const resultSpan = item.querySelector('.calc-time-result');
            const calcContainer = item.querySelector('.event-row-time-calc');

            if (startTime && !isNaN(durationH) && durationH > 0) {
                const [hours, minutes] = startTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes + Math.round(durationH * 60);
                
                const nextDay = Math.floor(totalMinutes / (24 * 60));
                const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
                const endMinutes = totalMinutes % 60;
                
                const timeStr = `${nextDay > 0 ? '翌' : ''}${endHours}時${endMinutes.toString().padStart(2, '0')}分`;
                
                if (eType === '移動') {
                    resultSpan.textContent = `到着予定時間: ${timeStr}`;
                } else {
                    resultSpan.textContent = `出発予定時間: ${timeStr}`;
                }
                calcContainer.style.display = 'block';
            } else {
                resultSpan.textContent = "";
                calcContainer.style.display = 'none';
            }
        }

        function resetEventRow(btn) {
            if (!confirm("この予定の入力内容をリセットしますか？")) return;
            const item = btn.closest('.event-item');
            item.querySelectorAll('input[type="text"], input[type="time"], input[type="url"], input[type="number"], textarea.event-content').forEach(el => el.value = '');
            item.querySelectorAll('select.transport-type').forEach(el => { el.value = ''; toggleTransportOther(el); });
            item.querySelector('.event-type').value = '移動';
            toggleEventType(item.querySelector('.event-type'));
            calcEndTime(item.querySelector('.event-time'));
            calcCosts();
        }

        function calcCosts() {
            document.querySelectorAll('.candidate-card').forEach(card => {
                let totalT = 0, totalF = 0, totalO = 0;
                card.querySelectorAll('.day-section').forEach(day => {
                    let dayT = 0, dayF = 0, dayO = 0;
                    day.querySelectorAll('.event-item').forEach(ev => {
                        dayT += parseInt(ev.querySelector('.cost-t').value) || 0;
                        dayF += parseInt(ev.querySelector('.cost-f').value) || 0;
                        dayO += parseInt(ev.querySelector('.cost-o').value) || 0;
                    });
                    const daySubtotal = dayT + dayF + dayO;
                    day.querySelector('.cost-subtotal').textContent = daySubtotal.toLocaleString();
                    totalT += dayT; totalF += dayF; totalO += dayO;
                });
                const total = totalT + totalF + totalO;
                card.querySelector('.cost-total').textContent = total.toLocaleString();
                card.querySelector('.cost-total-transport').textContent = totalT.toLocaleString();
                card.querySelector('.cost-total-food').textContent = totalF.toLocaleString();
                card.querySelector('.cost-total-other').textContent = totalO.toLocaleString();
            });
        }

        function addCandidate(parsedData = null) {
            internalIdCounter++;
            const container = document.getElementById('candidatesContainer');
            const dur = getDurationNightsAndDays();
            const currentDays = dur.days;
            
            const currentCards = document.querySelectorAll('.candidate-card');
            const currentDisplayCount = currentCards.length + 1;
            
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.id = `candidate-${internalIdCounter}`;
            
            let candName = `プラン ${currentDisplayCount}`;
            let memoValue = "";
            let clonedDaysData = {};
            let isCostShown = false;
            let isTitleShown = false;

            if (parsedData) {
                candName = parsedData.name;
                memoValue = parsedData.memo;
                clonedDaysData = parsedData.daysData;
                for(const i in clonedDaysData) {
                    if (clonedDaysData[i].title) isTitleShown = true;
                    clonedDaysData[i].events.forEach(ev => {
                        if (ev.cT || ev.cF || ev.cO) isCostShown = true;
                    });
                }
            } else if (currentCards.length > 0) {
                const lastCard = currentCards[currentCards.length - 1];
                const lastId = lastCard.id.split('-')[1];
                memoValue = lastCard.querySelector('.candidate-memo').value;
                isCostShown = lastCard.classList.contains('show-costs');
                isTitleShown = lastCard.classList.contains('show-titles');

                for (let i = 1; i <= currentDays; i++) {
                    const daySection = lastCard.querySelector(`#cand${lastId}-day${i}`);
                    if (daySection) {
                        const dateVal = daySection.querySelector('.day-date').value;
                        const titleVal = daySection.querySelector('.day-subtitle').value;
                        const dayMemoVal = daySection.querySelector('.day-memo').value;
                        const items = [];
                        daySection.querySelectorAll('.event-item').forEach(node => {
                            items.push({
                                time: node.querySelector('.event-time').value,
                                eType: node.querySelector('.event-type').value,
                                dest: node.querySelector('.event-dest').value,
                                tType: node.querySelector('.transport-type').value,
                                tOther: node.querySelector('.transport-other').value,
                                durTime: node.querySelector('.duration-time').value,
                                content: node.querySelector('.event-content').value,
                                url: node.querySelector('.event-url').value,
                                cT: node.querySelector('.cost-t').value,
                                cF: node.querySelector('.cost-f').value,
                                cO: node.querySelector('.cost-o').value
                            });
                        });
                        clonedDaysData[i] = { date: dateVal, title: titleVal, dayMemo: dayMemoVal, events: items };
                    }
                }
            }
            
            if (isCostShown) card.classList.add('show-costs');
            if (isTitleShown) card.classList.add('show-titles');

            let html = `
                <div class="candidate-header">
                    <input type="text" class="candidate-name" value="${escapeHTML(candName)}" placeholder="候補名を入力">
                    <div class="card-actions">
                        <button class="btn-title-toggle" onclick="toggleTitleInputs(this)">タイトル</button>
                        <button class="btn-cost" onclick="toggleCostInputs(this)">金額入力</button>
                        <button class="btn-secondary" onclick="this.closest('.candidate-card').remove(); calcCosts();">削除</button>
                    </div>
                </div>
                <div class="days-container"></div>
                
                <div class="plan-costs-summary">
                    <h4 style="margin:0 0 5px 0;">総額: <span class="cost-total">0</span>円</h4>
                    <div style="font-size:13px; color:#555;">
                        (内訳: 交通費 <span class="cost-total-transport">0</span>円 / 食費 <span class="cost-total-food">0</span>円 / その他 <span class="cost-total-other">0</span>円)
                    </div>
                </div>

                <div class="memo-section">
                    <div class="day-title" style="margin-bottom:5px;">全体メモ</div>
                    <textarea class="candidate-memo" placeholder="このプランに関するメモや懸念点等を記載">${escapeHTML(memoValue)}</textarea>
                </div>
            `;
            
            card.innerHTML = html;
            container.appendChild(card);
            
            const daysContainer = card.querySelector('.days-container');
            for (let i = 1; i <= currentDays; i++) {
                const dayData = clonedDaysData[i] || null;
                daysContainer.insertAdjacentHTML('beforeend', generateDayHTML(internalIdCounter, i, currentDays, dayData));
                
                const eventsContainer = card.querySelector(`#cand${internalIdCounter}-day${i} .events-container`);
                if (dayData && dayData.events && dayData.events.length > 0) {
                    dayData.events.forEach(ev => eventsContainer.appendChild(createEventRow(ev)));
                } else {
                    eventsContainer.appendChild(createEventRow());
                }
            }
            
            updateDuration();
            calcCosts();
            card.querySelectorAll('.duration-time').forEach(el => calcEndTime(el));
        }

        function generateDayHTML(internalId, dayIndex, targetDays, dayData = null) {
            const dateVal = dayData ? escapeHTML(dayData.date) : "";
            const titleVal = dayData && dayData.title ? escapeHTML(dayData.title) : "";
            const dayMemoVal = dayData && dayData.dayMemo ? escapeHTML(dayData.dayMemo) : "";
            const weekdayStr = getWeekdayString(dateVal);
            return `
                <div class="day-section" id="cand${internalId}-day${dayIndex}">
                    <div class="day-title-wrapper">
                        <span class="day-title">${targetDays === 1 ? "日付" : dayIndex + "日目"}</span>
                        <input type="date" class="day-date" value="${dateVal}" onchange="handleDateChange(this, '${internalId}', ${dayIndex})">
                        <span class="day-weekday">${weekdayStr}</span>
                        <span class="day-title-container">
                            メイン: <input type="text" class="day-subtitle" value="${titleVal}" placeholder="行き先など">
                        </span>
                        <span class="daily-cost-summary" style="margin-left:auto; font-weight:bold; color:var(--primary-color);">日計: <span class="cost-subtotal">0</span>円</span>
                    </div>
                    <div class="day-memo-wrapper">
                        <textarea class="day-memo" placeholder="この日のメモや持ち物など">${dayMemoVal}</textarea>
                    </div>
                    <div class="events-container"></div>
                </div>
            `;
        }

        function createEventRow(ev = null) {
            const item = document.createElement('div');
            
            const time = ev ? escapeHTML(ev.time) : "";
            const eType = ev && ev.eType ? escapeHTML(ev.eType) : "移動";
            const dest = ev ? escapeHTML(ev.dest) : "";
            const tType = ev ? escapeHTML(ev.tType) : "";
            const tOther = ev ? escapeHTML(ev.tOther) : "";
            const durTime = ev ? escapeHTML(ev.durTime) : "";
            const content = ev ? escapeHTML(ev.content) : "";
            const url = ev ? escapeHTML(ev.url) : "";
            const cT = ev ? escapeHTML(ev.cT) : "";
            const cF = ev ? escapeHTML(ev.cF) : "";
            const cO = ev ? escapeHTML(ev.cO) : "";

            const displayOther = (tType === "その他") ? "inline-block" : "none";
            const selType = (val) => (eType === val) ? "selected" : "";
            const selT = (val) => (tType === val) ? "selected" : "";
            const displayTransport = (eType === '観光') ? "none" : "inline-flex";
            const showUrlClass = url ? "show-url" : "";
            
            item.className = `event-item ${showUrlClass}`;
            
            item.innerHTML = `
                <div class="event-row-top">
                    <button class="btn-move" title="上へ移動" onclick="moveEventUp(this)">▲</button>
                    <button class="btn-move" title="下へ移動" onclick="moveEventDown(this)">▼</button>
                    <button class="btn-add-inline" title="下に予定を追加" onclick="insertEventRowAfter(this)">＋</button>
                    
                    <input type="time" class="event-time" value="${time}" onfocus="autoFillTime(this)" onchange="calcEndTime(this)">
                    <select class="event-type" onchange="toggleEventType(this); calcEndTime(this);">
                        <option value="移動" ${selType("移動")}>移動</option>
                        <option value="観光" ${selType("観光")}>観光</option>
                    </select>
                    <input type="text" class="event-dest" placeholder="目的地" value="${dest}">
                    
                    <span class="transport-group" style="display:${displayTransport};">
                        <select class="transport-type" onchange="toggleTransportOther(this)">
                            <option value="" ${selT("")}>手段</option>
                            <option value="電車" ${selT("電車")}>電車</option>
                            <option value="新幹線" ${selT("新幹線")}>新幹線</option>
                            <option value="飛行機" ${selT("飛行機")}>飛行機</option>
                            <option value="車" ${selT("車")}>車</option>
                            <option value="徒歩" ${selT("徒歩")}>徒歩</option>
                            <option value="その他" ${selT("その他")}>その他</option>
                        </select>
                        <input type="text" class="transport-other" placeholder="入力" style="display:${displayOther};" value="${tOther}">
                    </span>
                    
                    <div class="duration-group">
                        <input type="number" step="0.1" min="0" class="duration-time" placeholder="h" value="${durTime}" oninput="calcEndTime(this)">
                        <span style="font-size:14px;">h</span>
                    </div>
                    
                    <button class="btn-url-toggle" title="URL枠を追加" onclick="toggleSingleUrl(this)">🔗URL</button>
                    <button class="btn-secondary btn-reset-event" title="リセット" onclick="resetEventRow(this)">R</button>
                    <button class="remove-row" title="削除" onclick="removeEventRow(this)">×</button>
                </div>
                <div class="event-row-time-calc">
                    <span class="calc-time-result"></span>
                </div>
                <div class="event-row-middle">
                    <textarea class="event-content" placeholder="目的地についてのメモや概要">${content}</textarea>
                </div>
                <div class="event-row-bottom">
                    <input type="url" class="event-url" placeholder="参考URL (https://...)" value="${url}">
                </div>
                <div class="event-row-cost">
                    <label>交通費:<input type="number" class="cost-input cost-t" oninput="calcCosts()" value="${cT}">円</label>
                    <label>食費:<input type="number" class="cost-input cost-f" oninput="calcCosts()" value="${cF}">円</label>
                    <label>その他:<input type="number" class="cost-input cost-o" oninput="calcCosts()" value="${cO}">円</label>
                </div>
            `;
            return item;
        }

        function ensureDaysExist(card, internalId, targetDays) {
            const daysContainer = card.querySelector('.days-container');
            const existingDays = card.querySelectorAll('.day-section').length;
            for (let i = existingDays + 1; i <= targetDays; i++) {
                daysContainer.insertAdjacentHTML('beforeend', generateDayHTML(internalId, i, targetDays));
                const eventsContainer = card.querySelector(`#cand${internalId}-day${i} .events-container`);
                eventsContainer.appendChild(createEventRow());
            }
        }

        function updateDuration() {
            const targetDays = getDurationNightsAndDays().days;
            document.querySelectorAll('.candidate-card').forEach(card => {
                const internalId = card.id.split('-')[1];
                ensureDaysExist(card, internalId, targetDays);
                
                card.querySelectorAll('.day-section').forEach((section, index) => {
                    if (index < targetDays) {
                        section.style.display = 'block';
                        section.querySelector('.day-title').textContent = targetDays === 1 ? "日付" : (index + 1) + "日目";
                    } else {
                        section.style.display = 'none';
                    }
                });
            });
            calcCosts();
        }

        function toggleTransportOther(selectElem) {
            const otherInput = selectElem.nextElementSibling;
            if (selectElem.value === "その他") {
                otherInput.style.display = "inline-block";
            } else {
                otherInput.style.display = "none";
                otherInput.value = "";
            }
        }

        function generateExportText() {
            const dur = getDurationNightsAndDays();
            const targetDays = dur.days;
            const targetNights = dur.nights;
            if (document.getElementById('durationSelect').value === 'other' && targetDays === 0) {
                alert("泊数と日数を指定してから実行してください。"); return null;
            }

            const cards = document.querySelectorAll('.candidate-card');
            const isMultiple = cards.length > 1;
            const firstCard = cards[0];
            const basePlanName = firstCard ? (firstCard.querySelector('.candidate-name').value || "プラン1") : "プラン";
            
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const filename = `${basePlanName}_${yy}${mm}${dd}-${hh}${min}${ss}.txt`;

            let outputText = `【${basePlanName} ${targetNights}泊${targetDays}日】\n作成日時: ${now.toLocaleString('ja-JP')}\n\n`;
            if (isMultiple) outputText += `========================================\n\n`;

            cards.forEach((card, index) => {
                const name = card.querySelector('.candidate-name').value || "無名プラン";
                const internalId = card.id.split('-')[1];
                const showCosts = card.classList.contains('show-costs');
                const showTitles = card.classList.contains('show-titles');
                
                if (isMultiple) {
                    outputText += `■ 候補 ${index + 1}: ${name}\n`;
                    outputText += `----------------------------------------\n`;
                }

                for (let i = 1; i <= targetDays; i++) {
                    const daySection = card.querySelector(`#cand${internalId}-day${i}`);
                    const dateInput = daySection.querySelector('.day-date').value;
                    const weekdayText = daySection.querySelector('.day-weekday').textContent;
                    const dateStr = dateInput ? ` (${dateInput} ${weekdayText})` : "";
                    
                    let headerStr = "";
                    if (targetDays === 1) headerStr = `[日付${dateStr}]`;
                    else headerStr = `[${i}日目${dateStr}]`;
                    
                    const titleInput = daySection.querySelector('.day-subtitle').value.trim();
                    if (showTitles && titleInput) {
                        headerStr += ` ${titleInput}`;
                    }
                    outputText += headerStr + "\n";
                    
                    const dayMemoInput = daySection.querySelector('.day-memo').value.trim();
                    if (dayMemoInput) {
                        outputText += `  [日別メモ]\n`;
                        dayMemoInput.split('\n').forEach(memoLine => {
                            outputText += `    ${memoLine}\n`;
                        });
                    }

                    const items = daySection.querySelectorAll('.event-item');
                    let hasEvents = false;
                    let dayT = 0, dayF = 0, dayO = 0;

                    items.forEach(item => {
                        const time = item.querySelector('.event-time').value;
                        const eType = item.querySelector('.event-type').value;
                        const dest = item.querySelector('.event-dest').value.trim();
                        const tType = item.querySelector('.transport-type').value;
                        const tOther = item.querySelector('.transport-other').value.trim();
                        const durTime = item.querySelector('.duration-time').value.trim();
                        const calcResult = item.querySelector('.calc-time-result').textContent.trim();
                        
                        const content = item.querySelector('.event-content').value.trim();
                        const url = item.querySelector('.event-url').value.trim();
                        const costT = parseInt(item.querySelector('.cost-t').value) || 0;
                        const costF = parseInt(item.querySelector('.cost-f').value) || 0;
                        const costO = parseInt(item.querySelector('.cost-o').value) || 0;
                        
                        dayT += costT; dayF += costF; dayO += costO;

                        if (time || dest || tType || durTime || content || url || (showCosts && (costT > 0 || costF > 0 || costO > 0))) {
                            const timeStr = time ? `${time} ` : "時間未定 ";
                            const destStr = dest ? `【${dest}】` : "【目的地未定】";
                            
                            let transportInfo = "";
                            if (eType === '移動') {
                                let finalMode = tType === "その他" && tOther ? tOther : tType;
                                if (finalMode) transportInfo = ` (手段: ${finalMode})`;
                            }
                            
                            let typeWithTime = durTime ? `[${eType}：${durTime}h]` : `[${eType}]`;
                            let outputLine = `  ${timeStr}- ${destStr} ${typeWithTime}${transportInfo}`;
                            
                            outputText += outputLine + "\n";
                            
                            if (calcResult) {
                                outputText += `    └ (${calcResult})\n`;
                            }
                            
                            if (content) {
                                const cLines = content.split('\n');
                                outputText += `    └ 概要: ${cLines[0]}\n`;
                                for(let k=1; k<cLines.length; k++){
                                    outputText += `              ${cLines[k]}\n`;
                                }
                            }
                            if (url) outputText += `    └ URL: ${url}\n`;
                            
                            if (showCosts && (costT > 0 || costF > 0 || costO > 0)) {
                                outputText += `    └ 費用: `;
                                let costParts = [];
                                if (costT > 0) costParts.push(`交通費 ${costT}円`);
                                if (costF > 0) costParts.push(`食費 ${costF}円`);
                                if (costO > 0) costParts.push(`その他 ${costO}円`);
                                outputText += costParts.join(" / ") + "\n";
                            }
                            hasEvents = true;
                        }
                    });
                    
                    if (!hasEvents && !dayMemoInput) outputText += `  (予定の記載なし)\n`;
                    const sub = dayT + dayF + dayO;
                    if (showCosts && sub > 0) outputText += `  * 日計: ${sub.toLocaleString()}円 (交通費: ${dayT.toLocaleString()}円 / 食費: ${dayF.toLocaleString()}円 / その他: ${dayO.toLocaleString()}円)\n\n`;
                    else outputText += `\n`;
                }

                if (showCosts) {
                    const total = card.querySelector('.cost-total').textContent;
                    const totalT = card.querySelector('.cost-total-transport').textContent;
                    const totalF = card.querySelector('.cost-total-food').textContent;
                    const totalO = card.querySelector('.cost-total-other').textContent;
                    outputText += `[費用合計]\n総額: ${total}円 (交通費: ${totalT}円 / 食費: ${totalF}円 / その他: ${totalO}円)\n\n`;
                }

                const memo = card.querySelector('.candidate-memo').value.trim();
                if (memo) outputText += `[メモ]\n${memo}\n`;
                if (isMultiple) outputText += `========================================\n\n`;
            });

            return { text: outputText, filename: filename };
        }

        function executeExport() {
            const action = document.getElementById('exportAction').value;
            const data = generateExportText();
            if (!data) return;

            if (action === 'download') {
                const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = data.filename;
                a.click();
                URL.revokeObjectURL(a.href);
            } else if (action === 'copy') {
                const textarea = document.createElement('textarea');
                textarea.value = data.text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    alert("クリップボードにコピーしました！");
                } catch (err) {
                    alert("コピーに失敗しました。");
                }
                document.body.removeChild(textarea);
            }
        }

        /* ------------------------------------------------------------------
           テキスト読み込み (Import) ロジック
        ------------------------------------------------------------------- */
        function openImportModal() {
            document.getElementById('importText').value = '';
            document.getElementById('importModal').style.display = 'flex';
        }

        function closeImportModal() {
            document.getElementById('importModal').style.display = 'none';
        }

        function executeImport() {
            const text = document.getElementById('importText').value.trim();
            if(!text) {
                alert("テキストが入力されていません。");
                return;
            }

            try {
                const titleMatch = text.match(/【(.*?) (\d+)泊(\d+)日】/);
                let globalName = "プラン";
                let nights = 1;
                let days = 2;
                if(titleMatch) {
                    globalName = titleMatch[1];
                    nights = parseInt(titleMatch[2]);
                    days = parseInt(titleMatch[3]);
                }

                let candidateBlocks = [];
                if (text.includes('■ 候補')) {
                    const splits = text.split(/■ 候補 \d+: /);
                    for (let i = 1; i < splits.length; i++) {
                        const blockText = splits[i];
                        const nameMatch = blockText.match(/^(.*?)\n/);
                        candidateBlocks.push({
                            name: nameMatch ? nameMatch[1].trim() : `プラン ${i}`,
                            text: blockText
                        });
                    }
                } else {
                    candidateBlocks.push({ name: globalName, text: text });
                }

                const parsedCandidates = [];

                candidateBlocks.forEach(block => {
                    let daysData = {};
                    let memoText = "";
                    const lines = block.text.split('\n');
                    
                    let currentDay = 0;
                    let currentEvent = null;
                    let isMemoZone = false;
                    let isDayMemoZone = false;
                    let isEventContentZone = false;
                    let tempDayMemo = "";

                    lines.forEach(line => {
                        // 1. 空行はスキップ
                        if (line.trim() === '') return;

                        // 2. 全体メモの処理
                        if (line.match(/^\[メモ\]/)) {
                            isMemoZone = true;
                            isDayMemoZone = false;
                            isEventContentZone = false;
                            return;
                        }
                        if (isMemoZone) {
                            if (line.startsWith('==================')) return;
                            memoText += (memoText ? "\n" : "") + line.trim();
                            return;
                        }

                        // 各種パターンの定義 (正規表現に \s* を使用してあらゆる空白に対応)
                        const newEventMatch = line.match(/^\s*([\d:]+|時間未定)?\s*-\s*【(.*?)】\s*\[(移動|観光)(?:：([\d\.]+)h)?\](.*)/);
                        const oldEventMatch = line.match(/^\s*([\d:]+|時間未定)?\s*-\s*(?:\[(移動|観光)\])?\s*【(.*?)】(.*)/);
                        const dayMatch = line.match(/^\[(?:(\d+)日目|日付)(?: \(([\d-]+).*?\))?\](?:\s*(?:メイン:\s*)?(.*))?/);

                        // 3. 日別メモの終了・継続判定
                        if (isDayMemoZone) {
                            if (dayMatch || newEventMatch || oldEventMatch || line.match(/^\s*\[(?:費用合計|メモ)\]/)) {
                                if (daysData[currentDay]) daysData[currentDay].dayMemo = tempDayMemo.trim();
                                isDayMemoZone = false;
                            } else {
                                tempDayMemo += (tempDayMemo ? "\n" : "") + line.trim();
                                return;
                            }
                        }

                        // 4. 複数行概要の終了・継続判定
                        if (isEventContentZone) {
                            if (dayMatch || newEventMatch || oldEventMatch || line.match(/^\s*└/) || line.match(/^\s*\[/)) {
                                isEventContentZone = false;
                            } else {
                                currentEvent.content += '\n' + line.trim();
                                return;
                            }
                        }

                        // 5. 新規・日別メモの開始
                        if (line.match(/^\s*\[日別メモ\]/)) {
                            if (currentEvent && currentDay > 0) {
                                daysData[currentDay].events.push(currentEvent);
                                currentEvent = null;
                            }
                            isDayMemoZone = true;
                            tempDayMemo = "";
                            return;
                        }

                        // 6. 日付・タイトルの判定
                        if (dayMatch) {
                            if (currentEvent && currentDay > 0) {
                                daysData[currentDay].events.push(currentEvent);
                                currentEvent = null;
                            }
                            currentDay = dayMatch[1] ? parseInt(dayMatch[1]) : 1;
                            const dateVal = dayMatch[2] || "";
                            const titleVal = dayMatch[3] || "";
                            if (!daysData[currentDay]) daysData[currentDay] = { date: dateVal, title: titleVal, dayMemo: "", events: [] };
                            return;
                        }

                        // 7. 予定行の判定 (└で始まる行はスキップ)
                        if ((newEventMatch || oldEventMatch) && !line.match(/^\s*└/)) {
                            if (currentEvent && currentDay > 0) {
                                daysData[currentDay].events.push(currentEvent);
                            }
                            
                            let t = ""; let eType = "移動"; let d = ""; let rest = ""; let durT = "";
                            
                            if (newEventMatch) {
                                t = newEventMatch[1] === "時間未定" ? "" : (newEventMatch[1] || "").trim();
                                d = newEventMatch[2].trim() === "目的地未定" ? "" : newEventMatch[2].trim();
                                eType = newEventMatch[3] || "移動";
                                durT = newEventMatch[4] || "";
                                rest = newEventMatch[5] || "";
                            } else {
                                t = oldEventMatch[1] === "時間未定" ? "" : (oldEventMatch[1] || "").trim();
                                eType = oldEventMatch[2] || "移動"; 
                                d = oldEventMatch[3].trim() === "目的地未定" ? "" : oldEventMatch[3].trim();
                                rest = oldEventMatch[4] || "";
                                const durMatch = rest.match(/\/\s*時間:\s*([\d\.]+)h/);
                                if (durMatch) {
                                    durT = durMatch[1];
                                }
                            }
                            
                            let tType = ""; let tOther = "";
                            
                            const modeMatch = rest.match(/\(手段:\s*(.*?)\)/);
                            if (modeMatch) {
                                let mode = modeMatch[1];
                                const standardTypes = ["電車", "新幹線", "飛行機", "車", "徒歩"];
                                if (standardTypes.includes(mode)) {
                                    tType = mode;
                                } else {
                                    tType = "その他";
                                    tOther = mode;
                                }
                            }

                            currentEvent = { time: t, eType: eType, dest: d, tType: tType, tOther: tOther, durTime: durT, content: "", url: "", cT: "", cF: "", cO: "" };
                            return;
                        }

                        // 8. イベント属性の判定
                        if (currentEvent) {
                            if (line.match(/^\s*└\s*\((?:到着|出発)予定時間/)) return;

                            const contentMatch = line.match(/^\s*└ 概要:\s*(.*)/);
                            if (contentMatch) { 
                                currentEvent.content = contentMatch[1]; 
                                isEventContentZone = true;
                                return; 
                            }

                            const urlMatch = line.match(/^\s*└ URL:\s*(.*)/);
                            if (urlMatch) { 
                                currentEvent.url = urlMatch[1].trim(); 
                                return; 
                            }

                            const costMatch = line.match(/^\s*└ 費用:\s*(.*)/);
                            if (costMatch) {
                                const cStr = costMatch[1].replace(/,/g, '');
                                const ctM = cStr.match(/交通費 (\d+)円/); if(ctM) currentEvent.cT = ctM[1];
                                const cfM = cStr.match(/食費 (\d+)円/); if(cfM) currentEvent.cF = cfM[1];
                                const coM = cStr.match(/その他 (\d+)円/); if(coM) currentEvent.cO = coM[1];
                                return;
                            }
                            
                            if (line.match(/^\s*\*\s*日計:/)) return;
                        }
                    });

                    // 9. ループ終了時の残処理
                    if (isDayMemoZone && currentDay > 0 && daysData[currentDay]) {
                        daysData[currentDay].dayMemo = tempDayMemo.trim();
                    }
                    if (currentEvent && currentDay > 0) {
                        daysData[currentDay].events.push(currentEvent);
                    }

                    parsedCandidates.push({
                        name: block.name,
                        memo: memoText.trim(),
                        daysData: daysData
                    });
                });

                setDurationSelection(nights, days);
                document.getElementById('candidatesContainer').innerHTML = ''; 
                
                parsedCandidates.forEach(pc => {
                    addCandidate(pc);
                });

                closeImportModal();
                alert("データを復元しました。");

            } catch (e) {
                console.error(e);
                alert("読み込みに失敗しました。フォーマットが崩れていないか確認してください。");
            }
        }
