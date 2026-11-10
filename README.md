# 🎸 GitarChord

PWA ringkas untuk main gitar dengan **auto scroll** chord & lirik. Boleh di-install di telefon/PC dan berfungsi offline.

## Ciri-ciri
- ▶ Auto scroll dengan kiraan 3‑2‑1, laju 1–30 (disimpan setiap lagu)
- Tap pada skrin untuk main / berhenti; scroll manual pun boleh semasa main
- ♯ / ♭ transpose (chord kekal sejajar dengan lirik)
- A− / A＋ saiz tulisan
- Skrin tak padam semasa main (Wake Lock)
- Simpan lagu dalam peranti (localStorage), Export / Import JSON
- Tampal link Ultimate Guitar → tajuk & artis diisi automatik

## Cara guna
1. Buka lagu di Ultimate Guitar, contoh
   `https://tabs.ultimate-guitar.com/tab/umbrella/ramalanku-benar-belaka-chords-1730682`
2. Salin teks chord & lirik.
3. Dalam GitarChord tekan **＋**, tampal link + teks, **Simpan**, tekan **▶**.

> Laman Ultimate Guitar tak benarkan dimuat terus dalam app lain (CORS / iframe disekat),
> sebab itu teks perlu disalin & tampal sekali sahaja.

Papan kekunci: `Space` main/henti · `↑ ↓` laju · `← →` transpose · `Home` ke atas.

## Hosting (GitHub Pages)
Pages diset ke **Settings → Pages → Deploy from a branch → `main` / root**. Setiap push ke `main` akan deploy automatik.

Uji lokal: `python3 -m http.server` lalu buka `http://localhost:8000`.
