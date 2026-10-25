/* ============================================================
   WÄSCHE · game.js – Farben in Körbe stapeln
   Regeln + Löser: ../assets/sortieren/engine.js (korb*)
   Levelkarte, Rückgängig, Tipp, Sterne: ../assets/sortieren/rahmen.js
   ============================================================ */
import { sortierspiel } from "./assets/sortieren/rahmen.js";
import {
  korbStart,
  korbZuege,
  korbZugGrund,
  korbMenge,
  gruppe,
  istKlammer,
  fertigerKorb,
} from "./assets/sortieren/engine.js";
import { shirt, socke, klammer, bullauge, farbName } from "./assets/sortieren/symbole.js";
import { LEVELS } from "./levels.js";

const ort = (z, i) => (istKlammer(z, i) ? `Klammer ${i - z.n + 1}` : `Korb ${i + 1}`);
const teilWort = (l, n) => (l.socken ? (n === 1 ? "Socke" : "Socken") : n === 1 ? "Teil" : "Teile");

/** Verständlicher Satz zu einem unerlaubten Zug. */
function grundText(z, a, b, grund, level) {
  const fa = farbName(z.t[a][z.t[a].length - 1] ?? 0);
  switch (grund) {
    case "farbe": {
      const fb = farbName(z.t[b][z.t[b].length - 1]);
      return `${fa} darf nur auf ${fa} oder in einen leeren Korb – oben in ${ort(z, b)} liegt ${fb}.`;
    }
    case "voll":
      return `${ort(z, b)} ist schon voll – es passen nur ${z.k} ${teilWort(level, z.k)} hinein.`;
    case "klammer-belegt":
      return `An ${ort(z, b)} hängt schon etwas – an jede Klammer passt nur ein Teil.`;
    case "fertig":
      return `${ort(z, a)} ist schon in der Waschmaschine – fertige Körbe bleiben zu.`;
    case "leer":
      return `${ort(z, a)} ist leer – tippe zuerst einen Korb mit Wäsche an.`;
    default:
      return "";
  }
}

let frisch = -1; // Korb, der gerade fertig wurde (Trommel dreht sich)

const api = sortierspiel({
  spiel: "waesche",
  name: "Wäsche",
  levels: LEVELS,
  regeln: korbZuege,
  start: korbStart,
  kapitel: ["Erste Ladung", "Buntwäsche", "Leinen los", "Großer Waschtag", "Wäscheberg"],
  migration: { welt: "waesche" },
  markierung: (l) => (l.socken ? { zeichen: "🧦", text: "Socken-Level" } : null),
  titelZusatz: (l) => (l.socken ? " · Socken" : ""),
  siegTitel: "ALLES GEWASCHEN!",

  einfuehrung(l, ausHilfe) {
    const leine = l.l
      ? ` An der Wäscheleine hängen ${l.l === 1 ? "eine Klammer" : `${l.l} Klammern`}: Dort passt je ein Teil beliebiger Farbe zum Zwischenparken – am Ende muss die Leine leer sein.`
      : "";
    if (ausHilfe)
      return {
        titel: "So geht's",
        text: `Tippe einen Korb an, dann einen anderen: Die oberen ${l.socken ? "Socken" : "Teile"} gleicher Farbe wandern mit, soweit Platz ist. Ablegen darfst du nur in einen leeren Korb oder auf dieselbe Farbe. Ein voller, farbreiner Korb kommt in die Waschmaschine und ist fertig.${leine}`,
      };
    if (l.n === 1)
      return {
        titel: "Willkommen am Waschtag!",
        text: "Tippe einen Korb an – die oberen Teile gleicher Farbe heben sich. Tippe dann einen anderen Korb, um sie dort abzulegen. Erlaubt ist das nur in einen leeren Korb oder auf dieselbe Farbe. Ist ein Korb voll und einfarbig, kommt er in die Waschmaschine.",
      };
    if (l.n === 10)
      return {
        titel: "Socken-Level!",
        text: "Socken kommen paarweise: Immer zwei gleiche gehören in ein Körbchen. Sonst gelten dieselben Regeln.",
      };
    if (l.n === 11)
      return {
        titel: "Neu: die Wäscheleine",
        text: "Unter den Körben hängt jetzt eine Leine mit einer Klammer. Dort passt genau ein Teil – egal welche Farbe. Praktisch zum Zwischenparken! Aber Achtung: Zum Gewinnen muss die Leine am Ende wieder leer sein.",
      };
    if (l.n === 31)
      return {
        titel: "Zwei Klammern",
        text: "Ab jetzt hängen zwei Klammern an der Leine – dafür gibt es weniger leere Körbe.",
      };
    return null;
  },

  zugText(zug, api) {
    const z = api.zustand;
    const [a, b] = zug;
    const m = korbMenge(z, a, b);
    const was = `${m} × ${farbName(z.t[a][z.t[a].length - 1])}`;
    if (istKlammer(z, b)) return `${was} aus ${ort(z, a)} an ${ort(z, b)} hängen`;
    if (istKlammer(z, a)) return `${farbName(z.t[a][0])} von ${ort(z, a)} in ${ort(z, b)}`;
    return `${was} von ${ort(z, a)} in ${ort(z, b)}`;
  },

  nachZug(vorher, nachher, [, b], api) {
    frisch = -1;
    if (
      !istKlammer(nachher, b) &&
      fertigerKorb(nachher.t[b], nachher.k) &&
      !fertigerKorb(vorher.t[b], vorher.k)
    ) {
      frisch = b;
      if (!korbZuege.gewonnen(nachher)) {
        api.meldung(
          `${ort(nachher, b)} ist voll ${farbName(nachher.t[b][0])} – ab in die Waschmaschine!`,
        );
        api.ansagen(`${ort(nachher, b)} ist fertig.`);
      }
    }
  },
  zurueck() {
    frisch = -1;
  },

  tasten(e, api) {
    if (!/^[1-9]$/.test(e.key)) return false;
    const i = Number(e.key) - 1;
    if (i < api.zustand.n) {
      e.preventDefault();
      klick(i);
    }
    return true;
  },

  zeichnen,
});

