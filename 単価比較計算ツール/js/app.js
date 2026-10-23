let itemCount = 0;

        // 単位のグループ定義（同じグループ同士で最安値を計算）
        const unitGroups = {
            'g': { type: 'weight', factor: 1, baseLabel: '100g' },
            'kg': { type: 'weight', factor: 1000, baseLabel: '100g' },
            'ml': { type: 'volume', factor: 1, baseLabel: '100ml' },
            'L': { type: 'volume', factor: 1000, baseLabel: '100ml' },
            '個': { type: 'piece', factor: 1, baseLabel: '1個' },
            '枚': { type: 'piece', factor: 1, baseLabel: '1枚' },
            '本': { type: 'piece', factor: 1, baseLabel: '1本' }
        };

        window.onload = () => {
            // デフォルトで2つ表示
            addItem("商品 A");
            addItem("商品 B");
        };

        function addItem(defaultName = "") {
            itemCount++;
            const container = document.getElementById('itemsContainer');
            
            const name = defaultName || `商品 ${document.querySelectorAll('.item-card').length + 1}`;
            
            // 現在選択されている単位を取得（既存の枠がある場合）
            let currentUnit = "g";
            const existingSelect = document.querySelector('.item-unit');
            if (existingSelect) {
                currentUnit = existingSelect.value;
            }
            
            const card = document.createElement('div');
            card.className = 'item-card';
            card.id = `item-${itemCount}`;
            
            // 現在の単位に合わせてselected属性を設定するヘルパー関数
            const sel = (val) => (val === currentUnit) ? "selected" : "";
            
            card.innerHTML = `
                <div class="input-group" style="flex-grow: 1;">
                    <input type="text" class="item-name" value="${name}" placeholder="商品名">
                </div>
                <div class="input-group">
                    <label>価格:</label>
                    <input type="number" class="item-price" min="0" placeholder="0" oninput="calculate()">
                    <span>円</span>
                </div>
                <div class="input-group">
                    <label>内容量:</label>
                    <input type="number" class="item-qty" min="0" placeholder="0" oninput="calculate()">
                    <select class="item-unit" onchange="syncUnits(this)">
                        <option value="g" ${sel("g")}>g</option>
                        <option value="kg" ${sel("kg")}>kg</option>
                        <option value="ml" ${sel("ml")}>ml</option>
                        <option value="L" ${sel("L")}>L</option>
                        <option value="個" ${sel("個")}>個</option>
                        <option value="枚" ${sel("枚")}>枚</option>
                        <option value="本" ${sel("本")}>本</option>
                    </select>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <span class="cheapest-badge">🔥 最安値</span>
                    <div class="result-display">
                        <span class="unit-price-text">--- 円</span>
                    </div>
                </div>
                <div class="remove-wrapper">
                    <button class="btn-remove" onclick="removeItem(this)">削除</button>
                </div>
            `;
            
            container.appendChild(card);
            calculate();
        }

        function removeItem(btn) {
            const container = document.getElementById('itemsContainer');
            if (container.querySelectorAll('.item-card').length <= 1) {
                alert("比較するため、最低1つは残してください。");
                return;
            }
            btn.closest('.item-card').remove();
            calculate();
        }

        // 単位をすべて連動させる処理
        function syncUnits(changedSelect) {
            const newValue = changedSelect.value;
            const allSelects = document.querySelectorAll('.item-unit');
            
            allSelects.forEach(select => {
                select.value = newValue;
            });
            
            // 単位が変わったので再計算
            calculate();
        }

        function calculate() {
            const cards = document.querySelectorAll('.item-card');
            
            // リセット
            cards.forEach(card => {
                card.classList.remove('is-cheapest');
                card.querySelector('.unit-price-text').textContent = "--- 円";
                card.dataset.normalizedPrice = "";
                card.dataset.groupType = "";
            });

            const groupedData = {};

            // 1. 各項目の単価を計算してグループ化
            cards.forEach(card => {
                const price = parseFloat(card.querySelector('.item-price').value);
                const qty = parseFloat(card.querySelector('.item-qty').value);
                const unit = card.querySelector('.item-unit').value;
                
                if (price > 0 && qty > 0) {
                    const groupDef = unitGroups[unit];
                    const type = groupDef.type;
                    
                    // 基準単位への換算（例: kg -> g）
                    const normalizedQty = qty * groupDef.factor;
                    // 1基本単位あたりの価格（例: 1gあたりの価格）
                    const pricePerBase = price / normalizedQty;
                    
                    // 表示用（100g, 100ml, 1個あたりなどに調整）
                    let displayMultiplier = 1;
                    if (type === 'weight' || type === 'volume') {
                        displayMultiplier = 100; // 100g or 100ml
                    }
                    
                    const displayPrice = (pricePerBase * displayMultiplier).toFixed(2);
                    
                    // 末尾の不要な.00を消す
                    const formattedPrice = Number(displayPrice).toString();
                    
                    card.querySelector('.unit-price-text').textContent = `${groupDef.baseLabel}: ${formattedPrice} 円`;
                    card.dataset.normalizedPrice = pricePerBase;
                    card.dataset.groupType = type;
                    
                    if (!groupedData[type]) {
                        groupedData[type] = [];
                    }
                    groupedData[type].push({
                        card: card,
                        price: pricePerBase
                    });
                }
            });

            // 2. 各グループ（重さ、体積、個数）ごとに最安値を判定
            for (const type in groupedData) {
                const items = groupedData[type];
                if (items.length > 1) { // 比較対象が2つ以上ある場合のみ最安値をハイライト
                    const minPrice = Math.min(...items.map(item => item.price));
                    items.forEach(item => {
                        // 最小値とほぼ一致する場合（浮動小数点の誤差を考慮）
                        if (Math.abs(item.price - minPrice) < 0.0001) {
                            item.card.classList.add('is-cheapest');
                        }
                    });
                }
            }
        }
