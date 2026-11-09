// =====================================================================
// CÁLCULOS — funções puras, sem tela. Testáveis com: node teste.js
// =====================================================================

const mesesDe = (m) => (Number(m.idade) || 0) * 12 + (Number(m.meses) || 0);
const numero = (v) => Number(v) || 0;

// Calorias/dia de uma pessoa
function kcalMembro(m) {
  const anos = mesesDe(m) / 12;
  const faixa = REF.kcalPorFaixa.find((f) => anos < f.ate);
  let k = faixa[m.sexo] || faixa.M;
  if (anos >= 19 && Number(m.peso) > 0) {
    const r = Number(m.peso) / REF.pesoRef[m.sexo === 'F' ? 'F' : 'M'];
    k *= Math.min(1.25, Math.max(0.75, r));
  }
  if (m.gestante) k += REF.extraGestante;
  if (m.lactante) k += REF.extraLactante;
  return Math.round(k);
}

function fraldasDia(m) {
  const meses = mesesDe(m);
  const f = REF.fraldasPorDia.find((x) => meses < x.ate); // "ate" em meses
  return f ? f.n : 0;
}

// ---- Pets: energia → ração e água ----
function petKcalDia(p) {
  const kg = numero(p.peso);
  if (!kg) return 0;
  const rer = REF.petRER.fator * Math.pow(kg, REF.petRER.expoente);
  return rer * (REF.petFatorManutencao[p.tipo] || REF.petFatorManutencao.cao);
}
const petAguaLDia = (p) => (petKcalDia(p) * REF.aguaPetMlPorKcal) / 1000;
const petRacaoKgDia = (p) => petKcalDia(p) / REF.kcalPorKgRacao;

