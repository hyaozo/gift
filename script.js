const STORAGE_KEY = 'gifticon_mobile_ocr_box';

const fileInput = document.getElementById('fileInput');
const addBtn = document.getElementById('addBtn');
const content = document.getElementById('content');
const countChip = document.getElementById('countChip');

const modal = document.getElementById('modal');
const modalImage = document.getElementById('modalImage');
const modalDday = document.getElementById('modalDday');
const modalSubtext = document.getElementById('modalSubtext');
const memoInput = document.getElementById('memoInput');
const expireInput = document.getElementById('expireInput');
const ocrText = document.getElementById('ocrText');
const closeBtn = document.getElementById('closeBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let selectedIndex = null;
let pressTimer = null;
let isLongPress = false;

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizeDateString(y, m, d) {
  const year = y.length === 2 ? `20${y}` : y;
  const month = m.padStart(2, '0');
  const day = d.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractDate(text) {
  if (!text) return '';

  const cleaned = text.replace(/\s+/g, ' ');

  const patterns = [
    /(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})\s*일?/,
    /(\d{2})[.\-/ ](\d{1,2})[.\-/ ](\d{1,2})/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return normalizeDateString(match[1], match[2], match[3]);
    }
  }

  return '';
}

function extractBrand(text) {
  if (!text) return '';

  const brands = [
    '스타벅스',
    '이디야',
    '투썸',
    '투썸플레이스',
    '메가커피',
    '빽다방',
    '컴포즈커피',
    '할리스',
    '엔제리너스',
    '폴바셋',
    '배스킨라빈스',
    '던킨',
    '파리바게뜨',
    '뚜레쥬르',
    '맘스터치',
    '버거킹',
    '맥도날드',
    '롯데리아',
    '서브웨이',
    '교촌치킨',
    '굽네치킨',
    'BHC',
    'bhc'
  ];

  for (const brand of brands) {
    if (text.includes(brand)) {
      return brand;
    }
  }

  return '';
}

function getDday(dateString) {
  if (!dateString) return { text: '날짜 미설정', className: '' };

  const today = new Date();
  const end = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return { text: `만료 ${Math.abs(diff)}일 지남`, className: 'expired' };
  }

  if (diff === 0) {
    return { text: 'D-Day', className: 'soon' };
  }

  if (diff <= 7) {
    return { text: `D-${diff}`, className: 'soon' };
  }

  return { text: `D-${diff}`, className: '' };
}

function formatDate(dateString) {
  return dateString ? `만료일 ${dateString}` : '만료일을 확인하거나 직접 입력해 주세요';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function render() {
  countChip.textContent = `${items.length}개`;

  if (items.length === 0) {
  content.classList.add('is-empty');
  content.innerHTML = `
    <div class="empty">
      <div class="emoji">🎁</div>
      <h2>기프티콘을 추가해보세요</h2>
      <p>아래 + 버튼으로 사진을 올리면<br>보관하고 만료일을 관리할 수 있어요</p>
    </div>
  `;
  return;
}

content.classList.remove('is-empty');

  const sorted = [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (!a.item.expireDate) return 1;
      if (!b.item.expireDate) return -1;
      return new Date(a.item.expireDate) - new Date(b.item.expireDate);
    });

  content.innerHTML = `
    <div class="grid">
      ${sorted.map(({ item, index }) => {
        const dday = getDday(item.expireDate);
        return `
          <div class="card"
     onclick="handleCardClick(${index})"
     onmousedown="startPress(${index})"
     onmouseup="cancelPress()"
     onmouseleave="cancelPress()"
     ontouchstart="startPress(${index})"
     ontouchend="cancelPress()">
            <div class="thumb-wrap">
              <img class="thumb" src="${item.image}" alt="기프티콘 이미지" />
              <div class="ocr-badge">${item.expireDate ? '날짜 인식/입력 완료' : '날짜 확인 필요'}</div>
            </div>
            <div class="card-body">
              <div class="memo">${escapeHtml(item.memo || '메모 없음')}</div>
              <div class="dday-row">
                <div class="dday ${dday.className}">${dday.text}</div>
                <div class="expire-date">${item.expireDate || '날짜 없음'}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openDetail(index) {
  selectedIndex = index;
  const item = items[index];
  const dday = getDday(item.expireDate);

  modalImage.src = item.image;
  modalDday.textContent = dday.text;
  modalDday.className = `big-dday ${dday.className}`;
  modalSubtext.textContent = formatDate(item.expireDate);
  memoInput.value = item.memo || '';
  expireInput.value = item.expireDate || '';
  ocrText.value = item.ocrRawText || '';

  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show');
  selectedIndex = null;
}

function startPress(index) {
  isLongPress = false;

  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    isLongPress = true;

    const ok = confirm('이 기프티콘을 삭제할까요?');
    if (ok) {
      items.splice(index, 1);
      saveItems();
      render();
    }
  }, 700);
}

function cancelPress() {
  clearTimeout(pressTimer);
}

function handleCardClick(index) {
  if (isLongPress) {
    isLongPress = false;
    return;
  }

  openDetail(index);
}

async function runOCR(imageDataUrl) {
  try {
    const result = await Tesseract.recognize(imageDataUrl, 'kor+eng');
    const text = result.data.text || '';
    const foundDate = extractDate(text);

    return {
      text,
      foundDate
    };
  } catch (error) {
    return {
      text: 'OCR 인식 실패',
      foundDate: ''
    };
  }
}

async function addFiles(files) {
  for (const file of files) {
    const imageData = await readFileAsDataURL(file);

    const newItem = {
      image: imageData,
      memo: '',
      expireDate: '',
      ocrRawText: '날짜 인식 중...'
    };

    items.unshift(newItem);
    saveItems();
    render();

    const insertedIndex = 0;
    const ocrResult = await runOCR(imageData);

    items[insertedIndex].ocrRawText = ocrResult.text;

    if (ocrResult.foundDate) {
      items[insertedIndex].expireDate = ocrResult.foundDate;
    }

const brand = extractBrand(ocrResult.text);
if (brand && !items[insertedIndex].memo) {
  items[insertedIndex].memo = brand;
}
    
    saveItems();
    render();
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

addBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  await addFiles(files);
  fileInput.value = '';
});

saveBtn.addEventListener('click', () => {
  if (selectedIndex === null) return;

  items[selectedIndex].memo = memoInput.value.trim();
  items[selectedIndex].expireDate = expireInput.value;

  saveItems();
  render();
  closeModal();
});

deleteBtn.addEventListener('click', () => {
  if (selectedIndex === null) return;

  items.splice(selectedIndex, 1);
  saveItems();
  render();
  closeModal();
});

closeBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

window.openDetail = openDetail;

render();
