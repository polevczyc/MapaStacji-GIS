# PROJEKT: SYSTEMY INFORMACJI PRZESTRZENNEJ (GIS)

**Mapa lokalizacji stacji benzynowych w wybranym mieście w Polsce. (Gdynia)**

---

## Cel projektu
Celem projektu jest stworzenie aplikacji webowej, która umożliwia:
- Wyświetlanie mapy z lokalizacjami stacji benzynowych w wybranym mieście w Polsce.
- Zarządzanie danymi o stacjach (dodawanie, edycja, filtrowanie).
- Wyświetlanie szczegółowych informacji o wybranej stacji.

---

## Technologie
Projekt wykorzystuje następujące technologie:
- **React.js** – frontend aplikacji.
- **Leaflet.js** – integracja mapowa (OpenStreetMap).
- **Node.js** z **Express** – backend oraz API aplikacji.
- **MongoDB** – baza danych do przechowywania informacji o stacjach benzynowych oraz użytkownikach serwisu.
- **Visual Studio Code** – środowisko programistyczne.
- **MongoDB Compass** - wyświetlanie rekordów bazy danych w formie graficznej.

---

## Wymagania systemowe
- **Node.js** (wersja >= 16.0.0)
- **npm** lub **yarn** (do zarządzania zależnościami)
- **MongoDB**

---

## Instalacja i uruchomienie

### 1. Klonowanie repozytorium:
```
git clone https://github.com/polevczyc/MapaStacji-GIS.git
cd MapaStacji-GIS
```

### 2. Instalacja zależności:
- zainicjuj projekt:
```
npm init -y
```
**Frontend:**
- zainstaluj potrzebne narzędzia:
```
npm install bcrypt jsonwebtoken body-parser fs
```
**Backend:**
- zainstaluj [Node.js](https://nodejs.org/en/download)
- zainstaluj framework express oraz bazę danych MongoDB:
```
npm install express mongoose cors
```

### 3. Uruchomienie
- otwórz główny folder z plikami projektu
- wpisz poniższą komendę w terminalu:
```
node app.js
```
- otwórz nowy terminal i wpisz:
```
node server.js
```

## Autorzy
- **Aleksander Piszczatyn** 192575 | [GitHub](https://github.com/apiszczatyn)
- **Jakub Polewczyk** 192562 | [GitHub](https://github.com/polevczyc)

---
