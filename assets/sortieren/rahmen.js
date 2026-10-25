/* ============================================================
   SORTIERSPIELE · rahmen.js – alles, was Wäsche, Regale und Gewürze
   gemeinsam haben: Levelkarte in Kapiteln, HUD, Rückgängig, Tipp,
   Fehlermeldungen, Einführungen, Zeitlevel, Siegdialog, Topliste,
   Übernahme des alten Ordnungsliebe-Fortschritts.
   ------------------------------------------------------------
   Jedes Spiel ruft sortierspiel({...}) mit seinen Regeln auf und
   zeichnet nur sein Brett selbst (cfg.zeichnen). Der Rahmen hält den
   Zustand: aktueller Engine-Zustand + Verlauf (für Rückgängig).
   Speicher: ba:<spiel>:sterne = {levelNr: 1..3}, ba:<spiel>:frei
   (Level, die ohne Sterne offen sind – nur aus der Übernahme).
   ============================================================ */

import { lade, speichere, spielZuruecksetzen } from "../storage.js";
import { toplisteAnzeigen, stillEintragen, bewegungReduziert } from "../ui.js";
import { levelGeschafft, dialogKasten } from "../fortschritt.js";
import { loesen, sterne, zielDrei } from "./engine.js";

const $ = (id) => document.getElementById(id);
const sternText = (n) => "★".repeat(n) + "☆".repeat(3 - n);
const zeitText = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function sortierspiel(cfg) {
  const { spiel, levels, regeln } = cfg;
  const MAX = levels.length * 3;
  const el = {
    karte: $("karte"),
    raster: $("level-raster"),
    weiter: $("weiter"),
    kartenText: $("karten-text"),
    spiel: $("spielfeld"),
    brett: $("brett"),
    titel: $("level-titel"),
    hudLevel: $("hud-level"),
    hudZuege: $("hud-zuege"),
    hudZiel: $("hud-ziel"),
    hudZeit: $("hud-zeit"),
    hudZeitLabel: $("hud-zeit-label"),
    hudSterne: $("hud-sterne"),
    meldung: $("meldung"),
    einf: $("einfuehrung"),
    status: $("status"),
    topliste: $("topliste"),
  };

  /* ---------- Fortschritt ---------- */
  function sterneAlle() {
    const s = lade(spiel, "sterne", {});
    return s && typeof s === "object" ? s : {};
  }
  const sterneVon = (n) => Math.max(0, Math.min(3, Number(sterneAlle()[n]) || 0));
  const summe = () => levels.reduce((s, l) => s + sterneVon(l.n), 0);
  const istFrei = (l) =>
    l.n === 1 || sterneVon(l.n - 1) > 0 || l.n <= (Number(lade(spiel, "frei", 0)) || 0);
  const fmt = (p) => `${p} ★`;

  // Alter Stand aus "Ordnungsliebe" (eine Welt = jetzt ein eigenes Spiel), nur einmal
  function uebernehmen() {
    const m = cfg.migration;
    if (!m) return;
    const merker = `migriert-${spiel}`;
    if (lade("ordnungsliebe", merker, false)) return;
    const alt = lade("ordnungsliebe", "sterne", {}) || {};
    const s = sterneAlle();
    let frei = Number(lade(spiel, "frei", 0)) || 0;
    for (const [k, v] of Object.entries(alt)) {
      const [w, nr] = k.split("-");
      const n = Number(nr);
      const st = Math.max(0, Math.min(3, Number(v) || 0));
      if (w !== m.welt || !st || !levels.some((l) => l.n === n)) continue;
      if (m.nurFrei) frei = Math.max(frei, Math.min(levels.length, n + 1));
      else s[n] = Math.max(Number(s[n]) || 0, st);
    }
    speichere(spiel, "sterne", s);
    if (frei) speichere(spiel, "frei", frei);
    speichere("ordnungsliebe", merker, true);
    if (summe() > 0) stillEintragen(spiel, summe());
  }

  function ansagen(text) {
    el.status.textContent = "";
    requestAnimationFrame(() => (el.status.textContent = text));
  }

  /* ============================================================
     Levelkarte: Kapitel zu je 10 Leveln
     ============================================================ */
  function karteZeigen() {
    uhrStopp();
    el.spiel.hidden = true;
    el.karte.hidden = false;
    el.raster.replaceChildren();
    let naechstes = null;
    for (let k = 0; k * 10 < levels.length; k++) {
      const teil = levels.slice(k * 10, k * 10 + 10);
      const sek = document.createElement("section");
      sek.className = "kapitel";
      const st = teil.reduce((s, l) => s + sterneVon(l.n), 0);
      const h = document.createElement("h3");
      h.innerHTML = `<span></span><small></small>`;
      h.firstChild.textContent = `Kapitel ${k + 1} · ${cfg.kapitel?.[k] ?? ""}`;
      h.lastChild.textContent = `${st} / ${teil.length * 3} ★`;
      const reihe = document.createElement("div");
      reihe.className = "level-reihe";
      for (const l of teil) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "level-knopf";
        const frei = istFrei(l);
        const s = sterneVon(l.n);
        const mark = cfg.markierung?.(l);
        b.disabled = !frei;
        if (s) b.classList.add("geschafft");
        if (mark) b.classList.add("sonder");
        b.innerHTML = `<span class="nr"></span><span class="st"></span>`;
        b.firstChild.textContent = frei ? `${l.n}${mark ? " " + mark.zeichen : ""}` : "🔒";
        b.lastChild.textContent = frei ? sternText(s) : "";
        b.setAttribute(
          "aria-label",
          frei
            ? `Level ${l.n}${mark ? ` (${mark.text})` : ""}, ${s} von 3 Sternen`
            : `Level ${l.n}, noch gesperrt`,
        );
        if (mark) b.title = mark.text;
        b.addEventListener("click", () => levelStarten(l));
        if (!naechstes && frei && !s) naechstes = { l, b };
        reihe.append(b);
      }
      sek.append(h, reihe);
      el.raster.append(sek);
    }
    if (naechstes) naechstes.b.classList.add("naechstes");
    const ziel = naechstes?.l ?? null;
    el.weiter.hidden = !ziel;
    if (ziel) {
      el.weiter.textContent = `▶ Weiter mit Level ${ziel.n}`;
      el.weiter.onclick = () => levelStarten(ziel);
    }
    el.kartenText.textContent = `${summe()} von ${MAX} Sternen gesammelt.`;
  }

  /* ============================================================
     Spielfeld
     ============================================================ */
  const api = {
    level: null,
    zustand: null,
    verlauf: [],
    auswahl: null,
    tipp: null,
    fertig: false,
    brett: el.brett,
    ziehen,
    fehler,
    ansagen,
    meldung,
    neuZeichnen: () => zeichnen(),
    get zuege() {
      return api.verlauf.length;
    },
  };
  let uhr = { start: 0, timer: 0, rest: 0, laeuft: false };

  function levelStarten(l) {
    api.level = l;
    api.zustand = cfg.start(l);
    api.verlauf = [];
    api.auswahl = null;
    api.tipp = null;
    api.fertig = false;
    cfg.beimStart?.(api);
    uhrStopp();
    uhr = { start: 0, timer: 0, rest: l.zeit || 0, laeuft: false, verbraucht: 0 };
    el.hudZeitLabel.textContent = l.zeit ? "Zeit übrig" : "Zeit";
    el.hudZeit.textContent = zeitText(l.zeit || 0);
    el.hudZeit.parentElement.classList.toggle("zeitlevel", !!l.zeit);
    el.karte.hidden = true;
    el.spiel.hidden = false;
    el.titel.textContent = `${cfg.name} · Level ${l.n}${cfg.titelZusatz?.(l) ?? ""}`;
    el.hudLevel.textContent = l.n;
    el.hudZiel.textContent = zielDrei(l.ziel);
    el.hudSterne.textContent = sternText(sterneVon(l.n));
    meldung("");
    const e = cfg.einfuehrung?.(l);
    einfuehrung(e);
    zeichnen();
    el.spiel.scrollIntoView({ block: "start", behavior: bewegungReduziert() ? "auto" : "smooth" });
    ansagen(
      `${el.titel.textContent}. Ziel für drei Sterne: höchstens ${el.hudZiel.textContent} Züge.${l.zeit ? ` Zeitlimit ${l.zeit} Sekunden.` : ""}`,
    );
    // Zeitlevel: Uhr läuft, sobald die Einführung weg ist
    if (l.zeit && !e) uhrLos();
  }

  function einfuehrung(e) {
    el.einf.hidden = !e;
    if (!e) return;
    el.einf.replaceChildren();
    const h = document.createElement("strong");
    h.textContent = e.titel;
    const p = document.createElement("p");
    p.textContent = e.text;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "knopf primaer";
    b.textContent = api.level.zeit ? "Los geht's – Uhr starten" : "Verstanden";
    b.addEventListener("click", () => {
      el.einf.hidden = true;
      if (api.level.zeit) uhrLos();
      el.brett.querySelector("button:not(:disabled)")?.focus();
    });
    el.einf.append(h, p, b);
  }

  function meldung(text, art = "") {
    el.meldung.textContent = text;
    el.meldung.hidden = !text;
    el.meldung.className = `meldung ${art}`;
  }

  /** Unerlaubter Zug: Satz anzeigen + betroffene Teile kurz wackeln lassen. */
  function fehler(text, ...elemente) {
    meldung(text, "fehler");
    ansagen(text);
    if (bewegungReduziert()) return;
    for (const e of elemente) {
      if (!e) continue;
      e.classList.remove("wackeln");
      void e.offsetWidth; // Animation neu starten
      e.classList.add("wackeln");
    }
  }

  /* ---------- Uhr ---------- */
  function uhrStopp() {
    clearInterval(uhr.timer);
    if (uhr.laeuft) uhr.verbraucht += (performance.now() - uhr.start) / 1000;
    uhr.timer = 0;
    uhr.laeuft = false;
  }
  const sekunden = () =>
    Math.floor(uhr.verbraucht + (uhr.laeuft ? (performance.now() - uhr.start) / 1000 : 0));
  function uhrLos() {
    if (uhr.laeuft || api.fertig) return;
    uhr.start = performance.now();
    uhr.laeuft = true;
    uhr.timer = setInterval(uhrTick, 250);
  }
  function uhrTick() {
    const s = sekunden();
    if (!api.level.zeit) return (el.hudZeit.textContent = zeitText(Math.min(5999, s)));
    const rest = Math.max(0, api.level.zeit - s);
    el.hudZeit.textContent = zeitText(rest);
    el.hudZeit.parentElement.classList.toggle("knapp", rest <= 10);
    if (rest === 0) zeitUm();
  }
  // Im Hintergrund-Tab läuft keine Zeit weg
  document.addEventListener("visibilitychange", () => {
    if (!api.level || api.fertig || el.spiel.hidden) return;
    if (document.hidden) {
      if (uhr.laeuft) {
        uhrStopp();
        uhr.pausiert = true;
      }
    } else if (uhr.pausiert) {
      uhr.pausiert = false;
      uhrLos();
    }
  });

  /* ---------- Züge ---------- */
  function ziehen(zug) {
    if (api.fertig) return;
    const vorher = api.zustand;
    api.verlauf.push({ zustand: vorher, extra: cfg.merken?.(api) });
    api.zustand = regeln.anwenden(vorher, zug);
    api.auswahl = null;
    api.tipp = null;
    if (!api.level.zeit) uhrLos();
    meldung("");
    cfg.nachZug?.(vorher, api.zustand, zug, api);
    zeichnen(zug);
    if (regeln.gewonnen(api.zustand)) return gewonnen();
    if (!regeln.liste(api.zustand).length) {
      meldung("Keine Züge mehr möglich – nimm Züge zurück (Z) oder starte neu (R).", "fehler");
      ansagen("Keine Züge mehr möglich");
    }
  }

  function rueckgaengig() {
    if (!api.verlauf.length || api.fertig) return;
    const v = api.verlauf.pop();
    api.zustand = v.zustand;
    cfg.zurueck?.(v.extra, api);
    api.auswahl = null;
    api.tipp = null;
    meldung("");
    zeichnen();
    ansagen("Zug zurückgenommen");
  }

  let fsErgebnis = null;
  function gewonnen() {
    api.fertig = true;
    uhrStopp();
    const zuege = api.verlauf.length;
    const st = sterne(zuege, api.level.ziel);
    const vorher = sterneVon(api.level.n);
    if (st > vorher) {
      const alle = sterneAlle();
      alle[api.level.n] = st;
      speichere(spiel, "sterne", alle);
    }
    const ges = summe();
    stillEintragen(spiel, ges);
    try {
      fsErgebnis = levelGeschafft(spiel, { sterne: st, sterneNeu: Math.max(0, st - vorher) });
    } catch {
      fsErgebnis = null;
    }
    el.hudSterne.textContent = sternText(Math.max(st, vorher));
    el.brett.classList.add("feier");
    const zeit = sekunden();
    setTimeout(
      () =>
        dialog({
          titel: cfg.siegTitel ?? "AUFGERÄUMT!",
          gross: sternText(st),
          zeilen: [
            `${zuege} Züge in ${zeitText(Math.min(5999, zeit))}` +
              (st < 3
                ? ` – für drei Sterne höchstens ${zielDrei(api.level.ziel)} Züge.`
                : " – perfekt!"),
            ...(cfg.siegInfo?.(api) ?? []),
            `Sterne gesamt: ${ges} von ${MAX}`,
          ],
          weiter: true,
        }),
      bewegungReduziert() ? 0 : 800,
    );
    ansagen(`Geschafft mit ${zuege} Zügen: ${st} von 3 Sternen.`);
  }

  function zeitUm() {
    api.fertig = true;
    uhrStopp();
    zeichnen();
    dialog({
      titel: "ZEIT UM!",
      gross: "⏱",
      zeilen: [
        `Die ${api.level.zeit} Sekunden sind abgelaufen. Probier es gleich nochmal – du kennst das Regal jetzt schon.`,
      ],
      weiter: false,
    });
    ansagen("Die Zeit ist abgelaufen.");
  }

  function dialog({ titel, gross, zeilen, weiter }) {
    $("spiel-dialog")?.remove();
    const d = document.createElement("dialog");
    d.className = "spiel-dialog";
    d.id = "spiel-dialog";
    d.innerHTML = `<h2></h2><p class="gross sterne-gross"></p><div class="zeilen"></div><div class="aktionen"></div>`;
    d.querySelector("h2").textContent = titel;
    d.querySelector(".gross").textContent = gross;
    for (const z of zeilen) {
      const p = document.createElement("p");
      p.className = "info";
      p.textContent = z;
      d.querySelector(".zeilen").append(p);
    }
    if (weiter && fsErgebnis) {
      try {
        d.querySelector(".zeilen").after(dialogKasten(fsErgebnis));
      } catch {
        /* egal */
      }
      fsErgebnis = null;
    }
    const naechstes = levels.find((x) => x.n === api.level.n + 1);
    const knoepfe = weiter
      ? [
          [naechstes ? "Nächstes Level" : "Alle Level geschafft!", "weiter", true],
          ["Nochmal", "nochmal"],
          ["Levelkarte", "karte"],
        ]
      : [
          ["Nochmal", "nochmal", true],
          ["Levelkarte", "karte"],
        ];
    for (const [text, r, primaer] of knoepfe) {
      const b = document.createElement("button");
      b.className = `knopf${primaer ? " primaer" : ""}`;
      b.dataset.r = r;
      b.textContent = text;
      d.querySelector(".aktionen").append(b);
    }
    d.addEventListener("click", (e) => {
      const r = e.target.closest("[data-r]")?.dataset.r;
      if (!r) return;
      d.close();
      if (r === "weiter" && naechstes) levelStarten(naechstes);
      else if (r === "nochmal") levelStarten(api.level);
      else karteZeigen();
    });
    d.addEventListener("close", () => d.remove());
    document.body.append(d);
    d.showModal();
    toplisteAnzeigen(el.topliste, spiel, fmt);
  }

  /* ---------- Tipp: Löser im Browser ---------- */
  let tippLaeuft = false;
  function tippGeben() {
    if (api.fertig || tippLaeuft) return;
    tippLaeuft = true;
    meldung("Ich überlege …");
    setTimeout(() => {
      let weg = null;
      for (const [gewicht, grenze] of cfg.tippGewichte ?? [
        [2, 25000],
        [5, 25000],
      ]) {
        weg = loesen(api.zustand, regeln, { gewicht, grenze });
        if (weg) break;
      }
      tippLaeuft = false;
      if (!weg) {
        const notfall = cfg.tippNotfall?.(api.zustand);
        if (notfall) {
          api.tipp = notfall;
          meldung(`Tipp: ${cfg.zugText(notfall, api)} – das bringt dich näher ans Ziel.`, "tipp");
          ansagen(`Tipp: ${cfg.zugText(notfall, api)}`);
          return zeichnen();
        }
        meldung("Von hier aus geht es nicht mehr – nimm Züge zurück (Z).", "fehler");
        ansagen("Von hier aus geht es nicht mehr. Nimm Züge zurück.");
        return;
      }
      if (!weg.length) return;
      api.tipp = weg[0];
      meldung(`Tipp: ${cfg.zugText(api.tipp, api)} (noch etwa ${weg.length} Züge)`, "tipp");
      ansagen(`Tipp: ${cfg.zugText(api.tipp, api)}`);
      zeichnen();
    }, 30);
  }

  /* ---------- Zeichnen ---------- */
  function zeichnen(letzterZug = null) {
    el.hudZuege.textContent = api.verlauf.length;
    el.brett.classList.remove("feier");
    cfg.zeichnen(api, letzterZug);
    $("rueck").disabled = !api.verlauf.length || api.fertig;
  }

  /* ---------- Knöpfe + Tastatur ---------- */
  $("rueck").addEventListener("click", rueckgaengig);
  $("tipp").addEventListener("click", tippGeben);
  $("neustart").addEventListener("click", () => levelStarten(api.level));
  $("zur-karte").addEventListener("click", karteZeigen);
  $("hilfe").addEventListener("click", () => {
    const e = cfg.einfuehrung?.(api.level, true);
    if (e) {
      uhrStopp();
      einfuehrung(e);
      el.einf.scrollIntoView({ block: "nearest" });
    }
  });
  $("reset").addEventListener("click", () => {
    if (!confirm(`Alle Sterne und den Fortschritt von ${cfg.name} löschen?`)) return;
    spielZuruecksetzen(spiel);
    toplisteAnzeigen(el.topliste, spiel, fmt);
    karteZeigen();
  });

  document.addEventListener("keydown", (e) => {
    if (el.spiel.hidden || e.target.closest("input, textarea, dialog")) return;
    if (cfg.tasten?.(e, api)) return;
    if (e.key === "z" || e.key === "Z" || (e.key === "Backspace" && !e.target.closest("button"))) {
      e.preventDefault();
      rueckgaengig();
    } else if (e.key === "h" || e.key === "H") tippGeben();
    else if (e.key === "r" || e.key === "R") levelStarten(api.level);
    else if (e.key === "Escape") {
      api.auswahl = null;
      zeichnen();
    }
  });

  uebernehmen();
  toplisteAnzeigen(el.topliste, spiel, fmt);
  karteZeigen();
  return api;
}
