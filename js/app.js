// =====================================================================
// TELAS — estado simples + render. Sem frameworks, roda offline.
// =====================================================================
const CHAVE = 'familia-pronta-v1';
const novoId = () => Math.random().toString(36).slice(2, 9);
const planoVazio = () => ({ endereco: '', encontroPerto: '', encontroLonge: '', destino: '', lugares: '', veterinario: '',
  contatoFora: { nome: '', tel: '' }, contatos: [] });
const inicial = () => ({
  tela: 'home',
  membros: [{ id: novoId(), nome: '', idade: 30, meses: 0, sexo: 'M', peso: 70 }],
  pets: [],
  estoque: { aguaL: 0, secoKg: 0, latas: 0, fraldas: 0, racaoKg: 0, remedioDias: 0 },
  temRemedio: false,
  basicos: {},
  meta: 14,
  riscados: {},
  ultimo: null,            // último resultado do "Ficar em casa" (para a tela inicial)
  // Sair de casa (mochila 72h)
  bo: { modo: 'pe', clima: {}, orcamento: 'medio' },
  riscadosBO: {},
  boMontadaEm: null,       // data em que a família montou as mochilas (lembrete de revisão)
  plano: planoVazio(),
});

let S;
try { S = { ...inicial(), ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch { S = inicial(); }
// Migração de dados salvos por versões antigas
S.bo = { ...inicial().bo, ...(S.bo || {}) };
S.bo.clima = S.bo.clima || {};
S.riscadosBO = S.riscadosBO || {};
S.plano = { ...planoVazio(), ...(S.plano || {}) };
S.plano.contatoFora = { nome: '', tel: '', ...(S.plano.contatoFora || {}) };
S.plano.contatos = S.plano.contatos || [];
S.membros = Array.isArray(S.membros) ? S.membros : [];
S.pets = Array.isArray(S.pets) ? S.pets : [];
S.membros.forEach((m) => { if (!m.id) m.id = novoId(); });
S.pets.forEach((p) => { if (!p.id) p.id = novoId(); });

const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch {} };
salvar();

const $app = document.getElementById('app');
const ir = (tela) => { S.tela = tela; salvar(); render(); window.scrollTo(0, 0); };

// ---------- helpers ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (path, val, rot, extra = '') =>
  `<label class="campo"><span>${rot}</span><input type="number" inputmode="decimal" min="0" data-p="${path}" value="${val ?? ''}" ${extra}></label>`;
const txt = (path, val, rot, extra = '') =>
  `<label class="campo"><span>${rot}</span><input type="text" data-p="${path}" value="${esc(val)}" ${extra}></label>`;
const kgTxt = (g) => (g / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg';
const gTxt = (g) => (g >= 1000 ? kgTxt(g) : `${g} g`);
const SINGULAR = { pacotes: 'pacote', latas: 'lata', sachês: 'sachê', galões: 'galão', garrafas: 'garrafa', rolos: 'rolo' };
const unidade = (qtd, u) => (qtd === 1 && u ? u.replace(/^(\S+)/, (w) => SINGULAR[w] || w) : u);
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR');
const nomePessoa = (m, i) => (m.nome && m.nome.trim()) || `Pessoa ${i + 1}`;
const idadeTxt = (m) => {
  const a = Number(m.idade) || 0;
  const me = Number(m.meses) || 0;
  if (a === 0) return `${me} ${me === 1 ? 'mês' : 'meses'}`;
  return `${a} ${a === 1 ? 'ano' : 'anos'}${a < 3 && me ? ` e ${me} m` : ''}`;
};
function revisarAte() {
  if (!S.boMontadaEm) return null;
  const d = new Date(S.boMontadaEm);
  d.setMonth(d.getMonth() + REF.plano.revisarMeses);
  return d;
}

function setPath(path, valor) {
  const k = path.split('.');
  let o = S;
  k.slice(0, -1).forEach((x) => (o = o[x]));
  o[k.at(-1)] = valor;
}

let toastTimer;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2500);
}
function compartilhar(texto) {
  const url = location.href.split(/[?#]/)[0];
  if (navigator.share) { navigator.share({ title: 'Família Pronta', text: texto, url }).catch(() => {}); return; }
  const tudo = `${texto} ${url}`;
  (navigator.clipboard ? navigator.clipboard.writeText(tudo) : Promise.reject())
    .then(() => toast('Texto copiado. É só colar no WhatsApp ou no Instagram.'))
    .catch(() => window.prompt('Copie o texto abaixo:', tudo));
}

// ---------- INSTALAR NO CELULAR ----------
// Android/Chrome: o navegador avisa que dá para instalar (beforeinstallprompt) e a gente mostra o botão.
// iPhone: não tem botão automático; é pelo Compartilhar → "Adicionar à Tela de Início".
// Dentro do Instagram/Facebook/TikTok não dá para instalar: tem que abrir no navegador.
let pedidoInstalar = null;
const UA = navigator.userAgent || '';
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ehIOS = /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
const ehAndroid = /Android/i.test(UA);
const appDentro = (() => {
  const m = UA.match(/Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|TikTok|musical_ly|Bytedance|Snapchat|Line\/|LinkedInApp|Pinterest/i);
  if (!m) return null;
  const n = m[0].toLowerCase();
  return n.startsWith('insta') ? 'Instagram' : n.startsWith('f') || n === 'messenger' ? 'Facebook' : /tiktok|musical|byte/.test(n) ? 'TikTok' : 'aplicativo';
})();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; if (['home', 'instalar'].includes(S.tela)) render(); });
window.addEventListener('appinstalled', () => { pedidoInstalar = null; toast('Instalado! Agora abra pelo ícone na tela do celular.'); render(); });

