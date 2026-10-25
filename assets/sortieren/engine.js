/* ============================================================
   SORTIERSPIELE · engine.js – Spielregeln + Löser (ohne DOM)
   Gemeinsam für Wäsche, Regale und Gewürze (je eigenes Spiel).
   ------------------------------------------------------------
   1. KÖRBE (Wäsche)
      Jeder Korb ist ein Stapel (unten → oben) mit fester Höhe `k`.
      Ein Zug nimmt die oberste Gruppe gleicher Teile und legt so
      viele davon, wie Platz ist, auf einen anderen Korb – erlaubt,
      wenn der leer ist oder oben dieselbe Farbe liegt.
      Dazu kommt die WÄSCHELEINE: Klammern, an die genau ein Teil
      beliebiger Farbe passt (Zwischenablage). Sie stehen im Zustand
      hinter den Körben: t[0..n-1] = Körbe, t[n..] = Klammern.
      Gewonnen: jeder Korb leer oder voll mit einer Farbe, Leine leer.

   2. REGALE
      Jedes Fach hat vorne 3 Plätze und dahinter Reihen, die nachrücken.
      Ein Zug setzt ein vorderes Teil in ein anderes Fach mit freiem
      Platz. Stehen vorne 3 gleiche, verschwinden sie. Ist ein Fach
      vorne leer, rückt die nächste Reihe nach. KISTEN: ein Fach mit
      Zahl ist verschlossen, bis insgesamt so viele Dreier geräumt sind.
      Gewonnen: alles weg.

   3. SCHIEBEREGAL (Gewürze)
      Gläser in einem Raster. Ein Zug schiebt eine ganze Reihe nach
      links/rechts oder eine Spalte nach oben/unten; was hinten
      rausfällt, kommt vorne wieder rein (Drehregal). Ziel: In Spalte c
      stehen nur Gläser der Sorte c. Reihen/Spalten mit Schloss lassen
      sich nicht schieben.

   Der Löser ist ein gewichtetes A* ("best first" mit Schätzung der
   Restzüge). Er findet schnell kurze, aber nicht immer die kürzesten
   Lösungen. Benutzt wird er offline (Level-Generator: Lösbarkeit +
   Zielzüge für die Sterne) und im Browser für den Tipp-Knopf.
   ============================================================ */

