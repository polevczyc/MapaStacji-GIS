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
const startIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Ikona startu
    iconSize: [32, 32], // Rozmiar
    iconAnchor: [16, 32]
});

const endIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Ikona końca
    iconSize: [32, 32], // Rozmiar
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
        startPoint = L.marker([lat, lng], { icon: startIcon, draggable: true }).addTo(map)
            .bindPopup("Punkt Początkowy")
            .openPopup();
    } else if (activeAction === 'end') {
        if (endPoint) {
            map.removeLayer(endPoint);
        }
        endPoint = L.marker([lat, lng], { icon: endIcon, draggable: true }).addTo(map)
            .bindPopup("Punkt Końcowy")
            .openPopup();
    }
    activeAction = null; // Resetuj aktywną akcję
}

// Wyznaczanie trasy
async function calculateRoute() {
    if (!startPoint || !endPoint) {
        alert("Musisz ustawić punkt początkowy i końcowy!");
        return;
    }

    const startCoords = startPoint.getLatLng();
    const endCoords = endPoint.getLatLng();

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248f19cceb9aca24d8fa6c374d071ae2198&start=${startCoords.lng},${startCoords.lat}&end=${endCoords.lng},${endCoords.lat}`;

    const response = await fetch(url);
    if (!response.ok) {
        alert("Błąd podczas pobierania trasy!");
        return;
    }

    const data = await response.json();
    const routeCoords = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);

    routeLayer.clearLayers();
    L.polyline(routeCoords, { color: 'blue' }).addTo(routeLayer);
}

// Usuwanie trasy
function clearRoute() {
    routeLayer.clearLayers(); // Usuń trasę
    if (startPoint) {
        map.removeLayer(startPoint);
        startPoint = null;
    }
    if (endPoint) {
        map.removeLayer(endPoint);
        endPoint = null;
    }
}

// Obsługa przycisków
let activeAction = null;

document.getElementById('setStart').addEventListener('click', () => {
    activeAction = 'start';
    alert("Kliknij na mapie, aby ustawić punkt początkowy");
});

document.getElementById('setEnd').addEventListener('click', () => {
    activeAction = 'end';
    alert("Kliknij na mapie, aby ustawić punkt końcowy");
});

document.getElementById('calculateRoute').addEventListener('click', calculateRoute);
document.getElementById('clearRoute').addEventListener('click', clearRoute);

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


// Funkcja do ładowania markerów i przypisania im obsługi usuwania
async function loadMarkers() {
    const response = await fetch('/markers'); // Pobieranie z lokalnego serwera Node.js
    if (!response.ok) {
        console.error('Błąd podczas ładowania markerów');
        return;
    }

    const markers = await response.json();
    markers.forEach(markerData => {
        const marker = L.marker([markerData.lat, markerData.lng])
            .addTo(map)
            .bindPopup(markerData.name) // Wyświetlanie opisu po kliknięciu
            .bindTooltip(markerData.name, { // Wyświetlanie opisu po najechaniu
                permanent: false,
                direction: 'top',
                offset: [0, -10]
            });

        enableMarkerRemoval(marker, markerData.lat, markerData.lng); // Dodaj obsługę usuwania
    });
}

// Obsługa kliknięcia na marker w trybie usuwania
function enableMarkerRemoval(marker, lat, lng) {
    marker.on('click', async (e) => {
        if (activeAdminAction === 'remove') {
            e.originalEvent.stopPropagation(); // Zatrzymaj domyślną obsługę kliknięcia

            const confirmDelete = confirm('Czy na pewno chcesz usunąć ten marker?');
            if (!confirmDelete) {
                activeAdminAction = null; // Anuluj usuwanie
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

            activeAdminAction = null; // Zresetuj akcję
        }
    });
}

let activeAdminAction = null; // Przechowuje aktywną akcję admina (dodawanie/usuwanie)

// Dodawanie markera
document.getElementById('addMarker').addEventListener('click', () => {
    activeAdminAction = 'add';
    alert('Kliknij na mapie, aby dodać marker.');
});

map.on('click', async (e) => {
    if (activeAdminAction === 'add') {
        const { lat, lng } = e.latlng;

        const description = prompt('Wprowadź opis markera:');
        if (!description) {
            alert('Dodawanie markera zostało anulowane.');
            return;
        }

        // Dodaj marker na mapę
        const marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(description) // Wyświetlanie opisu po kliknięciu
            .bindTooltip(description, { // Wyświetlanie opisu po najechaniu
                permanent: false,
                direction: 'top',
                offset: [0, -10]
            });

        enableMarkerRemoval(marker, lat, lng); // Przypisz obsługę usuwania nowo dodanemu markerowi

        // Wyślij dane do serwera
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
            map.removeLayer(marker); // Usuń marker w razie błędu
        }

        activeAdminAction = null; // Zresetuj akcję
    }
});

// Usuwanie markera
document.getElementById('removeMarker').addEventListener('click', () => {
    activeAdminAction = 'remove';
    alert('Kliknij na marker, aby go usunąć.');
});

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
        alert('Błąd podczas rejestracji. Sprawdź, czy nazwa użytkownika jest unikalna.');
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

// Ładowanie markerów po załadowaniu mapy
loadMarkers();

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

        if (isAdmin) {
            document.getElementById('adminControls').style.display = 'flex';
        } else {
            document.getElementById('adminControls').style.display = 'none';
        }
    } else {
        showLoginContent();
    }
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