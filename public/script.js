// Inicjalizacja mapy
const map = L.map('map').setView([54.51086917328015, 18.506788268877372], 11); // Współrzędne początkowe

// Dodanie warstwy z OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    minZoom: 6
}).addTo(map);

// Warstwa do rysowania tras
const routeLayer = L.layerGroup().addTo(map);

// Ikony dla markerów
function makeDivIcon(imgUrl, size = 35) {
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background:#fff;
        width:${size}px;
        height:${size}px;
        border-radius:25%;
        display:flex;
        justify-content:center;
        align-items:center;">
        <img src="${imgUrl}"
             style="width:${size - 5}px; height:${size - 5}px; object-fit:contain;" />
      </div>`
  });
}

// mapowanie nazwa -> URL logo
const fuelLogos = {
  orlen : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOYwBMkqpW77rZwpZQoqd_dz3HgwzeEqJ5eQ&s',
  shell : 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Shell_logo.svg/1024px-Shell_logo.svg.png',
  bp    : 'https://www.bp.com/apps/settings/wcm/designs/refresh/bp/images/navigation/bp-logo.svg',
  moya  : 'https://instreamgroup.com/wp-content/uploads/2020/10/moya-duze.png',
  mol   : 'https://molpolska.pl/img/logo-mol-colorful.88751645.svg',
  amic  : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJob7yZyCsmByf8rWXDKS2kNBM7C7MdTmNXg&s',
  circleK: 'https://e7.pngegg.com/pngimages/157/520/png-clipart-circle-k-retail-convenience-shop-business-franchising-business-text-rectangle-thumbnail.png',
  podZaglami: 'https://storage.googleapis.com/rc-data-search-imgs-e3f2bfb0d31a3004/img-hash-v1-bc9193c6cc399267.jpg'
};

// generowanie ikon w jednym kroku
const icons = Object.fromEntries(
  Object.entries(fuelLogos).map(([key, url]) => [key + 'Icon', makeDivIcon(url)])
);

const startIcon = L.icon({
  iconUrl: 'icons/you.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const endIcon = L.icon({
  iconUrl: 'icons/end.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32]  
});

// Punkty trasy
let startPoint = null;
let endPoint = null;

// Funkcja obsługująca kliknięcia na mapie
function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    if (activeAction === 'start') {
        if (startPoint) {
            map.removeLayer(startPoint);
        }
        startPoint = L.marker([lat, lng], { icon: startIcon, draggable: false }).addTo(map)
        activeAction = null;
        updateButtonsState();
    } else if (activeAction === 'end') {
        if (endPoint) {
            map.removeLayer(endPoint);
        }
        endPoint = L.marker([lat, lng], { icon: endIcon, draggable: false }).addTo(map)
        activeAction = null;
        updateButtonsState();
    }
}

function decodePolyline(encoded) {
    let points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let shift = 0, result = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1F) << shift;
            shift += 5;
        } while (byte >= 0x20);
        let deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += deltaLat;

        shift = 0, result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1F) << shift;
            shift += 5;
        } while (byte >= 0x20);
        let deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += deltaLng;

        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
}

async function calculateRoute() {

    const startCoords = startPoint.getLatLng();
    const endCoords = endPoint.getLatLng();
    const proxyUrl = `http://localhost:3001/directions?origin=${startCoords.lat},${startCoords.lng}&destination=${endCoords.lat},${endCoords.lng}`;

    try {
        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (data.status !== "OK") {
            alert("Błąd podczas pobierania trasy: " + data.status);
            return;
        }

        // Pobranie współrzędnych trasy
        const routeCoords = data.routes[0].legs[0].steps.flatMap(step => {
            return step.polyline ? decodePolyline(step.polyline.points) : [];
        });

        // Czyścimy starą trasę i dodajemy nową
        routeLayer.clearLayers();
        L.polyline(routeCoords, { color: 'blue' }).addTo(routeLayer);

        updateButtonsState();

    } catch (error) {
        console.error("Błąd:", error);
        alert("Błąd podczas pobierania trasy!");
    }
}