async function instalarAgora() {
  if (!pedidoInstalar) return ir('instalar');
  pedidoInstalar.prompt();
  const { outcome } = await pedidoInstalar.userChoice;
  pedidoInstalar = null;
  if (outcome !== 'accepted') ir('instalar'); else render();
}

function avisoInstalar() {
  if (instalado()) return '';
  return `<div class="instalar no-print">
    <b>📲 Guarde o app no celular</b>
    <span>Pelo link ele só abre com internet. Instalado, ele fica com ícone na tela e <b>abre sem internet</b>, como um app baixado.</span>
    ${pedidoInstalar ? '<button class="pri" data-instalar>Instalar agora</button>' : '<button class="pri" data-ir="instalar">Como instalar (1 minuto)</button>'}
  </div>`;
}

function telaInstalar() {
  const url = location.href.split(/[?#]/)[0];
  const passosAndroid = `<ol class="passos">
      <li>Abra este link no <b>Chrome</b>.</li>
      <li>Toque nos <b>três pontinhos ⋮</b> (em cima, à direita).</li>
      <li>Toque em <b>"Instalar app"</b> ou <b>"Adicionar à tela inicial"</b> e confirme.</li>
      <li>Pronto: o ícone 🏠 <b>Família Pronta</b> aparece junto com os seus outros apps.</li></ol>`;
  const passosIOS = `<ol class="passos">
      <li>Abra este link no <b>Safari</b> (a bússola azul).</li>
      <li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima ⬆️, embaixo da tela).</li>
      <li>Role a lista e toque em <b>"Adicionar à Tela de Início"</b>, depois em <b>"Adicionar"</b>.</li>
      <li>Pronto: o ícone 🏠 <b>Família Pronta</b> aparece na tela do iPhone.</li></ol>`;
  const principal = ehIOS ? passosIOS : passosAndroid;
  return `
  <button class="voltar" data-ir="home">← Voltar</button>
  <h2>📲 Instalar no celular</h2>
  ${instalado() ? '<div class="dica"><b>✅ Já está instalado.</b> Abra sempre pelo ícone da tela do celular.</div>' : ''}
  ${appDentro ? `<div class="avisos"><p><b>Você abriu pelo ${appDentro}.</b> O navegador de dentro do ${appDentro} não instala apps.</p>
    <p>Toque nos <b>três pontinhos</b> (⋯ ou ⋮, no canto de cima) e escolha <b>"Abrir no navegador"</b>${ehIOS ? ' (ou "Abrir no Safari")' : ' (ou "Abrir no Chrome")'}. Depois siga os passos abaixo.</p>
    <button class="sec" data-copiar="${esc(url)}">Copiar o link</button></div>` : ''}
  ${pedidoInstalar ? '<button class="pri" data-instalar>Instalar agora</button>' : ''}
  <h3>${ehIOS ? 'No iPhone' : 'No Android'}</h3>
  ${principal}
  <details class="cartao"><summary>${ehIOS ? 'Tenho Android' : 'Tenho iPhone'}</summary>${ehIOS ? passosAndroid : passosIOS}</details>

  <h3>Depois de instalar</h3>
  <ul class="passos">
    <li>Abra sempre pelo <b>ícone</b>, não pelo link.</li>
    <li>Faça o teste: ligue o <b>modo avião</b> e toque no ícone. Tem que abrir.</li>
    <li>O que você preenche fica <b>só neste celular</b>. Nada vai para a internet.</li>
    <li>Não precisa de APK: no Android, o Chrome transforma o app instalado num app de verdade, que aparece na lista de apps.</li>
    ${appDentro || !instalado() ? '<li>O que você preencheu pelo link (ou dentro do Instagram) pode não aparecer no app instalado. Antes de instalar, use <b>Meus dados → Salvar uma cópia</b>, e depois <b>Restaurar</b> dentro do app.</li>' : ''}
  </ul>
  <button class="sec" data-ir="dados">Meus dados (cópia de segurança)</button>`;
}

// ---------- MEUS DADOS ----------
function telaDados() {
  return `
  <button class="voltar" data-ir="home">← Voltar</button>
  <h2>💾 Meus dados</h2>
  <p class="obs">Tudo que você preenche fica guardado <b>só neste celular</b>, sem internet e sem cadastro. Se trocar de celular, limpar o navegador ou instalar o app, salve uma cópia antes.</p>
  <div class="acoes">
    <button class="pri" data-exportar>Salvar uma cópia (arquivo)</button>
    <label class="sec botao-arquivo">Restaurar de uma cópia<input type="file" accept=".json,application/json" data-importar hidden></label>
    <button class="sec discreto" data-apagar>Apagar tudo deste celular</button>
  </div>`;
}

function exportar() {
  const nome = `familia-pronta-${new Date().toISOString().slice(0, 10)}.json`;
  const dados = JSON.stringify({ app: 'familia-pronta', versao: 1, salvoEm: new Date().toISOString(), dados: S }, null, 1);
  const arq = new File([dados], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arq] })) {
    navigator.share({ files: [arq], title: 'Família Pronta — cópia dos dados' }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(arq); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Cópia salva na pasta de downloads.');
}

function importar(arquivo) {
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const j = JSON.parse(leitor.result);
      const d = j && j.app === 'familia-pronta' ? j.dados : j;
      if (!d || !Array.isArray(d.membros)) throw new Error('formato');
      if (!confirm(`Restaurar a cópia com ${d.membros.length} pessoa(s)? O que está no celular agora será substituído.`)) return;
      localStorage.setItem(CHAVE, JSON.stringify({ ...d, tela: 'home' }));
      location.reload();
    } catch { toast('Esse arquivo não é uma cópia do Família Pronta.'); }
  };
  leitor.readAsText(arquivo);
}

