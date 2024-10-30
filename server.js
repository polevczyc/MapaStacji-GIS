const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Konfiguracja do serwowania plików statycznych
app.use(express.static('public'));
app.use(express.json());

// Endpoint do pobierania markerów
app.get('/markers', (req, res) => {
    fs.readFile('markers.json', (err, data) => {
        if (err) throw err;
        res.json(JSON.parse(data));
    });
});

// Endpoint do dodawania nowego markera
app.post('/markers', (req, res) => {
    const newMarker = req.body;
    fs.readFile('markers.json', (err, data) => {
        if (err) throw err;
        const markers = JSON.parse(data);
        markers.push(newMarker);
        fs.writeFile('markers.json', JSON.stringify(markers), err => {
            if (err) throw err;
            res.status(201).send();
        });
    });
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
