/* Pro4All v2 – yhteinen skripti. Demo: mikään lomake ei lähetä mitään mihinkään. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fi = n => Math.round(n).toLocaleString('fi-FI').replace(/ | /g, ' ');

  /* Muisti sivujen välillä: vain tämän välilehden ajan, ei osoiteriville */
  const KEY = 'p4a-pyynto';
  const muisti = {
    lue() { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
    lisaa(o) { try { sessionStorage.setItem(KEY, JSON.stringify({ ...this.lue(), ...o })); } catch (e) {} },
    tyhjenna() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  };

  /* Valikko */
  const menuBtn = $('.menu-btn'), nav = $('#valikko');
  if (menuBtn && nav) {
    const setMenu = open => { nav.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Sulje valikko' : 'Avaa valikko'); if (open) { const eka = nav.querySelector('a'); if (eka) eka.focus(); } };
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  }

  /* Linkit, jotka kertovat remontin tyypin seuraavalle sivulle */
  $$('a[data-tyyppi]').forEach(a => a.addEventListener('click', () => muisti.lisaa({ tyyppi: a.dataset.tyyppi, kuvaus: '' })));
  $$('a[href$="tarjouspyynto.html"]:not([data-tyyppi])').forEach(a => a.addEventListener('click', () => muisti.lisaa({ kuvaus: '' })));

  /* Etusivun ensinäkymä: ennen → jälkeen */
  const hero = $('[data-hero]');
  if (hero) {
    const media = $('.hero-media', hero), segBtns = $$('.seg button', hero);
    let wipeTimer;
    const setHero = (state, animate) => {
      hero.dataset.state = state;
      segBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.tila === state));
      if (!animate) media.style.transition = 'none';
      else { hero.classList.add('is-wiping'); clearTimeout(wipeTimer); wipeTimer = setTimeout(() => hero.classList.remove('is-wiping'), 2000); }
      media.style.setProperty('--rev', state === 'jalkeen' ? '100%' : '0%');
      if (!animate) { void media.offsetWidth; media.style.transition = ''; }
    };
    segBtns.forEach(b => b.addEventListener('click', () => setHero(b.dataset.tila, !reduce)));
    const imgs = $$('img', media);
    const ready = Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })));
    const waited = Promise.race([ready, new Promise(r => setTimeout(r, 3000))]);
    if (reduce) { setHero('jalkeen', false); hero.classList.add('is-ready'); }
    else {
      setHero('ennen', false);
      waited.then(() => { hero.classList.add('is-ready'); setTimeout(() => { if (hero.dataset.state === 'ennen') setHero('jalkeen', true); }, 900); });
    }
  }

  /* Ennen–jälkeen-vertailu */
  $$('[data-ba]').forEach(ba => {
    const range = $('input', ba);
    let touched = false;
    const set = v => ba.style.setProperty('--pos', v + '%');
    set(range.value);
    range.addEventListener('input', () => { touched = true; set(range.value); });
    if (reduce || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 2200, mid = +range.value;
      const tick = now => {
        if (touched) return;
        const t = Math.min(1, (now - t0) / dur);
        const v = mid + Math.sin(t * Math.PI * 2) * 16 * (1 - t * .25);
        set(v);
        if (t < 1) requestAnimationFrame(tick); else set(mid);
      };
      requestAnimationFrame(tick);
    }, { threshold: .5 });
    io.observe(ba);
  });

  /* Vaihesarja: kuva vaihtuu sen mukaan, mikä vaihe on luettavana */
  $$('[data-seq]').forEach(seq => {
    const imgs = $$('.seq-stage img', seq), steps = $$('.seq-steps > li', seq);
    const nimi = $('[data-seq-nimi]', seq), bar = $('.seq-hud .ticks', seq);
    let cur = -1;
    const show = i => {
      if (i === cur) return; cur = i;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      if (nimi) nimi.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(steps.length).padStart(2, '0') + '  ' + steps[i].dataset.nimi;
      if (bar) bar.style.setProperty('--p', (i + 1) / steps.length);
    };
    show(0);
    let raf = 0;
    const upd = () => {
      raf = 0;
      const line = innerWidth <= 900 ? innerHeight * .72 : innerHeight * .55;
      let best = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) best = i; });
      show(best);
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd);
    upd();
  });

  /* Vaiheiden mittaviiva täyttyy vierittäessä */
  $$('[data-steps]').forEach(steps => {
    let raf = 0;
    const upd = () => { raf = 0; const r = steps.getBoundingClientRect(); const p = (innerHeight * .62 - r.top) / r.height; steps.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3)); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd);
    upd();
  });

  /* Tarkistukset */
  const ok = {
    nimi: v => /\p{L}{2,}/u.test(v.trim()),
    puhelin: v => { const d = v.replace(/[^\d]/g, ''); return /^[+\d][\d\s()-]*$/.test(v.trim()) && d.length >= 7 && d.length <= 15; },
    sahkoposti: v => v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
  };
  const merkitse = (el, bad) => {
    const box = el.closest('.cell') || el.closest('.fg') || el;
    el.classList.toggle('is-bad', bad); if (box !== el) box.classList.toggle('is-bad', bad);
    el.setAttribute('aria-invalid', bad);
  };
  const tarkista = (form, kentat) => {
    let first = null;
    kentat.forEach(n => { const el = form.elements[n]; if (!el) return; const bad = !ok[n](el.value); merkitse(el, bad); if (bad && !first) first = el; });
    return first;
  };
  /* Virhe poistuu heti, kun kenttä on korjattu */
  document.addEventListener('input', e => {
    const el = e.target; if (!el.name || !ok[el.name] || el.getAttribute('aria-invalid') !== 'true') return;
    if (ok[el.name](el.value)) {
      merkitse(el, false);
      const m = el.form && $('[data-viesti]', el.form), jaljella = el.form && $('[aria-invalid="true"]', el.form);
      if (m && !jaljella) { m.textContent = m.dataset.oletus || ''; m.classList.remove('err'); }
      else if (m && jaljella) m.textContent = jaljella.name === 'nimi' ? 'Kirjoita nimesi.' : 'Tarkista puhelinnumero.';
    }
  });

  /* Etusivun tarjouspalkki: tiedot mukaan ja polun toiseen vaiheeseen */
  const pika = $('[data-pikalomake]');
  if (pika) {
    const msg = $('[data-viesti]', pika); msg.dataset.oletus = msg.textContent;
    pika.addEventListener('submit', e => {
      e.preventDefault();
      const bad = tarkista(pika, ['nimi', 'puhelin']);
      if (bad) { msg.textContent = bad.name === 'nimi' ? 'Kirjoita nimesi.' : 'Tarkista puhelinnumero.'; msg.classList.add('err'); bad.focus(); return; }
      muisti.lisaa({ kuvaus: '', tyyppi: pika.elements.tyyppi.value, nimi: pika.elements.nimi.value.trim(), puhelin: pika.elements.puhelin.value.trim(), vaihe: 2 });
      location.href = pika.dataset.kohde;
    });
  }

  /* Soittopyyntö */
  $$('[data-soitto]').forEach(f => {
    const msg = $('[data-viesti]', f);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const bad = tarkista(f, ['puhelin']);
      if (bad) { msg.textContent = 'Tarkista puhelinnumero.'; msg.classList.add('err'); bad.focus(); return; }
      const aika = (f.elements.aika && f.elements.aika.value) || '';
      const valmis = $('[data-soitto-ok]', f.parentElement);
      $('[data-soitto-aika]', valmis).textContent = aika ? aika.toLowerCase() : 'sopivana aikana';
      const alku = $('[data-soitto-alku]', f.parentElement); if (alku) alku.hidden = true;
      f.hidden = true; valmis.hidden = false; valmis.focus();
    });
  });

  /* Kuvat: pysyvät selaimessa, mitään ei ladata palvelimelle */
  const MAX = 8;
  let photos = [];
  const fileInput = $('[data-tiedostot]');
  const makeThumb = (p, removable) => {
    const d = document.createElement('div'); d.className = 'thumb';
    const i = document.createElement('img'); i.src = p.url; i.alt = 'Liitetty kuva: ' + p.name; d.append(i);
    if (removable) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Poista kuva ' + p.name);
      b.addEventListener('click', () => { URL.revokeObjectURL(p.url); photos = photos.filter(x => x !== p); renderThumbs(); });
      d.append(b);
    }
    return d;
  };
  const renderThumbs = () => {
    $$('[data-thumbs]').forEach(box => box.replaceChildren(...photos.map(p => makeThumb(p, true))));
    $$('[data-kuvalaskuri]').forEach(el => { el.textContent = photos.length ? photos.length + ' / ' + MAX + ' kuvaa liitetty.' : el.dataset.oletus; });
  };
  if (fileInput) {
    $$('[data-kuvalaskuri]').forEach(el => { el.dataset.oletus = el.textContent; });
    const addFiles = files => { for (const f of files) { if (photos.length >= MAX) break; if (!f.type.startsWith('image/')) continue; photos.push({ name: f.name, url: URL.createObjectURL(f) }); } renderThumbs(); };
    $$('[data-lisaa-kuvia]').forEach(b => b.addEventListener('click', () => fileInput.click()));
    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
    $$('[data-drop]').forEach(drop => {
      ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
      drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    });
  }

  /* Vaiheittainen tarjouspyyntö */
  const wiz = $('[data-wiz]');
  if (wiz) {
    const steps = $$('.wiz-step', wiz), bars = $$('.wiz-bar li', wiz), viim = steps.length;
    const val = n => { const el = wiz.elements[n]; return el ? (el.value || '').trim() : ''; };
    let cur = 1;
    const go = (n, focus = true) => {
      cur = n;
      steps.forEach(s => s.classList.toggle('is-on', +s.dataset.step === n));
      bars.forEach((b, i) => { b.classList.toggle('is-on', i + 1 === n); b.classList.toggle('is-done', i + 1 < n); if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      $('.wiz-bar', wiz).hidden = n === viim;
      if (focus) { const h = $('.h2', steps[n - 1]); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); wiz.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    };
    const stepOk = n => {
      if (n === 1) { const fg = $('[data-step="1"] .fg', wiz), bad = !val('tyyppi'); fg.classList.toggle('is-bad', bad); if (bad) { $('input[name="tyyppi"]', wiz).focus({ preventScroll: true }); $('.f-err', fg).scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); return false; } }
      if (n === 4) { const bad = tarkista(wiz, ['nimi', 'puhelin', 'sahkoposti']); if (bad) { bad.focus(); return false; } }
      return true;
    };
    $$('[data-next]', wiz).forEach(b => b.addEventListener('click', () => { if (stepOk(cur)) go(cur + 1); }));
    $$('[data-prev]', wiz).forEach(b => b.addEventListener('click', () => go(cur - 1)));
    $$('input[name="tyyppi"]', wiz).forEach(r => {
      r.addEventListener('change', () => $('[data-step="1"] .fg', wiz).classList.remove('is-bad'));
      r.addEventListener('click', e => { if (e.detail > 0 && cur === 1) setTimeout(() => go(2), reduce ? 0 : 260); });
    });
    /* Vaihe 2: kerro heti, mitä talotyyppi ja ikä tarkoittavat. Vaihe 3: kuvausohje remontin mukaan. */
    const huomiot = () => {
      const talo = val('talo'), vuosi = val('vuosi');
      const yhtio = talo === 'Kerrostalo' || talo === 'Rivi- tai paritalo';
      const vanha = !!vuosi && !vuosi.startsWith('1994');
      const a = $('[data-huomio="taloyhtio"]', wiz), b = $('[data-huomio="asbesti"]', wiz), box = $('[data-huomiot]', wiz);
      if (a) a.hidden = !yhtio; if (b) b.hidden = !vanha; if (box) box.hidden = !(yhtio || vanha);
      return [yhtio ? 'muutostyöilmoitus taloyhtiölle' : '', vanha ? 'asbestikartoitus ennen purkua' : ''].filter(Boolean);
    };
    const ohje = () => { const kylpy = val('tyyppi') === 'Kylpyhuone tai WC'; $$('[data-ohje]', wiz).forEach(el => { el.hidden = (el.dataset.ohje === 'kylpy') !== kylpy; }); };
    wiz.addEventListener('change', () => { huomiot(); ohje(); });

    /* Muilta sivuilta tuodut tiedot */
    const m = muisti.lue();
    if (m.tyyppi) { const r = $$('input[name="tyyppi"]', wiz).find(x => x.value === m.tyyppi); if (r) r.checked = true; }
    ['nimi', 'puhelin', 'kuvaus'].forEach(n => { if (m[n] && wiz.elements[n]) wiz.elements[n].value = m[n]; });
    huomiot(); ohje();
    if (m.vaihe === 2 && val('tyyppi')) { muisti.lisaa({ vaihe: 0 }); go(2, false); }

    const rivi = (k, v) => { const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; d.append(dt, dd); return d; };
    const tiedot = () => {
      const r = [['Remontti', val('tyyppi')]];
      const kohde = [val('talo'), val('vuosi'), val('paikkakunta')].filter(Boolean).join(', ');
      if (kohde) r.push(['Kohde', kohde]);
      const h = huomiot(); if (h.length) r.push(['Huomioitavaa', h.join(', ')]);
      if (val('ajankohta')) r.push(['Ajankohta', val('ajankohta')]);
      if (val('kuvaus')) r.push(['Kuvaus', val('kuvaus')]);
      r.push(['Kuvia', photos.length ? photos.length + ' kpl' : 'Ei liitetty']);
      r.push(['Nimi', val('nimi')], ['Puhelin', val('puhelin')]);
      if (val('sahkoposti')) r.push(['Sähköposti', val('sahkoposti')]);
      if (val('tapa')) r.push(['Yhteydenotto', val('tapa')]);
      return r;
    };
    wiz.addEventListener('submit', e => {
      e.preventDefault();
      if (cur !== 4) { if (stepOk(cur)) go(Math.min(cur + 1, 4)); return; }
      if (!stepOk(4)) return;
      const r = tiedot();
      $('[data-yhteenveto]', wiz).replaceChildren(...r.filter(x => !['Nimi', 'Puhelin', 'Sähköposti'].includes(x[0])).map(x => rivi(...x)));
      $('[data-kiitos-nimi]', wiz).textContent = val('nimi').split(/\s+/)[0];
      const dlg = $('[data-posti]');
      if (dlg) {
        $('[data-k-aihe]', dlg).textContent = 'Tarjouspyyntö: ' + val('tyyppi') + ' – ' + val('nimi');
        $('[data-k-rivit]', dlg).replaceChildren(...r.map(x => rivi(...x)));
        $('[data-k-kuvat]', dlg).replaceChildren(...photos.map(p => makeThumb(p, false)));
      }
      muisti.tyhjenna();
      go(viim);
    });
    const dlg = $('[data-posti]');
    if (dlg) {
      $$('[data-nayta-posti]').forEach(b => b.addEventListener('click', () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }));
      $$('[data-sulje]', dlg).forEach(b => b.addEventListener('click', () => dlg.close()));
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    }
  }

  /* Keittiösivun valinnat mukaan tarjouspyyntöön */
  const valinnat = $('[data-valinnat]');
  if (valinnat) {
    valinnat.addEventListener('submit', e => e.preventDefault());
    $('[data-vie]', valinnat).addEventListener('click', () => {
      const rivit = $$('fieldset', valinnat).map(fs => { const c = $('input:checked', fs); return c ? $('legend', fs).textContent.trim() + ': ' + c.value : null; }).filter(Boolean);
      muisti.lisaa({ tyyppi: 'Keittiö', kuvaus: rivit.join('\n'), vaihe: 2 });
      location.href = valinnat.dataset.kohde;
    });
  }

  /* Kotitalousvähennyslaskuri: luvut tulevat HTML:n data-attribuuteista (lähde vero.fi) */
  const kv = $('[data-kv]');
  if (kv) {
    const pros = +kv.dataset.pros / 100, max = +kv.dataset.max, oma = +kv.dataset.oma;
    const luku = kv.elements.tyo, liuku = kv.elements.tyoliuku, out = k => $('[data-kv-' + k + ']', kv);
    const laske = () => {
      const raaka0 = String(luku.value).replace(/[\s\u00a0€]/g, '').replace(',', '.');
      const n = /^\d+(\.\d+)?$/.test(raaka0) ? parseFloat(raaka0) : NaN;
      const fg = luku.closest('.fg'); if (fg) fg.classList.toggle('is-bad', raaka0 !== '' && isNaN(n));
      const w = Math.round(Math.max(0, Math.min(100000, isNaN(n) ? 0 : n)));
      if (document.activeElement !== liuku) liuku.value = Math.max(+liuku.min, Math.min(+liuku.max, w));
      const kaksi = kv.elements.maksajia.value === '2';
      const raaka = w * pros - oma;
      const a = Math.max(0, Math.min(max, raaka));
      const b = kaksi ? Math.max(0, Math.min(max, raaka - a - oma)) : 0;
      const yht = a + b;
      out('yht').textContent = fi(yht) + ' €';
      out('tyo').textContent = fi(w) + ' €';
      out('jaa').textContent = fi(w - yht) + ' €';
      out('b-rivi').hidden = !kaksi; out('kaksi').hidden = !kaksi;
      out('a').textContent = fi(a) + ' €';
      out('b').textContent = fi(b) + ' €';
      out('katto').hidden = !(a >= max && (!kaksi || b >= max));
    };
    luku.addEventListener('input', laske);
    liuku.addEventListener('input', () => { luku.value = liuku.value; laske(); });
    $$('input[name="maksajia"]', kv).forEach(r => r.addEventListener('change', laske));
    kv.addEventListener('submit', e => e.preventDefault());
    laske();
  }

  /* Lisäosa: hinta-arvio esimerkkiluvuilla (luvut HTML:n data-attribuuteissa) */
  const arvio = $('[data-arvio]');
  if (arvio) {
    const laske = () => {
      const tila = $('input[name="tila"]:checked', arvio), laaj = $('input[name="laajuus"]:checked', arvio), m2 = +arvio.elements.koko.value;
      const keski = (+tila.dataset.pohja + +tila.dataset.m2 * m2) * +laaj.dataset.kerroin;
      const tyo = keski * +tila.dataset.tyo;
      $('[data-arvio-koko]', arvio).textContent = String(m2).replace('.', ',') + ' m²';
      $('[data-arvio-ala]', arvio).textContent = fi(Math.round(keski * .88 / 100) * 100);
      $('[data-arvio-yla]', arvio).textContent = fi(Math.round(keski * 1.15 / 100) * 100);
      $('[data-arvio-tyo]', arvio).textContent = fi(Math.round(tyo / 100) * 100) + ' €';
    };
    arvio.addEventListener('input', laske);
    arvio.addEventListener('submit', e => e.preventDefault());
    laske();
  }

  /* Kiinteä toimintopalkki puhelimessa: piiloon, kun lomake tai tarjousosio on näkyvissä */
  const dock = $('[data-dock]');
  if (dock && 'IntersectionObserver' in window) {
    const seen = new Map(), kohteet = $$('[data-dock-piiloon]');
    const io = new IntersectionObserver(es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); dock.classList.toggle('is-on', ![...seen.values()].some(Boolean)); }, { threshold: 0 });
    kohteet.forEach(el => { seen.set(el, false); io.observe(el); });
    if (!kohteet.length) dock.classList.add('is-on');
  }
})();