// ---------- TELA INICIAL ----------
function resumoMochilas() {
  if (!S.membros.length) return '';
  const r = calcularBugOut(S);
  const chaves = [];
  r.mochilas.forEach((mo) => mo.itens.forEach((it) => chaves.push(chaveBO(mo, it))));
  const prontos = chaves.filter((k) => S.riscadosBO[k]).length;
  return prontos ? `${prontos} de ${chaves.length} itens prontos` : '';
}

function telaHome() {
  const u = S.ultimo;
  const rev = revisarAte();
  const vencido = rev && rev < new Date();
  const progresso = resumoMochilas();
  return `
  <header class="topo"><h1>Família Pronta</h1><p>Prepare sua casa e sua família para uma crise. Funciona sem internet.</p></header>
  ${avisoInstalar()}
  ${vencido ? `<div class="avisos"><p>⏰ <b>Hora de revisar as mochilas.</b> Confira validade de comida, remédios e pilhas (Defesa Civil: a cada ${REF.plano.revisarMeses} meses).</p></div>` : ''}
  <button class="porta" data-ir="bugin">
    <strong>🏠 Ficar em casa</strong><span>Quantos dias sua família aguenta? E o que falta comprar.</span>
    ${u ? `<em class="status">Último resultado: ${u.dias} ${u.dias === 1 ? 'dia' : 'dias'} · nota ${String(u.nota).replace('.', ',')}/10</em>` : ''}</button>
  <button class="porta" data-ir="bugout">
    <strong>🎒 Sair de casa</strong><span>Monte a mochila de 72 horas de cada pessoa.</span>
    ${progresso ? `<em class="status">${progresso}</em>` : ''}
    ${rev && !vencido ? `<em class="status">Revisar até ${rev.toLocaleDateString('pt-BR')}</em>` : ''}</button>
  <button class="porta" data-ir="plano">
    <strong>📋 Plano da família</strong><span>Contatos, ponto de encontro e tipo sanguíneo para colar na geladeira.</span></button>
  <p class="rodape"><button class="link" data-ir="dados">💾 Meus dados</button> · <button class="link" data-ir="instalar">📲 Instalar</button><br>
    Grátis e de código aberto · @breno.paiva40</p>`;
}

// ---------- FAMÍLIA (a mesma nas três telas) ----------
// modo: 'bugin' | 'bugout' | 'plano'
function telaMembro(m, i, modo) {
  const anos = Number(m.idade) || 0;
  const bo = modo === 'bugout';
  const peso = anos >= 19 ? num(`membros.${i}.peso`, m.peso, 'Peso (kg)', 'max="300"')
    : bo ? num(`membros.${i}.pesoCrianca`, m.pesoCrianca, 'Peso (kg, opcional)', 'max="200" placeholder="média da idade"') : '';
  const saude = modo === 'plano' ? `
    <div class="grade">
      <label class="campo"><span>Tipo sanguíneo</span><select data-p="membros.${i}.sangue">${REF.plano.sangue.map((s) =>
        `<option value="${s}" ${m.sangue === s ? 'selected' : ''}>${s || 'Não sei'}</option>`).join('')}</select></label>
      ${txt(`membros.${i}.tel`, m.tel, 'Celular', 'inputmode="tel" autocomplete="off"')}
    </div>
    <div class="grade g1">
      ${txt(`membros.${i}.alergiasTxt`, m.alergiasTxt, 'Alergias (remédio, comida, inseto)')}
      ${txt(`membros.${i}.remediosTxt`, m.remediosTxt, 'Remédios contínuos (nome e dose)')}
      ${txt(`membros.${i}.saudeTxt`, m.saudeTxt, 'Problemas de saúde (diabetes, asma, marca-passo…)')}
    </div>` : '';
  return `
  <div class="cartao">
    <div class="linha"><input class="nome" placeholder="Nome (opcional)" aria-label="Nome" data-p="membros.${i}.nome" value="${esc(m.nome)}">
      <button class="x" data-rm="membros.${i}" aria-label="Remover ${esc(nomePessoa(m, i))}">✕</button></div>
    ${modo === 'plano' ? `<p class="obs mini">${idadeTxt(m)}</p>` : `
    <div class="grade">
      ${num(`membros.${i}.idade`, m.idade, 'Idade (anos)', 'max="120" data-re')}
      ${anos < 3 ? num(`membros.${i}.meses`, m.meses, '+ meses', 'max="11"') : ''}
      <label class="campo"><span>Sexo</span><select data-p="membros.${i}.sexo" data-re>
        <option value="M" ${m.sexo === 'M' ? 'selected' : ''}>Masc.</option>
        <option value="F" ${m.sexo === 'F' ? 'selected' : ''}>Fem.</option></select></label>
      ${peso}
    </div>
    ${m.sexo === 'F' && anos >= 14 ? `<div class="checks">
      <label><input type="checkbox" data-p="membros.${i}.gestante" ${m.gestante ? 'checked' : ''}> Gestante</label>
      <label><input type="checkbox" data-p="membros.${i}.lactante" ${m.lactante ? 'checked' : ''}> Amamentando</label></div>` : ''}`}
    ${bo ? `<div class="checks">
      <label><input type="checkbox" data-p="membros.${i}.remedio" ${m.remedio ? 'checked' : ''}> Remédio contínuo</label>
      <label><input type="checkbox" data-p="membros.${i}.oculos" ${m.oculos ? 'checked' : ''}> Usa óculos</label>
      <label><input type="checkbox" data-p="membros.${i}.alergia" ${m.alergia ? 'checked' : ''}> Alergia grave</label>
      <label><input type="checkbox" data-p="membros.${i}.equipamento" ${m.equipamento ? 'checked' : ''}> Usa aparelho, bengala ou cadeira</label></div>` : ''}
    ${saude}
  </div>`;
}