// Usuwanie trasy
function clearRoute() {

    routeLayer.clearLayers();

    if (startPoint) {
        map.removeLayer(startPoint);
        startPoint = null;
    }
    if (endPoint) {
        map.removeLayer(endPoint);
        endPoint = null;
    }
    activeAction = null;
    updateButtonsState();
}

// Obsługa przycisków
let activeAction = null;

const setStartBtn = document.getElementById('setStart');
const setEndBtn = document.getElementById('setEnd');

document.getElementById('setStart').addEventListener('click', () => {
    activeAction = 'start';
    setStartBtn.classList.add('active-action');
    setEndBtn.classList.remove('active-action');
});

document.getElementById('setEnd').addEventListener('click', () => {
    activeAction = 'end';
    setEndBtn.classList.add('active-action');
    setStartBtn.classList.remove('active-action');
});

document.getElementById('calculateRoute').addEventListener('click', () => {
    calculateRoute();
    document.getElementById('setStart').classList.remove('active-action');
    document.getElementById('setEnd').classList.remove('active-action');
    
    if (startPoint && endPoint) {
        const group = L.featureGroup([startPoint, endPoint]);
        map.fitBounds(group.getBounds().pad(0.2)); // margines
    }
});

document.getElementById('clearRoute').addEventListener('click', () => {
    clearRoute();
    stationLayer.eachLayer(marker => {
        map.addLayer(marker);
    });
    map.setView([54.51086917328015, 18.506788268877372], 11);   // pozycja poczatkowa
});

function updateButtonsState() {
    const calculateRouteBtn = document.getElementById('calculateRoute');
    const clearRouteBtn = document.getElementById('clearRoute');
    const setStartBtn = document.getElementById('setStart');
    const setEndBtn = document.getElementById('setEnd');

    // Przyciski calculateRoute aktywny tylko jeśli są oba punkty
    calculateRouteBtn.disabled = !(startPoint && endPoint);

    // Przyciski clearRoute aktywny tylko jeśli istnieje trasa na mapie
    clearRouteBtn.disabled = routeLayer.getLayers().length === 0;

    // Kontrola klas active-action na setStart i setEnd
    if (activeAction === 'start') {
        setStartBtn.classList.add('active-action');
        setEndBtn.classList.remove('active-action');
    } else if (activeAction === 'end') {
        setStartBtn.classList.remove('active-action');
        setEndBtn.classList.add('active-action');
    } else {
        setStartBtn.classList.remove('active-action');
        setEndBtn.classList.remove('active-action');
    }
}

// Dodanie obsługi kliknięć na mapie
map.on('click', handleMapClick);

// Definicja funkcji checkLoginStatus
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = payload.username;
        const isAdmin = payload.isAdmin;
        showUserPanel(username, isAdmin);

        if (isAdmin) {
            document.getElementById('adminControls').style.display = 'block'; // Pokaż przyciski admina
        } else {
            document.getElementById('adminControls').style.display = 'none';
        }
    } else {
        hideUserPanel();
    }
}

