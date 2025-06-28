const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'supersecretkey'; 
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
    name: String,
    address: String
});
const Marker = mongoose.model('Marker', markerSchema);

// Schemat i model Użytkownika
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Schemat i model Oceny
const ratingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'Marker', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
}, { timestamps: true });

const Rating = mongoose.model('Rating', ratingSchema);

//Schemat i model Oceny pisemnej
const opinionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  station: { type: mongoose.Schema.Types.ObjectId, ref: 'Marker', required: true },
  text: { type: String, required: true, maxlength: 60 }
}, { timestamps: true });

const Opinion = mongoose.model('Opinion', opinionSchema);

// Middleware do weryfikacji tokena JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      console.log('Brak tokena w nagłówku');
      return res.sendStatus(401);
    }
  
    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) {
        console.log('JWT verify error:', err.name, err.message);
        return res.sendStatus(403);
      }
      console.log('JWT payload:', payload);
      req.user = payload;
      req.user = {
        _id: payload.id, 
        username: payload.username,
        isAdmin: payload.isAdmin
      };
      next();
    });

  }

// Wystawianie lub aktualizacja oceny (tylko zalogowani użytkownicy)
app.post('/ratings', authenticateToken, async (req, res) => {
    // 1) Wyciągamy userId z middleware
    const userId = req.user.id || req.user._id;
    if (!userId) {
      return res.status(401).json({ error: 'Brak uprawnień' });
    }
    console.log('POST /ratings — req.user:', req.user);
  
    const { stationId, rating } = req.body;
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Ocena musi być w zakresie 1–5' });
    }
  
    // 2) Spróbuj skonwertować stationId na ObjectId, żeby Mongoose nie musiał tego robić
    let stationObjId;
    try {
      stationObjId = new mongoose.Types.ObjectId(stationId);
    } catch (e) {
      return res.status(400).json({ error: 'Nieprawidłowe stationId' });
    }
  
    try {
      // 3) Szukamy istniejącej oceny: używamy userId i stationObjId
      console.log(`Szukam ratingu dla user=${userId} i station=${stationObjId}`);
      let userRating = await Rating.findOne({
        user: userId,
        station: stationObjId
      });
  
      if (userRating) {
        userRating.rating = rating;
        console.log('Aktualizuję istniejącą ocenę:', userRating);
      } else {
        userRating = new Rating({
          user: userId,
          station: stationObjId,
          rating
        });
        console.log('Tworzę nową ocenę:', userRating);
      }
  
      // 4) Zapisujemy
      await userRating.save();
      console.log('Ocena zapisana w bazie');
      return res.json({ message: 'Ocena zapisana' });
  
    } catch (err) {
      console.error('Błąd w POST /ratings:', err);
      return res.status(500).json({ error: 'Błąd zapisu oceny' });
    }
  });

// Pobieranie średniej oceny i liczby głosów dla stacji
app.get('/ratings', async (req, res) => {
    const { stationId } = req.query;
    if (!stationId) {
      return res.status(400).json({ error: 'Brak stationId' });
    }
  
    try {
      // 1) Pobieramy wszystkie oceny tej stacji
      const ratings = await Rating.find({ station: stationId });
  
      // 2) Liczymy
      const count = ratings.length;
      const avgRating = count === 0
        ? 0
        : Number((ratings.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1));
  
      // 3) Zwracamy JSON
      return res.json({ avgRating, count });
  
    } catch (err) {
      console.error('Błąd w GET /ratings:', err);
      return res.status(500).json({ error: 'Błąd pobierania ocen' });
    }
  });

  // Dodawanie opinii
app.post('/opinions', authenticateToken, async (req, res) => {
  const { stationId, text } = req.body;
  const userId = req.user._id;

  if (!text || text.length > 60) {
    return res.status(400).json({ error: 'Opinia musi mieć maksymalnie 60 znaków' });
  }

  try {
    const opinion = new Opinion({ user: userId, station: stationId, text });
    await opinion.save();
    res.status(201).json({ message: 'Opinia dodana' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd podczas zapisywania opinii' });
  }
});

// Pobieranie opinii dla danej stacji
app.get('/opinions', async (req, res) => {
  const { stationId } = req.query;
  try {
    const opinions = await Opinion.find({ station: stationId }).populate('user', 'username').sort({ createdAt: -1 });
    res.json(opinions);
  } catch (err) {
    res.status(500).json({ error: 'Błąd podczas pobierania opinii' });
  }
});

// Usuwanie opinii
app.delete('/opinions/:id', authenticateToken, async (req, res) => {
  const opinionId = req.params.id;

  try {
    const opinion = await Opinion.findById(opinionId);
    if (!opinion) return res.status(404).json({ error: 'Opinia nie istnieje' });

    const userId = req.user._id;
    const isAdmin = req.user.isAdmin;

    // Sprawdź, czy użytkownik jest właścicielem opinii lub adminem
    if (!isAdmin && opinion.user.toString() !== userId) {
      return res.status(403).json({ error: 'Brak uprawnień do usunięcia tej opinii' });
    }

    await opinion.deleteOne();
    res.json({ message: 'Opinia usunięta' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd przy usuwaniu opinii' });
  }
});

// TOP3 STACJE
app.get('/top-stations', async (req, res) => {
  try {
    const ratings = await Rating.aggregate([
      { $group: { _id: "$station", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      { $sort: { avgRating: -1, count: -1 } },
      { $limit: 3 }
    ]);

    const populated = await Marker.populate(ratings, { path: "_id" });
    const result = populated.map((entry, index) => ({
      rank: index + 1,
      name: entry._id.name,
      address: entry._id.address,
      rating: entry.avgRating.toFixed(1),
      count: entry.count
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Błąd pobierania TOP3 stacji" });
  }
});

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

    const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
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