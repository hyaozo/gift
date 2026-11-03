const STORAGE_KEY = 'gifticon_mobile_ocr_box';

const fileInput = document.getElementById('fileInput');
const addBtn = document.getElementById('addBtn');
const content = document.getElementById('content');
const countChip = document.getElementById('countChip');

const modal = document.getElementById('modal');
const modalImage = document.getElementById('modalImage');
const modalDday = document.getElementById('modalDday');
const modalSubtext = document.getElementById('modalSubtext');
const brandInput = document.getElementById('brandInput');
const memoInput = document.getElementById('memoInput');
const expireInput = document.getElementById('expireInput');
const ocrText = document.getElementById('ocrText');
const closeBtn = document.getElementById('closeBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const usedBtn = document.getElementById('usedBtn');

const filterAll = document.getElementById('filterAll');
const filterSoon = document.getElementById('filterSoon');
const filterExpired = document.getElementById('filterExpired');
const filterUsed = document.getElementById('filterUsed');

let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let selectedIndex = null;
let pressTimer = null;
let isLongPress = false;
let currentFilter = 'all';

const BRAND_SUGGESTIONS = [
  '스타벅스',
  '메가MGC커피',
  '이디야',
  '투썸플레이스',
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
  'BHC'
];

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

function normalizeKoreanForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^가-힣a-z0-9]/g, '');
}

function extractBrand(text) {
  if (!text) return '';

  const normalizedText = normalizeKoreanForMatch(text);

  const brandRules = [
    {
      patterns: [
        '메가mgc커피',
        '메가mgc',
        'megamgc',
        'megamgccoffee',
        '메가커피',
        '메가'
      ],
      brand: '메가MGC커피'
    },
    {
      patterns: ['스타벅스'],
      brand: '스타벅스'
    },
    {
      patterns: ['이디야'],
      brand: '이디야'
    },
    {
      patterns: ['투썸플레이스', '투썸'],
      brand: '투썸플레이스'
    },
    {
      patterns: ['빽다방'],
      brand: '빽다방'
    },
    {
      patterns: ['컴포즈커피', '컴포즈'],
      brand: '컴포즈커피'
    },
    {
      patterns: ['할리스'],
      brand: '할리스'
    },
    {
      patterns: ['엔제리너스'],
      brand: '엔제리너스'
    },
    {
      patterns: ['폴바셋'],
      brand: '폴바셋'
    },
    {
      patterns: ['배스킨라빈스'],
      brand: '배스킨라빈스'
    },
    {
      patterns: ['던킨'],
      brand: '던킨'
    },
    {
      patterns: ['파리바게뜨'],
      brand: '파리바게뜨'
    },
    {
      patterns: ['뚜레쥬르'],
      brand: '뚜레쥬르'
    },
    {
      patterns: ['맘스터치'],
      brand: '맘스터치'
    },
    {
      patterns: ['버거킹'],
      brand: '버거킹'
    },
    {
      patterns: ['맥도날드'],
      brand: '맥도날드'
    },
    {
      patterns: ['롯데리아'],
      brand: '롯데리아'
    },
    {
      patterns: ['서브웨이', 'subway'],
      brand: '서브웨이'
    },
    {
      patterns: ['교촌치킨', '교촌'],
      brand: '교촌치킨'
    },
    {
      patterns: ['굽네치킨', '굽네'],
      brand: '굽네치킨'
    },
    {
      patterns: ['bhc'],
      brand: 'BHC'
    }
  ];

  for (const rule of brandRules) {
    const matched = rule.patterns.some(pattern => normalizedText.includes(pattern));
    if (matched) {
      return rule.brand;
    }
  }

  return '';
}

function migrateItems() {
  let changed = false;

  items = items.map(item => {
    const nextItem = {
      brand: '',
      memo: '',
      expireDate: '',
      ocrRawText: '',
      used: false,
      ...item
    };

    if (typeof nextItem.used !== 'boolean') {
      nextItem.used = false;
      changed = true;
    }

    if (!nextItem.brand) {
      const detectedBrand = extractBrand(nextItem.memo || nextItem.ocrRawText || '');

      if (detectedBrand) {
        nextItem.brand = detectedBrand;

        if ((nextItem.memo || '').trim() === detectedBrand) {
          nextItem.memo = '';
        }

        changed = true;
      }
    }

    return nextItem;
  });

  if (changed) {
    saveItems();
  }
}

