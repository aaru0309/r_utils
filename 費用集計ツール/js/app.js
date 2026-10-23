const container = document.getElementById('input-container');

  // 入力行を生成する関数
  function createRow() {
    const row = document.createElement('div');
    row.className = 'input-row';
    
    row.innerHTML = `
      <input type="text" class="title" placeholder="タイトル">
      <input type="number" class="amount" placeholder="支払金額" min="0">
      <select class="category">
        <option value="食費">食費</option>
        <option value="交通費">交通費</option>
        <option value="雑費">雑費</option>
      </select>
      <select class="payment-method">
        <option value="自分">自分</option>
        <option value="複数">複数</option>
      </select>
      <input type="number" class="people-count" placeholder="人数" style="visibility:hidden;" min="2">
    `;

    const methodSelect = row.querySelector('.payment-method');
    const peopleInput = row.querySelector('.people-count');
    methodSelect.addEventListener('change', (e) => {
      if (e.target.value === '複数') {
        peopleInput.style.visibility = 'visible';
      } else {
        peopleInput.style.visibility = 'hidden';
        peopleInput.value = ''; 
      }
    });

    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('input', handleInput);
    });

    return row;
  }

  function handleInput(e) {
    const currentRow = e.target.closest('.input-row');
    const rows = document.querySelectorAll('.input-row');
    if (currentRow === rows[rows.length - 1] && e.target.value !== '') {
      container.appendChild(createRow());
    }
  }

  // 初期化
  container.appendChild(createRow());

  // ★ 集計ボタンの処理 ★
  document.getElementById('calc-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('.input-row');
    let totalAmount = 0;
    
    // 復元用データを保存する配列
    const rawInputsData = [];
    
    const breakdownData = {
      '食費': { total: 0, items: [] },
      '交通費': { total: 0, items: [] },
      '雑費': { total: 0, items: [] }
    };

    rows.forEach((row) => {
      const amountVal = row.querySelector('.amount').value;
      if (!amountVal) return; // 未入力行はスキップ

      const titleVal = row.querySelector('.title').value;
      const categoryVal = row.querySelector('.category').value;
      const methodVal = row.querySelector('.payment-method').value;
      const peopleVal = row.querySelector('.people-count').value;

      // 復元用データとして入力内容をそのまま記録
      rawInputsData.push({
        title: titleVal,
        amount: amountVal,
        category: categoryVal,
        method: methodVal,
        people: peopleVal
      });

      let amount = parseInt(amountVal, 10);
      const title = titleVal.trim();

      if (methodVal === '複数' && peopleVal) {
        const people = parseInt(peopleVal, 10);
        if (people > 0) {
          amount = Math.ceil(amount / people);
        }
      }

      totalAmount += amount;
      
      if (breakdownData[categoryVal]) {
        breakdownData[categoryVal].total += amount;
        breakdownData[categoryVal].items.push({ title: title, amount: amount });
      }
    });

    if (totalAmount === 0) {
      alert("金額が入力されていません。");
      return;
    }

    let resultText = `【合計金額】
${totalAmount.toLocaleString()}円

【内訳】
`;
    for (const [categoryName, data] of Object.entries(breakdownData)) {
      if (data.items.length > 0) {
        resultText += `${categoryName}：${data.total.toLocaleString()}円
`;
        data.items.forEach((item, index) => {
          const displayTitle = item.title !== '' ? item.title : `項目${index + 1}`;
          resultText += `- ${displayTitle}：${item.amount.toLocaleString()}円
`;
        });
      }
    }

    // ★ 復元用データをBase64エンコード ★
    const encodedData = btoa(encodeURIComponent(JSON.stringify(rawInputsData)));
    const copyText = resultText.trim() + `

[復元用データ: ${encodedData}]`;

    // 表示用テキスト（画面上は隠しデータを見せない）
    const resultArea = document.getElementById('result-area');
    resultArea.textContent = resultText.trim();
    // コピー用の完全なテキストを属性に保存
    resultArea.dataset.copyText = copyText; 
    
    document.getElementById('result-container').style.display = 'block';
  });

  // ★ コピーボタンの処理 ★
  document.getElementById('copy-button').addEventListener('click', () => {
    // 隠しデータを含んだテキストをコピー
    const textToCopy = document.getElementById('result-area').dataset.copyText;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('集計結果（復元データ込み）をクリップボードにコピーしました！');
    }).catch(err => {
      alert('コピーに失敗しました。');
    });
  });

  // ★ 復元ボタンの処理 ★
  document.getElementById('import-button').addEventListener('click', () => {
    const text = document.getElementById('import-text').value;
    const match = text.match(/\[復元用データ: (.*)\]/);
    
    if (!match) {
      alert('入力されたテキストから復元用データが見つかりませんでした。正しいテキストを貼り付けてください。');
      return;
    }
    
    try {
      // データのデコード
      const rawInputsData = JSON.parse(decodeURIComponent(atob(match[1])));
      
      // 現在の入力行をすべてリセット
      container.innerHTML = '';
      
      // データに基づいて行を再生成
      rawInputsData.forEach(data => {
        const row = createRow();
        row.querySelector('.title').value = data.title;
        row.querySelector('.amount').value = data.amount;
        row.querySelector('.category').value = data.category;
        
        const methodSelect = row.querySelector('.payment-method');
        methodSelect.value = data.method;
        
        const peopleInput = row.querySelector('.people-count');
        if (data.method === '複数') {
          peopleInput.style.visibility = 'visible';
          peopleInput.value = data.people;
        } else {
          peopleInput.style.visibility = 'hidden';
        }
        
        container.appendChild(row);
      });
      
      // 最後に空の行を追加
      container.appendChild(createRow());
      
      alert('データを復元しました！');
      document.getElementById('import-text').value = ''; // 入力欄をクリア
      document.querySelector('.import-section').removeAttribute('open'); // 折りたたむ
      
    } catch(e) {
      alert('データの復元に失敗しました。テキストが破損している可能性があります。');
    }
  });
