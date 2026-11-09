// Teste rápido dos cálculos: node teste.js
global.REF = (new Function(require('fs').readFileSync('js/data.js', 'utf8') + ';return REF'))();
const { calcularBugIn, calcularBugOut, petKcalDia, petRacaoKgDia, petAguaLDia } = require('./js/calc.js');

let falhas = 0;
const confere = (ok, msg) => { console.log(ok ? '  ok  ' : '  FALHOU', msg); if (!ok) falhas++; };
const kg = (g) => (g / 1000).toFixed(1) + ' kg';

const familia = {
  membros: [
    { nome: 'Pai', idade: 35, sexo: 'M', peso: 80, remedio: true },
    { nome: 'Mãe', idade: 32, sexo: 'F', peso: 62, lactante: true, oculos: true },
    { nome: 'Bebê', idade: 0, meses: 8, sexo: 'M' },
    { nome: 'Filha', idade: 7, sexo: 'F', alergia: true },
    { nome: 'Avó', idade: 68, sexo: 'F', peso: 65 },
  ],
  pets: [{ tipo: 'cao', peso: 15 }],
};

// ---------------- FICAR EM CASA ----------------
console.log('\n=== Ficar em casa ===');
const r = calcularBugIn({ ...familia, estoque: { aguaL: 20, secoKg: 10, latas: 6, fraldas: 30, racaoKg: 2 },
  temRemedio: false, basicos: { lanterna: true, velas: true }, meta: 14 });
console.log('dias:', r.dias, '| limitante:', r.limitante, '| nota:', r.nota, '| kcal/dia:', r.kcalDia, '| água/dia:', r.aguaDia.toFixed(1), 'L');
r.lista.forEach((x) => console.log(' -', x.qtd, x.unid, x.nome));

console.log('\nCão 15 kg:', Math.round(petKcalDia({ tipo: 'cao', peso: 15 })), 'kcal/dia,',
  Math.round(petRacaoKgDia({ tipo: 'cao', peso: 15 }) * 1000), 'g ração,', Math.round(petAguaLDia({ tipo: 'cao', peso: 15 }) * 1000), 'ml água');
console.log('Gato 4 kg:', Math.round(petKcalDia({ tipo: 'gato', peso: 4 })), 'kcal/dia,',
  Math.round(petRacaoKgDia({ tipo: 'gato', peso: 4 }) * 1000), 'g ração,', Math.round(petAguaLDia({ tipo: 'gato', peso: 4 }) * 1000), 'ml água');
confere(Math.abs(petAguaLDia({ tipo: 'cao', peso: 15 }) * 1000 / 15 - 57) < 5, 'água do cão fica na faixa clássica de 50–60 ml/kg/dia');
confere(Math.abs(REF.cesta.reduce((a, c) => a + c.pct, 0) - 1) < 1e-9, 'proporções da cesta somam 100%');

// ---------------- SAIR DE CASA ----------------
const mostra = (b) => {
  b.mochilas.forEach((mo) => {
    console.log(`\n🎒 ${mo.nome} (${mo.cat}, ${mo.pesoKg} kg) → ${kg(mo.pesoG)} de ${kg(mo.limiteG)} ${mo.passou ? '⚠️ PASSOU ' + kg(mo.excessoG) : 'ok'}`);
    mo.itens.forEach((it) => console.log(`   [${it.prio[0]}] ${it.qtd} ${it.unid} ${it.nome}${it.de ? ' (de ' + it.de + ')' : ''} — ${it.g} g`));
  });
  b.bebes.forEach((x) => console.log(`\n👶 ${x.nome}: itens com ${x.vaiCom.join(', ')}`));
  if (b.carro.length) { console.log('\n🚗 Carro:'); b.carro.forEach((it) => console.log('   -', it.qtd, it.unid, it.nome)); }
  b.avisos.forEach((a) => console.log('! ', a));
};

