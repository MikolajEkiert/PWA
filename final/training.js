function saveTraining() {
  if (!currentPhoto) { showToast('Zrób zdjęcie z treningu!', 'error'); return; }
  if (!selectedType) { showToast('Wybierz rodzaj treningu!', 'error'); return; }
  if (!currentLat || !currentLng) { showToast('Pobierz lokalizację GPS!', 'error'); return; }

  const training = {
    id: Date.now(),
    photo: currentPhoto,
    type: selectedType,
    lat: currentLat,
    lng: currentLng,
    notes: document.getElementById('trainingNotes').value,
    date: new Date().toISOString()
  };

  const trainings = getTrainings();
  trainings.unshift(training);

  try {
    localStorage.setItem('trainings', JSON.stringify(trainings));
  } catch (e) {
    if (trainings.length > 10) {
      trainings.splice(10);
      localStorage.setItem('trainings', JSON.stringify(trainings));
    }
  }

  resetForm();
  showToast('Trening zapisany!');
}

function getTrainings() {
  try {
    return JSON.parse(localStorage.getItem('trainings')) || [];
  } catch { return []; }
}

function resetForm() {
  currentPhoto = null;
  currentLat = null;
  currentLng = null;
  selectedType = null;

  stopCamera();
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('retakeBtn').style.display = 'none';
  document.getElementById('cameraContainer').style.display = 'none';
  document.getElementById('photoPlaceholder').style.display = 'flex';
  document.getElementById('photoButtons').style.display = 'flex';
  document.getElementById('cameraInput').value = '';
  document.querySelectorAll('.training-type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('trainingNotes').value = '';
  document.getElementById('locationInfo').style.display = 'none';
  document.getElementById('map').style.display = 'none';

  const btn = document.getElementById('getLocationBtn');
  btn.innerHTML = '<i class="bi bi-crosshair"></i> Pobierz lokalizację GPS';
  btn.disabled = false;
  btn.style.borderColor = '';
  btn.style.color = '';

  if (map) { map.remove(); map = null; marker = null; }
}

const typeLabels = {
  bieganie: 'Bieganie',
  rower: 'Rower',
  silownia: 'Siłownia',
  kalistenika: 'Kalistenika',
  spacer: 'Spacer',
  inne: 'Inne'
};

function renderHistory() {
  const container = document.getElementById('historyList');
  const trainings = getTrainings();

  if (trainings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-journal-x"></i>
        <p>Brak zapisanych treningów.<br>Dodaj pierwszy trening!</p>
      </div>`;
    return;
  }
  container.innerHTML = trainings.map(t => {
    const date = new Date(t.date);
    const dateStr = date.toLocaleDateString('pl-PL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const mapLink = `https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=15/${t.lat}/${t.lng}`;

    return `
      <div class="history-card">
        <img src="${t.photo}" alt="Trening" onclick="showFullPhoto('${t.photo.replace(/'/g, "\\'")}')">
        <div class="info">
          <h4>${typeLabels[t.type] || t.type}</h4>
          <p>${dateStr}</p>
          <p><a href="${mapLink}" target="_blank" style="color:var(--green);text-decoration:none">
            <i class="bi bi-geo-alt"></i> ${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}</a></p>
          ${t.notes ? `<p>${escapeHtml(t.notes.substring(0, 60))}${t.notes.length > 60 ? '...' : ''}</p>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <button class="share-btn" onclick="shareTraining(${t.id})" title="Udostępnij">
            <i class="bi bi-share"></i>
          </button>
          <button class="share-btn" onclick="deleteTraining(${t.id})" title="Usuń" style="color:#ef4444">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function shareTraining(id) {
  const training = getTrainings().find(t => t.id === id);
  if (!training) return;

  const date = new Date(training.date).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const mapUrl = `https://www.openstreetmap.org/?mlat=${training.lat}&mlon=${training.lng}#map=15/${training.lat}/${training.lng}`;

  const shareTitle = `${typeLabels[training.type] || training.type} - ${date}`;
  const shareText = `${typeLabels[training.type] || training.type}\n📅 ${date}\n📍 Lokalizacja: ${training.lat.toFixed(4)}, ${training.lng.toFixed(4)}\n🗺️ Mapa: ${mapUrl}${training.notes ? '\n📝 ' + training.notes : ''}`;

  if (navigator.canShare) {
    try {
      const blob = await fetch(training.photo).then(r => r.blob());
      const file = new File([blob], `trening-${training.id}.jpg`, { type: 'image/jpeg' });

      const shareData = {
        title: shareTitle,
        text: shareText,
        files: [file]
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('Udostępniono!');
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.log('File share failed, trying text-only:', err);
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: mapUrl
      });
      showToast('Udostępniono!');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    showToast('Skopiowano do schowka!');
  } catch {
    prompt('Skopiuj tekst:', shareText);
  }
}

function showFullPhoto(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.9);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;padding:20px;
  `;
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:100%;max-height:90vh;border-radius:12px;';
  overlay.appendChild(img);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

function deleteTraining(id) {
  if (!confirm('Usunąć ten trening?')) return;
  const trainings = getTrainings().filter(t => t.id !== id);
  localStorage.setItem('trainings', JSON.stringify(trainings));
  renderHistory();
  showToast('Trening usunięty');
}