function blocoFamilia(modo) {
  return `
  ${S.membros.map((m, i) => telaMembro(m, i, modo)).join('')}
  ${modo === 'plano' ? '' : '<button class="sec" data-add="membro">+ Pessoa</button>'}

  <h3>Pets</h3>
  ${S.pets.map((p, i) => `<div class="cartao">
     <div class="linha"><input class="nome" placeholder="Nome do pet (opcional)" aria-label="Nome do pet" data-p="pets.${i}.nome" value="${esc(p.nome)}">
       <button class="x" data-rm="pets.${i}" aria-label="Remover pet">✕</button></div>
     <div class="grade">
       <label class="campo"><span>Tipo</span><select data-p="pets.${i}.tipo" data-re><option value="cao" ${p.tipo === 'cao' ? 'selected' : ''}>Cão</option>
         <option value="gato" ${p.tipo === 'gato' ? 'selected' : ''}>Gato</option></select></label>
       ${num(`pets.${i}.peso`, p.peso, 'Peso (kg)', 'max="100"')}</div></div>`).join('')}
  ${S.pets.length ? '' : '<p class="obs mini">Nenhum pet cadastrado.</p>'}
  <button class="sec" data-add="pet">+ Pet</button>`;
}

// ---------- FICAR EM CASA ----------
function telaBugIn() {
  const e = S.estoque;
  const temBebe = S.membros.some((m) => (Number(m.idade) || 0) < 3);
  return `
  <button class="voltar" data-ir="home">← Voltar</button>
  <h2>🏠 Ficar em casa</h2>

  <h3>1. Quem mora com você</h3>
  ${blocoFamilia('bugin')}

  <h3>2. O que você tem em casa hoje</h3>
  <div class="grade">
    ${num('estoque.aguaL', e.aguaL, 'Água potável (litros)', 'max="100000"')}
    ${num('estoque.secoKg', e.secoKg, 'Arroz, feijão, macarrão (kg somados)', 'max="10000"')}
    ${num('estoque.latas', e.latas, 'Enlatados (latas)', 'max="10000"')}
    ${temBebe ? num('estoque.fraldas', e.fraldas, 'Fraldas (unid.)', 'max="10000"') : ''}
    ${S.pets.length ? num('estoque.racaoKg', e.racaoKg, 'Ração (kg)', 'max="10000"') : ''}
  </div>
  <div class="checks"><label><input type="checkbox" data-p="temRemedio" data-re ${S.temRemedio ? 'checked' : ''}> Alguém usa remédio contínuo</label></div>
  ${S.temRemedio ? num('estoque.remedioDias', e.remedioDias, 'Remédio dá para quantos dias?', 'max="3650"') : ''}

  <h3>3. Você já tem…</h3>
  <div class="checks col">${REF.basicos.map((b) =>
    `<label><input type="checkbox" data-p="basicos.${b.id}" ${S.basicos[b.id] ? 'checked' : ''}> ${b.nome}</label>`).join('')}</div>

  <h3>4. Quer se preparar para quantos dias?</h3>
  <div class="metas">${[3, 7, 14, 30].map((d) =>
    `<button class="${S.meta === d ? 'on' : ''}" data-meta="${d}" aria-pressed="${S.meta === d}">${d} dias</button>`).join('')}</div>

  <button class="pri" data-ir="resultado" ${S.membros.length ? '' : 'disabled'}>Ver resultado</button>
  ${S.membros.length ? '' : '<p class="obs">Cadastre pelo menos uma pessoa.</p>'}`;
}

const fontesHtml = () =>
  `<details class="fontes"><summary>Fontes dos números</summary><ul>${REF.fontes.map((f) => `<li>${f}</li>`).join('')}</ul></details>`;

function telaResultado() {
  if (!S.membros.length) return telaBugIn();
  const r = calcularBugIn(S);
  if (!S.ultimo || S.ultimo.dias !== r.dias || S.ultimo.nota !== r.nota) { S.ultimo = { dias: r.dias, nota: r.nota }; salvar(); }
  const cor = r.dias < 3 ? 'ruim' : r.dias < 7 ? 'medio' : 'bom';
  const grupos = ['essencial', 'importante', 'extra'];
  return `
  <button class="voltar no-print" data-ir="bugin">← Ajustar respostas</button>
  <div class="placar ${cor}">
    <span>Hoje sua família aguenta</span>
    <strong>${r.dias} ${r.dias === 1 ? 'dia' : 'dias'}</strong>
    <span>O que acaba primeiro: <b>${r.limitante}</b> · Nota ${String(r.nota).replace('.', ',')}/10</span>
  </div>
  <p class="obs">Base: ${REF.aguaLitrosPessoaDia} L de água por pessoa/dia e ${r.kcalDia.toLocaleString('pt-BR')} kcal/dia para a família.</p>

  <h3>Lista completa para chegar a ${r.meta} dias</h3>
  <p class="obs mini">Marque o que você já tem ou já comprou. Fica salvo no celular.</p>
  ${opcoes('filtro', (v) => (S.filtroLista || 'tudo') === v, [['tudo', `Tudo (${r.lista.length})`], ['essencial', `Só o essencial (${r.lista.filter((x) => x.prioridade === 'essencial').length})`]])}
  ${(() => {
    const visiveis = r.lista.filter((x) => (S.filtroLista || 'tudo') === 'tudo' || x.prioridade === 'essencial');
    if (!visiveis.length) return '<p>Você já está pronto para essa meta. 💪</p>';
    const prontos = visiveis.filter((x) => S.riscados[x.id]).length;
    return `<p class="progresso"><b>${prontos}</b> de ${visiveis.length} itens prontos</p>` + Object.keys(REF.categorias).map((cat) => {
      const itens = visiveis.filter((x) => x.cat === cat).sort((a, b) => grupos.indexOf(a.prioridade) - grupos.indexOf(b.prioridade));
      return itens.length ? `<h4>${REF.categorias[cat]}</h4><ul class="lista">${itens.map((x) => {
        const ok = S.riscados[x.id];
        return `<li class="${ok ? 'ok' : ''}"><label><input type="checkbox" data-risca="${esc(x.id)}" ${ok ? 'checked' : ''}>
          <span>${x.qtd > 1 || x.unid ? `<b>${x.qtd}</b> ${unidade(x.qtd, x.unid)} — ` : ''}${esc(x.nome)}</span>
          <small class="tag ${x.prioridade}">${x.prioridade}</small></label></li>`;
      }).join('')}</ul>` : '';
    }).join('');
  })()}

  <div class="dica"><b>Ficou sem água potável?</b> ${REF.hipocloritoGotasPorLitro} gotas de água sanitária (hipoclorito 2,5%, sem perfume) por litro, espere 30 minutos.</div>

  ${avisoInstalar()}
  <div class="acoes no-print">
    <button class="pri" onclick="window.print()">Imprimir / salvar PDF</button>
    <button class="sec" data-share="bugin">Compartilhar resultado</button>
    <button class="sec" data-ir="bugout">Montar a mochila de saída →</button>
    <button class="sec" data-ir="plano">Fazer o plano da família →</button>
  </div>
  ${fontesHtml()}`;
}

