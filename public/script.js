// Inicjalizacja mapy
const map = L.map('map').setView([51.505, -0.09], 13); // Współrzędne początkowe

// Dodanie warstwy z OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Funkcja do ładowania markerów z pliku JSON
async function loadMarkers() {
    const response = await fetch('markers.json');
    const markers = await response.json();
    markers.forEach(marker => {
        L.marker([marker.lat, marker.lng]).addTo(map)
            .bindPopup(marker.name);
    });
}

// Funkcja do dodawania nowego markera
async function addMarker(lat, lng, name) {
    L.marker([lat, lng]).addTo(map)
        .bindPopup(name)
        .openPopup();

    // Wysłanie nowego markera do serwera
    const response = await fetch('/markers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat, lng, name })
    });

    if (response.ok) {
        console.log('Marker dodany');
    } else {
        console.error('Błąd dodawania markera');
    }
}


// Ładowanie markerów po załadowaniu mapy
loadMarkers();