// ---------------------------------------------------------------------
// BUG-IN: quantos dias a casa aguenta + o que comprar para a meta
// s = { membros:[...], pets:[{tipo,peso}], estoque:{aguaL,secoKg,latas,fraldas,racaoKg,remedioDias},
//       temRemedio:bool, basicos:{id:true}, meta:dias }
// ---------------------------------------------------------------------
function calcularBugIn(s) {
  const membros = s.membros || [];
  const pets = s.pets || [];
  const e = s.estoque || {};
  const num = numero;

  const aguaDia = membros.length * REF.aguaLitrosPessoaDia + pets.reduce((a, p) => a + petAguaLDia(p), 0);

  // Bebês com menos de 12 meses não entram na cesta (leite/fórmula à parte)
  const kcalDia = membros.filter((m) => mesesDe(m) >= 12).reduce((a, m) => a + kcalMembro(m), 0);
  const kcalCasa = num(e.secoKg) * REF.kcalPorKgAlimentoSeco + num(e.latas) * REF.kcalPorLata;

  const fraldas = membros.reduce((a, m) => a + fraldasDia(m), 0);
  const racaoDia = pets.reduce((a, p) => a + petRacaoKgDia(p), 0);

  const limites = [];
  if (aguaDia) limites.push({ fator: 'Água', dias: num(e.aguaL) / aguaDia });
  if (kcalDia) limites.push({ fator: 'Comida', dias: kcalCasa / kcalDia });
  if (fraldas) limites.push({ fator: 'Fraldas', dias: num(e.fraldas) / fraldas });
  if (racaoDia) limites.push({ fator: 'Ração dos pets', dias: num(e.racaoKg) / racaoDia });
  const temRemedio = s.temRemedio || membros.some((m) => m.remedio); // marcado aqui ou no "Sair de casa"
  if (temRemedio) limites.push({ fator: 'Remédio de uso contínuo', dias: num(e.remedioDias) });

  const pior = limites.reduce((a, b) => (b.dias < a.dias ? b : a), { fator: '-', dias: Infinity });
  const dias = Number.isFinite(pior.dias) ? Math.floor(pior.dias) : 0;

  // ---- Lista completa para atingir a meta, por categoria ----
  const meta = num(s.meta) || 14;
  const lista = [];
  const add = (id, cat, nome, qtd, unid, prioridade) => qtd > 0 && lista.push({ id, cat, nome, qtd, unid, prioridade });

  // Água e comida (descontando o que já tem)
  const faltaAgua = Math.max(0, aguaDia * meta - num(e.aguaL));
  add('agua', 'agua', 'Água potável', Math.ceil(faltaAgua / 5), 'galões de 5 L', 'essencial');

  const faltaKcal = Math.max(0, kcalDia * meta - kcalCasa);
  REF.cesta.forEach((c) => add(c.id, 'comida', c.nome, Math.ceil((faltaKcal * c.pct) / c.kcal), c.unid, 'essencial'));

  // Reserva de 3 dias de comida que não precisa cozinhar (Ready.gov: comida pronta, sem geladeira nem fogão)
  const semFogao = {};
  const semAmendoimCasa = membros.some((m) => m.alergiaAmendoim);
  membros.forEach((m) => comidaLeve(m, REF.bugout.dias, semAmendoimCasa).forEach(({ c, n }) => { semFogao[c.id] = (semFogao[c.id] || 0) + n; }));
  REF.bugout.comida.forEach((c) => add(`semFogao-${c.id}`, 'comida', `Sem fogão (reserva de 3 dias): ${c.nome}`, semFogao[c.id] || 0, c.unid, 'importante'));

  // Bebê e pets
  add('fraldas', 'bebe', 'Fraldas', Math.max(0, Math.ceil(fraldas * meta - num(e.fraldas))), 'unidades', 'essencial');
  const amamenta = membros.some((m) => m.lactante);
  membros.filter((m) => mesesDe(m) < 12).forEach((m, k) => {
    if (amamenta) return;
    const gPo = (mlFormulaDia(m) * meta * REF.bugout.formula.gPoPor100ml) / 100;
    add(`formula-${k}`, 'bebe', `Fórmula infantil (${Math.round(gPo / 10) * 10} g para ${meta} dias; confira o rótulo)`,
      Math.ceil(gPo / REF.bugout.gLataFormula), `latas de ${REF.bugout.gLataFormula} g`, 'essencial');
  });
  add('racao', 'pets', 'Ração', Math.max(0, Math.ceil(racaoDia * meta - num(e.racaoKg))), 'kg', 'essencial');

  if (temRemedio && num(e.remedioDias) < meta)
    add('remedio', 'saude', 'Remédio de uso contínuo (fale com o médico e leve a receita)', meta - num(e.remedioDias), 'dias a mais', 'essencial');

  add('papel', 'higiene', 'Papel higiênico', Math.ceil(membros.length * REF.papelRoloPessoaDia * meta), 'rolos', 'importante');

  // Resto da lista (data.js → casa)
  const anos = (m) => mesesDe(m) / 12;
  const grupo = {
    familia: 1,
    todos: membros.length,
    ano1: membros.filter((m) => mesesDe(m) >= 12).length,
    anos2: membros.filter((m) => mesesDe(m) >= 24).length,
    anos5: membros.filter((m) => anos(m) >= 5).length,
    adulto: membros.filter((m) => anos(m) >= 18).length,
    mulher: membros.filter((m) => m.sexo === 'F' && anos(m) >= 12 && anos(m) < 51).length,
    bebe: membros.filter((m) => mesesDe(m) < 36).length,
    formula: amamenta ? 0 : membros.filter((m) => mesesDe(m) < 12).length,
    crianca: membros.filter((m) => anos(m) >= 3 && anos(m) < 12).length,
    oculos: membros.filter((m) => m.oculos).length,
    pet: pets.length,
    gato: pets.filter((p) => p.tipo === 'gato').length,
    cao: pets.filter((p) => p.tipo !== 'gato').length,
  };
  const tem = s.basicos || {};
  const semanas = Math.ceil(meta / 7);
  REF.casa.forEach((it) => {
    if (it.basico && tem[it.basico]) return;
    if (it.se && !grupo[it.se]) return;
    const n = grupo[it.por || 'familia'];
    const v = it.valor || 1;
    let q;
    if (it.regra === 'pessoa') q = n * v;
    else if (it.regra === 'dia') q = Math.ceil((n * v * meta) / (it.tamanho || 1));
    else if (it.regra === 'semana') q = Math.ceil((n * v * semanas) / (it.tamanho || 1));
    else if (it.regra === 'mes') q = Math.ceil((n * v * meta) / 30 / (it.tamanho || 1));
    else q = v;
    if (!it.se && membros.length) q = Math.max(1, q);
    add(it.id, it.cat, it.nome, q, it.unid || '', it.prio);
  });

  // Nota 0–10: 70% dias (alvo 14), 30% itens básicos
  const pctBasicos = REF.basicos.filter((b) => tem[b.id]).length / REF.basicos.length;
  const nota = Math.round((Math.min(dias / 14, 1) * 7 + pctBasicos * 3) * 10) / 10;

  return { dias, limitante: pior.fator, limites, lista, nota, aguaDia, kcalDia, meta };
}