// ---------- SAIR DE CASA ----------
const opcoes = (attr, atual, lista) =>
  `<div class="metas n${lista.length}">${lista.map(([v, rot]) =>
    `<button class="${atual(v) ? 'on' : ''}" data-${attr}="${v}" aria-pressed="${atual(v) ? 'true' : 'false'}">${rot}</button>`).join('')}</div>`;

function telaBugOut() {
  const bo = S.bo;
  return `
  <button class="voltar" data-ir="home">← Voltar</button>
  <h2>🎒 Sair de casa</h2>
  <p class="obs">Mochila de 72 horas para cada pessoa. Usa a mesma família do "Ficar em casa".</p>

  <h3>1. Sua família</h3>
  ${blocoFamilia('bugout')}

  <h3>2. Como vocês vão sair?</h3>
  ${opcoes('modo', (v) => bo.modo === v, [['pe', '🚶 A pé'], ['carro', '🚗 De carro']])}

  <h3>3. Como está o clima? <small>(pode marcar mais de um)</small></h3>
  ${opcoes('clima', (v) => !!bo.clima[v], [['calor', '☀️ Calor'], ['frio', '🧊 Frio'], ['chuva', '🌧️ Chuva']])}

  <h3>4. Quanto dá para gastar?</h3>
  ${opcoes('orc', (v) => bo.orcamento === v, [['basico', 'Básico'], ['medio', 'Médio'], ['completo', 'Completo']])}
  <p class="obs">${{ basico: 'Só o essencial.', medio: 'Essencial + importante.', completo: 'Tudo, inclusive os extras.' }[bo.orcamento]}</p>

  <button class="pri" data-ir="boResultado" ${S.membros.length ? '' : 'disabled'}>Montar as mochilas</button>
  ${S.membros.length ? '' : '<p class="obs">Cadastre pelo menos uma pessoa.</p>'}`;
}

const chaveBO = (mo, it) => `${(S.membros[mo.idx] || {}).id || mo.idx}|${it.id}|${it.de || ''}`;

function itemBO(it, chave) {
  const ok = S.riscadosBO[chave];
  const qtd = it.qtd > 1 || it.unid ? `<b>${it.qtd}</b> ${unidade(it.qtd, it.unid)} — ` : '';
  const de = it.de ? ` <em class="de">${it.de === 'família' ? 'da família' : 'de ' + esc(it.de)}</em>` : '';
  const peso = it.noCorpo ? 'vai no corpo' : it.g ? '~' + gTxt(it.g) : '';
  return `<li class="${ok ? 'ok' : ''}"><label><input type="checkbox" data-riscabo="${esc(chave)}" ${ok ? 'checked' : ''}>
    <span>${qtd}${esc(it.nome)}${de}</span><small class="g">${peso}</small></label></li>`;
}

function listaPorPrioridade(itens, chave) {
  return ['essencial', 'importante', 'extra'].map((p) => {
    const l = itens.filter((it) => it.prio === p);
    return l.length ? `<h4>${p[0].toUpperCase() + p.slice(1)}</h4><ul class="lista">${l.map((it) => itemBO(it, chave(it))).join('')}</ul>` : '';
  }).join('');
}

const ROTULO_CAT = { crianca: 'Criança', adolescente: 'Adolescente', adulto: 'Adulto', idoso: 'Idoso(a)' };