async function loadStations() {
    console.log("Ładowanie stacji...");
    stationLayer.clearLayers();

    try {
        const response = await fetch('/markers');
        if (!response.ok) throw new Error('Błąd podczas ładowania stacji');

        const stations = await response.json();
        console.log("Pobrane stacje:", stations);

        stations.forEach(station => {
            const availableFuels = Object.keys(station)
                .filter(key => station[key] === true)
                .map(fuel => fuel.toString());

            const icon = getStationIcon(station.name);
            const popupHtml = `
                <strong>${station.name}</strong><br>
                ul. ${station.address}<br>
            `;

            const marker = L.marker([station.lat, station.lng], { icon })
                .addTo(stationLayer)
                .bindPopup(popupHtml);
                marker.stationData = station;

            marker.on('click', (e) => {
                if (activeAction === 'end') {
                    if (endPoint) {
                        map.removeLayer(endPoint);
                    }
                    const { lat, lng } = e.latlng;
                    endPoint = L.marker([lat, lng], { icon: endIcon, draggable: true }).addTo(map)
                    activeAction = null;
                    updateButtonsState();
                }
            });

            marker.on('popupopen', async () => {
                document.getElementById("sidePanel").classList.remove("hidden");
                map.setView([station.lat, station.lng], 16);

                document.getElementById("ratingSection").innerHTML = `
                    <h3>${station.name}</h3>
                    <p><strong>ul. ${station.address}</strong></p>
                    <b>Godziny otwarcia:</b><br> ${station.open} - ${station.close}<br>
                    <b>Dostępne paliwa/usługi:</b><br> ${availableFuels.join(", ") || "Brak paliw"}<br>
                    <div class="rating-container" id="rating-container-${station._id}">
                        <div><strong>Ocena użytkowników:</strong> <span id="avg-${station._id}">–</span></div>
                        <div><strong>Ilość ocen:</strong> <span id="count-${station._id}">–</span></div>
                        <select id="select-${station._id}">
                            <option value="">Twoja ocena</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                        <button id="btn-${station._id}">Oceń</button>

                    </div>
                `;

                document.getElementById("opinionSection").innerHTML = `
                    <div id="opinion-list-${station._id}" class="opinion-list">Ładowanie opinii...</div>
                    <textarea id="opinion-input-${station._id}" maxlength="60" placeholder="Dodaj opinię (max 60 znaków)"></textarea>
                    <button id="opinion-btn-${station._id}">Wyślij</button>
                    <br><button id="navigate-${station._id}" class="navigate-btn">Prowadź</button>
                `;
                
                const token = localStorage.getItem('token');
                const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
                const currentUserId = payload?.id;
                const isAdmin = payload?.isAdmin;

                try {
                    const res = await fetch(`/ratings?stationId=${station._id}`);
                    const { avgRating, count } = await res.json();
                    document.getElementById(`avg-${station._id}`).textContent = avgRating;
                    document.getElementById(`count-${station._id}`).textContent = count;
                } catch {
                    document.getElementById(`avg-${station._id}`).textContent = `–`;
                }

                const btn = document.getElementById(`btn-${station._id}`);
                const sel = document.getElementById(`select-${station._id}`);
                const listDiv = document.getElementById(`opinion-list-${station._id}`);
                const opinionBtn = document.getElementById(`opinion-btn-${station._id}`);
                const opinionInput = document.getElementById(`opinion-input-${station._id}`);

                if (token) {
                    btn.disabled = false;
                    sel.disabled = false;
                    opinionBtn.disabled = false;
                    opinionInput.disabled = false;

                    btn.addEventListener('click', async () => {
                        const rating = Number(sel.value);
                        if (!rating) return alert('Wybierz ocenę!');
                        const post = await fetch('/ratings', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ stationId: station._id, rating })
                        });
                        if (post.ok) {
                            alert('Dziękujemy za ocenę!');
                            const again = await fetch(`/ratings?stationId=${station._id}`);
                            const upd = await again.json();
                            document.getElementById(`avg-${station._id}`).textContent = upd.avgRating;
                            document.getElementById(`count-${station._id}`).textContent = upd.count;
                        } else {
                            alert('Błąd przy zapisie oceny');
                        }
                    });

                    opinionBtn.addEventListener('click', async () => {
                        const text = opinionInput.value.trim();
                        if (!text) return alert('Opinia nie może być pusta');
                        if (text.length > 60) return alert('Opinia za długa (max 60 znaków)');
                        const resp = await fetch('/opinions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ stationId: station._id, text })
                        });
                        if (resp.ok) {
                            alert('Dziękujemy za opinię!');
                            opinionInput.value = '';
                            const refreshed = await fetch(`/opinions?stationId=${station._id}`);
                            const data = await refreshed.json();
                            listDiv.innerHTML = data.map(o => {
                                const canDelete = isAdmin || (o.user._id === currentUserId);
                                return `
                                    <div class="opinion-item">
                                        <span class="opinion-user"><strong>${o.user.username}:</strong></span>
                                        <span class="opinion-text">${o.text}</span>
                                        ${canDelete ? `<button class="delete-opinion" data-id="${o._id}">🗑</button>` : ''}
                                    </div>
                                `;
                            }).join('');
                            attachDeleteHandlers();
                        } else {
                            alert('Błąd przy zapisie opinii');
                        }
                    });
                } else {
                    btn.disabled = true;
                    sel.disabled = true;
                    opinionBtn.disabled = true;
                    opinionInput.disabled = true;
                }

                try {
                    const res = await fetch(`/opinions?stationId=${station._id}`);
                    const opinions = await res.json();
                    listDiv.innerHTML = opinions.length
                        ? opinions.map(o => {
                            const canDelete = isAdmin || (o.user._id === currentUserId);
                            return `
                                <div class="opinion-item">
                                    <span class="opinion-user"><strong>${o.user.username}:</strong></span>
                                    <span class="opinion-text">${o.text}</span>
                                    ${canDelete ? `<button class="delete-opinion" data-id="${o._id}">🗑</button>` : ''}
                                </div>
                            `;
                        }).join('')
                        : 'Brak opinii.';
                } catch {
                    listDiv.innerHTML = 'Błąd wczytywania opinii';
                }

                function attachDeleteHandlers() {
                    document.querySelectorAll(`#opinion-list-${station._id} .delete-opinion`).forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const id = btn.dataset.id;
                            if (!confirm("Czy na pewno chcesz usunąć tę opinię?")) return;
                            const resp = await fetch(`/opinions/${id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (resp.ok) {
                                alert("Opinia usunięta");
                                const refreshed = await fetch(`/opinions?stationId=${station._id}`);
                                const data = await refreshed.json();
                                listDiv.innerHTML = data.map(o => {
                                    const canDelete = isAdmin || (o.user._id === currentUserId);
                                    return `
                                        <div class="opinion-item">
                                            <span class="opinion-user"><strong>${o.user.username}:</strong></span>
                                            <span class="opinion-text">${o.text}</span>
                                            ${canDelete ? `<button class="delete-opinion" data-id="${o._id}">🗑</button>` : ''}
                                        </div>
                                    `;
                                }).join('');
                                attachDeleteHandlers();
                            } else {
                                alert("Nie udało się usunąć opinii");
                            }
                        });
                    });
                }
                document.getElementById(`navigate-${station._id}`).addEventListener('click', () => {
                    if (endPoint) {
                        map.removeLayer(endPoint);
                    }

                    endPoint = L.marker([station.lat, station.lng], { icon: endIcon, draggable: true }).addTo(map);
                    activeAction = null;
                    updateButtonsState();
                    document.querySelectorAll('.navigate-btn').forEach(btn => btn.classList.remove('active'));
                    document.getElementById(`navigate-${station._id}`).classList.add('active');
                });

                attachDeleteHandlers();
            });

            enableMarkerRemoval(marker, station.lat, station.lng);
        });

        // 💡 Wygeneruj wyniki wyszukiwania
        renderSearchResults(stations, document.getElementById("keywordInput").value);

        console.log("Ładowanie stacji zakończone.");
    } catch (error) {
        console.error("Błąd:", error.message);
    }
}

function renderSearchResults(stations, keyword) {
    const resultsDiv = document.getElementById("searchResults");
    const keywords = keyword ? keyword.split(' ').map(k => k.trim().toLowerCase()) : [];

    const matched = keywords.length
        ? stations.filter(station =>
            keywords.every(kw => {
                const inName = station.name && station.name.toLowerCase().includes(kw);
                const inKeys = Object.keys(station).some(k =>
                    typeof station[k] === 'boolean' && station[k] === true && k.toLowerCase().includes(kw)
                );
                return inName || inKeys;
            })
        )
        : [];

        resultsDiv.innerHTML = matched.length
        ? matched.map(s => {
            const logo = getStationIconURL(s.name);
            return `
            <div class="search-item" data-id="${s._id}" data-lat="${s.lat}" data-lng="${s.lng}">
                ${logo ? `<img src="${logo}" class="search-logo" alt="logo">` : ''}
                <div class="search-inline-text">${s.name} – ${s.address}</div>
            </div>
        `;
        }).join('')
        : '';

    // Kliknięcie w wynik listy
    resultsDiv.querySelectorAll('div[data-lat]').forEach(el => {
        el.addEventListener('click', () => {
            const lat = parseFloat(el.dataset.lat);
            const lng = parseFloat(el.dataset.lng);

            map.setView([lat, lng], 16);

            // otwórz popup i sidePanel
            stationLayer.eachLayer(layer => {
                const pos = layer.getLatLng();
                if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
                    layer.openPopup();           // pokaż dymek
                    setTimeout(() => layer.fire('popupopen'), 100); // wywołaj sidePanel
                }
            });
        });
    });

    stationLayer.eachLayer(layer => {
        if (!layer.stationData) return;

        const match = matched.find(s => s._id === layer.stationData._id);
        if (match) {
            map.addLayer(layer); // pokaż marker
        } else {
            map.removeLayer(layer); // ukryj marker
        }
    });

    if (!keywords.length) {
        stationLayer.eachLayer(layer => {
            map.addLayer(layer); // przy braku frazy: pokaż wszystko
        });
    }
}

// Aktywuj filtr przy wpisywaniu
const searchInput = document.getElementById("keywordInput");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        loadStations();
    });
}

// Funkcja zwracająca ikonę stacji
function getStationIcon(name) {
  switch (name) {
    case 'Orlen':       return icons.orlenIcon;
    case 'Shell':       return icons.shellIcon;
    case 'BP':          return icons.bpIcon;
    case 'MOYA':        return icons.moyaIcon;
    case 'MOL':         return icons.molIcon;
    case 'AMIC Energy': return icons.amicIcon;
    case 'Circle K':    return icons.circleKIcon;
    case 'Pod Żaglami': return icons.podZaglamiIcon;
    default:
      return L.divIcon({
        className: 'custom-icon',
        html: '<div style="background-color: gray; width: 32px; height: 32px; border-radius: 50%;"></div>'
      });
  }
}

function getStationIconURL(name) {
    switch (name) {
        case 'Orlen':
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOYwBMkqpW77rZwpZQoqd_dz3HgwzeEqJ5eQ&s';
        case 'Shell':
            return 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Shell_logo.svg/1024px-Shell_logo.svg.png';
        case 'BP':
            return 'https://www.bp.com/apps/settings/wcm/designs/refresh/bp/images/navigation/bp-logo.svg';
        case 'MOYA':
            return 'https://instreamgroup.com/wp-content/uploads/2020/10/moya-duze.png';
        case 'MOL':
            return 'https://molpolska.pl/img/logo-mol-colorful.88751645.svg';
        case 'AMIC Energy':
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJob7yZyCsmByf8rWXDKS2kNBM7C7MdTmNXg&s';
        case 'Circle K':
            return 'https://e7.pngegg.com/pngimages/157/520/png-clipart-circle-k-retail-convenience-shop-business-franchising-business-text-rectangle-thumbnail.png';
        case 'Pod Żaglami':
            return 'https://storage.googleapis.com/rc-data-search-imgs-e3f2bfb0d31a3004/img-hash-v1-bc9193c6cc399267.jpg';
        default:
            return null; // brak logo
    }
}

// Funkcja, która zwraca listę dostępnych paliw
function getAvailableFuels(data) {
    let availableFuels = [];

    if (data["95"]) availableFuels.push("95");
    if (data["98"]) availableFuels.push("98");
    if (data["100"]) availableFuels.push("100");
    if (data["LPG"]) availableFuels.push("LPG");
    if (data["ON"]) availableFuels.push("ON");

    return availableFuels.length > 0 ? availableFuels.join(", ") : "Brak paliw";
}

function updateActiveButtonStyle() {
  const addBtn    = document.getElementById('addMarker');
  const removeBtn = document.getElementById('removeMarker');

  // .toggle(className, condition) => doda gdy condition true, usunie gdy false
  addBtn.classList.toggle   ('active-button', activeAdminAction === 'add');
  removeBtn.classList.toggle('active-button', activeAdminAction === 'remove');
}

function setActiveAdminAction(action) {
  activeAdminAction = action;   // 'add', 'remove' albo null
  updateActiveButtonStyle();
}

// Obsługa kliknięcia na marker w trybie usuwania
function enableMarkerRemoval(marker, lat, lng) {
    marker.on('click', async (e) => {
        if (activeAdminAction === 'remove') {
            e.originalEvent.stopPropagation(); // Zatrzymaj domyślną obsługę kliknięcia

            const confirmDelete = confirm('Czy na pewno chcesz usunąć ten marker?');
            if (!confirmDelete) {
                setActiveAdminAction(null);
                return;
            }

            // Usuń marker z serwera
            const response = await fetch(`/markers?lat=${lat}&lng=${lng}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                map.removeLayer(marker); // Usuń marker z mapy
                alert('Marker został usunięty.');
            } else {
                alert('Błąd podczas usuwania markera.');
            }

            setActiveAdminAction(null);
        }
    });
}