// =====================================================================
// BUG-OUT: mochila de 72 horas por pessoa
// s = { membros:[{..., remedio, oculos, alergia, pesoCrianca}], pets:[...],
//       bo:{ modo:'pe'|'carro', clima:{calor,frio,chuva}, orcamento:'basico'|'medio'|'completo' } }
// =====================================================================
const ORDEM_PRIO = { essencial: 0, importante: 1, extra: 2 };
const PRIOS_ORC = { basico: ['essencial'], medio: ['essencial', 'importante'], completo: ['essencial', 'importante', 'extra'] };

function categoria(m) {
  const B = REF.bugout;
  const meses = mesesDe(m);
  const anos = meses / 12;
  if (meses < B.bebeAteMeses) return 'bebe';
  if (anos < B.idadeAdolescente) return 'crianca';
  if (anos < B.idadeAdulto) return 'adolescente';
  if (anos < B.idadeIdoso) return 'adulto';
  return 'idoso';
}

// Peso corporal (kg): informado, ou mediana OMS/CDC para a idade
function pesoCorporal(m) {
  const sexo = m.sexo === 'F' ? 'F' : 'M';
  const anos = mesesDe(m) / 12;
  if (anos >= 19) return numero(m.peso) || REF.pesoRef[sexo];
  if (numero(m.pesoCrianca) > 0) return numero(m.pesoCrianca);
  if (anos >= 18 && numero(m.peso) > 0) return numero(m.peso);
  const meses = mesesDe(m);
  let r = REF.bugout.pesoMedianoKg[0];
  REF.bugout.pesoMedianoKg.forEach((x) => { if (meses >= x.m) r = x; });
  return r[sexo];
}

// Litros/dia de água para beber (IOM, parte de bebidas)
function aguaBebidaLDia(m) {
  const B = REF.bugout;
  if (mesesDe(m) < 12) return 0;
  const anos = mesesDe(m) / 12;
  const f = B.aguaBebidaLDia.find((x) => anos < x.ate);
  let l = f[m.sexo === 'F' ? 'F' : 'M'];
  if (m.gestante) l = Math.max(l, B.aguaBebidaGestante);
  if (m.lactante) l = Math.max(l, B.aguaBebidaLactante);
  return l;
}

// Comida leve e calórica para N dias (a partir de 12 meses): arredonda para baixo
// e completa com o item mais em falta até bater as calorias. Retorna [{ c, n }].
// semAmendoim: alguém da família tem alergia a amendoim → ninguém leva (evita contato).
function comidaLeve(m, dias, semAmendoim) {
  const meses = mesesDe(m);
  if (meses < 12) return [];
  const kcal = kcalMembro(m) * dias;
  const lista = REF.bugout.comida.filter((c) => (!c.minMeses || meses >= c.minMeses) && !(semAmendoim && c.alergeno === 'amendoim'));
  const soma = lista.reduce((a, c) => a + c.pct, 0);
  const alvo = lista.map((c) => (kcal * c.pct) / soma);
  const ns = lista.map((c, k) => Math.floor(alvo[k] / c.kcal));
  let tot = ns.reduce((a, n, k) => a + n * lista[k].kcal, 0);
  while (tot < kcal) {
    let k = 0;
    alvo.forEach((a, j) => { if (a - ns[j] * lista[j].kcal > alvo[k] - ns[k] * lista[k].kcal) k = j; });
    ns[k]++; tot += lista[k].kcal;
  }
  return lista.map((c, k) => ({ c, n: ns[k] })).filter((x) => x.n > 0);
}

