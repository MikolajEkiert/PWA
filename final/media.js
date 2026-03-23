let cameraStream = null;
let facingMode = 'environment';

async function startCamera() {
  const container = document.getElementById('cameraContainer');
  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('photoPlaceholder');
  const buttons = document.getElementById('photoButtons');

  stopCamera();

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = cameraStream;
    container.style.display = 'block';
    placeholder.style.display = 'none';
    buttons.style.display = 'none';
  } catch (err) {
    console.error('Camera error:', err);
    if (err.name === 'NotAllowedError') {
      showToast('Brak dostępu do kamery. Sprawdź uprawnienia.', 'error');
    } else {
      showToast('Nie udało się uruchomić kamery. Użyj galerii.', 'error');
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById('cameraVideo');
  video.srcObject = null;
}

function switchCamera() {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
}

function snapPhoto() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  if (facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0);

  compressImage(canvas.toDataURL('image/jpeg', 0.9), 800, 0.7).then(compressed => {
    currentPhoto = compressed;
    const preview = document.getElementById('photoPreview');
    preview.src = currentPhoto;
    preview.style.display = 'block';
    document.getElementById('retakeBtn').style.display = 'block';
    document.getElementById('cameraContainer').style.display = 'none';
    document.getElementById('photoPlaceholder').style.display = 'none';
    document.getElementById('photoButtons').style.display = 'none';
    stopCamera();
    showToast('Zdjęcie zrobione!');
  });
}

function retakePhoto() {
  currentPhoto = null;
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('retakeBtn').style.display = 'none';
  startCamera();
}

document.getElementById('cameraInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    compressImage(ev.target.result, 800, 0.7).then(compressed => {
      currentPhoto = compressed;
      const preview = document.getElementById('photoPreview');
      preview.src = currentPhoto;
      preview.style.display = 'block';
      document.getElementById('retakeBtn').style.display = 'block';
      document.getElementById('photoPlaceholder').style.display = 'none';
      document.getElementById('photoButtons').style.display = 'none';
      showToast('Zdjęcie dodane!');
    });
  };
  reader.readAsDataURL(file);
});

function compressImage(base64, maxWidth, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}

function getLocation() {
  const btn = document.getElementById('getLocationBtn');
  btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Pobieranie lokalizacji...';
  btn.disabled = true;

  if (!navigator.geolocation) {
    showToast('Geolokalizacja nie jest wspierana!', 'error');
    btn.innerHTML = '<i class="bi bi-crosshair"></i> Pobierz lokalizację GPS';
    btn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLat = position.coords.latitude;
      currentLng = position.coords.longitude;

      document.getElementById('coordsText').textContent =
        `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`;
      document.getElementById('locationInfo').style.display = 'block';

      btn.innerHTML = '<i class="bi bi-check-circle"></i> Lokalizacja pobrana!';
      btn.style.borderColor = 'var(--green)';
      btn.style.color = 'var(--green)';

      initMap(currentLat, currentLng);
      showToast('Lokalizacja pobrana!');
    },
    (error) => {
      let msg = 'Nie udało się pobrać lokalizacji.';
      switch(error.code) {
        case 1: msg = 'Odmowa dostępu do lokalizacji.'; break;
        case 2: msg = 'Lokalizacja niedostępna.'; break;
        case 3: msg = 'Przekroczono czas oczekiwania.'; break;
      }
      showToast(msg, 'error');
      btn.innerHTML = '<i class="bi bi-crosshair"></i> Pobierz lokalizację GPS';
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function initMap(lat, lng) {
  const mapEl = document.getElementById('map');
  mapEl.style.display = 'block';

  if (map) {
    map.setView([lat, lng], 15);
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
  } else {
    map = L.map('map').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const greenIcon = L.divIcon({
      html: '<i class="bi bi-geo-alt-fill" style="color:#22c55e;font-size:2rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))"></i>',
      iconSize: [30, 36],
      iconAnchor: [15, 36],
      className: ''
    });

    marker = L.marker([lat, lng], { icon: greenIcon }).addTo(map);
    marker.bindPopup('<b>Miejsce treningu</b>').openPopup();
  }
}