// wciśnięto przycisk Dodaj
document.getElementById('addMarker').addEventListener('click', () => {
  setActiveAdminAction('add');
  alert('Kliknij na mapie, aby dodać marker.');
});

// wciśnięto przycisk Usuń
document.getElementById('removeMarker').addEventListener('click', () => {
  setActiveAdminAction('remove');
  alert('Kliknij na marker, aby usunąć marker.');
});

map.on('click', async (e) => {
    if (activeAdminAction === 'add') {
        await addMarkerAt(e.latlng.lat, e.latlng.lng);
    }
});
map.on('popupclose', () => {
    document.getElementById("sidePanel").classList.add("hidden");
});

// Tworzenie markera (admin)
async function addMarkerAt(lat, lng) {
    const description = prompt('Wprowadź opis markera:');
    if (!description) {
        alert('Dodawanie markera zostało anulowane.');
        setActiveAdminAction(null);
        return;
    }

    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(description)
        .bindTooltip(description, { permanent: false, direction: 'top', offset: [0, -10] });

    enableMarkerRemoval(marker, lat, lng);

    const response = await fetch('/markers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ lat, lng, name: description })
    });

    if (response.ok) {
        alert('Marker został dodany.');
    } else {
        alert('Błąd podczas dodawania markera.');
        map.removeLayer(marker);
    }

    setActiveAdminAction(null);
}