console.log('\n=== Sair de casa: a pé, frio + chuva, orçamento médio ===');
const pe = calcularBugOut({ ...familia, bo: { modo: 'pe', clima: { frio: true, chuva: true }, orcamento: 'medio' } });
mostra(pe);

const m = (n) => pe.mochilas.find((x) => x.nome === n);
const temItem = (mo, id, de) => mo.itens.some((it) => it.id === id && (de === undefined || it.de === de));
confere(pe.mochilas.length === 4, 'bebê não tem mochila (4 mochilas para 5 pessoas)');
confere(pe.mochilas.some((mo) => temItem(mo, 'fraldas', 'Bebê')), 'fraldas do bebê estão na mochila de um adulto');
confere(!pe.mochilas.some((mo) => temItem(mo, 'formula')), 'mãe amamentando → sem fórmula');
confere(pe.mochilas.some((mo) => temItem(mo, 'papinha', 'Bebê')), 'bebê de 8 meses leva papinha');
confere(m('Pai').limiteG === 16000 && m('Filha').limiteG === Math.round(22.4 * 0.10 * 1000), 'limites: adulto 20%, criança 10% (peso OMS de 7 anos)');
const adultosCheios = ['Pai', 'Mãe'].every((n) => m(n).pesoG >= m(n).limiteG - 100); // sem folga para receber mais
confere(['Pai', 'Mãe'].every((n) => !m(n).itens.some((it) => ['Filha', 'Avó'].includes(it.de)) || !m(n).passou),
  'peso de criança/idosa só vai para adulto que ainda tem folga');
confere(pe.mochilas.some((mo) => mo.colo.some((b) => b.nome === 'Bebê' && b.g === 7900)), 'bebê de 8 meses (7,9 kg, OMS) conta no peso de quem leva no colo');
confere(pe.avisos.some((a) => a.startsWith('Avó passou')), 'aviso quando a idosa passa do limite');
confere(m('Filha').pesoG <= m('Filha').limiteG || adultosCheios, 'criança dentro do limite, ou os adultos já estão cheios');
confere(m('Avó').pesoG <= m('Avó').limiteG || adultosCheios, 'idosa dentro do limite, ou os adultos já estão cheios');
confere(['docs', 'remedio', 'alergia'].every((id) => !pe.mochilas.some((mo) => temItem(mo, id, 'Filha'))), 'documentos e remédio da criança ficam com ela');
confere(temItem(m('Pai'), 'remedio') && temItem(m('Mãe'), 'oculos') && temItem(m('Filha'), 'alergia'), 'remédio, óculos e alergia na mochila certa');
confere(pe.mochilas.some((mo) => temItem(mo, 'racao')), 'ração do cão em alguma mochila');
confere(temItem(m('Pai'), 'gorro') && temItem(m('Pai'), 'capa'), 'frio e chuva → gorro e capa');
const aguaPai = m('Pai').itens.filter((it) => it.id === 'agua' && !it.de).reduce((a, it) => a + it.qtd, 0);
confere(aguaPai === 3, 'pai leva 3 L para beber (3 L/dia IOM × 1 dia na mochila)');
const comidaPai = m('Pai').itens.filter((it) => ['cracker', 'amendoim', 'maisena', 'sardinha'].includes(it.id) && !it.de);
const kcalPai = comidaPai.reduce((a, it) => a + it.qtd * REF.bugout.comida.find((c) => c.id === it.id).kcal, 0);
confere(kcalPai >= 3 * 2500 * 80 / 70 && kcalPai < 3 * 2500 * 80 / 70 + 1000, `comida do pai cobre 3 dias (${kcalPai} kcal, ${comidaPai.reduce((a, it) => a + it.g, 0)} g)`);

