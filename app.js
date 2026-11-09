'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'pao-fraterno-prototipo-v1';
const pages = ['lg', 'c1', 'c2', 'c3', 'c4', 'v2', 'v3', 'v4'];
const foods = ['Feijão', 'Legumes', 'Macarrão', 'Outro'];
const goals = [50, 40, 40];
const stops = [
  { name: 'Praça XV', meals: 30, distance: '350 m · 4 min a pé' },
  { name: 'Terminal Norte', meals: 20, distance: '650 m · 8 min a pé' },
  { name: 'Av. Central', meals: 15, distance: '450 m · 6 min a pé' },
  { name: 'Praça da Sé', meals: 10, distance: '300 m · 4 min a pé' },
  { name: 'Viaduto Norte', meals: 10, distance: '500 m · 7 min a pé' },
];
const app = document.querySelector('#app');
const noticeElement = document.querySelector('#notice');
let page;
let revision = 0;
let noticeTimer;
let selectedFood = 0;
let quantity = 25;
let expiry = futureDate();
let count = 24;
const templates = new Map();

function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return localDate(date);
}
function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function initialState() {
  return { stock: [25, 34, 12, 0], donations: [], approved: false, deliveries: [], startedAt: null, finished: false };
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.stock) && saved.stock.length === 4 &&
        saved.stock.every(n => Number.isFinite(n) && n >= 0) &&
        Array.isArray(saved.donations) && Array.isArray(saved.deliveries) &&
        saved.deliveries.length <= stops.length && saved.deliveries.every(d => Number.isInteger(d.count) && d.count >= 0)) {
      return { ...initialState(), ...saved };
    }
  } catch { /* Navegação privada ou dados antigos: iniciar demonstração. */ }
  return initialState();
}
let state = loadState();
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { notify('Dados mantidos nesta sessão. O navegador não permitiu salvar no dispositivo.'); }
}
function notify(message) {
  const notice = noticeElement;
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.classList.add('visible');
  noticeTimer = setTimeout(() => notice.classList.remove('visible'), 4500);
}
function go(target) {
  if (location.hash === `#${target}`) render(target);
  else location.hash = target;
}
function setText(id, value) {
  const el = app.querySelector(`#${id}`);
  if (el) el.textContent = value;
}
function replaceText(old, value) {
  app.querySelectorAll('svg text, [data-copy]').forEach(el => {
    if (el.textContent === old) el.textContent = value;
  });
}
function capacity() {
  // Receita simulada: feijão e legumes rendem 10 porções/kg;
  // macarrão rende 85/12 porções/kg (85 porções no cenário original).
  return Math.floor(Math.min(state.stock[0] * 10, state.stock[1] * 10, state.stock[2] * 85 / 12));
}
function currentIndex() { return Math.min(state.deliveries.length, stops.length - 1); }