// ml de fórmula por dia (bebê < 12 meses que não mama no peito)
function mlFormulaDia(m) {
  const F = REF.bugout.formula;
  const meses = mesesDe(m);
  if (meses >= 12) return 0;
  return meses < 6 ? Math.min(F.mlPorKgDia * pesoCorporal(m), F.maxMlDia) : F.mlDia6a12;
}

// Prioridade final de um item conforme clima e modo; null = não entra
function prioridadeDe(it, bo) {
  const climas = Object.keys(bo.clima || {}).filter((c) => bo.clima[c]);
  if (it.soClima && !it.soClima.some((c) => climas.includes(c))) return null;
  let p = it.prio;
  if (it.prioClima) {
    climas.forEach((c) => {
      const q = it.prioClima[c];
      if (q && ORDEM_PRIO[q] < ORDEM_PRIO[p]) p = q;
    });
  }
  if (it.prioModo && it.prioModo[bo.modo]) p = it.prioModo[bo.modo];
  return p;
}

function aplica(it, m) {
  const meses = mesesDe(m);
  const anos = meses / 12;
  switch (it.quem) {
    case 'todos': return true;
    case 'cada3': return meses >= 36;
    case 'cada5': return anos >= 5;
    case 'adulto': return anos >= REF.bugout.idadeAdulto;
    case 'mulher': return m.sexo === 'F' && anos >= 12 && anos < 51;
    case 'menor12': return anos < 12;
    case 'crianca': return meses >= 36 && anos < 12;
    case 'equipamento': return !!m.equipamento;
    case 'remedio': return !!m.remedio;
    case 'oculos': return !!m.oculos;
    case 'alergia': return !!m.alergia;
    default: return false;
  }
}

function novoItem(base) {
  const qtd = base.qtd ?? 1;
  return { unid: '', ...base, qtd, g: base.noCorpo ? 0 : Math.round(qtd * base.gUnid) };
}