function telaBoResultado() {
  if (!S.membros.length) return telaBugOut();
  const r = calcularBugOut(S);
  const climas = Object.keys(S.bo.clima).filter((c) => S.bo.clima[c]);
  const rev = revisarAte();
  return `
  <button class="voltar no-print" data-ir="bugout">← Ajustar respostas</button>
  <h2>🎒 Mochilas de 72 horas</h2>
  <p class="obs">${S.bo.modo === 'carro' ? 'De carro' : 'A pé'} · ${climas.length ? climas.join(', ') : 'clima ameno'} · orçamento ${{ basico: 'básico', medio: 'médio', completo: 'completo' }[S.bo.orcamento]} · peso total ${kgTxt(r.totalG)}</p>

  ${r.avisos.length ? `<div class="avisos">${r.avisos.map((a) => `<p>${esc(a)}</p>`).join('')}</div>` : ''}

  ${r.mochilas.map((mo) => {
    const pct = Math.min(100, Math.round((mo.pesoG / mo.limiteG) * 100));
    const colo = mo.colo.map((b) => `<p class="colo">👶 Leva ${esc(b.nome)} no sling/colo: ${kgTxt(b.g)} (já está na conta).</p>`).join('')
      + mo.coloParcial.map((b) => `<p class="colo">👶 ${esc(b.nome)} anda parte do caminho com ${esc(mo.nome)}. No colo, são mais ${kgTxt(b.g)}.</p>`).join('');
    return `<section class="mochila cartao ${mo.passou ? 'passou' : ''}">
      <div class="mo-topo"><strong>${esc(mo.nome)}</strong><span>${ROTULO_CAT[mo.cat]}, ${mo.pesoKg.toLocaleString('pt-BR')} kg</span></div>
      <div class="barra" role="img" aria-label="${pct}% do limite"><i style="width:${pct}%"></i></div>
      <p class="peso"><b>${kgTxt(mo.pesoG)}</b> de ${kgTxt(mo.limiteG)} <small>(limite: ${Math.round(mo.fator * 100)}% do peso do corpo${mo.colo.length ? `; mochila ${kgTxt(mo.mochilaG)} + bebê` : ''})</small>
        ${mo.passou ? `<br><span class="alerta">⚠️ Passou ${kgTxt(mo.excessoG)} do limite</span>` : ''}</p>
      ${colo}
      ${listaPorPrioridade(mo.itens, (it) => chaveBO(mo, it))}
    </section>`;
  }).join('')}

  ${r.bebes.map((b) => `<div class="cartao bebe">👶 <b>${esc(b.nome)}</b> não carrega mochila. As coisas dele(a) estão na mochila de ${esc(b.vaiCom.join(' e ') || '—')}.</div>`).join('')}

  ${r.carro.length ? `<section class="mochila cartao"><div class="mo-topo"><strong>🚗 Vai no carro</strong><span>não pesa nas costas</span></div>
    ${listaPorPrioridade(r.carro, (it) => `carro|${it.id}`)}</section>` : ''}

  <div class="dica"><b>Monte e deixe pronta.</b> Mochila perto da porta. Sapato fechado e roupa do corpo já vão vestidos.
    ${rev ? `<br>Montadas em ${dataBR(S.boMontadaEm)}. <b>Revisar até ${rev.toLocaleDateString('pt-BR')}</b> (validade de comida, remédio e pilhas).` : ''}</div>

  ${avisoInstalar()}
  <div class="acoes no-print">
    <button class="pri" onclick="window.print()">Imprimir / salvar PDF</button>
    <button class="sec" data-montada>${S.boMontadaEm ? 'Revisei hoje: renovar o lembrete' : '✅ Mochilas montadas: lembrar de revisar em 6 meses'}</button>
    <button class="sec" data-share="bugout">Compartilhar</button>
    <button class="sec" data-ir="plano">Fazer o plano da família →</button>
    <button class="sec discreto" data-limpabo>Desmarcar todos os itens</button>
  </div>
  ${fontesHtml()}`;
}

// ---------- PLANO DA FAMÍLIA ----------
function telaPlano() {
  const p = S.plano;
  return `
  <button class="voltar" data-ir="home">← Voltar</button>
  <h2>📋 Plano da família</h2>
  <p class="obs">Preencha uma vez, imprima e cole na geladeira. Cada pessoa leva um cartão na carteira e na mochila.</p>

  <h3>1. Onde a família se encontra</h3>
  <div class="grade g1">
    ${txt('plano.endereco', p.endereco, 'Endereço de casa')}
    ${txt('plano.encontroPerto', p.encontroPerto, 'Ponto de encontro perto de casa (se tiver que sair correndo: incêndio, desabamento)', 'placeholder="Ex.: portão da escola da rua de baixo"')}
    ${txt('plano.encontroLonge', p.encontroLonge, 'Ponto de encontro fora do bairro (se não der para voltar para casa)', 'placeholder="Ex.: casa da tia, no centro"')}
    ${txt('plano.destino', p.destino, 'Para onde vamos se precisar sair da cidade', 'placeholder="Ex.: casa dos avós em…"')}
  </div>

  <h3>2. Contato fora da cidade</h3>
  <p class="obs mini">Quando a rede cai na cidade, ligar para longe costuma funcionar melhor. Todo mundo avisa essa pessoa que está bem, de preferência por mensagem de texto.</p>
  <div class="grade">
    ${txt('plano.contatoFora.nome', p.contatoFora.nome, 'Nome')}
    ${txt('plano.contatoFora.tel', p.contatoFora.tel, 'Telefone', 'inputmode="tel"')}
  </div>

  <h3>3. Outros contatos</h3>
  ${p.contatos.map((c, i) => `<div class="cartao">
    <div class="linha"><strong class="nome">Contato ${i + 1}</strong><button class="x" data-rm="plano.contatos.${i}" aria-label="Remover contato">✕</button></div>
    <div class="grade">
      ${txt(`plano.contatos.${i}.nome`, c.nome, 'Nome')}
      ${txt(`plano.contatos.${i}.tel`, c.tel, 'Telefone', 'inputmode="tel"')}
      ${txt(`plano.contatos.${i}.rel`, c.rel, 'Quem é', 'placeholder="vizinho, médico, trabalho…"')}
    </div></div>`).join('')}
  <button class="sec" data-add="contato">+ Contato</button>

  <h3>4. Saúde de cada pessoa</h3>
  ${S.membros.length ? blocoFamilia('plano') : '<p class="obs">Cadastre a família no "Ficar em casa" ou no "Sair de casa".</p>'}
  ${S.pets.length ? txt('plano.veterinario', p.veterinario, 'Veterinário (nome e telefone)') : ''}

  <h3>5. Escola, creche, trabalho</h3>
  <label class="campo"><span>Onde cada um fica durante o dia e quem busca as crianças</span>
    <textarea data-p="plano.lugares" rows="3">${esc(p.lugares)}</textarea></label>

  <div class="acoes">
    <button class="pri" data-ir="planoImprimir">Ver plano pronto para imprimir</button>
  </div>`;
}