/* ---------- Bedienung: antippen, dann Ziel antippen ---------- */
function klick(i) {
  if (api.fertig) return;
  const z = api.zustand;
  const el = api.brett.querySelector(`[data-i="${i}"]`);
  if (api.auswahl === null) {
    const grund = korbZugGrund(z, i, i === 0 ? 1 : 0);
    if (grund === "leer" || grund === "fertig")
      return api.fehler(grundText(z, i, i, grund, api.level), el);
    api.auswahl = i;
    api.meldung("");
    api.ansagen(
      `${ort(z, i)} gewählt: ${istKlammer(z, i) ? 1 : gruppe(z.t[i])} × ${farbName(z.t[i][z.t[i].length - 1])}. Jetzt das Ziel wählen.`,
    );
    return api.neuZeichnen();
  }
  const a = api.auswahl;
  if (a === i) {
    api.auswahl = null;
    return api.neuZeichnen();
  }
  const grund = korbZugGrund(z, a, i);
  if (grund) {
    api.auswahl = null;
    api.neuZeichnen();
    return api.fehler(
      grundText(z, a, i, grund, api.level),
      api.brett.querySelector(`[data-i="${i}"]`),
    );
  }
  api.ziehen([a, i]);
}

api.brett.addEventListener("click", (e) => {
  const b = e.target.closest("[data-i]");
  if (b) klick(Number(b.dataset.i));
});

/* ---------- Zeichnen ---------- */
function zeichnen(api, letzterZug) {
  const z = api.zustand;
  const l = api.level;
  const bild = l.socken ? socke : shirt;
  const [tVon, tNach] = api.tipp ?? [-1, -1];
  const neuIn = letzterZug ? letzterZug[1] : -1;
  const neuAnzahl = letzterZug
    ? api.verlauf.at(-1).zustand.t[letzterZug[0]].length - z.t[letzterZug[0]].length
    : 0;

  const koerbe = document.createElement("div");
  koerbe.className = "koerbe";
  for (let i = 0; i < z.n; i++) {
    const korb = z.t[i];
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.i = i;
    b.className = "korb";
    b.style.setProperty("--k", z.k);
    const fertig = fertigerKorb(korb, z.k);
    if (l.socken) b.classList.add("socken");
    if (fertig) b.classList.add("gewaschen");
    if (fertig && i === frisch && letzterZug) b.classList.add("frisch");
    if (api.auswahl === i) b.classList.add("gewaehlt");
    if (i === tVon) b.classList.add("tipp-von");
    if (i === tNach) b.classList.add("tipp-nach");
    const hoch = api.auswahl === i ? gruppe(korb) : 0;
    korb.forEach((s, j) => {
      const t = document.createElement("span");
      t.className = "teil";
      if (j >= korb.length - hoch) t.classList.add("hoch");
      if (i === neuIn && j >= korb.length - neuAnzahl) t.classList.add("neu");
      t.innerHTML = bild(s);
      b.append(t);
    });
    if (fertig) {
      const m = document.createElement("span");
      m.className = "maschine";
      m.innerHTML = bullauge();
      b.append(m);
    }
    const nr = document.createElement("span");
    nr.className = "nr";
    nr.textContent = i + 1;
    nr.setAttribute("aria-hidden", "true");
    b.append(nr);
    b.setAttribute(
      "aria-label",
      `Korb ${i + 1}: ` +
        (korb.length ? `von unten ${korb.map(farbName).join(", ")}` : "leer") +
        (fertig ? ", gewaschen" : `, ${z.k - korb.length} frei`) +
        (api.auswahl === i ? ", gewählt" : ""),
    );
    b.setAttribute("aria-pressed", api.auswahl === i ? "true" : "false");
    koerbe.append(b);
  }
  const teile = [koerbe];

  if (z.t.length > z.n) {
    const leine = document.createElement("div");
    leine.className = "leine";
    const titel = document.createElement("span");
    titel.className = "leine-titel";
    titel.textContent = "Wäscheleine";
    titel.setAttribute("aria-hidden", "true");
    leine.append(titel);
    for (let i = z.n; i < z.t.length; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.i = i;
      b.className = "leine-platz";
      if (api.auswahl === i) b.classList.add("gewaehlt");
      if (i === tVon) b.classList.add("tipp-von");
      if (i === tNach) b.classList.add("tipp-nach");
      if (i === neuIn) b.classList.add("neu");
      b.innerHTML = `<span class="klammer">${klammer()}</span>`;
      if (z.t[i].length) {
        const t = document.createElement("span");
        t.className = "teil";
        t.innerHTML = bild(z.t[i][0]);
        b.append(t);
      }
      b.setAttribute(
        "aria-label",
        `${ort(z, i)} an der Wäscheleine: ${z.t[i].length ? farbName(z.t[i][0]) : "frei"}${api.auswahl === i ? ", gewählt" : ""}`,
      );
      b.setAttribute("aria-pressed", api.auswahl === i ? "true" : "false");
      leine.append(b);
    }
    teile.push(leine);
  }
  // Fokus behalten (Tastaturbedienung)
  const fokus = document.activeElement?.closest?.("[data-i]")?.dataset.i;
  api.brett.replaceChildren(...teile);
  if (fokus !== undefined)
    api.brett.querySelector(`[data-i="${fokus}"]`)?.focus({ preventScroll: true });
}