// button highlight
function updateActiveButtonStyle() {
    const addBtn    = document.getElementById('addMarker');
    const removeBtn = document.getElementById('removeMarker');

    addBtn.classList.toggle   ('active-button', activeAdminAction === 'add');
    removeBtn.classList.toggle('active-button', activeAdminAction === 'remove');
}

// Wyświetlanie panelu użytkownika
function showUserPanel(username, isAdmin) {
    document.getElementById('auth').style.display = 'none'; // Ukryj formularze logowania/rejestracji
    document.getElementById('userPanel').style.display = 'block';

    const adminLabel = isAdmin ? ' [Administrator]' : ''; // Sprawdzenie, czy użytkownik jest administratorem
    document.getElementById('userInfo').textContent = `Zalogowano jako: ${username}${adminLabel}`;
}

// Ukrywanie panelu użytkownika
function hideUserPanel() {
    document.getElementById('auth').style.display = 'block'; // Pokaż formularze logowania/rejestracji
    document.getElementById('userPanel').style.display = 'none';
}

// Logowanie użytkownika
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        checkLoginStatus();
        alert('Zalogowano pomyślnie');
        document.getElementById('loginForm').reset();
    } else {
        alert('Błąd logowania');
    }
});

// Rejestracja użytkownika
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        alert('Konto zostało utworzone. Możesz się teraz zalogować.');
        document.getElementById('registerForm').reset();
    } else {
        alert('Błąd podczas rejestracji. Podany użytkownik już istnieje.');
    }
});

