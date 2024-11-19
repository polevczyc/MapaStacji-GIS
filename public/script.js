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
});

document.getElementById('setEnd').addEventListener('click', () => {
    activeAction = 'end';
});

document.getElementById('calculateRoute').addEventListener('click', calculateRoute);
document.getElementById('clearRoute').addEventListener('click', clearRoute);

// Dodanie obsługi kliknięć na mapie
map.on('click', handleMapClick);

// Funkcja do ładowania markerów z pliku JSON (stacje benzynowe)
async function loadMarkers() {
    const response = await fetch('/markers');
    const markers = await response.json();
    markers.forEach(marker => {
        L.marker([marker.lat, marker.lng]).addTo(map)
            .bindPopup(marker.name);
    });
}

// Ładowanie markerów stacji benzynowych po załadowaniu mapy
loadMarkers();
