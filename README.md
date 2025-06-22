# PROJEKT: WYBRANE APLIKACJE SYSTEMÓW GEOINFORMACYJNYCH (WASG) - ROZBUDOWA APLIKACJI

**Mapa lokalizacji stacji benzynowych w wybranym mieście w Polsce. (Gdynia)**

---

## ZAKRES ROZBUDOWY FUNKCJONALNOŚCI
### 1. Rozszerzenie informacji o obiektach
- Opis obiektu – krótka charakterystyka danej stacji
- Słowa kluczowe – przypisywane z listy słów tematycznych (np. „LPG”, „24h”, „kawa”, „parking TIR” itp.)

Nowe dane będą mogły być wykorzystywane w panelu wyszukiwania i filtrowania.
### 2. Agregacja znaczników na mapie
- Automatyczne grupowanie znaczników znajdujących się blisko siebie
- Wyświetlanie jednego znacznika agregującego z liczbą zawartych w nim obiektów
- Automatyczne rozbijanie grupy na indywidualne markery przy zbliżeniu
### 3. Poprawa działania funkcji wyznaczania trasy
Obecnie funkcja wyznaczania trasy działa jedynie dla nowo dodanych markerów na mapie. Planowana modyfikacja obejmuje umożliwienie wyznaczana trasy dla dowolnego istniejącego markera z bazy danych.
### 4. System oceniania i komentarzy
W celu zwiększenia zaangażowania użytkowników w aplikację planujemy wdrożenie:
- Systemu oceniania stacji (np. w skali 1-5)
- Możliwości dodawania komentarzy przez użytkowników
- Rankingów stacji na podstawie średniej oceny
- Panelu, w którym będzie można przeglądać i dodawać opinie
### 5. Inne usprawnienia
Planujemy poprawić i udoskonalić oprawę graficzną aplikacji, zwiększyć czytelność głównych elementów interfejsu i poprawienie wygody nawigowania po stronie.

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
```
```
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
- otwórz przeglądarkę i wpisz
```
localhost:3000
```

## Autorzy
- **Aleksander Piszczatyn** 192575 | [GitHub](https://github.com/apiszczatyn)
- **Jakub Polewczyk** 192562 | [GitHub](https://github.com/polevczyc)

---