function getDday(dateString, used = false) {
  if (used) return { text: '사용완료', className: 'used' };
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

function formatDate(dateString, used = false) {
  if (used) return '이미 사용한 기프티콘입니다';
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

function updateFilterButtons() {
  filterAll.classList.toggle('active', currentFilter === 'all');
  filterSoon.classList.toggle('active', currentFilter === 'soon');
  filterExpired.classList.toggle('active', currentFilter === 'expired');
  filterUsed.classList.toggle('active', currentFilter === 'used');
}

function render() {
  const visibleAllCount = items.filter(item => !item.used).length;
  const visibleUsedCount = items.filter(item => item.used).length;

  if (currentFilter === 'used') {
    countChip.textContent = `${visibleUsedCount}개`;
  } else {
    countChip.textContent = `${visibleAllCount}개`;
  }

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

  const filtered = [...items]
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const dday = getDday(item.expireDate, item.used);

      if (currentFilter === 'soon') {
        return !item.used && dday.className === 'soon';
      }

      if (currentFilter === 'expired') {
        return !item.used && dday.className === 'expired';
      }

      if (currentFilter === 'used') {
        return item.used;
      }

      return !item.used;
    });

  if (filtered.length === 0) {
    content.classList.add('is-empty');
    content.innerHTML = `
      <div class="empty">
        <div class="emoji">🗂️</div>
        <h2>표시할 기프티콘이 없어요</h2>
        <p>${
          currentFilter === 'soon'
            ? '임박한 기프티콘이 없습니다'
            : currentFilter === 'expired'
            ? '만료된 기프티콘이 없습니다'
            : currentFilter === 'used'
            ? '사용완료한 기프티콘이 없습니다'
            : '기프티콘을 추가해보세요'
        }</p>
      </div>
    `;
    return;
  }

  content.classList.remove('is-empty');

  const sorted = filtered.sort((a, b) => {
    if (a.item.used && !b.item.used) return 1;
    if (!a.item.used && b.item.used) return -1;
    if (!a.item.expireDate) return 1;
    if (!b.item.expireDate) return -1;
    return new Date(a.item.expireDate) - new Date(b.item.expireDate);
  });

  content.innerHTML = `
    <div class="grid">
      ${sorted.map(({ item, index }) => {
        const dday = getDday(item.expireDate, item.used);
        return `
          <div class="card ${item.used ? 'is-used' : ''}"
               onclick="handleCardClick(${index})"
               onmousedown="startPress(${index})"
               onmouseup="cancelPress()"
               onmouseleave="cancelPress()"
               ontouchstart="startPress(${index})"
               ontouchend="cancelPress()"
               ontouchcancel="cancelPress()">
            <div class="thumb-wrap">
              <img class="thumb" src="${item.image}" alt="기프티콘 이미지" />
              <div class="card-badge ${dday.className}">${dday.text}</div>
            </div>
            <div class="card-body">
              <div class="card-brand">${escapeHtml(item.brand || '브랜드 미인식')}</div>
              <div class="card-memo">${escapeHtml(item.memo || '메모 없음')}</div>
              <div class="card-date">${escapeHtml(item.expireDate || '날짜 없음')}</div>
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
  const dday = getDday(item.expireDate, item.used);

  modalImage.src = item.image;
  modalDday.textContent = dday.text;
  modalDday.className = `big-dday ${dday.className}`;
  modalSubtext.textContent = formatDate(item.expireDate, item.used);
  brandInput.value = item.brand || '';
  memoInput.value = item.memo || '';
  expireInput.value = item.expireDate || '';
  ocrText.value = item.ocrRawText || '';
  usedBtn.textContent = item.used ? '사용취소' : '사용완료';

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
  }, 800);
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
    const foundBrand = extractBrand(text);

    return {
      text,
      foundDate,
      foundBrand
    };
  } catch (error) {
    return {
      text: 'OCR 인식 실패',
      foundDate: '',
      foundBrand: ''
    };
  }
}

async function addFiles(files) {
  for (const file of files) {
    const imageData = await readFileAsDataURL(file);

    const newItem = {
      id: Date.now() + Math.random(),
      image: imageData,
      brand: '',
      memo: '',
      expireDate: '',
      ocrRawText: '날짜 인식 중...',
      used: false
    };

    items.unshift(newItem);
    saveItems();
    render();

    const currentId = newItem.id;
    const ocrResult = await runOCR(imageData);
    const targetIndex = items.findIndex(item => item.id === currentId);

    if (targetIndex === -1) continue;

    items[targetIndex].ocrRawText = ocrResult.text;

    if (ocrResult.foundDate) {
      items[targetIndex].expireDate = ocrResult.foundDate;
    }

    if (ocrResult.foundBrand) {
      items[targetIndex].brand = ocrResult.foundBrand;
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

brandInput.addEventListener('blur', () => {
  const current = brandInput.value.trim();
  if (!current) return;

  const detected = extractBrand(current);
  if (detected) {
    brandInput.value = detected;
  } else {
    const exact = BRAND_SUGGESTIONS.find(brand => brand.toLowerCase() === current.toLowerCase());
    if (exact) {
      brandInput.value = exact;
    }
  }
});

saveBtn.addEventListener('click', () => {
  if (selectedIndex === null) return;

  const normalizedBrand = extractBrand(brandInput.value.trim()) || brandInput.value.trim();

  items[selectedIndex].brand = normalizedBrand;
  items[selectedIndex].memo = memoInput.value.trim();
  items[selectedIndex].expireDate = expireInput.value;

  saveItems();
  render();
  closeModal();
});

usedBtn.addEventListener('click', () => {
  if (selectedIndex === null) return;

  const willUse = !items[selectedIndex].used;
  const ok = confirm(willUse ? '이 기프티콘을 사용완료 처리할까요?' : '사용완료를 취소할까요?');
  if (!ok) return;

  items[selectedIndex].used = willUse;

  saveItems();
  render();
  openDetail(selectedIndex);
});

deleteBtn.addEventListener('click', () => {
  if (selectedIndex === null) return;

  const ok = confirm('이 기프티콘을 삭제할까요?');
  if (!ok) return;

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

filterAll.addEventListener('click', () => {
  currentFilter = 'all';
  updateFilterButtons();
  render();
});

filterSoon.addEventListener('click', () => {
  currentFilter = 'soon';
  updateFilterButtons();
  render();
});

filterExpired.addEventListener('click', () => {
  currentFilter = 'expired';
  updateFilterButtons();
  render();
});

filterUsed.addEventListener('click', () => {
  currentFilter = 'used';
  updateFilterButtons();
  render();
});

window.openDetail = openDetail;
window.handleCardClick = handleCardClick;
window.startPress = startPress;
window.cancelPress = cancelPress;

updateFilterButtons();
migrateItems();
render();
