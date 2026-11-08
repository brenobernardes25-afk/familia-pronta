// Teste de verdade, no navegador: node teste-navegador.js
// Abre o app no Edge ou Chrome (sem janela), usa as telas como uma pessoa usaria
// e no fim desliga o servidor para conferir se o app abre SEM INTERNET.
// Precisa: Node 22+ e Edge ou Chrome instalados. Para outro navegador: CHROME="caminho" node teste-navegador.js
// Para salvar os PDFs de impressão: PDF_DIR="pasta" node teste-navegador.js
// Para testar o site publicado: URL="https://SEU-USUARIO.github.io/familia-pronta/" node teste-navegador.js
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = __dirname;
const CACHE = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8').match(/const V = '([^']+)'/)[1];
const ARQ = eval(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8').match(/const ARQ = (\[[\s\S]*?\]);/)[1]);

// ---------- servidor local ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(f).pipe(res);
});

// ---------- navegador ----------
function acharNavegador() {
  const c = [process.env.CHROME,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  return c.find((x) => x && fs.existsSync(x));
}

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.esperando = new Map(); this.ouvintes = []; }
  abrir() {
    return new Promise((ok, erro) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = ok; this.ws.onerror = erro;
      this.ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id && this.esperando.has(d.id)) {
          const { ok: o, erro: e } = this.esperando.get(d.id); this.esperando.delete(d.id);
          d.error ? e(new Error(d.error.message)) : o(d.result);
        } else this.ouvintes.forEach((f) => f(d));
      };
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, erro) => this.esperando.set(id, { ok, erro }));
  }
  quando(method, ms = 15000) {
    return new Promise((ok, erro) => {
      const t = setTimeout(() => erro(new Error('demorou demais: ' + method)), ms);
      const f = (d) => { if (d.method === method) { clearTimeout(t); this.ouvintes = this.ouvintes.filter((x) => x !== f); ok(d.params); } };
      this.ouvintes.push(f);
    });
  }
}