function calcularBugOut(s) {
  const B = REF.bugout;
  const membros = s.membros || [];
  const pets = s.pets || [];
  const bo = { modo: 'pe', clima: {}, orcamento: 'medio', ...(s.bo || {}) };
  const dias = B.dias;
  const permitidas = PRIOS_ORC[bo.orcamento] || PRIOS_ORC.medio;
  const ok = (p) => p && permitidas.includes(p);
  const nomeDe = (m, i) => (m.nome && String(m.nome).trim()) || `Pessoa ${i + 1}`;
  const temLactante = membros.some((m) => m.lactante);
  const semAmendoim = membros.some((m) => m.alergiaAmendoim);

  // ---- 1. Itens de cada pessoa ----
  const porPessoa = membros.map((m, i) => {
    const meses = mesesDe(m);
    const crianca = meses < B.idadeAdolescente * 12;
    const itens = [];

    // Água para beber (só os dias que vão nas costas; o resto se trata no caminho ou vai no carro)
    const litros = Math.ceil(aguaBebidaLDia(m) * B.diasAguaNaMochila);
    const resto = dias - B.diasAguaNaMochila;
    if (litros) itens.push(novoItem({ id: 'agua', nome: resto > 0 ? `Água para beber (${B.diasAguaNaMochila} dia; trate água para os outros ${resto})` : 'Água para beber',
      qtd: litros, unid: 'L', gUnid: B.gPorLitroAgua, prio: 'essencial', divisivel: true }));

    // Comida leve (a partir de 12 meses)
    comidaLeve(m, dias, semAmendoim).forEach(({ c, n }) =>
      itens.push(novoItem({ id: c.id, nome: c.nome, qtd: n, unid: c.unid, gUnid: c.g, prio: 'essencial', divisivel: true })));

    // Checklist geral
    B.itens.filter((it) => it.quem !== 'familia' && aplica(it, m)).forEach((it) => {
      const p = prioridadeDe(it, bo);
      if (!ok(p)) return;
      const qtd = it.porDia ? Math.max(1, Math.ceil(REF[it.porDia] * dias)) : (it.qtd || 1);
      itens.push(novoItem({ id: it.id, nome: it.nome, qtd, unid: it.unid || '', gUnid: crianca && it.gC ? it.gC : it.g, prio: p }));
    });

    // Bebê: fraldas, leite, papinha
    if (meses < B.bebeAteMeses) {
      const f = fraldasDia(m) * dias;
      if (f) itens.push(novoItem({ id: 'fraldas', nome: 'Fraldas', qtd: f, unid: 'un.', gUnid: B.gFralda, prio: 'essencial', divisivel: true }));
      const usaFormula = meses < 12 && !temLactante;
      if (usaFormula) {
        const ml = mlFormulaDia(m) * dias;
        const gPo = Math.ceil((ml * B.formula.gPoPor100ml) / 100 / 10) * 10;
        itens.push(novoItem({ id: 'formula', nome: 'Fórmula infantil (de preferência a líquida pronta; se for em pó: pote bem fechado e a medida do rótulo)', qtd: gPo, unid: 'g', gUnid: 1, prio: 'essencial' }));
        itens.push(novoItem({ id: 'aguaFormula', nome: 'Água mineral para preparar a fórmula', qtd: Math.ceil(ml / 1000), unid: 'L', gUnid: B.gPorLitroAgua, prio: 'essencial', divisivel: true }));
      }
      const pap = meses >= 6 && meses < 12 ? B.papinhasDia.find((x) => meses < x.ate) : null;
      if (pap) itens.push(novoItem({ id: 'papinha', nome: 'Papinhas prontas (fruta e salgada)', qtd: pap.n * dias, unid: 'sachês', gUnid: B.gPapinha, prio: 'essencial', divisivel: true }));
      B.itensBebe.forEach((it) => {
        if (it.soFormula && !usaFormula) return;
        if (it.aPartirMeses && meses < it.aPartirMeses) return;
        if (!ok(it.prio)) return;
        itens.push(novoItem({ id: it.id, nome: it.nome, qtd: it.qtd || 1, unid: it.unid || '', gUnid: it.g, prio: it.prio, noCorpo: it.noCorpo }));
      });
    }
    return itens;
  });

  // ---- 2. Mochilas (quem carrega) ----
  const mochilas = [];
  const bebes = [];
  membros.forEach((m, i) => {
    const cat = categoria(m);
    const nome = nomeDe(m, i);
    if (cat === 'bebe') { bebes.push({ idx: i, nome, meses: mesesDe(m), pesoKg: pesoCorporal(m), itens: porPessoa[i], vaiCom: [] }); return; }
    const pesoKg = pesoCorporal(m);
    mochilas.push({ idx: i, nome, cat, idade: Number(m.idade) || 0, pesoKg, fator: B.limiteCarga[cat],
      limiteG: Math.round(pesoKg * B.limiteCarga[cat] * 1000), itens: porPessoa[i].slice(), gestante: !!m.gestante,
      colo: [], coloParcial: [] });
  });

  const carga = (mo) => mo.itens.reduce((a, it) => a + it.g, 0) + mo.colo.reduce((a, b) => a + b.g, 0);
  const folga = (mo) => mo.limiteG - carga(mo);
  // Quem leva o que é de bebê, pet e família: adultos; senão adolescentes/idosos; senão qualquer um
  const ordemCat = [['adulto'], ['adolescente', 'idoso'], ['crianca']];
  const portadores = () => {
    for (const cats of ordemCat) { const l = mochilas.filter((mo) => cats.includes(mo.cat)); if (l.length) return l; }
    return [];
  };
  const maisFolga = (lista) => lista.reduce((a, b) => (folga(b) > folga(a) ? b : a), lista[0]);

  // Bebê vai no colo/sling de quem tem mais folga — e o peso dele conta (até coloContaAteMeses)
  bebes.slice().sort((a, b) => b.pesoKg - a.pesoKg).forEach((b) => {
    const lista = portadores();
    if (!lista.length) return;
    const mo = maisFolga(lista);
    const reg = { nome: b.nome, g: Math.round(b.pesoKg * 1000) };
    if (b.meses < B.coloContaAteMeses) mo.colo.push(reg); else mo.coloParcial.push(reg);
    b.colo = mo.nome;
  });

  // Itens sem dono (bebê, pets, família), do mais pesado para o mais leve
  const avulsos = [];
  bebes.forEach((b) => b.itens.forEach((it) => avulsos.push({ ...it, de: b.nome })));
  pets.forEach((p, j) => {
    const nomePet = (p.nome && String(p.nome).trim()) || `${p.tipo === 'gato' ? 'Gato' : 'Cão'} ${j + 1}`;
    const kgRacao = petRacaoKgDia(p) * dias;
    const lAgua = petAguaLDia(p) * B.diasAguaNaMochila;
    if (kgRacao) avulsos.push({ ...novoItem({ id: 'racao', nome: 'Ração em saco bem fechado (ou pote com tampa)', qtd: Math.ceil(kgRacao * 1000 / 10) * 10, unid: 'g', gUnid: 1, prio: 'essencial', divisivel: true }), de: nomePet });
    if (lAgua) avulsos.push({ ...novoItem({ id: 'aguaPet', nome: 'Água do pet', qtd: Math.ceil(lAgua * 2) / 2, unid: 'L', gUnid: B.gPorLitroAgua, prio: 'essencial' }), de: nomePet });
    B.itensPet.forEach((it) => {
      if (it.so && it.so !== p.tipo) return;
      if (it.ateKg && numero(p.peso) > it.ateKg) return;
      if (!ok(it.prio)) return;
      avulsos.push({ ...novoItem({ id: it.id, nome: it.nome, gUnid: it.g, prio: it.prio, noCorpo: it.noCorpo }), de: nomePet });
    });
  });
  B.itens.filter((it) => it.quem === 'familia').forEach((it) => {
    const p = prioridadeDe(it, bo);
    if (!ok(p)) return;
    avulsos.push({ ...novoItem({ id: it.id, nome: it.nome, gUnid: it.g, prio: p }), de: 'família' });
  });
  avulsos.sort((a, b) => b.g - a.g);

  const semPortador = [];
  avulsos.forEach((it) => {
    const lista = portadores();
    if (!lista.length) { semPortador.push(it); return; }
    const mo = maisFolga(lista);
    mo.itens.push(it);
    const bb = bebes.find((b) => b.nome === it.de);
    if (bb && !bb.vaiCom.includes(mo.nome)) bb.vaiCom.push(mo.nome);
  });

  // ---- 3. Criança/adolescente/idoso acima do limite: passa peso para um adulto com folga ----
  // Primeiro o que se divide (água, comida), depois itens inteiros (roupa, cobertor...).
  // Documentos, remédios, óculos, apito, cartão de contato, pulseira, forro e sacos zip ficam sempre com a própria pessoa.
  const FICA = ['docs', 'contatos', 'remedio', 'oculos', 'alergia', 'apito', 'manta', 'pulseira', 'forro', 'zip'];
  mochilas.filter((mo) => mo.cat !== 'adulto').forEach((mo) => {
    const movem = mo.itens.filter((it) => !it.de && it.g > 0 && !FICA.includes(it.id))
      .sort((a, b) => (b.divisivel ? 1 : 0) - (a.divisivel ? 1 : 0) || b.g - a.g);
    for (const it of movem) {
      if (folga(mo) >= 0) break;
      const passo = it.divisivel ? it.gUnid : it.g;
      const adultos = mochilas.filter((x) => x.cat === 'adulto' && folga(x) >= passo);
      if (!adultos.length) continue;
      const alvo = maisFolga(adultos);
      const n = it.divisivel ? Math.min(it.qtd, Math.ceil(-folga(mo) / it.gUnid), Math.floor(folga(alvo) / it.gUnid)) : it.qtd;
      if (n <= 0) continue;
      it.qtd -= n; it.g = Math.round(it.qtd * it.gUnid);
      alvo.itens.push({ ...it, qtd: n, g: Math.round(n * it.gUnid), de: mo.nome });
    }
    mo.itens = mo.itens.filter((it) => it.qtd > 0);
  });

  // ---- 4. Fecha cada mochila ----
  mochilas.forEach((mo) => {
    mo.itens.sort((a, b) => ORDEM_PRIO[a.prio] - ORDEM_PRIO[b.prio] || (a.de ? 1 : 0) - (b.de ? 1 : 0) || b.g - a.g);
    mo.pesoG = carga(mo);
    mo.passou = mo.pesoG > mo.limiteG;
    mo.excessoG = Math.max(0, mo.pesoG - mo.limiteG);
    mo.mochilaG = mo.pesoG - mo.colo.reduce((a, b) => a + b.g, 0); // só a mochila, sem o bebê
  });

  // ---- 5. Carro ----
  const carro = [];
  if (bo.modo === 'carro') {
    // Até 1 galão/pessoa/dia (Ready.gov) nos 3 dias, menos o que já vai nas mochilas; + água dos pets
    const extraL = membros.reduce((a, m) => a + (mesesDe(m) >= 12
      ? Math.max(0, REF.aguaLitrosPessoaDia * dias - aguaBebidaLDia(m) * B.diasAguaNaMochila) : 0), 0)
      + pets.reduce((a, p) => a + petAguaLDia(p) * (dias - B.diasAguaNaMochila), 0);
    if (extraL > 0) carro.push({ id: 'galoes', nome: 'Água extra (beber, higiene e comida) — fora a das mochilas', qtd: Math.ceil(extraL / 5), unid: 'galões de 5 L', prio: 'essencial' });
    const dormirNaMochila = mochilas.some((mo) => mo.itens.some((it) => it.id === 'dormir'));
    B.itensCarro.forEach((it) => {
      if (it.id === 'cobertor' && dormirNaMochila) return;
      if (!ok(it.prio)) return;
      carro.push({ id: it.id, nome: it.nome, qtd: it.porPessoa ? membros.length : 1, unid: it.porPessoa ? 'un.' : '', prio: it.prio });
    });
  }

  // ---- 6. Avisos ----
  const avisos = [];
  if (!mochilas.length && membros.length) avisos.push('Ninguém da família tem idade para carregar mochila. Cadastre o adulto responsável.');
  if (semPortador.length) avisos.push(`${semPortador.length} itens (bebê, pets ou da família) ficaram sem ninguém para carregar.`);
  mochilas.filter((mo) => mo.gestante).forEach((mo) =>
    avisos.push(`${mo.nome} está gestante: não achamos limite oficial de carga na gravidez. Leve o mínimo e passe o peso para outro adulto.`));
  if (temLactante && membros.some((m) => mesesDe(m) < 12))
    avisos.push('Bebê mamando no peito: continue amamentando. Na emergência, o leite materno é o alimento mais seguro (OMS/UNICEF).');
  if (semAmendoim) avisos.push('Alergia a amendoim na família: a mochila de ninguém leva amendoim (evita contato). A comida foi trocada por biscoito e sardinha.');
  if (membros.some((m) => m.alergia)) avisos.push('Quem tem alergia grave: confira o rótulo de TODA a comida da mochila (biscoito tem trigo e leite, sardinha é peixe) e leve o remédio de emergência receitado sempre junto da pessoa, nunca na mochila de outro.');
  if (!temLactante && membros.some((m) => mesesDe(m) < 12)) avisos.push('Bebê na fórmula: em emergência, a OMS recomenda fórmula líquida pronta, que não depende de água limpa. Se usar pó, prepare com água fervida (ou mineral) e mamadeira bem lavada; jogue fora o que sobrar em 2 horas.');
  if (bo.clima && bo.clima.calor) avisos.push('No calor, beba antes de sentir sede e descanse na sombra. Água de rio só depois de coar e tratar.');
  if (dias > B.diasAguaNaMochila) avisos.push(`A mochila leva ${B.diasAguaNaMochila} dia de água; mais que isso passa do peso que dá para carregar. Para os outros dias, encha a garrafa no caminho e trate. ${REF.tratarAgua}`);
  mochilas.filter((mo) => mo.passou).forEach((mo) => {
    const kgTxt = (mo.excessoG / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    avisos.push(mo.cat === 'adulto'
      ? `${mo.nome} passou ${kgTxt} kg do limite. Tire primeiro os itens "extra", depois os "importante".`
      : `${mo.nome} passou ${kgTxt} kg do limite e os adultos já estão cheios. Deixe os itens "extra" e "importante" em casa ou leve no carro.`);
  });

  const totalG = mochilas.reduce((a, mo) => a + mo.pesoG, 0);
  return { dias, bo, mochilas, bebes, carro, avisos, semPortador, totalG };
}

if (typeof module !== 'undefined') module.exports = {
  kcalMembro, calcularBugIn, calcularBugOut, petKcalDia, petAguaLDia, petRacaoKgDia, pesoCorporal, aguaBebidaLDia, categoria, mlFormulaDia,
};