function telaPlanoImprimir() {
  const p = S.plano;
  const P = REF.plano;
  const contatos = [p.contatoFora.nome || p.contatoFora.tel ? { nome: p.contatoFora.nome, tel: p.contatoFora.tel, rel: 'contato fora da cidade' } : null,
    ...p.contatos.filter((c) => c.nome || c.tel)].filter(Boolean);
  const vazio = (v) => esc(v) || '<span class="linha-vazia"></span>';
  const principal = contatos[0];
  return `
  <div class="no-print">
    <button class="voltar" data-ir="plano">← Editar plano</button>
  </div>
  <article class="folha">
    <h2>Plano de emergência da família</h2>
    <p class="obs mini">Atualizado em ${new Date().toLocaleDateString('pt-BR')} · Família Pronta</p>

    <section class="bloco emerg">
      ${P.emergencia.map((e) => `<div><b>${e.n}</b><span>${e.nome}</span></div>`).join('')}
    </section>
    <p class="mini">📲 Alertas da Defesa Civil: mande um SMS com o seu CEP para <b>${P.smsAlerta}</b>.</p>

    <section class="bloco">
      <h3>Onde nos encontrar</h3>
      <dl>
        <dt>Casa</dt><dd>${vazio(p.endereco)}</dd>
        <dt>Perto de casa</dt><dd>${vazio(p.encontroPerto)}</dd>
        <dt>Fora do bairro</dt><dd>${vazio(p.encontroLonge)}</dd>
        <dt>Se sair da cidade</dt><dd>${vazio(p.destino)}</dd>
      </dl>
    </section>

    <section class="bloco">
      <h3>Contatos</h3>
      ${contatos.length ? `<table><tbody>${contatos.map((c) => `<tr><td>${esc(c.nome)}</td><td><b>${esc(c.tel)}</b></td><td>${esc(c.rel || '')}</td></tr>`).join('')}</tbody></table>`
        : '<p class="linha-vazia"></p><p class="linha-vazia"></p>'}
    </section>

    <section class="bloco">
      <h3>Família</h3>
      <div class="tabela-rolagem"><table>
        <thead><tr><th>Nome</th><th>Idade</th><th>Sangue</th><th>Celular</th><th>Alergias</th><th>Remédios</th><th>Saúde</th></tr></thead>
        <tbody>${S.membros.map((m, i) => `<tr><td><b>${esc(nomePessoa(m, i))}</b></td><td>${idadeTxt(m)}</td><td>${esc(m.sangue) || '?'}</td>
          <td>${esc(m.tel)}</td><td>${esc(m.alergiasTxt)}</td><td>${esc(m.remediosTxt)}</td><td>${esc(m.saudeTxt)}</td></tr>`).join('')}</tbody>
      </table></div>
      ${S.pets.length ? `<p class="mini"><b>Pets:</b> ${S.pets.map((pt, j) => `${esc(pt.nome || (pt.tipo === 'gato' ? 'Gato' : 'Cão') + ' ' + (j + 1))} (${pt.tipo === 'gato' ? 'gato' : 'cão'}, ${Number(pt.peso) || '?'} kg)`).join(', ')}${p.veterinario ? ` · Veterinário: ${esc(p.veterinario)}` : ''}</p>` : ''}
    </section>

    ${p.lugares ? `<section class="bloco"><h3>Durante o dia</h3><p>${esc(p.lugares).replace(/\n/g, '<br>')}</p></section>` : ''}

    <section class="bloco dica">
      <b>Sem água potável?</b> ${REF.hipocloritoGotasPorLitro} gotas de água sanitária (sem perfume) por litro, espere 30 min.
      <b>Mochilas</b> perto da porta, revisar a cada ${P.revisarMeses} meses.
    </section>
  </article>

  <h3 class="quebra">Cartões de bolso <small>(recorte na linha e guarde na carteira e na mochila)</small></h3>
  <div class="cartoes">
    ${S.membros.map((m, i) => `<div class="cartao-bolso">
      <b>${esc(nomePessoa(m, i))}</b> · ${idadeTxt(m)} · Sangue: <b>${esc(m.sangue) || '?'}</b>
      ${m.alergiasTxt ? `<div>⚠️ Alergia: ${esc(m.alergiasTxt)}</div>` : ''}
      ${m.remediosTxt ? `<div>💊 ${esc(m.remediosTxt)}</div>` : ''}
      ${m.saudeTxt ? `<div>🩺 ${esc(m.saudeTxt)}</div>` : ''}
      <div>📞 ${principal ? `${esc(principal.nome)} ${esc(principal.tel)}` : '________________'}</div>
      <div>📍 ${esc(p.encontroLonge || p.encontroPerto) || '________________'}</div>
      <div class="mini">190 · 192 · 193 · 199</div>
    </div>`).join('')}
  </div>

  <div class="acoes no-print">
    <button class="pri" onclick="window.print()">Imprimir / salvar PDF</button>
    <button class="sec" data-ir="home">Voltar ao início</button>
  </div>`;
}

const TELAS = { home: telaHome, bugin: telaBugIn, resultado: telaResultado, bugout: telaBugOut, boResultado: telaBoResultado,
  plano: telaPlano, planoImprimir: telaPlanoImprimir, instalar: telaInstalar, dados: telaDados };

