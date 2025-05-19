const express = require("express");
const cors = require("cors");
const axios = require("axios");

import API_KEY from "./api_key";

const app = express();
app.use(cors());

app.get("/directions", async (req, res) => {
    const { origin, destination } = req.query;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${API_KEY}`;
    
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Błąd pobierania trasy" });
    }
});

app.listen(3001, () => console.log("Serwer proxy działa na http://localhost:3001"));