// Wylogowanie użytkownika
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token'); // Usunięcie tokena z pamięci
    checkLoginStatus();
    alert('Wylogowano pomyślnie');
});

// Sprawdzanie stanu logowania przy załadowaniu strony
window.onload = checkLoginStatus;

// Pokazuje panel użytkownika i ukrywa inne elementy
function showMainContent() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('userPanel').style.display = 'flex';
    document.getElementById('controls').style.display = 'flex';
    document.getElementById('map').style.display = 'block';
}

// Pokazuje tylko panel logowania/rejestracji
function showLoginContent() {
    document.getElementById('auth').style.display = 'flex';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    document.getElementById('map').style.display = 'none';
    document.getElementById('adminControls').style.display = 'none';
}

// Sprawdzanie stanu logowania
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = payload.username;
        const isAdmin = payload.isAdmin;

        showUserPanel(username, isAdmin);
        showMainContent();
        toggleFilters(true);

        if (isAdmin) {
            document.getElementById('adminControls').style.display = 'flex';
        } else {
            document.getElementById('adminControls').style.display = 'none';
        }
    } else {
        showLoginContent();
        toggleFilters(false); // Ukryj filtry
    }
}

document.getElementById("showTopStations").addEventListener("click", async () => {
    try {
      const res = await fetch("/top-stations");
      const topStations = await res.json();
  
      const list = document.getElementById("top3List");
      list.innerHTML = "";
  
      topStations.forEach(station => {
        const li = document.createElement("li");
        li.textContent = `${station.rank}. ${station.name} ul.${station.address} – ${station.rating} (${station.count} ocen)`;
        list.appendChild(li);
      });
  
      document.getElementById("top3Modal").classList.remove("hidden");
    } catch (err) {
      alert("Błąd ładowania rankingu.");
    }
  });
  
  function closeTop3() {
    document.getElementById("top3Modal").classList.add("hidden");
  }