let falhas = 0;
const confere = (ok, msg) => { console.log(ok ? '  ok  ' : '  FALHOU', msg); if (!ok) falhas++; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const exe = acharNavegador();
  if (!exe) { console.log('Não achei Edge nem Chrome. Use: CHROME="caminho do navegador" node teste-navegador.js'); process.exit(2); }

  const REMOTO = process.env.URL ? process.env.URL.replace(/\/?$/, '/') : null;
  if (!REMOTO) await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const BASE = REMOTO || `http://localhost:${servidor.address().port}/`;
  console.log('Testando', BASE);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'familia-pronta-teste-'));
  const nav = spawn(exe, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${perfil}`, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });

  let porta;
  for (let i = 0; i < 100 && !porta; i++) {
    await espera(100);
    try { porta = fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {}
  }
  const alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
  const cdp = new CDP(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await cdp.abrir();

  const erros = [];
  cdp.ouvintes.push((d) => {
    if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') erros.push(d.params.args.map((a) => a.value || a.description).join(' '));
    if (d.method === 'Page.javascriptDialogOpening') cdp.send('Page.handleJavaScriptDialog', { accept: true });
  });
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  // Celular comum (375 × 812)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });

  const js = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const vai = async (url) => { const p = cdp.quando('Page.loadEventFired'); await cdp.send('Page.navigate', { url }); await p; await espera(150); };
  const recarrega = async () => { const p = cdp.quando('Page.loadEventFired'); await cdp.send('Page.reload'); await p; await espera(150); };
  const clica = (sel) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) throw new Error('não achei ${sel.replace(/'/g, '')}'); e.click(); return true; })()`);
  const preenche = (sel, valor) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(valor)};
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const estado = () => js(`JSON.parse(localStorage.getItem('familia-pronta-v1'))`);
  const semRolagemLateral = async (tela) => confere(await js('document.documentElement.scrollWidth <= window.innerWidth'), `${tela}: sem rolagem para o lado no celular`);

  try {
    // ---------------- 1. Tela inicial ----------------
    console.log('\n1. Tela inicial');
    await vai(BASE);
    confere((await js(`document.querySelectorAll('.porta').length`)) === 3, 'mostra as 3 portas (ficar, sair, plano)');
    await semRolagemLateral('início');

    // ---------------- 2. Digitar idade (bug do foco) ----------------
    console.log('\n2. Digitação');
    await clica('[data-ir="bugin"]');
    await js(`(() => { const e = document.querySelector('[data-p="membros.0.idade"]'); e.value = ''; e.focus(); return true; })()`);
    await cdp.send('Input.insertText', { text: '3' });
    await cdp.send('Input.insertText', { text: '5' });
    confere((await js(`document.querySelector('[data-p="membros.0.idade"]').value`)) === '35', 'digitar "35" na idade não perde o foco no meio');
    await js(`document.activeElement.blur()`);
    confere((await estado()).membros[0].idade === 35, 'idade 35 ficou salva');
    await preenche('[data-p="membros.0.idade"]', '-4');
    confere((await estado()).membros[0].idade === 0, 'idade negativa vira 0');
    await semRolagemLateral('ficar em casa');

    // ---------------- 3. Ficar em casa com família completa ----------------
    console.log('\n3. Ficar em casa');
    await js(`localStorage.setItem('familia-pronta-v1', JSON.stringify({ tela: 'resultado',
      membros: [{ id: 'p1', nome: 'Pai', idade: 35, sexo: 'M', peso: 80, remedio: true }, { id: 'p2', nome: 'Mãe', idade: 32, sexo: 'F', peso: 62, lactante: true },
                { id: 'p3', nome: 'Bebê', idade: 0, meses: 8, sexo: 'M' }, { id: 'p4', nome: 'Filha', idade: 7, sexo: 'F', alergia: true }],
      pets: [{ id: 'c1', nome: 'Thor', tipo: 'cao', peso: 15 }], estoque: { aguaL: 40, secoKg: 10, latas: 6, fraldas: 30, racaoKg: 2 }, meta: 14 }))`);
    await recarrega();
    const placar = await js(`document.querySelector('.placar').innerText`);
    confere(/\d+ dias?/.test(placar) && /Nota/.test(placar), `placar aparece (${placar.replace(/\s+/g, ' ').trim()})`);
    confere((await js(`document.querySelectorAll('.lista li').length`)) > 5, 'lista de compras aparece');
    confere((await estado()).ultimo && typeof (await estado()).ultimo.dias === 'number', 'resultado guardado para a tela inicial');
    await clica('[data-risca]');
    await recarrega();
    confere(await js(`document.querySelector('[data-risca]').checked`), 'item riscado continua riscado depois de recarregar');
    await semRolagemLateral('resultado ficar em casa');

    // ---------------- 4. Sair de casa ----------------
    console.log('\n4. Sair de casa');
    await clica('[data-ir="bugout"]');
    confere((await js(`document.querySelectorAll('[data-p$=".remedio"]').length`)) === 4, 'pergunta remédio/óculos/alergia de cada pessoa');
    confere(await js(`document.querySelector('[data-p="membros.0.remedio"]').checked`), 'usa a mesma família (remédio do Pai marcado)');
    await clica('[data-clima="frio"]'); await clica('[data-clima="chuva"]');
    confere((await estado()).bo.clima.frio === true && (await estado()).bo.clima.chuva === true, 'marca dois climas ao mesmo tempo');
    await clica('[data-ir="boResultado"]');
    const nomes = await js(`[...document.querySelectorAll('.mochila .mo-topo strong')].map((e) => e.textContent)`);
    confere(JSON.stringify(nomes) === JSON.stringify(['Pai', 'Mãe', 'Filha']), `uma mochila por pessoa que carrega (${nomes.join(', ')}); bebê não carrega`);
    confere(await js(`document.body.innerText.includes('Thor')`), 'itens do pet aparecem com o nome dele');
    confere(await js(`/Bebê no sling\\/colo/.test(document.body.innerText)`), 'bebê no colo aparece no cartão de quem leva');
    const pesos = await js(`[...document.querySelectorAll('.mochila .peso b')].map((e) => e.textContent)`);
    confere(pesos.every((p) => /^\d+,\d kg$/.test(p)), `peso de cada mochila em kg (${pesos.join(' | ')})`);
    const chave = await js(`document.querySelector('[data-riscabo]').dataset.riscabo`);
    await clica('[data-riscabo]');
    await recarrega();
    confere(await js(`document.querySelector('[data-riscabo="${chave}"]').checked`), 'item da mochila riscado continua riscado depois de recarregar');
    confere(chave.startsWith('p1|'), 'item riscado fica preso à pessoa (id), não à posição na lista');
    await clica('[data-montada]');
    confere(!!(await estado()).boMontadaEm, 'botão "mochilas montadas" guarda a data');
    await semRolagemLateral('mochilas');

    await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
    confere((await js(`getComputedStyle(document.querySelector('.acoes')).display`)) === 'none', 'na impressão os botões somem');
    if (process.env.PDF_DIR) {
      const pdf = await cdp.send('Page.printToPDF', { printBackground: true });
      fs.writeFileSync(path.join(process.env.PDF_DIR, 'mochilas.pdf'), Buffer.from(pdf.data, 'base64'));
    }
    await cdp.send('Emulation.setEmulatedMedia', { media: '' });

    // ---------------- 5. Plano da família ----------------
    console.log('\n5. Plano da família');
    await clica('[data-ir="plano"]');
    await preenche('[data-p="plano.encontroPerto"]', 'Praça da igreja');
    await preenche('[data-p="plano.contatoFora.nome"]', 'Tia Rosa');
    await preenche('[data-p="plano.contatoFora.tel"]', '(11) 98888-7777');
    await clica('[data-add="contato"]');
    await preenche('[data-p="plano.contatos.0.nome"]', 'Vizinho <b>João</b>');
    await preenche('[data-p="membros.0.sangue"]', 'O+');
    await preenche('[data-p="membros.3.alergiasTxt"]', 'dipirona');
    await clica('[data-ir="planoImprimir"]');
    confere((await js(`document.querySelectorAll('.cartao-bolso').length`)) === 4, 'um cartão de bolso por pessoa');
    confere((await js(`document.querySelectorAll('.folha tbody tr').length`)) >= 4, 'tabela da família no plano');
    const textoPlano = await js(`document.body.innerText`);
    confere(textoPlano.includes('Praça da igreja') && textoPlano.includes('Tia Rosa') && textoPlano.includes('dipirona') && textoPlano.includes('O+'), 'dados preenchidos aparecem no plano');
    confere(textoPlano.includes('Vizinho <b>João</b>') && !(await js(`!!document.querySelector('.folha b b, .folha td b b')`)), 'texto digitado não vira código (proteção contra HTML)');
    confere(['190', '192', '193', '199', '40199'].every((n) => textoPlano.includes(n)), 'telefones 190/192/193/199 e SMS 40199');
    await semRolagemLateral('plano para imprimir');
    if (process.env.PDF_DIR) {
      await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
      const pdf = await cdp.send('Page.printToPDF', { printBackground: true });
      fs.writeFileSync(path.join(process.env.PDF_DIR, 'plano.pdf'), Buffer.from(pdf.data, 'base64'));
      await cdp.send('Emulation.setEmulatedMedia', { media: '' });
    }

    // ---------------- 6. Tela inicial com resumo ----------------
    console.log('\n6. Resumo e modo escuro');
    await clica('[data-ir="home"]');
    const home = await js(`document.body.innerText`);
    confere(/Último resultado: \d+ dias?/.test(home), 'início mostra o último resultado do "Ficar em casa"');
    confere(/Revisar até \d\d\/\d\d\/\d{4}/.test(home), 'início mostra a data de revisar as mochilas');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    confere((await js(`getComputedStyle(document.body).backgroundColor`)) === 'rgb(20, 22, 19)', 'modo escuro automático');
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });

    // ---------------- 7. Sem internet ----------------
    console.log('\n7. Funciona sem internet');
    const ativo = await js(`navigator.serviceWorker.ready.then(() => true)`);
    confere(ativo, 'service worker instalado');
    for (let i = 0; i < 30 && !(await js('!!navigator.serviceWorker.controller')); i++) await espera(100);
    const guardados = await js(`caches.open('${CACHE}').then((c) => c.keys()).then((k) => k.map((r) => new URL(r.url).pathname))`);
    confere(guardados.length === ARQ.length, `todos os ${ARQ.length} arquivos guardados no celular (cache ${CACHE})`);
    if (REMOTO) {
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    } else { servidor.closeAllConnections(); servidor.close(); }
    await vai(BASE);
    confere((await js(`document.querySelectorAll('.porta').length`)) === 3, 'sem internet: o app abre');
    await vai(BASE + '?utm_source=instagram');
    confere((await js(`document.querySelectorAll('.porta').length`)) === 3, 'sem internet: link com ?utm (do Instagram) também abre');
    await clica('[data-ir="bugout"]');
    await clica('[data-ir="boResultado"]');
    confere((await js(`document.querySelectorAll('.mochila').length`)) >= 3, 'sem internet: as mochilas aparecem');
    confere(await js(`document.querySelector('[data-riscabo="${chave}"]').checked`), 'sem internet: os itens riscados continuam lá');

    confere(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  } catch (e) {
    falhas++;
    console.log('  FALHOU (erro no teste):', e.message);
  } finally {
    try { await cdp.send('Browser.close'); } catch {}
    nav.kill();
    if (servidor.listening) servidor.close();
    setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); } catch {} }, 500);
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo certo no navegador.');
  process.exitCode = falhas ? 1 : 0;
})();
