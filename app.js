const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'supersecretkey'; // Zmień na bezpieczny klucz w produkcji

app.use(bodyParser.json()); // Obsługa JSON w żądaniach
app.use(express.static(path.join(__dirname, 'public')));

// Połączenie z MongoDB
mongoose.connect('mongodb://localhost:27017/markersDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Połączono z MongoDB'))
    .catch(err => console.error('Błąd połączenia z MongoDB:', err));

// Schemat i model Markera
const markerSchema = new mongoose.Schema({
    lat: Number,
    lng: Number,
    name: String
});
const Marker = mongoose.model('Marker', markerSchema);

// Schemat i model Użytkownika
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Middleware do weryfikacji tokena JWT
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Endpointy dla użytkowników
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Konto utworzone' });
    } catch (err) {
        res.status(400).json({ error: 'Nazwa użytkownika zajęta' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'Użytkownik nie istnieje' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ error: 'Nieprawidłowe hasło' });

    const token = jwt.sign({ username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Dodawanie markera (tylko admin)
app.post('/markers', authenticateToken, async (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);

    const { lat, lng, name } = req.body;
    try {
        const newMarker = new Marker({ lat, lng, name });
        await newMarker.save();
        res.status(201).json({ message: 'Marker dodany.' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd przy dodawaniu markera.' });
    }
});

// Usuwanie markera (tylko admin)
app.delete('/markers', authenticateToken, async (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);

    const { lat, lng } = req.query;
    try {
        const marker = await Marker.findOneAndDelete({ lat, lng });
        if (!marker) return res.status(404).json({ error: 'Marker nie znaleziony.' });
        res.json({ message: 'Marker usunięty.' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd przy usuwaniu markera.' });
    }
});


// Pobieranie markerów (dla wszystkich użytkowników)
app.get('/markers', async (req, res) => {
    try {
        const markers = await Marker.find();
        res.json(markers);
    } catch (err) {
        res.status(500).json({ error: 'Błąd podczas pobierania markerów' });
    }
});

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