/* ---------- Zufall mit Startwert (gleiches Level = gleiche Würfel) ---------- */
export function zufall(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mischen(liste, rnd) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

/* ============================================================
   1. Körbe + Wäscheleine
   Level:   { k, t: [[sorte, …], …], l: Anzahl Klammern }
   Zustand: { k, n: Anzahl Körbe, t: [...Körbe, ...Klammern] }
   ============================================================ */
const oben = (korb) => korb[korb.length - 1];

/** Länge der obersten Gruppe gleicher Teile. */
export function gruppe(korb) {
  let n = 0;
  for (let i = korb.length - 1; i >= 0 && korb[i] === korb[korb.length - 1]; i--) n++;
  return n;
}

export const istKlammer = (z, i) => i >= (z.n ?? z.t.length);
export const fertigerKorb = (korb, k) => korb.length === k && gruppe(korb) === k;
const platzVon = (z, i) => (istKlammer(z, i) ? 1 : z.k);

export function korbStart(level) {
  const t = level.t.map((k) => k.slice());
  for (let i = 0; i < (level.l || 0); i++) t.push([]);
  return { k: level.k, n: level.t.length, t };
}

/**
 * Warum geht ein Zug nicht? null = erlaubt, sonst ein Grund-Kürzel.
 * Die Oberfläche macht daraus einen verständlichen Satz.
 */
export function korbZugGrund(z, a, b) {
  const ka = z.t[a];
  const kb = z.t[b];
  if (a === b) return "gleich";
  if (ka.length === 0) return "leer";
  if (!istKlammer(z, a) && fertigerKorb(ka, z.k)) return "fertig";
  if (kb.length >= platzVon(z, b)) return istKlammer(z, b) ? "klammer-belegt" : "voll";
  if (istKlammer(z, b) || kb.length === 0) return null;
  return oben(kb) === oben(ka) ? null : "farbe";
}
export const korbZugErlaubt = (z, a, b) => korbZugGrund(z, a, b) === null;

/** Wie viele Teile wandern bei Zug a → b? */
export function korbMenge(z, a, b) {
  const n = istKlammer(z, a) ? 1 : gruppe(z.t[a]);
  return Math.min(n, platzVon(z, b) - z.t[b].length);
}

export const korbZuege = {
  liste(z) {
    const zuege = [];
    let leerKorb = false;
    let leerKlammer = false;
    for (let b = 0; b < z.t.length; b++) {
      const klammer = istKlammer(z, b);
      const leer = z.t[b].length === 0;
      // Alle leeren Körbe (bzw. Klammern) sind gleichwertig: nur den ersten betrachten
      if (leer && (klammer ? leerKlammer : leerKorb)) continue;
      for (let a = 0; a < z.t.length; a++) {
        if (!korbZugErlaubt(z, a, b)) continue;
        if (leer && !klammer && !istKlammer(z, a) && gruppe(z.t[a]) === z.t[a].length) continue; // einfarbig umkippen bringt nichts
        if (klammer && istKlammer(z, a)) continue; // Klammer → Klammer bringt nichts
        zuege.push([a, b]);
      }
      if (leer) {
        if (klammer) leerKlammer = true;
        else leerKorb = true;
      }
    }
    return zuege;
  },
  anwenden(z, [a, b]) {
    const t = z.t.map((korb) => korb.slice());
    const m = korbMenge(z, a, b);
    for (let i = 0; i < m; i++) t[b].push(t[a].pop());
    return { k: z.k, n: z.n, t };
  },
  gewonnen: (z) =>
    z.t.every((korb, i) => korb.length === 0 || (!istKlammer(z, i) && fertigerKorb(korb, z.k))),
  schluessel(z) {
    const n = z.n ?? z.t.length;
    const koerbe = z.t
      .slice(0, n)
      .map((k) => k.join(","))
      .sort()
      .join("|");
    const leine = z.t
      .slice(n)
      .map((k) => k.join(","))
      .sort()
      .join(",");
    return koerbe + "#" + leine;
  },
  // Untergrenze: jede Gruppe muss mindestens einmal bewegt werden, außer
  // der untersten Gruppe einer Farbe (die darf liegen bleiben).
  schaetzung(z) {
    let gruppen = 0;
    const sorten = new Set();
    for (const korb of z.t) {
      for (let i = 0; i < korb.length; i++) if (i === 0 || korb[i] !== korb[i - 1]) gruppen++;
      for (const s of korb) sorten.add(s);
    }
    return gruppen - sorten.size;
  },
};

/* ============================================================
   2. Regale + Kisten
   Level:   { r: [ [ [reihe vorne], [reihe 2], … ], … ], zu?: {fach: dreier} }
   Zustand: { r, zu, f: [[vorne], …], i: [nächste Reihe, …], g: geräumte Dreier }
   ============================================================ */
export function regalStart(level) {
  const z = {
    r: level.r,
    zu: level.zu || {},
    f: level.r.map(() => []),
    i: level.r.map(() => 0),
    g: 0,
  };
  for (let s = 0; s < z.r.length; s++) z.g += nachruecken(z, s);
  return z;
}

const dreier = (f) => f.length === 3 && f[0] === f[2];

function nachruecken(z, s) {
  // Vorne leer → nächste Reihe vor. Steht dabei ein Dreier, verschwindet er.
  let weg = 0;
  while (z.f[s].length === 0 && z.i[s] < z.r[s].length) {
    z.f[s] = z.r[s][z.i[s]].slice().sort((x, y) => x - y);
    z.i[s]++;
    if (dreier(z.f[s])) {
      z.f[s] = [];
      weg++;
    }
  }
  return weg;
}

/** Fach noch in der Kiste? */
export const regalZu = (z, s) => (z.zu[s] || 0) > z.g;

export function regalZugGrund(z, a, x, b) {
  if (regalZu(z, a)) return "kiste-von";
  if (regalZu(z, b)) return "kiste";
  if (a === b) return "gleich";
  if (!z.f[a].includes(x)) return "weg";
  if (z.f[b].length >= 3) return "voll";
  return null;
}

export const regalZuege = {
  liste(z) {
    const zuege = [];
    for (let a = 0; a < z.f.length; a++) {
      if (regalZu(z, a)) continue;
      const gesehen = new Set();
      for (const x of z.f[a]) {
        if (gesehen.has(x)) continue;
        gesehen.add(x);
        let leerGenommen = false;
        for (let b = 0; b < z.f.length; b++) {
          if (b === a || z.f[b].length >= 3 || regalZu(z, b)) continue;
          // komplett leere Fächer (vorne und hinten) sind gleichwertig
          const ganzLeer = z.f[b].length === 0 && z.i[b] >= z.r[b].length;
          if (ganzLeer) {
            if (leerGenommen) continue;
            leerGenommen = true;
          }
          zuege.push([a, x, b]);
        }
      }
    }
    return zuege;
  },
  anwenden(z, [a, x, b]) {
    const n = { r: z.r, zu: z.zu, f: z.f.map((f) => f.slice()), i: z.i.slice(), g: z.g };
    n.f[a].splice(n.f[a].indexOf(x), 1);
    n.f[b].push(x);
    n.f[b].sort((p, q) => p - q);
    if (dreier(n.f[b])) {
      n.f[b] = [];
      n.g++;
    }
    n.g += nachruecken(n, a);
    n.g += nachruecken(n, b);
    return n;
  },
  gewonnen: (z) => z.f.every((f, s) => f.length === 0 && z.i[s] >= z.r[s].length),
  schluessel: (z) => z.f.map((f, s) => f.join(",") + ":" + z.i[s]).join("|") + "#" + z.g,
  // Grobe Schätzung: Teile, die vorne nicht zur Mehrheit ihres Fachs
  // gehören, müssen weg; dazu ein Anteil für alles, was hinten wartet.
  schaetzung(z) {
    let h = 0;
    for (let s = 0; s < z.f.length; s++) {
      const f = z.f[s];
      const zaehl = {};
      let max = 0;
      for (const x of f) max = Math.max(max, (zaehl[x] = (zaehl[x] || 0) + 1));
      h += f.length - max + (max > 0 && max < 3 ? 3 - max : 0);
      for (let j = z.i[s]; j < z.r[s].length; j++) h += z.r[s][j].length * 0.7;
    }
    return h;
  },
};

/* ============================================================
   3. Schieberegal
   Level:   { R, C, g: [sorte je Feld, zeilenweise], fz?: [Reihen mit Schloss], fs?: [Spalten mit Schloss] }
   Zustand: { R, C, g, fz, fs }   Zug: ["z", reihe, ±1] | ["s", spalte, ±1]
   ============================================================ */
export function schiebeStart(level) {
  return { R: level.R, C: level.C, g: level.g.slice(), fz: level.fz || [], fs: level.fs || [] };
}

export function schieben(z, [art, i, d]) {
  const g = z.g.slice();
  if (art === "z") {
    for (let c = 0; c < z.C; c++) g[i * z.C + ((c + d + z.C) % z.C)] = z.g[i * z.C + c];
  } else {
    for (let r = 0; r < z.R; r++) g[((r + d + z.R) % z.R) * z.C + i] = z.g[r * z.C + i];
  }
  return { ...z, g };
}

export const schiebeZuege = {
  liste(z) {
    const zuege = [];
    for (let r = 0; r < z.R; r++) if (!z.fz.includes(r)) zuege.push(["z", r, 1], ["z", r, -1]);
    for (let c = 0; c < z.C; c++) if (!z.fs.includes(c)) zuege.push(["s", c, 1], ["s", c, -1]);
    return zuege;
  },
  anwenden: schieben,
  gewonnen: (z) => z.g.every((s, i) => s === i % z.C),
  schluessel: (z) => z.g.join(""),
  // Je Reihe: beste Drehung (Kosten = Schiebezüge) plus halbe Zahl der
  // Gläser, die danach noch falsch stehen. Nicht ganz zulässig, findet
  // aber in Versuchen bis 5×5 schnell fast kürzeste Lösungen.
  schaetzung(z) {
    let h = 0;
    for (let r = 0; r < z.R; r++) {
      let best = Infinity;
      for (let k = 0; k < z.C; k++) {
        let f = 0;
        for (let c = 0; c < z.C; c++) if (z.g[r * z.C + ((c + k) % z.C)] !== c) f++;
        best = Math.min(best, Math.min(k, z.C - k) + f * 0.5);
      }
      h += best;
    }
    return h;
  },
};

/* ============================================================
   Löser: gewichtetes A* mit Knotengrenze
   Gibt die Zugliste zurück, [] wenn schon gelöst, null wenn nichts
   gefunden (unlösbar ODER Grenze erreicht).
   ============================================================ */
export function loesen(start, regeln, { grenze = 50000, gewicht = 1.6 } = {}) {
  if (regeln.gewonnen(start)) return [];
  // Kleiner Binär-Heap nach f = g + gewicht * h
  const heap = [];
  const rein = (e) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].f <= heap[i].f) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const raus = () => {
    const top = heap[0];
    const letzt = heap.pop();
    if (heap.length) {
      heap[0] = letzt;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l].f < heap[m].f) m = l;
        if (r < heap.length && heap[r].f < heap[m].f) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const bester = new Map([[regeln.schluessel(start), 0]]);
  rein({ z: start, g: 0, f: gewicht * regeln.schaetzung(start), weg: null });
  let knoten = 0;
  while (heap.length && knoten < grenze) {
    const e = raus();
    knoten++;
    if (regeln.gewonnen(e.z)) {
      const zuege = [];
      for (let w = e.weg; w; w = w.vor) zuege.push(w.zug);
      return zuege.reverse();
    }
    for (const zug of regeln.liste(e.z)) {
      const n = regeln.anwenden(e.z, zug);
      const key = regeln.schluessel(n);
      const g = e.g + 1;
      if ((bester.get(key) ?? Infinity) <= g) continue;
      bester.set(key, g);
      rein({ z: n, g, f: g + gewicht * regeln.schaetzung(n), weg: { zug, vor: e.weg } });
    }
  }
  return null;
}

/** Zielwert für drei Sterne (10 % Spielraum über der besten gefundenen Lösung). */
export const zielDrei = (ziel) => ziel + Math.floor(ziel / 10);

/** Sterne für eine Lösung mit `zuege` Zügen bei Zielwert `ziel`. */
export function sterne(zuege, ziel) {
  if (zuege <= zielDrei(ziel)) return 3;
  if (zuege <= Math.round(ziel * 1.5)) return 2;
  return 1;
}