console.log('\n=== Sair de casa: de carro, calor, orçamento básico ===');
const carro = calcularBugOut({ ...familia, bo: { modo: 'carro', clima: { calor: true }, orcamento: 'basico' } });
console.log(carro.mochilas.map((mo) => `${mo.nome}: ${kg(mo.pesoG)}/${kg(mo.limiteG)}`).join(' | '));
carro.carro.forEach((it) => console.log('   🚗', it.qtd, it.unid, it.nome));
confere(carro.mochilas.every((mo) => mo.itens.every((it) => it.prio === 'essencial')), 'orçamento básico → só itens essenciais');
confere(carro.carro.some((it) => it.id === 'galoes'), 'de carro → galões de água extra no carro');
confere(carro.mochilas.some((mo) => temItem(mo, 'bone')), 'calor → boné essencial');

console.log('\n=== Bebê de 2 meses sem mãe amamentando ===');
const bb = calcularBugOut({ membros: [{ nome: 'Pai', idade: 30, sexo: 'M', peso: 75 }, { nome: 'Nina', idade: 0, meses: 2, sexo: 'F' }], pets: [],
  bo: { modo: 'pe', clima: {}, orcamento: 'completo' } });
bb.mochilas[0].itens.filter((it) => it.de === 'Nina').forEach((it) => console.log(`   ${it.qtd} ${it.unid} ${it.nome} — ${it.g} g`));
const f = bb.mochilas[0].itens.find((it) => it.id === 'formula');
confere(f && f.qtd >= 350 && f.qtd <= 450, `fórmula de 3 dias ~400 g para bebê de 5 kg (deu ${f && f.qtd} g)`);
confere(bb.mochilas[0].itens.some((it) => it.id === 'fraldas' && it.qtd === 30), '10 fraldas/dia × 3 = 30');

// ---------------- CASOS EXTREMOS ----------------
console.log('\n=== Casos extremos ===');
const { pesoCorporal, mlFormulaDia, categoria } = require('./js/calc.js');
const peso = (g) => g.mochilas.reduce((a, mo) => a + mo.pesoG, 0);
const base = (bo) => calcularBugOut({ membros: [{ nome: 'Ana', idade: 40, sexo: 'F', peso: 70 }, { nome: 'Leo', idade: 10, sexo: 'M' }], pets: [], bo });

const vazio = calcularBugOut({ membros: [], pets: [], bo: {} });
confere(vazio.mochilas.length === 0 && vazio.avisos.length >= 0, 'família vazia não quebra');
const vazioIn = calcularBugIn({ membros: [], pets: [], estoque: {}, meta: 7 });
confere(vazioIn.dias === 0 && Number.isFinite(vazioIn.nota), 'ficar em casa sem ninguém não quebra');

const soBebe = calcularBugOut({ membros: [{ nome: 'Lia', idade: 1, sexo: 'F' }], pets: [], bo: {} });
confere(soBebe.mochilas.length === 0 && soBebe.avisos.some((a) => a.includes('Ninguém da família')), 'só bebê → aviso de cadastrar o adulto');

const soIdosa = calcularBugOut({ membros: [{ nome: 'Dona Lu', idade: 80, sexo: 'F', peso: 55 }], pets: [{ tipo: 'gato', peso: 4 }], bo: {} });
confere(soIdosa.mochilas.length === 1 && soIdosa.mochilas[0].itens.some((it) => it.id === 'kit'), 'idosa sozinha leva os itens da família');
confere(soIdosa.mochilas[0].itens.some((it) => it.id === 'caixa' && it.noCorpo && it.g === 0), 'gato: caixa de transporte, vai na mão (não pesa na mochila)');

const gB = peso(base({ orcamento: 'basico' })), gM = peso(base({ orcamento: 'medio' })), gC = peso(base({ orcamento: 'completo' }));
confere(gB < gM && gM < gC, `orçamento maior → mochila mais pesada (${kg(gB)} < ${kg(gM)} < ${kg(gC)})`);

