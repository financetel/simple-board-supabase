const seedNotes = [
  { id: 'sample-1', date: '2026. 10. 07. 14:23:05', text: '테스트 게시글입니다.', photoUrl: 'assets/notebook-sample.jpg' },
  { id: 'sample-2', date: '2026. 10. 06. 11:42:18', text: '사진 첨부 예시입니다.' },
  { id: 'sample-3', date: '2026. 10. 06. 09:15:42', text: '게시글 목록은 최신순으로 표시됩니다.' },
  { id: 'sample-4', date: '2026. 10. 05. 17:08:33', text: '두 번째 줄에 표시되는 글 내용입니다.\n줄바꿈도 적용됩니다.' },
  { id: 'sample-5', date: '2026. 10. 04. 08:51:09', text: '게시글 등록 및 삭제 화면 확인용입니다.' }
];

const list = document.querySelector('#notesList');
const form = document.querySelector('#postForm');
const content = document.querySelector('#content');
const photoInput = document.querySelector('#photoInput');
const preview = document.querySelector('#imagePreview');
const charCount = document.querySelector('#charCount');
const totalLabel = document.querySelector('#totalLabel');
const todayLabel = document.querySelector('#todayDate');
const statusLabel = document.querySelector('#connectionStatus');
const modeInfo = document.querySelector('#modeInfo');
const message = document.querySelector('#appMessage');
const today = new Date();
todayLabel.textContent = formatTimestamp(today);

function formatTimestamp(date) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((values, part) => {
    values[part.type] = part.value;
    return values;
  }, {});
  return `${parts.year}. ${parts.month}. ${parts.day}. ${parts.hour}:${parts.minute}:${parts.second}`;
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const config = window.SUPABASE_CONFIG || {};
const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
const isConfigured = !isPreview && Boolean(config.url && config.publishableKey && window.supabase?.createClient);
const client = isConfigured ? window.supabase.createClient(config.url, config.publishableKey) : null;
const imageBucket = 'post-images';
let notes = isConfigured ? [] : [...seedNotes];
let selectedPhoto = null;
let previewUrl = '';
let submitting = false;

function showMessage(text = '', kind = 'info') {
  message.textContent = text;
  message.dataset.kind = kind;
  message.hidden = !text;
}

function drawNotes() {
  list.innerHTML = notes.map((note, i) => {
    return `
    <article class="note-card" data-index="${String(i + 1).padStart(2, '0')}">
      <div class="note-head">
        <span class="note-date">${escapeHtml(note.date)}</span>
        <button class="delete-button" data-delete="${escapeHtml(note.id)}" aria-label="게시글 삭제">삭제</button>
      </div>
      <div class="note-body">${escapeHtml(note.text)}</div>
      ${note.photoUrl ? `<img class="note-image" src="${escapeHtml(note.photoUrl)}" alt="게시글 첨부 사진" loading="lazy" />` : ''}
    </article>`;
  }).join('');
  totalLabel.textContent = String(notes.length).padStart(2, '0');
}

function clearPhoto() {
  selectedPhoto = null;
  previewUrl = '';
  photoInput.value = '';
  preview.hidden = true;
  preview.replaceChildren();
}

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedTypes.includes(file.type)) {
    showMessage('JPG, PNG, WebP, GIF 파일만 첨부할 수 있습니다.', 'error');
    clearPhoto();
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showMessage('사진은 5 MB 이하만 첨부할 수 있습니다.', 'error');
    clearPhoto();
    return;
  }
  selectedPhoto = file;
  const reader = new FileReader();
  reader.onload = () => {
    previewUrl = reader.result;
    preview.innerHTML = `<img src="${previewUrl}" alt="첨부할 사진 미리보기"><button class="delete-button" type="button">사진 제거</button>`;
    preview.hidden = false;
    preview.querySelector('button').addEventListener('click', clearPhoto);
  };
  reader.readAsDataURL(file);
  showMessage();
});

content.addEventListener('input', () => {
  charCount.textContent = `${content.value.length} / 500`;
});

async function loadRemotePosts() {
  const { data, error } = await client.from('posts')
    .select('id, content, image_path, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  notes = data.map(post => ({
    id: post.id,
    text: post.content,
    date: formatTimestamp(new Date(post.created_at)),
    imagePath: post.image_path,
    photoUrl: post.image_path ? client.storage.from(imageBucket).getPublicUrl(post.image_path).data.publicUrl : ''
  }));
  drawNotes();
}

async function storePhoto(file) {
  if (!file) return '';
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(imageBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = content.value.trim();
  if ((!text && !selectedPhoto) || submitting) {
    if (!text && !selectedPhoto) showMessage('내용이나 사진을 하나 이상 입력해 주세요.', 'error');
    return;
  }
  submitting = true;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  showMessage();
  try {
    if (client) {
      const imagePath = await storePhoto(selectedPhoto);
      const { error } = await client.from('posts').insert({ content: text, image_path: imagePath || null });
      if (error) {
        if (imagePath) await client.storage.from(imageBucket).remove([imagePath]);
        throw error;
      }
      await loadRemotePosts();
    } else {
      notes.unshift({ id: crypto.randomUUID(), date: formatTimestamp(new Date()), text, photoUrl: previewUrl });
      drawNotes();
    }
    form.reset();
    clearPhoto();
    charCount.textContent = '0 / 500';
    showMessage('등록했습니다.');
  } catch (error) {
    showMessage(`등록하지 못했습니다: ${error.message || '연결 오류'}`, 'error');
  } finally {
    submitting = false;
    submitButton.disabled = false;
  }
});

list.addEventListener('click', async event => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  const note = notes.find(item => item.id === button.dataset.delete);
  if (!note) return;
  button.disabled = true;
  showMessage();
  try {
    if (client) {
      const { error } = await client.from('posts').delete().eq('id', note.id);
      if (error) throw error;
      if (note.imagePath) {
        const { error: imageError } = await client.storage.from(imageBucket).remove([note.imagePath]);
        if (imageError) showMessage('글은 삭제했지만 사진 파일 삭제에 실패했습니다.', 'error');
      }
      await loadRemotePosts();
    } else {
      notes = notes.filter(item => item.id !== note.id);
      drawNotes();
    }
    if (!message.dataset.kind || message.dataset.kind !== 'error') showMessage('삭제했습니다.');
  } catch (error) {
    showMessage(`삭제하지 못했습니다: ${error.message || '연결 오류'}`, 'error');
    button.disabled = false;
  }
});

if (client) {
  statusLabel.textContent = 'Supabase 연결 중';
  modeInfo.textContent = '게시글은 Supabase에 저장되며 다른 접속자에게 실시간 반영됩니다.';
  showMessage('게시글을 불러오는 중입니다.');
  loadRemotePosts().then(() => showMessage()).catch(error => {
    showMessage(`게시글을 불러오지 못했습니다: ${error.message || '연결 오류'}`, 'error');
  });
  client.channel('public-posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      loadRemotePosts().catch(error => showMessage(`목록을 갱신하지 못했습니다: ${error.message || '연결 오류'}`, 'error'));
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') statusLabel.textContent = 'Supabase 연결됨';
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        statusLabel.textContent = '실시간 연결 오류';
        showMessage('실시간 연결이 끊겼습니다. 페이지를 새로고침해 주세요.', 'error');
      }
    });
} else {
  statusLabel.textContent = '미리보기 모드';
  modeInfo.textContent = '작성한 글은 현재 브라우저에만 표시됩니다.';
}

drawNotes();
