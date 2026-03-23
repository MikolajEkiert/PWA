let currentPhoto = null;
let currentLat = null;
let currentLng = null;
let selectedType = null;
let map = null;
let marker = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBanner').style.display = 'flex';
});

document.getElementById('installBtn')?.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        document.getElementById('installBanner').style.display = 'none';
      }
      deferredPrompt = null;
    });
  }
});

document.getElementById('closeBanner')?.addEventListener('click', () => {
  document.getElementById('installBanner').style.display = 'none';
});

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const viewId = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'viewHistory') renderHistory();
  });
});

document.querySelectorAll('.training-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.training-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
  });
});

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = message;
  toast.style.cssText = `
    position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:${type === 'error' ? '#ef4444' : 'var(--green)'};
    color:${type === 'error' ? '#fff' : 'var(--dark)'};
    padding:12px 24px;border-radius:12px;font-weight:600;font-size:0.9rem;
    z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.3);
    animation:toastIn 0.3s ease, toastOut 0.3s ease 2.5s forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.getElementById('map').style.display = 'none';