const semClima = base({ clima: {} });
confere(!semClima.mochilas.some((mo) => mo.itens.some((it) => it.id === 'gorro')), 'sem frio → sem gorro');
const calor = base({ clima: { calor: true } });
confere(calor.mochilas.some((mo) => mo.itens.some((it) => it.id === 'soro' && it.prio === 'essencial')), 'calor → soro de reidratação vira essencial');

confere(categoria({ idade: 2, meses: 11 }) === 'bebe' && categoria({ idade: 3 }) === 'crianca' && categoria({ idade: 12 }) === 'adolescente'
  && categoria({ idade: 18 }) === 'adulto' && categoria({ idade: 60 }) === 'idoso', 'faixas: bebê <3, criança <12, adolescente <18, adulto <60, idoso 60+');
confere(pesoCorporal({ idade: 10, sexo: 'M' }) === 31.2 && pesoCorporal({ idade: 10, sexo: 'M', pesoCrianca: 40 }) === 40, 'peso da criança: mediana OMS, ou o informado');
confere(mlFormulaDia({ idade: 0, meses: 3, sexo: 'M' }) === 960, 'fórmula não passa de 960 ml/dia (AAP)');
confere(mlFormulaDia({ idade: 0, meses: 9, sexo: 'M' }) === 600, 'fórmula 6–12 meses: 600 ml/dia (Ministério da Saúde)');

const inFormula = calcularBugIn({ membros: [{ idade: 30, sexo: 'M', peso: 70 }, { idade: 0, meses: 2, sexo: 'F' }], pets: [], estoque: {}, meta: 14 });
const latas = inFormula.lista.find((x) => /Fórmula/.test(x.nome));
confere(latas && latas.qtd === 3, `ficar em casa: fórmula de 14 dias para bebê de 2 meses = ${latas && latas.qtd} latas de 800 g (≈1,8 kg)`);
const inPeito = calcularBugIn({ membros: [{ idade: 30, sexo: 'F', peso: 60, lactante: true }, { idade: 0, meses: 2, sexo: 'F' }], pets: [], estoque: {}, meta: 14 });
confere(!inPeito.lista.some((x) => /Fórmula/.test(x.nome)), 'ficar em casa: mãe amamentando → sem fórmula na lista');

const gest = calcularBugOut({ membros: [{ nome: 'Bia', idade: 28, sexo: 'F', peso: 65, gestante: true }], pets: [], bo: {} });
confere(gest.avisos.some((a) => a.includes('gestante')), 'gestante → aviso para carregar o mínimo');

const toddler = calcularBugOut({ membros: [{ nome: 'Rui', idade: 30, sexo: 'M', peso: 75 }, { nome: 'Teo', idade: 2, meses: 6, sexo: 'M' }], pets: [], bo: {} });
confere(toddler.mochilas[0].colo.length === 0 && toddler.mochilas[0].coloParcial.length === 1, 'criança de 2 anos e meio anda parte do caminho (peso só como aviso)');
confere(!toddler.mochilas[0].itens.some((it) => it.id === 'amendoim' && it.de === 'Teo'), 'criança < 4 anos não recebe amendoim (engasgo)');

const nomeEstranho = calcularBugOut({ membros: [{ nome: '  ', idade: 30, sexo: 'M', peso: 70 }], pets: [], bo: {} });
confere(nomeEstranho.mochilas[0].nome === 'Pessoa 1', 'nome em branco vira "Pessoa 1"');
const semPeso = calcularBugOut({ membros: [{ idade: 30, sexo: 'F', peso: '' }], pets: [], bo: {} });
confere(semPeso.mochilas[0].limiteG === 12000, 'adulta sem peso informado usa 60 kg de referência');

const tudoNum = [pe, carro, bb].every((b) => b.mochilas.every((mo) => mo.itens.every((it) => Number.isFinite(it.g) && it.g >= 0 && it.qtd > 0)));
confere(tudoNum, 'todo item tem quantidade > 0 e peso válido');