function render() {
  // Guarda o foco (para não perder o campo ao redesenhar a tela)
  const a = document.activeElement;
  const foco = a && $app.contains(a) ? (a.dataset.p ? `[data-p="${a.dataset.p}"]` : a.dataset.riscabo ? `[data-riscabo="${CSS.escape(a.dataset.riscabo)}"]` : null) : null;
  $app.innerHTML = (TELAS[S.tela] || telaHome)();
  document.title = { home: 'Família Pronta', plano: 'Plano da família · Família Pronta', planoImprimir: 'Plano da família · Família Pronta',
    bugout: 'Sair de casa · Família Pronta', boResultado: 'Mochilas 72h · Família Pronta', instalar: 'Instalar · Família Pronta',
    dados: 'Meus dados · Família Pronta' }[S.tela] || 'Ficar em casa · Família Pronta';
  if (foco) { const el = $app.querySelector(foco); if (el) el.focus({ preventScroll: true }); }
}

// ---------- eventos ----------
function limita(t) {
  if (t.value === '') return '';
  let v = Number(t.value);
  if (!Number.isFinite(v)) return '';
  if (t.min !== '' && v < Number(t.min)) v = Number(t.min);
  if (t.max !== '' && v > Number(t.max)) v = Number(t.max);
  return v;
}
$app.addEventListener('input', (ev) => {
  const t = ev.target; const p = t.dataset.p; if (!p) return;
  if (t.type === 'checkbox' || t.tagName === 'SELECT') return;
  setPath(p, t.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value);
  salvar();
});
$app.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.risca) {
    S.riscados[t.dataset.risca] = t.checked; salvar(); t.closest('li').classList.toggle('ok', t.checked);
    const b = $app.querySelector('.progresso b');
    if (b) b.textContent = $app.querySelectorAll('[data-risca]:checked').length;
    return;
  }
  if (t.dataset.importar !== undefined) { if (t.files[0]) importar(t.files[0]); t.value = ''; return; }
  if (t.dataset.riscabo) {
    S.riscadosBO[t.dataset.riscabo] = t.checked; salvar();
    t.closest('li').classList.toggle('ok', t.checked); // sem redesenhar: mantém a rolagem
    return;
  }
  if (!t.dataset.p) return;
  if (t.type === 'checkbox') setPath(t.dataset.p, t.checked);
  else if (t.tagName === 'SELECT') setPath(t.dataset.p, t.value);
  else if (t.type === 'number') { const v = limita(t); setPath(t.dataset.p, v); if (String(v) !== t.value) t.value = v; }
  salvar();
  if (t.dataset.re !== undefined) render();
});
$app.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.ir) return ir(b.dataset.ir);
  if (b.dataset.meta) { S.meta = Number(b.dataset.meta); salvar(); return render(); }
  if (b.dataset.modo) { S.bo.modo = b.dataset.modo; salvar(); return render(); }
  if (b.dataset.clima) { S.bo.clima[b.dataset.clima] = !S.bo.clima[b.dataset.clima]; salvar(); return render(); }
  if (b.dataset.orc) { S.bo.orcamento = b.dataset.orc; salvar(); return render(); }
  if (b.dataset.filtro) { S.filtroLista = b.dataset.filtro; salvar(); return render(); }
  if (b.dataset.instalar !== undefined) return instalarAgora();
  if (b.dataset.copiar) {
    const url = b.dataset.copiar;
    return (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(() => toast('Link copiado. Cole no Chrome ou no Safari.')).catch(() => window.prompt('Copie o link:', url));
  }
  if (b.dataset.exportar !== undefined) return exportar();
  if (b.dataset.apagar !== undefined) {
    if (!confirm('Apagar TUDO que está salvo neste celular (família, listas, plano)? Não dá para desfazer.')) return;
    try { localStorage.removeItem(CHAVE); } catch {}
    return location.reload();
  }
  if (b.dataset.limpabo !== undefined) {
    if (!confirm('Desmarcar todos os itens das mochilas?')) return;
    S.riscadosBO = {}; salvar(); return render();
  }
  if (b.dataset.montada !== undefined) {
    S.boMontadaEm = new Date().toISOString(); salvar(); render();
    return toast(`Combinado. Revisar até ${revisarAte().toLocaleDateString('pt-BR')}.`);
  }
  if (b.dataset.share === 'bugin') {
    const u = S.ultimo || calcularBugIn(S);
    return compartilhar(`Fiz o teste do Família Pronta: hoje minha família aguenta ${u.dias} ${u.dias === 1 ? 'dia' : 'dias'} numa crise (nota ${String(u.nota).replace('.', ',')}/10). E a sua? É grátis e funciona sem internet:`);
  }
  if (b.dataset.share === 'bugout') {
    return compartilhar(`Montei a mochila de 72 horas de cada pessoa da minha família no Família Pronta, com peso certo para cada um carregar. Faça a sua, é grátis:`);
  }
  if (b.dataset.add === 'membro') S.membros.push({ id: novoId(), nome: '', idade: 30, meses: 0, sexo: 'F', peso: 60 });
  if (b.dataset.add === 'pet') S.pets.push({ id: novoId(), nome: '', tipo: 'cao', peso: 10 });
  if (b.dataset.add === 'contato') S.plano.contatos.push({ nome: '', tel: '', rel: '' });
  if (b.dataset.rm) {
    const k = b.dataset.rm.split('.');
    const i = Number(k.pop());
    let lista = S; k.forEach((x) => (lista = lista[x]));
    const alvo = lista[i];
    const nome = alvo && alvo.nome ? `"${alvo.nome}"` : 'este item';
    if ((alvo && (alvo.nome || alvo.tel)) && !confirm(`Remover ${nome}?`)) return;
    lista.splice(i, 1);
  }
  salvar(); render();
});

render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
// Pede ao navegador para não apagar os dados sozinho quando o celular ficar sem espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