// Funkcja do wyświetlania komunikatu
function showMessage(message) {
    const messageContainer = document.getElementById("messageContainer");
    const messageText = document.getElementById("messageText");
    
    // Ustawienie tekstu w dymku
    messageText.textContent = message;

    // Pokaż kontener z dymkiem
    messageContainer.style.visibility = "visible";
}

// Funkcja do zamykania komunikatu
function closeMessage() {
    const messageContainer = document.getElementById("messageContainer");
    
    // Ukrycie kontenera z dymkiem
    messageContainer.style.visibility = "hidden";
}

// Zastąpienie domyślnych alertów
window.alert = function(message) {
    showMessage(message);
}

document.getElementById("themeSwitch").addEventListener("change", function() {
    document.body.classList.toggle("dark-mode", this.checked);
});

const stationLayer = L.layerGroup().addTo(map);

function toggleFilters(visible) {
    const mapContainer = document.getElementById('mapContainer');

    if (visible) {
        mapContainer.classList.add('fade-in');
        mapContainer.classList.remove('hidden');
    } else {
        mapContainer.classList.remove('fade-in');
        mapContainer.classList.add('hidden');
    }
}

// Upewnienie się, że dane ładują się na starcie
document.addEventListener("DOMContentLoaded", () => {
    console.log("Strona załadowana, inicjalizuję mapę...");
    loadStations();
});

document.addEventListener("DOMContentLoaded", function () {
    const messageContainer = document.getElementById("messageContainer");
    const messageBox = document.getElementById("messageBox");
    const messageText = document.getElementById("messageText");
    const closeButton = messageBox.querySelector("button");
    const setStartButton = document.getElementById("setStart");
    const setEndButton = document.getElementById("setEnd");

    /* dark mode persistance */
    const themeSwitch = document.getElementById("themeSwitch");
    const darkModeEnabled = localStorage.getItem("darkMode") === "true";

    themeSwitch.checked = darkModeEnabled;
    document.body.classList.toggle("dark-mode", darkModeEnabled);
        themeSwitch.addEventListener("change", function() {
        document.body.classList.toggle("dark-mode", this.checked);
        localStorage.setItem("darkMode", this.checked);
    });
    /* dark mode persistance */

    function showMessage(text) {
        messageText.textContent = text;
        messageContainer.style.visibility = "visible";
        closeButton.focus();
    }

    function closeMessage() {
        messageContainer.style.visibility = "hidden";
    }

    // Nasłuchiwanie klawisza Enter do zamknięcia alertu
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && messageContainer.style.visibility === "visible") {
            closeMessage();
        }
    });

    setStartButton.addEventListener("click", function () {
        showMessage("Wybierz punkt początkowy na mapie.");
    });

    setEndButton.addEventListener("click", function () {
        showMessage("Wybierz punkt końcowy na mapie.");
    });

    window.closeMessage = closeMessage;

    updateButtonsState();
});