// ---------------- LISTA COMPLETA DO FICAR EM CASA ----------------
console.log('\n=== Lista completa (ficar em casa) ===');
const ids = (l) => l.map((x) => x.id);
confere(Object.keys(REF.categorias).every((c) => c === 'lazer' || r.lista.some((x) => x.cat === c)), `todas as categorias aparecem (${new Set(r.lista.map((x) => x.cat)).size} categorias, ${r.lista.length} itens)`);
confere(r.lista.every((x) => REF.categorias[x.cat] && ['essencial', 'importante', 'extra'].includes(x.prioridade)), 'todo item tem categoria e prioridade');
confere(new Set(ids(r.lista)).size === r.lista.length, 'nenhum item repetido');
confere(['oleo', 'sal', 'cafe', 'leite', 'farinha', 'abridor', 'banheiro', 'semReceita', 'cobertor', 'alicate'].every((id) => ids(r.lista).includes(id)),
  'inclui óleo, sal, café, leite, farinha, abridor, banheiro sem água, remédios sem receita, cobertor e alicate');
confere(!ids(r.lista).includes('lanterna') && !ids(r.lista).includes('velas') && ids(r.lista).includes('radio'), 'o que já tem (lanterna, velas) sai da lista; o que falta (rádio) fica');
confere(r.lista.some((x) => x.id.startsWith('semFogao-')), 'reserva de 3 dias de comida sem fogão');
const soHomem = calcularBugIn({ membros: [{ idade: 40, sexo: 'M', peso: 80 }], pets: [], estoque: {}, meta: 7 });
confere(!ids(soHomem.lista).some((id) => ['absorv', 'areia', 'jogos', 'fraldas', 'lencoBebe', 'mamadeira', 'racao'].includes(id)),
  'homem sozinho sem pet: sem absorvente, areia, jogos, fralda, ração');
const comGato = calcularBugIn({ membros: [{ idade: 40, sexo: 'F', peso: 60 }, { idade: 6, sexo: 'M' }], pets: [{ tipo: 'gato', peso: 4 }], estoque: {}, meta: 14 });
confere(['absorv', 'areia', 'jogos', 'caixaPet'].every((id) => ids(comGato.lista).includes(id)) && !ids(comGato.lista).includes('saquinhos'), 'mulher + criança + gato: absorvente, areia, jogos, caixa (sem saquinho de cão)');
const sal = comGato.lista.find((x) => x.id === 'sal');
confere(sal.qtd === 1, 'sal: 5 g × 2 pessoas × 14 dias = 140 g → 1 pacote');

// ---------------- MOCHILA: ITENS NOVOS ----------------
console.log('\n=== Mochila: itens novos ===');
confere(temItem(m('Filha'), 'pulseira') && pe.mochilas.some((mo) => temItem(mo, 'pulseira', 'Bebê')), 'pulseira de identificação para a filha e para o bebê');
confere(temItem(m('Filha'), 'brinquedo') || pe.mochilas.some((mo) => temItem(mo, 'brinquedo', 'Filha')), 'brinquedo/livro para a criança');
confere(temItem(m('Pai'), 'forro') && m('Pai').itens.find((it) => it.id === 'forro').prio === 'essencial', 'chuva: forro vira essencial');
const seco = calcularBugOut({ membros: [{ nome: 'Ana', idade: 40, sexo: 'F', peso: 70, remedio: true }, { nome: 'Leo', idade: 10, sexo: 'M' }], pets: [{ tipo: 'cao', peso: 10 }],
  bo: { modo: 'pe', clima: { calor: true }, orcamento: 'basico' } });
