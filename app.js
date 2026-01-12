(() => {
  const els = {
    chainring: document.getElementById('chainring'),
    cog: document.getElementById('cog'),
    cadence: document.getElementById('cadence'),
    wheelPreset: document.getElementById('wheelPreset'),
    bsdMm: document.getElementById('bsdMm'),
    tireMm: document.getElementById('tireMm'),
    rpmFrom: document.getElementById('rpmFrom'),
    rpmTo: document.getElementById('rpmTo'),
    rpmStep: document.getElementById('rpmStep'),
    btnCalc: document.getElementById('btnCalc'),
    btnCSV: document.getElementById('btnCSV'),
    status: document.getElementById('status'),
    summaryPill: document.getElementById('summaryPill'),
    speedKmh: document.getElementById('speedKmh'),
    paceMinKm: document.getElementById('paceMinKm'),
    paceMinMile: document.getElementById('paceMinMile'),
    devM: document.getElementById('devM'),
    table: document.getElementById('table'),
  };

  const presets = {
    "700c-25": { bsd: 622, tire: 25 },
    "700c-28": { bsd: 622, tire: 28 },
    "700c-32": { bsd: 622, tire: 32 },
    "700c-35": { bsd: 622, tire: 35 },
    "650b-47": { bsd: 584, tire: 47 },
    "29-2.25": { bsd: 622, tire: 57 },
    "27.5-2.35": { bsd: 584, tire: 60 },
    "custom": null
  };

  let lastTableRows = [];
  let lastMeta = null;

  function setStatus(msg, type = "") {
    els.status.className = `status ${type}`.trim();
    els.status.textContent = msg || "";
  }

  function wheelMetrics(bsdMm, tireMm) {
    const diameterMm = bsdMm + 2 * tireMm;
    const circumferenceMm = Math.PI * diameterMm;
    return {
      diameterMm,
      circumferenceM: circumferenceMm / 1000
    };
  }

  function fmt(n, decimals = 1) {
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(decimals);
  }

  function paceMinPerKm(kmh) {
    if (!Number.isFinite(kmh) || kmh <= 0) return null;
    return 60 / kmh;
  }

  function toMinSec(minFloat) {
    if (!Number.isFinite(minFloat) || minFloat <= 0) return "—";
    const totalSeconds = Math.round(minFloat * 60);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function calculatePoint(chainring, cog, cadence, wheel) {
    const ratio = chainring / cog;
    const devM = wheel.circumferenceM * ratio;
    const kmh = devM * cadence * 60 / 1000;
    return { ratio, devM, kmh };
  }

  function buildTable(chainring, cog, wheel, rpmFrom, rpmTo, rpmStep) {
    const rows = [];
    for (let rpm = rpmFrom; rpm <= rpmTo; rpm += rpmStep) {
      const { kmh } = calculatePoint(chainring, cog, rpm, wheel);
      const pace = paceMinPerKm(kmh);
      rows.push({
        rpm,
        kmh,
        paceMinKm: pace
      });
    }
    return rows;
  }

  function renderTable(rows) {
    const tbody = els.table.querySelector('tbody');
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="muted center">Ingen data</td></tr>`;
      return;
    }

    for (const r of rows) {
      const tr = document.createElement('tr');

      const td1 = document.createElement('td');
      td1.textContent = String(r.rpm);

      const td2 = document.createElement('td');
      td2.textContent = fmt(r.kmh, 1);

      const td3 = document.createElement('td');
      td3.textContent = toMinSec(r.paceMinKm);

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);

      tbody.appendChild(tr);
    }
  }

  function csvEscape(s) {
    const str = String(s ?? "");
    if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  function toCSV(rows, meta) {
    const lines = [];
    lines.push(`Chainring,${meta.chainring}`);
    lines.push(`Cog,${meta.cog}`);
    lines.push(`BSDmm,${meta.bsdMm}`);
    lines.push(`Tiremm,${meta.tireMm}`);
    lines.push(`WheelCircumferenceM,${meta.wheelCircM}`);
    lines.push(`RPM_from,${meta.rpmFrom}`);
    lines.push(`RPM_to,${meta.rpmTo}`);
    lines.push(`RPM_step,${meta.rpmStep}`);
    lines.push("");

    lines.push("RPM,SpeedKmh,PaceMinPerKm");
    for (const r of rows) {
      lines.push([
        r.rpm,
        fmt(r.kmh, 3),
        (r.paceMinKm == null ? "" : fmt(r.paceMinKm, 6))
      ].join(","));
    }
    return lines.join("\n");
  }

  function download(filename, content, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function validateInts(...vals) {
    return vals.every(v => Number.isFinite(v) && v > 0);
  }

  function calculate() {
    setStatus("");

    const chainring = Number(els.chainring.value);
    const cog = Number(els.cog.value);
    const cadence = Number(els.cadence.value);

    const bsdMm = Number(els.bsdMm.value);
    const tireMm = Number(els.tireMm.value);

    const rpmFrom = Number(els.rpmFrom.value);
    const rpmTo = Number(els.rpmTo.value);
    const rpmStep = Number(els.rpmStep.value);

    if (!validateInts(chainring, cog, cadence, bsdMm, tireMm, rpmFrom, rpmTo, rpmStep)) {
      return setStatus("Tjek dine input: alle felter skal være tal > 0.", "error");
    }
    if (rpmFrom >= rpmTo) return setStatus("RPM fra skal være mindre end RPM til.", "error");
    if (rpmStep <= 0) return setStatus("RPM step skal være > 0.", "error");

    const wheel = wheelMetrics(bsdMm, tireMm);
    const point = calculatePoint(chainring, cog, cadence, wheel);

    els.speedKmh.textContent = fmt(point.kmh, 1);
    els.devM.textContent = fmt(point.devM, 3);

    const paceKm = paceMinPerKm(point.kmh);
    els.paceMinKm.textContent = toMinSec(paceKm);

    const paceMile = paceKm == null ? null : (paceKm * 1.609344);
    els.paceMinMile.textContent = toMinSec(paceMile);

    els.summaryPill.textContent = `${chainring}/${cog} · ${cadence} rpm · ${Math.round(wheel.diameterMm)}mm dia`;

    const rows = buildTable(chainring, cog, wheel, rpmFrom, rpmTo, rpmStep);
    lastTableRows = rows;
    lastMeta = {
      chainring, cog, bsdMm, tireMm,
      wheelCircM: wheel.circumferenceM,
      rpmFrom, rpmTo, rpmStep
    };

    renderTable(rows);

    setStatus("Beregnet.", "ok");
  }

  function bindPresets() {
    els.wheelPreset.addEventListener("change", () => {
      const p = presets[els.wheelPreset.value];
      if (!p) return;
      els.bsdMm.value = String(p.bsd);
      els.tireMm.value = String(p.tire);
    });
  }

  function init() {
    const p = presets[els.wheelPreset.value];
    if (p) {
      els.bsdMm.value = String(p.bsd);
      els.tireMm.value = String(p.tire);
    }

    bindPresets();

    els.btnCalc.addEventListener("click", calculate);

    els.btnCSV.addEventListener("click", () => {
      if (!lastTableRows.length || !lastMeta) {
        return setStatus("Klik “Beregn” før du eksporterer.", "error");
      }
      const csv = toCSV(lastTableRows, lastMeta);
      const stamp = new Date().toISOString().slice(0, 10);
      download(`cadence-speed-${stamp}.csv`, csv, "text/csv");
      setStatus("CSV downloadet.", "ok");
    });
  }

  init();
})();