async function render(target) {
  const token = ++revision;
  page = pages.includes(target) ? target : 'lg';
  if ((page === 'v2' || page === 'v3') && state.deliveries.length === stops.length) page = 'v4';
  const requested = page;
  try {
    if (!templates.has(requested)) {
      const response = await fetch(`./assets/${requested}.svg`);
      if (!response.ok) throw new Error('Tela indisponível');
      templates.set(requested, await response.text());
    }
    if (token !== revision) return;
    // Mantém o anúncio vivo ao reconstruir a tela e evita sobrepor controles.
    document.body.append(noticeElement);
    const parsed = new DOMParser().parseFromString(templates.get(requested), 'image/svg+xml');
    const svg = document.importNode(parsed.documentElement, true);
    const desktop = requested.startsWith('c');
    document.body.classList.toggle('coordinator', desktop);
    renderFluidScreen(svg);
    wireControls();
    document.title = `${app.querySelector('h1')?.textContent || 'Pão Fraterno'} — Pão Fraterno`;
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch {
    if (token !== revision) return;
    app.textContent = 'Não foi possível abrir a tela. Atualize a página. Execute o site pelo servidor HTTP indicado no README.';
  }
}

function updateScreen() {
  if (page === 'c1') {
    [25, 34, 12].forEach((_, i) => {
      const label = [...app.querySelectorAll('text')].find(el => +el.getAttribute('x') === 1230 && +el.getAttribute('y') === 176 + i * 70);
      label.textContent = `${state.stock[i]} kg`;
      const bar = [...app.querySelectorAll('rect')].find(el => +el.getAttribute('x') === 994 && +el.getAttribute('y') === 188 + i * 70 && el.getAttribute('fill') !== '#E6E8EF');
      if (bar) {
        bar.setAttribute('width', 236 * Math.min(1, state.stock[i] / goals[i]));
        bar.setAttribute('fill', stockColor(i));
      }
    });
    replaceText('85 refeições', `${capacity()} refeições`);
    if (state.deliveries.length) {
      replaceText('Praça XV não recebe sopa há 15 dias', `Praça XV atendida hoje · ${state.deliveries[0].count} pessoas`);
      replaceText('Praça XV · 15 dias', 'Praça XV · hoje');
      const circles = [...app.querySelectorAll('circle')].filter(el => el.getAttribute('cx') === '680.2');
      circles.forEach(el => el.setAttribute('fill', '#E5533D'));
    }
  }
  if (page === 'c2') {
    [25, 34, 12].forEach((old, i) => {
      const x = 490 + i * 280;
      const height = Math.min(state.stock[i] * 6, 390);
      const bar = [...app.querySelectorAll('rect')].find(el => +el.getAttribute('x') === x && +el.getAttribute('width') === 90);
      bar.setAttribute('height', height);
      bar.setAttribute('y', 620 - height);
      bar.setAttribute('fill', stockColor(i));
      const label = [...app.querySelectorAll('text')].find(el => +el.getAttribute('x') === x + 45);
      label.textContent = `${state.stock[i]} kg`;
      label.setAttribute('y', 614 - height);
      const status = [...app.querySelectorAll('text')].find(el => +el.getAttribute('x') === 480 + i * 280 && +el.getAttribute('y') === 684);
      status.textContent = stockStatus(i);
      status.previousElementSibling.setAttribute('fill', stockColor(i));
      status.setAttribute('fill', stockStatus(i) === 'Baixo' ? '#3a2b00' : '#fff');
    });
  }
  if (page === 'c3') {
    replaceText('Total: 85 refeições (limite do estoque: 85)', `Total: 85 refeições (limite do estoque: ${capacity()})`);
    if (state.approved) replaceText('Aprovar e enviar aos voluntários', 'Rota enviada ✓');
  }
  if (page === 'c4') {
    updateDonation();
    editable('qty', 'number', String(quantity), 'Quantidade em quilogramas', { x: 454, y: 331, width: 372, height: 53 }, value => {
      quantity = Number(value);
    });
    editable('dt', 'date', expiry, 'Data de validade', { x: 450, y: 451, width: 380, height: 53 }, value => { expiry = value; });
    const qtyInput = app.querySelector('[name="qty"]');
    qtyInput.min = '1'; qtyInput.max = '10000'; qtyInput.step = '1';
    app.querySelector('[name="dt"]').min = localDate(new Date());
  }
  if (page === 'v2' || page === 'v3') {
    const index = currentIndex();
    const prefix = page;
    setText(`${prefix}p`, `Parada ${index + 1}/${stops.length}`);
    setText(`${prefix}n`, stops[index].name);
    if (page === 'v2') {
      setText('v2d', stops[index].distance);
      for (let i = 0; i < stops.length; i++) app.querySelector(`#pr${i}`).setAttribute('fill', i <= index ? '#2BB673' : '#2A303B');
    } else updateDelivery();
  }
  if (page === 'v4') {
    setText('v4a', state.deliveries.length);
    setText('v4b', state.deliveries.reduce((total, delivery) => total + delivery.count, 0));
    const minutes = state.startedAt ? Math.max(1, Math.round(((state.endedAt || Date.now()) - state.startedAt) / 60000)) : 0;
    setText('v4c', minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`);
  }
}
function stockColor(i) { return state.stock[i] / goals[i] < .4 ? '#D64545' : state.stock[i] / goals[i] < .8 ? '#F2B134' : '#2BB673'; }
function stockStatus(i) { return state.stock[i] / goals[i] < .4 ? 'Crítico' : state.stock[i] / goals[i] < .8 ? 'Baixo' : 'OK'; }

function editable(id, type, value, label, box, onChange) {
  const text = app.querySelector(`#${id}`);
  const foreign = document.createElementNS(SVG_NS, 'foreignObject');
  Object.entries(box).forEach(([key, val]) => foreign.setAttribute(key, val));
  const input = document.createElementNS('http://www.w3.org/1999/xhtml', 'input');
  input.setAttribute('class', 'svg-input');
  input.setAttribute('type', type);
  input.setAttribute('name', id);
  input.setAttribute('aria-label', label);
  input.value = value;
  input.addEventListener('input', () => onChange(input.value));
  foreign.append(input);
  text.replaceWith(foreign);
}
function updateDonation() {
  foods.forEach((_, i) => {
    app.querySelector(`#ch${i}r`)?.setAttribute('fill', selectedFood === i ? '#1F2A6E' : 'none');
    app.querySelector(`#ch${i}t`)?.setAttribute('fill', selectedFood === i ? '#fff' : '#1F2A6E');
    app.querySelector(`[data-act="chip${i}"]`).setAttribute('aria-pressed', String(selectedFood === i));
  });
  const input = app.querySelector('[name="qty"]');
  if (input) input.value = quantity;
  const date = app.querySelector('[name="dt"]');
  if (date) date.value = expiry;
}
function updateDelivery() {
  const saved = state.deliveries.length === stops.length || state.pending;
  setText('cnt', saved ? state.pending?.count ?? state.deliveries.at(-1)?.count : count);
  setText('dl', saved ? 'Entrega registrada ✓' : 'Sopa entregue');
  for (const action of ['dec', 'inc', 'deliver']) app.querySelector(`[data-act="${action}"]`).setAttribute('aria-disabled', String(Boolean(saved)));
  app.querySelector('[data-act="undo"]').setAttribute('aria-disabled', String(!state.pending));
  app.querySelector('[data-act="next"]').setAttribute('aria-disabled', String(!state.pending));
  if (currentIndex() === stops.length - 1) replaceText('Próxima parada ›', 'Ver resumo ›');
}

const actionLabels = {
  qdec: 'Diminuir quantidade em 1 kg', qinc: 'Aumentar quantidade em 1 kg',
  ddec: 'Diminuir validade em 1 dia', dinc: 'Aumentar validade em 1 dia',
  dec: 'Diminuir pessoas atendidas em 1', inc: 'Aumentar pessoas atendidas em 1',
};
function wireControls() {
  app.querySelectorAll('[data-go], [data-act]').forEach(el => {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', actionLabels[el.dataset.act] || el.textContent.trim());
    // Textos de navegação ganham área clicável sem alterar a aparência.
    if (!el.querySelector('rect') && el.tagName.toLowerCase() === 'g') {
      const box = el.getBBox();
      const hit = document.createElementNS(SVG_NS, 'rect');
      hit.setAttribute('x', box.x - 8); hit.setAttribute('y', box.y - 10);
      hit.setAttribute('width', Math.max(box.width + 16, 44));
      hit.setAttribute('height', Math.max(box.height + 20, 44));
      hit.setAttribute('fill', 'transparent');
      el.prepend(hit);
    }
    const activate = () => {
      if (el.getAttribute('aria-disabled') === 'true') return;
      if (el.dataset.go) navigate(el.dataset.go);
      else act(el.dataset.act);
    };
    el.addEventListener('click', activate);
    if (el.tagName.toLowerCase() !== 'button') el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
    });
  });
}
function navigate(target) {
  clearTimeout(noticeTimer);
  noticeElement.classList.remove('visible');
  if (page === 'lg' && target === 'v2') {
    if (state.finished) {
      state.deliveries = []; state.pending = null; state.finished = false; state.startedAt = null; state.endedAt = null;
    }
    if (!state.startedAt) state.startedAt = Date.now();
    persist();
    if (!state.approved) notify('Demonstração: rota de exemplo disponível para teste.');
  }
  if (target === 'v3') count = state.pending?.count ?? Math.min(24, stops[currentIndex()].meals);
  go(target);
}
function act(action) {
  if (action.startsWith('chip')) { selectedFood = Number(action.slice(4)); updateDonation(); return; }
  switch (action) {
    case 'qinc': case 'qdec':
      quantity = Math.max(1, Math.min(10000, (Number.isFinite(quantity) ? quantity : 1) + (action === 'qinc' ? 1 : -1)));
      updateDonation(); break;
    case 'dinc': case 'ddec': {
      const date = new Date(`${expiry || localDate(new Date())}T12:00:00`);
      date.setDate(date.getDate() + (action === 'dinc' ? 1 : -1));
      expiry = localDate(date);
      updateDonation(); break;
    }
    case 'save':
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) { notify('Informe uma quantidade inteira entre 1 e 10.000 kg.'); app.querySelector('[name="qty"]').focus(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || expiry < localDate(new Date())) { notify('Informe uma validade igual ou posterior a hoje.'); app.querySelector('[name="dt"]').focus(); return; }
      state.stock[selectedFood] += quantity;
      state.donations.push({ food: foods[selectedFood], quantity, expiry, createdAt: Date.now() });
      persist(); go('c1'); notify(`Doação salva: ${quantity} kg de ${foods[selectedFood].toLowerCase()}. Estoque atualizado.`); break;
    case 'send':
      if (capacity() < 85) { notify('Estoque insuficiente para a rota de 85 refeições. Registre uma doação antes de enviar.'); return; }
      state.approved = true; persist();
      replaceText('Aprovar e enviar aos voluntários', 'Rota enviada ✓');
      notify('Rota aprovada e disponível no perfil voluntário deste navegador.'); break;
    case 'inc': count = Math.min(999, count + 1); updateDelivery(); break;
    case 'dec': count = Math.max(0, count - 1); updateDelivery(); break;
    case 'deliver':
      if (count === 0) { notify('Registre ao menos uma pessoa atendida antes de confirmar a entrega.'); return; }
      state.pending = { count, stop: currentIndex(), at: Date.now() };
      persist(); updateDelivery(); notify('Entrega registrada. Você pode desfazer antes de avançar.'); break;
    case 'undo':
      count = state.pending.count; state.pending = null;
      persist(); updateDelivery(); notify('Entrega desfeita. Ajuste a contagem e confirme novamente.'); break;
    case 'next':
      state.deliveries.push(state.pending); state.pending = null;
      if (state.deliveries.length === stops.length) state.endedAt = Date.now();
      persist(); go(state.deliveries.length === stops.length ? 'v4' : 'v2'); break;
    case 'finish':
      state.finished = true; persist(); go('lg'); notify('Turno finalizado. Obrigado por participar da ronda!'); break;
  }
}
// Em telas menores, os mesmos conteúdos fluem em HTML em vez de reduzir
// uma prancheta inteira: textos e alvos de toque mantêm tamanhos legíveis.
function renderFluidScreen(source) {
  const button = (label, attr, value, cls = '') => `<button type="button" class="${cls}" data-${attr}="${value}"><span data-copy>${label}</span></button>`;
  const nav = (label, target) => `<button type="button" data-go="${target}" ${page === target ? 'aria-current="page"' : ''}>${label}</button>`;
  const titles = { c1: 'Painel do coordenador', c2: 'Estoque da cozinha — detalhe', c3: 'Rota sugerida', c4: 'Doações' };
  const stockRows = foods.slice(0, 3).map((food, i) => `<div class="stock-row"><div><span>${food}</span><span>${state.stock[i]} kg</span></div><meter min="0" max="${goals[i]}" value="${Math.min(state.stock[i], goals[i])}" style="--stock-color:${stockColor(i)}" aria-label="${food}: ${state.stock[i]} kg de ${goals[i]} kg"></meter></div>`).join('');
  let content = '';
  if (page === 'c1') content = `
    <section class="panel coverage"><h2>Mapa de calor da cidade</h2><div data-map></div><div class="map-legend"><span>🔴 Quente: visitado há pouco</span><span>🔵 Frio: sem visita há dias</span></div></section>
    <aside class="stock-aside"><section class="panel"><h2>Estoque</h2>${stockRows}${button('Ver detalhe ›', 'go', 'c2', 'text-button')}</section>
    <section class="panel"><p>Projeção de hoje</p><strong class="projection">${capacity()} refeições</strong></section>${button('Registrar doação', 'go', 'c4', 'primary')}</aside>
    <section class="alert coverage-alert"><p>${state.deliveries.length ? `Praça XV atendida hoje · ${state.deliveries[0].count} pessoas` : 'Praça XV não recebe sopa há 15 dias'}</p>${button('Ver rota', 'go', 'c3', 'danger')}</section>`;
  if (page === 'c2') content = `
    ${button('‹ Voltar ao painel', 'go', 'c1', 'text-button back-link')}
    <section class="panel stock-detail"><h2>Meta × quantidade atual de cada insumo</h2><div class="chart-legend"><span><i class="goal-key"></i>Meta</span><span><i class="actual-key"></i>Atual</span></div>
    <div class="stock-chart">${foods.slice(0, 3).map((food, i) => `<section class="chart-item"><h3>${food}</h3><div class="bar-row"><span>Meta</span><div class="bar-track"><div class="goal-bar" style="width:${goals[i] / 50 * 100}%"></div></div><strong>${goals[i]} kg</strong></div><div class="bar-row"><span>Atual</span><div class="bar-track"><div style="width:${Math.min(state.stock[i] / 50 * 100, 100)}%;background:${stockColor(i)}"></div></div><strong>${state.stock[i]} kg</strong></div><span class="stock-status" style="background:${stockColor(i)}">${stockStatus(i)}</span></section>`).join('')}</div></section>`;
  if (page === 'c3') content = `
    <section class="panel stop-panel"><h2>Paradas (limitadas pelo estoque do dia)</h2><ol class="stop-list">${stops.map((stop, i) => `<li><span class="stop-number">${i + 1}</span><div><h3>${stop.name}</h3><p>sem visita há ${[15, 9, 6, 4, 3][i]} dias</p></div><strong>${stop.meals} ref</strong></li>`).join('')}</ol><div class="alert"><strong>Parque Sul — parada descartada</strong><p>estoque insuficiente para cobrir esta parada</p></div><p>Total: 85 refeições (limite do estoque: ${capacity()})</p></section>
    <aside class="route-aside"><section class="panel"><h2>Mapa da rota</h2><div data-map></div></section>${button(state.approved ? 'Rota enviada ✓' : 'Aprovar e enviar aos voluntários', 'act', 'send', 'primary')}<p>Os voluntários recebem a rota no app.</p></aside>`;
  if (page === 'c4') content = `
    <section class="panel donation-panel"><h2>Registrar doação recebida</h2><fieldset><legend>Tipo de alimento</legend><div class="food-choices">${foods.map((food, i) => button(food, 'act', `chip${i}`, 'food-chip')).join('')}</div></fieldset>
    <label for="fluid-qty">Quantidade (kg)</label><div class="stepper">${button('−', 'act', 'qdec')}<input id="fluid-qty" name="qty" type="number" min="1" max="10000" step="1" aria-label="Quantidade em quilogramas">${button('+', 'act', 'qinc')}</div>
    <label for="fluid-date">Validade</label><div class="stepper date-stepper">${button('−', 'act', 'ddec')}<input id="fluid-date" name="dt" type="date" min="${localDate(new Date())}" aria-label="Data de validade">${button('+', 'act', 'dinc')}</div>
    <p>Use − e + para ajustar (1 kg ou 1 dia por toque).</p>${button('Salvar doação', 'act', 'save', 'primary')}</section>`;
  if (page.startsWith('c')) {
    app.innerHTML = `<div class="fluid-coordinator"><header class="fluid-header"><strong>Pão Fraterno</strong><h1>${titles[page]}</h1><div><span>Marta · Coordenadora</span>${button('Sair', 'go', 'lg', 'text-button')}</div></header><nav class="fluid-nav" aria-label="Navegação do coordenador"><strong class="nav-brand">Pão Fraterno</strong>${nav('Painel', 'c1')}${nav('Rota sugerida', 'c3')}${nav('Estoque', 'c2')}${nav('Doações', 'c4')}</nav><div class="fluid-content"><h1>${titles[page]}</h1><div class="coordinator-grid page-${page}">${content}</div></div></div>`;
    if (page === 'c4') {
      updateDonation();
      app.querySelector('[name="qty"]').addEventListener('input', event => { quantity = Number(event.target.value); });
      app.querySelector('[name="dt"]').addEventListener('input', event => { expiry = event.target.value; });
    }
  } else {
    const index = currentIndex();
    const stop = stops[index];
    const progress = `<div class="field-progress" aria-label="Parada ${index + 1} de ${stops.length}">${stops.map((_, i) => `<span class="${i <= index ? 'active' : ''}"></span>`).join('')}</div>`;
    if (page === 'lg') content = `<div class="login-brand"><div data-logo></div><h1><span>PÃO</span><span>FRATERNO</span></h1><p>Distribuição de refeições</p></div><div class="login-actions">${button('Entrar como coordenador', 'go', 'c1', 'coordinator-button')}${button('Entrar como voluntário', 'go', 'v2', 'primary')}</div>`;
    if (page === 'v2') content = `<header class="field-header"><span id="v2p">Parada ${index + 1}/5</span><span>Ronda noturna</span></header>${progress}<p class="next-label">Próxima parada</p><div data-map></div><h1 id="v2n">${stop.name}</h1><p id="v2d">${stop.distance}</p><footer>${button('Confirmar chegada', 'go', 'v3', 'primary')}</footer>`;
    if (page === 'v3') content = `<header class="field-header"><span id="v3p">Parada ${index + 1}/5</span></header><h1 id="v3n">${stop.name}</h1><section class="delivery-counter"><p>Pessoas atendidas</p><output id="cnt" aria-live="polite">${count}</output><div class="counter-controls">${button('−1', 'act', 'dec')}${button('+1', 'act', 'inc')}</div></section>${button('<span id="dl">Sopa entregue</span>', 'act', 'deliver', 'primary')}${button('Desfazer último registro', 'act', 'undo', 'undo-button')}<footer>${button('Próxima parada ›', 'act', 'next', 'secondary')}</footer>`;
    if (page === 'v4') {
      const minutes = state.startedAt ? Math.max(1, Math.round(((state.endedAt || Date.now()) - state.startedAt) / 60000)) : 0;
      content = `<div class="summary-check" aria-hidden="true">✓</div><h1>Ronda finalizada</h1><dl class="summary-rows"><div><dt>Paradas concluídas</dt><dd id="v4a">${state.deliveries.length}</dd></div><div><dt>Pessoas atendidas</dt><dd id="v4b">${state.deliveries.reduce((total, delivery) => total + delivery.count, 0)}</dd></div><div><dt>Duração</dt><dd id="v4c">${minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`}</dd></div></dl><footer>${button('Finalizar turno', 'act', 'finish', 'primary')}</footer>`;
    }
    app.innerHTML = `<div class="fluid-field field-${page}">${content}</div>`;
    if (page === 'v3') updateDelivery();
  }
  const map = app.querySelector('[data-map]');
  if (map) {
    const viewBox = { c1: '266 150 668 450', c3: '910 150 324 370', v2: '24 156 312 300' }[page];
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox);
    if (page === 'c1') svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', page === 'c1' ? 'Mapa ilustrativo de cobertura da cidade' : 'Mapa ilustrativo da rota');
    source.querySelectorAll('clipPath, g[clip-path]').forEach(el => svg.append(el.cloneNode(true)));
    if (page === 'c1' && state.deliveries.length) {
      svg.querySelectorAll('text').forEach(el => { el.textContent = 'Praça XV · hoje'; });
      svg.querySelectorAll('circle[cx="680.2"]').forEach(el => el.setAttribute('fill', '#E5533D'));
    }
    map.append(svg);
  }
  const logo = app.querySelector('[data-logo]');
  if (logo) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '100 95 160 170');
    svg.setAttribute('aria-hidden', 'true');
    source.querySelectorAll(':scope > path, :scope > line, :scope > ellipse').forEach(el => svg.append(el.cloneNode(true)));
    logo.append(svg);
  }
  const noticeSlot = document.createElement('div');
  noticeSlot.className = 'notice-slot';
  noticeSlot.append(noticeElement);
  (app.querySelector('.fluid-content') || app.querySelector('.fluid-field')).prepend(noticeSlot);
}
window.addEventListener('hashchange', () => render(location.hash.slice(1)));
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) { state = loadState(); render(page); }
});
render(location.hash.slice(1) || 'lg');