confere(seco.mochilas.every((mo) => mo.itens.some((it) => it.id === 'forro' && !it.de && it.prio === 'essencial')), 'sem chuva e no orçamento básico: toda mochila vai forrada (essencial)');
confere(seco.mochilas.every((mo) => mo.itens.some((it) => it.id === 'zip' && !it.de && it.qtd === 3)), 'cada pessoa de 5 anos+ leva 3 sacos zip na própria mochila');
const naoMolha = ['docs', 'contatos', 'dinheiro', 'remedio', 'vacina', 'fotoPet'];
confere(seco.mochilas.every((mo) => mo.itens.filter((it) => naoMolha.includes(it.id)).every((it) => /zip|plastific/.test(it.nome))),
  'documentos, dinheiro, remédios, cartão e papéis do pet dizem para ir em saco zip');

const comEquip = calcularBugOut({ membros: [{ nome: 'Zé', idade: 70, sexo: 'M', peso: 70, equipamento: true }], pets: [], bo: {} });
confere(comEquip.mochilas[0].itens.some((it) => it.id === 'equip'), 'quem usa aparelho/bengala recebe o item do equipamento');
confere(pe.mochilas.some((mo) => temItem(mo, 'fotoPet')), 'pet: foto do dono com o pet');

// ---------------- CONSERTOS DA REVISÃO ----------------
console.log('\n=== Consertos da revisão ===');
const alerg = calcularBugOut({ membros: [{ nome: 'Pai', idade: 40, sexo: 'M', peso: 80 }, { nome: 'Lia', idade: 9, sexo: 'F', alergia: true, alergiaAmendoim: true }], pets: [], bo: {} });
confere(!alerg.mochilas.some((mo) => mo.itens.some((it) => it.id === 'amendoim')), 'alergia a amendoim: ninguém da família leva amendoim');
const kcalTodos = alerg.mochilas.flatMap((mo) => mo.itens).filter((it) => REF.bugout.comida.some((c) => c.id === it.id))
  .reduce((a, it) => a + it.qtd * REF.bugout.comida.find((c) => c.id === it.id).kcal, 0);
confere(kcalTodos >= 3 * (2500 * 80 / 70 + 1300) - 1, `sem amendoim a comida ainda cobre as calorias dos 3 dias (${kcalTodos} kcal)`);
confere(alerg.avisos.some((a) => a.includes('Alergia a amendoim')) && alerg.avisos.some((a) => a.includes('confira o rótulo')), 'avisos de alergia: amendoim retirado e conferir rótulos');
const inAlerg = calcularBugIn({ membros: [{ idade: 40, sexo: 'M', peso: 80 }, { idade: 9, sexo: 'F', alergiaAmendoim: true }], pets: [], estoque: {}, meta: 7 });
confere(!inAlerg.lista.some((x) => x.id === 'semFogao-amendoim'), 'ficar em casa: reserva sem fogão também sem amendoim');
confere(bb.avisos.some((a) => a.includes('fórmula líquida pronta')) && !pe.avisos.some((a) => a.includes('fórmula líquida')), 'fórmula: aviso da OMS só quando o bebê não mama no peito');
const inRem = calcularBugIn({ membros: [{ idade: 60, sexo: 'F', peso: 60, remedio: true }], pets: [], estoque: { aguaL: 999, secoKg: 99, remedioDias: 2 }, meta: 7 });
confere(inRem.limitante === 'Remédio de uso contínuo' && inRem.dias === 2 && inRem.lista.some((x) => x.id === 'remedio'), 'remédio marcado no "Sair de casa" vale no "Ficar em casa"');
confere(/coe/.test(REF.tratarAgua) && pe.avisos.some((a) => a.includes('coe num pano')), 'tratar água: coar a água turva antes do cloro');
confere(pesoCorporal({ idade: 12, sexo: 'M' }) === 40.7 && pesoCorporal({ idade: 17, sexo: 'F' }) === 55.2, 'peso 11–17 anos pelo arquivo oficial do CDC (12 anos M = 40,7 kg)');
confere(/Não substitui/.test(REF.aviso), 'aviso de responsabilidade existe');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo certo.');
process.exitCode = falhas ? 1 : 0;
