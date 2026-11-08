// =====================================================================
// VALORES DE REFERÊNCIA — todo número que o app usa sai daqui.
// Cada valor tem a fonte comentada ao lado.
// "ESTIMATIVA" = não achamos norma/fonte oficial; é aproximação nossa.
// "ADAPTAÇÃO" = número tem fonte, mas fizemos uma conta/ajuste em cima dela.
// =====================================================================
const REF = {
  // ---------------------------------------------------------------
  // ÁGUA
  // ---------------------------------------------------------------
  // Água por pessoa/dia (beber + higiene mínima).
  // Ready.gov/FEMA e Cruz Vermelha Americana: 1 galão (3,8 L) por pessoa por dia
  // (3 dias para evacuação, 2 semanas para ficar em casa). Arredondado para 4 L.
  aguaLitrosPessoaDia: 4,

  // Água dos pets: ~1 ml de água por kcal de energia que o animal gasta por dia.
  // NRC (National Research Council) 2006, Nutrient Requirements of Dogs and Cats;
  // Zanghi, "Water Needs and Hydration for Cats and Dogs" (Purina Institute).
  // Dá ~55–60 ml/kg/dia num cão de 15 kg, igual à faixa clássica de 50–60 ml/kg.
  aguaPetMlPorKcal: 1,

  // ---------------------------------------------------------------
  // ENERGIA DAS PESSOAS
  // ---------------------------------------------------------------
  // 1 kg de alimento seco (arroz/feijão/macarrão cru) ≈ 3.300–3.700 kcal (Tabela TACO/Unicamp).
  kcalPorKgAlimentoSeco: 3500,

  // Uma lata de sardinha em óleo de 125 g (84 g drenado). TACO: sardinha em conserva
  // em óleo = 285 kcal/100 g → ~240 kcal; arredondado para 250 com o óleo da lata.
  kcalPorLata: 250,

  // Necessidade energética estimada (kcal/dia), atividade moderada.
  // Base: Dietary Reference Intakes (IOM/EUA) e FAO/OMS — valores arredondados.
  // "ate" = idade em anos (exclusivo).
  kcalPorFaixa: [
    { ate: 1, M: 700, F: 700 },
    { ate: 4, M: 1000, F: 1000 },
    { ate: 9, M: 1400, F: 1300 },
    { ate: 14, M: 1800, F: 1600 },
    { ate: 19, M: 2400, F: 1900 },
    { ate: 51, M: 2500, F: 2000 },
    { ate: Infinity, M: 2200, F: 1800 },
  ],
  pesoRef: { M: 70, F: 60 },   // adultos: ajusta kcal pelo peso, limitado a ±25% (ESTIMATIVA: regra de proporção nossa)
  extraGestante: 350,          // IOM: +340 (2º tri) a +450 (3º tri)
  extraLactante: 500,          // IOM: ~+500 kcal/dia

  // Como a comida que falta é dividida (fração das calorias).
  // ADAPTAÇÃO da ração essencial mínima do Decreto-Lei 399/1938 (cesta básica DIEESE,
  // Região 1: arroz 3 kg, feijão 4,5 kg, açúcar 3 kg, óleo 750 ml, farinha 1,5 kg, carne 6 kg/mês).
  // Só itens de despensa: carne → enlatados, farinha → macarrão. Calorias pela TACO.
  // Açúcar limitado a 10% das calorias (OMS: açúcares livres < 10% da energia) e o resto
  // redistribuído na mesma proporção. Resultado arredondado abaixo.
  cesta: [
    { id: 'arroz',    nome: 'Arroz',                          unid: 'kg',                 kcal: 3580, pct: 0.21 }, // TACO arroz tipo 1 cru 358 kcal/100 g
    { id: 'feijao',   nome: 'Feijão',                         unid: 'kg',                 kcal: 3290, pct: 0.29 }, // TACO feijão carioca cru 329
    { id: 'macarrao', nome: 'Macarrão',                       unid: 'pacotes de 500 g',   kcal: 1855, pct: 0.11 }, // TACO macarrão trigo cru 371
    { id: 'oleo',     nome: 'Óleo',                           unid: 'garrafas de 900 ml', kcal: 7320, pct: 0.12 }, // TACO óleo de soja 884 kcal/100 g, 0,92 g/ml
    { id: 'acucar',   nome: 'Açúcar',                         unid: 'kg',                 kcal: 3870, pct: 0.10 }, // TACO açúcar refinado 387
    { id: 'latas',    nome: 'Enlatados (sardinha, atum, carne)', unid: 'latas',           kcal: 250,  pct: 0.17 }, // ver kcalPorLata
  ],

  // ---------------------------------------------------------------
  // BEBÊS
  // ---------------------------------------------------------------
  // Fraldas por dia conforme idade em meses ("ate" exclusivo).
  // National Diaper Bank Network (EUA): recém-nascido usa até 12/dia, criança pequena ~8/dia.
  // Pampers (guia de uso): 8–12/dia nos 2–3 primeiros meses. Resolução do Congresso dos EUA
  // (Diaper Need Awareness): 6 a 12/dia. Usamos o lado mais alto (estoque não pode faltar).
  fraldasPorDia: [
    { ate: 1, n: 12 }, { ate: 6, n: 10 }, { ate: 12, n: 8 }, { ate: 24, n: 8 }, { ate: 36, n: 6 },
  ],

  // ---------------------------------------------------------------
  // PETS
  // ---------------------------------------------------------------
  // Energia do pet: RER = 70 × peso(kg)^0,75 (NRC 2006; WSAVA; AAHA 2021).
  // Manutenção de adulto castrado: cão 1,6 × RER, gato 1,2 × RER
  // (WSAVA Nutritional Assessment Guidelines; tabela do Manual Veterinário MSD/Merck).
  petRER: { fator: 70, expoente: 0.75 },
  petFatorManutencao: { cao: 1.6, gato: 1.2 },
  // Ração seca: AAFCO usa como referência 4.000 kcal/kg na matéria seca;
  // com ~10% de umidade da ração seca → ~3.600 kcal/kg "como vem no saco".
  // Rótulos reais vão de 3.400 a 4.200 kcal/kg — use o do seu saco se souber.
  kcalPorKgRacao: 3600,

  // ---------------------------------------------------------------
  // HIGIENE
  // ---------------------------------------------------------------
  // Papel higiênico: consumo médio brasileiro. USP (Programa de Uso Sustentável, PUSP):
  // 4,708 bilhões de rolos em 2010 ÷ 190,8 milhões de habitantes (IBGE, Censo 2010)
  // = ~25 rolos/pessoa/ano = 0,07 rolo/dia. Dado de consumo, não norma.
  papelRoloPessoaDia: 0.07,

  // Desinfecção de água (Ministério da Saúde): 2 gotas de hipoclorito 2,5% por litro, esperar 30 min.
  hipocloritoGotasPorLitro: 2,

  // Itens básicos de casa (contam na nota e entram na lista se a pessoa não tiver).
  basicos: [
    { id: 'lanterna', nome: 'Lanterna (1 por pessoa adulta)' },
    { id: 'pilhas',   nome: 'Pilhas reserva' },
    { id: 'radio',    nome: 'Rádio a pilha ou manivela' },
    { id: 'gas',      nome: 'Botijão de gás reserva ou fogareiro' },
    { id: 'kit',      nome: 'Kit de primeiros socorros' },
    { id: 'sanitaria',nome: 'Água sanitária sem perfume (para tratar água)' },
    { id: 'velas',    nome: 'Velas e fósforo/isqueiro' },
    { id: 'powerbank',nome: 'Carregador portátil (power bank)' },
    { id: 'dinheiro', nome: 'Dinheiro em espécie (sem internet, sem Pix)' },
  ],

  // =================================================================
  // SAIR DE CASA (mochila BOB de 72 horas)
  // =================================================================
  bugout: {
    // Ready.gov / Cruz Vermelha / Defesa Civil: kit de evacuação para 72 horas (3 dias).
    dias: 3,

    // Faixas de idade.
    bebeAteMeses: 36,      // até 3 anos não carrega mochila (decisão do app: idade em que ainda usa fralda/colo)
    idadeAdolescente: 12,  // ECA (Lei 8.069/1990): criança até 12 anos incompletos
    idadeAdulto: 18,
    idadeIdoso: 60,        // Estatuto da Pessoa Idosa (Lei 10.741/2003): 60 anos ou mais

    // Peso máximo da mochila (fração do peso corporal).
    limiteCarga: {
      // Academia Americana de Pediatria (AAP): mochila de 10% a 20% do peso da criança;
      // várias entidades (ex.: Associação Americana de Terapia Ocupacional) pedem no máximo 10%.
      // Usamos 10% (o mais prudente) para criança.
      crianca: 0.10,
      // ADAPTAÇÃO: meio da faixa da AAP (10–20%) para 12–17 anos.
      adolescente: 0.15,
      // REI (guia de trilha, EUA): mochila carregada de travessia até ~20% do peso corporal.
      // É a regra mais usada; não existe norma oficial civil.
      adulto: 0.20,
      // Revisão sistemática (2025) sobre carga e marcha em idosos: manter abaixo de 5% do
      // peso corporal, simétrica, para não perder estabilidade e evitar queda.
      idoso: 0.05,
    },

    // Peso mediano por idade, quando o peso da criança não é informado.
    // 0–5 anos: Padrões de Crescimento da OMS (2006); 5–10 anos: Referência OMS 2007;
    // 11–17 anos: curvas CDC 2000 (percentil 50). Valores arredondados. "m" = idade em meses.
    pesoMedianoKg: [
      { m: 0, M: 3.3, F: 3.2 }, { m: 1, M: 4.5, F: 4.2 }, { m: 2, M: 5.6, F: 5.1 }, { m: 3, M: 6.4, F: 5.8 },
      { m: 4, M: 7.0, F: 6.4 }, { m: 5, M: 7.5, F: 6.9 }, { m: 6, M: 7.9, F: 7.3 }, { m: 9, M: 8.9, F: 8.2 },
      { m: 12, M: 9.6, F: 8.9 }, { m: 18, M: 10.9, F: 10.2 }, { m: 24, M: 12.2, F: 11.5 }, { m: 36, M: 14.3, F: 13.9 },
      { m: 48, M: 16.3, F: 16.1 }, { m: 60, M: 18.3, F: 18.2 }, { m: 72, M: 20.5, F: 20.2 }, { m: 84, M: 22.9, F: 22.4 },
      { m: 96, M: 25.4, F: 25.0 }, { m: 108, M: 28.1, F: 28.2 }, { m: 120, M: 31.2, F: 31.9 }, { m: 132, M: 35.6, F: 36.9 },
      { m: 144, M: 40.0, F: 41.5 }, { m: 156, M: 45.0, F: 46.0 }, { m: 168, M: 50.8, F: 49.4 }, { m: 180, M: 56.0, F: 52.0 },
      { m: 192, M: 60.8, F: 53.9 }, { m: 204, M: 64.6, F: 55.0 },
    ],

    // Água PARA BEBER levada na mochila (litros/dia). IOM, Dietary Reference Intakes for Water (2005):
    // ingestão adequada, parte vinda de bebidas. A comida de mochila é seca, então tudo vem da garrafa.
    // Bate com o Projeto Esfera (padrão humanitário): 2,5–3 L/dia só para beber.
    // "ate" = idade em anos (exclusivo). Bebê < 1 ano: água vai na fórmula/peito.
    aguaBebidaLDia: [
      { ate: 4, M: 0.9, F: 0.9 },
      { ate: 9, M: 1.2, F: 1.2 },
      { ate: 14, M: 1.8, F: 1.6 },
      { ate: 19, M: 2.6, F: 1.8 },
      { ate: Infinity, M: 3.0, F: 2.2 },
    ],
    aguaBebidaGestante: 2.3,  // IOM
    aguaBebidaLactante: 3.1,  // IOM
    // Quantos dias de água vão NAS COSTAS. Ready.gov pede 3 dias no kit, mas 3 dias só de água
    // para beber pesam 7–10 kg por adulto e estouram o limite de carga de quase todo mundo.
    // ESTIMATIVA/decisão do app: 1 dia na mochila + água sanitária/filtro para tratar o resto
    // no caminho. De carro, os outros dias (até 1 galão/pessoa/dia) vão em galões no carro.
    diasAguaNaMochila: 1,
    gPorLitroAgua: 1030,      // 1 kg da água + ~30 g de garrafa PET por litro (ESTIMATIVA: peso de embalagem)

    // Comida leve e calórica (não precisa cozinhar). Calorias pela TACO (Unicamp).
    // A divisão entre os itens (pct) é ESTIMATIVA nossa; o total de calorias sai de kcalPorFaixa.
    // Sardinha tem pouca caloria por grama (1,6 kcal/g com a lata), por isso fica com só 10%:
    // entra pela proteína, não pela energia.
    // minMeses: amendoim/castanha inteiros são risco de engasgo antes dos 4 anos (AAP; SBP).
    comida: [
      { id: 'cracker', nome: 'Biscoito cream cracker',  unid: 'pacotes de 200 g', g: 200, kcal: 864, pct: 0.35 },              // TACO 432 kcal/100 g
      { id: 'amendoim', nome: 'Amendoim torrado',       unid: 'pacotes de 150 g', g: 150, kcal: 909, pct: 0.30, minMeses: 48 }, // TACO 606 kcal/100 g
      { id: 'maisena', nome: 'Biscoito doce tipo maisena', unid: 'pacotes de 200 g', g: 200, kcal: 886, pct: 0.25 },           // TACO 443 kcal/100 g
      { id: 'sardinha', nome: 'Sardinha em lata (abre-fácil)', unid: 'latas de 125 g', g: 155, kcal: 250, pct: 0.10 },       // ver kcalPorLata; 155 g com a lata
    ],

    // Bebê que não mama no peito.
    formula: {
      // AAP (HealthyChildren.org): 2,5 oz de fórmula por libra de peso por dia (≈ 165 ml/kg/dia),
      // sem passar de ~32 oz (≈ 960 ml) por dia. Vale para bebê até 6 meses só no leite.
      mlPorKgDia: 165,
      maxMlDia: 960,
      // Ministério da Saúde (Guia Alimentar < 2 anos / Caderno de Atenção Básica 23):
      // depois da introdução alimentar, 180–200 ml, 3 vezes ao dia, no máximo 600 ml/dia.
      mlDia6a12: 600,
      // Diluição: rótulos de fórmula no Brasil usam 1 medida (~4,5 g) para 30 ml → ~15 g/100 ml.
      // Siga sempre o rótulo da sua lata (ESTIMATIVA: varia por marca).
      gPoPor100ml: 15,
    },
    // Ministério da Saúde, Guia Alimentar para Crianças Brasileiras Menores de 2 Anos (2019):
    // aos 6 meses 3 refeições complementares (2 frutas + almoço); dos 7 aos 11 meses, 4 (2 frutas + almoço + jantar).
    papinhasDia: [{ ate: 7, n: 3 }, { ate: 12, n: 4 }],
    gPapinha: 120,   // sachê comum de papinha (ESTIMATIVA: peso de embalagem)
    gLataFormula: 800, // lata comum de fórmula infantil no Brasil (ESTIMATIVA: tamanho de embalagem; há latas de 400 g)
    // Bebê no colo/sling pesa para quem carrega: até essa idade o peso dele entra na conta do adulto.
    // Depois disso a criança anda parte do caminho e o peso aparece só como aviso.
    // ESTIMATIVA/decisão do app (não achamos norma; criança costuma andar trechos curtos a partir de ~2 anos).
    coloContaAteMeses: 24,
    gFralda: 35,     // fralda descartável média (ESTIMATIVA: peso de produto)

    // Checklist. Itens da lista: Ready.gov "Build a Kit", Cruz Vermelha "Get a Kit",
    // Defesa Civil (contatos 199/193 em papel, documentos, revisar a cada 6 meses).
    // g = peso típico do produto para adulto; gC = criança (< 12 anos). Pesos são ESTIMATIVA (peso de produto, não norma).
    // quem: todos (inclui bebê) | cada3 (3 anos+) | cada5 (5 anos+) | adulto (18+) | familia (1 para a família)
    //       | mulher (12–50 anos) | remedio | oculos | alergia (só quem marcou)
    // prio: essencial | importante | extra. prioClima / prioModo trocam a prioridade conforme a resposta.
    // soClima: o item só entra se um desses climas foi marcado.
    itens: [
      { id: 'docs',     nome: 'Cópias dos documentos em saco plástico fechado (RG, CPF, certidão, cartão SUS e vacinas)', g: 60, quem: 'todos', prio: 'essencial' },
      { id: 'contatos', nome: 'Cartão com nome, contatos da família, ponto de encontro e telefones 199/193', g: 10, quem: 'todos', prio: 'essencial' },
      { id: 'dinheiro', nome: 'Dinheiro em espécie, notas pequenas', g: 30, quem: 'adulto', prio: 'essencial' },
      { id: 'lanterna', nome: 'Lanterna com pilhas reserva', g: 200, gC: 100, quem: 'cada5', prio: 'essencial' },
      { id: 'apito',    nome: 'Apito (para pedir socorro)', g: 10, quem: 'cada5', prio: 'essencial' },
      { id: 'manta',    nome: 'Manta térmica de emergência', g: 60, quem: 'todos', prio: 'essencial' },
      { id: 'roupa',    nome: 'Muda de roupa completa (camiseta, calça/bermuda)', g: 500, gC: 250, quem: 'todos', prio: 'essencial' },
      { id: 'intima',   nome: 'Roupa íntima e 3 pares de meias', g: 250, gC: 120, quem: 'todos', prio: 'essencial' },
      { id: 'capa',     nome: 'Capa de chuva / poncho', g: 300, gC: 150, quem: 'cada3', prio: 'importante', prioClima: { chuva: 'essencial' } },
      { id: 'agasalho', nome: 'Agasalho / casaco', g: 700, gC: 350, quem: 'todos', prio: 'extra', prioClima: { frio: 'essencial', chuva: 'importante' } },
      { id: 'gorro',    nome: 'Gorro e luvas', g: 150, gC: 80, quem: 'todos', prio: 'importante', soClima: ['frio'], prioClima: { frio: 'essencial' } },
      { id: 'dormir',   nome: 'Saco de dormir ou cobertor leve', g: 1200, gC: 700, quem: 'todos', prio: 'extra', prioClima: { frio: 'importante' } },
      { id: 'bone',     nome: 'Boné ou chapéu', g: 100, gC: 60, quem: 'todos', prio: 'extra', prioClima: { calor: 'essencial' } },
      { id: 'escova',   nome: 'Escova e pasta de dente', g: 60, gC: 40, quem: 'todos', prio: 'essencial' },
      { id: 'papel',    nome: 'Papel higiênico (rolo amassado no saco plástico)', g: 100, quem: 'cada3', prio: 'importante', porDia: 'papelRoloPessoaDia', unid: 'rolo' },
      { id: 'absorv',   nome: 'Absorventes (1 pacote)', g: 100, quem: 'mulher', prio: 'essencial' },
      { id: 'mascara',  nome: 'Máscaras PFF2 (contra fumaça e poeira)', g: 20, quem: 'cada3', prio: 'importante', qtd: 2, unid: 'un.' },
      { id: 'remedio',  nome: 'Remédios de uso contínuo para 3 dias + cópia da receita', g: 100, quem: 'remedio', prio: 'essencial' },
      { id: 'oculos',   nome: 'Óculos reserva (pode ser o antigo) e estojo', g: 60, quem: 'oculos', prio: 'essencial' },
      { id: 'alergia',  nome: 'Remédio da alergia receitado + cartão escrito "tenho alergia a…"', g: 50, quem: 'alergia', prio: 'essencial' },
      { id: 'celular',  nome: 'Carregador do celular + power bank carregado', g: 300, quem: 'adulto', prio: 'importante' },
      { id: 'canivete', nome: 'Canivete ou alicate multiuso', g: 150, quem: 'adulto', prio: 'importante' },
      // Um por família
      { id: 'kit',      nome: 'Kit de primeiros socorros', g: 400, quem: 'familia', prio: 'essencial' },
      { id: 'alcool',   nome: 'Álcool em gel 70%', g: 80, quem: 'familia', prio: 'essencial' },
      { id: 'sanitaria',nome: 'Água sanitária sem perfume em frasco conta-gotas (2 gotas/litro, esperar 30 min)', g: 60, quem: 'familia', prio: 'essencial' },
      { id: 'garrafa',  nome: 'Garrafa vazia de 2 L para encher e tratar água no caminho', g: 50, quem: 'cada5', prio: 'essencial' },
      { id: 'soro',     nome: 'Soro de reidratação oral (4 envelopes, posto de saúde)', g: 120, quem: 'familia', prio: 'importante', prioClima: { calor: 'essencial' } },
      { id: 'protetor', nome: 'Protetor solar', g: 120, quem: 'familia', prio: 'extra', prioClima: { calor: 'importante' } },
      { id: 'repelente',nome: 'Repelente (dengue)', g: 100, quem: 'familia', prio: 'importante' },
      { id: 'sabonete', nome: 'Sabonete em saco plástico', g: 90, quem: 'familia', prio: 'importante' },
      { id: 'lencos',   nome: 'Lenços umedecidos', g: 200, quem: 'familia', prio: 'importante' },
      { id: 'lixo',     nome: 'Sacos de lixo e lacres', g: 80, quem: 'familia', prio: 'importante' },
      { id: 'radio',    nome: 'Rádio a pilha ou manivela', g: 300, quem: 'familia', prio: 'importante' },
      { id: 'isqueiro', nome: 'Isqueiro e fósforo em saco plástico', g: 30, quem: 'familia', prio: 'importante' },
      { id: 'mapa',     nome: 'Mapa de papel da região (GPS pode cair)', g: 50, quem: 'familia', prio: 'importante' },
      { id: 'abridor',  nome: 'Abridor de lata manual', g: 50, quem: 'familia', prio: 'extra' },
      { id: 'filtro',   nome: 'Filtro de água portátil', g: 100, quem: 'familia', prio: 'extra', prioModo: { pe: 'importante' } },
      { id: 'fita',     nome: 'Fita adesiva tipo silver tape', g: 150, quem: 'familia', prio: 'extra' },
      { id: 'corda',    nome: 'Corda fina (10 m)', g: 200, quem: 'familia', prio: 'extra' },
      { id: 'lona',     nome: 'Lona plástica 2 × 3 m', g: 500, quem: 'familia', prio: 'extra' },
      { id: 'caderno',  nome: 'Bloco de papel e caneta', g: 50, quem: 'familia', prio: 'extra' },
    ],

    // Itens do bebê (vão na mochila de um adulto). Pesos: ESTIMATIVA (peso de produto).
    itensBebe: [
      { id: 'mamadeira', nome: 'Mamadeiras limpas', g: 100, qtd: 2, unid: 'un.', prio: 'essencial', soFormula: true },
      { id: 'colher',    nome: 'Colher e potinho do bebê', g: 40, prio: 'importante', aPartirMeses: 6 },
      { id: 'pomada',    nome: 'Pomada para assadura', g: 60, prio: 'importante' },
      { id: 'sling',     nome: 'Sling ou canguru para levar o bebê', g: 500, prio: 'importante', noCorpo: true },
    ],

    // Itens de cada pet (vão na mochila de um adulto). Ready.gov Pets / FEMA: comida e água
    // do pet para pelo menos 3 dias, separada da água da família. Pesos: ESTIMATIVA (peso de produto).
    itensPet: [
      { id: 'coleira',  nome: 'Coleira com plaquinha (nome + telefone) e guia', g: 150, prio: 'essencial', noCorpo: true },
      { id: 'vacina',   nome: 'Cópia da carteira de vacinação', g: 10, prio: 'essencial' },
      { id: 'caixa',    nome: 'Caixa de transporte', g: 1500, prio: 'essencial', so: 'gato', noCorpo: true },
      { id: 'caixaP',   nome: 'Caixa de transporte (cão pequeno)', g: 1500, prio: 'importante', so: 'cao', ateKg: 10, noCorpo: true },
      { id: 'pote',     nome: 'Pote dobrável', g: 80, prio: 'importante' },
      { id: 'saquinho', nome: 'Saquinhos para fezes', g: 30, prio: 'importante', so: 'cao' },
      { id: 'areia',    nome: 'Tapete higiênico ou um pouco de areia', g: 500, prio: 'importante', so: 'gato' },
      { id: 'remPet',   nome: 'Remédios do pet (se usa)', g: 50, prio: 'extra' },
    ],

    // Vai no carro (não pesa nas costas). Água extra até 1 galão/pessoa/dia (Ready.gov).
    itensCarro: [
      { id: 'cobertor', nome: 'Cobertor ou saco de dormir para cada pessoa', prio: 'importante', porPessoa: true },
      { id: 'carreg',   nome: 'Carregador de celular para o carro', prio: 'importante' },
      { id: 'tanque',   nome: 'Tanque cheio (abasteça assim que sair o alerta)', prio: 'essencial' },
      { id: 'mapaC',    nome: 'Rota de saída e uma rota alternativa marcadas no mapa', prio: 'essencial' },
    ],
  },

  // =================================================================
  // PLANO DA FAMÍLIA
  // =================================================================
  plano: {
    // Telefones de emergência no Brasil (gratuitos, de qualquer telefone).
    emergencia: [
      { n: '190', nome: 'Polícia Militar' },
      { n: '192', nome: 'SAMU (ambulância)' },
      { n: '193', nome: 'Corpo de Bombeiros' },
      { n: '199', nome: 'Defesa Civil' },
    ],
    // Defesa Civil Alerta (gov.br): mande um SMS com o seu CEP para 40199 e receba alertas de risco.
    smsAlerta: '40199',
    // Defesa Civil: revisar o kit a cada 6 meses (validade de comida, remédio e pilhas).
    revisarMeses: 6,
    sangue: ['', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'],
  },

  fontes: [
    'Ready.gov (FEMA) — Build a Kit e Water: ~1 galão por pessoa por dia; kit de 3 dias para evacuação',
    'Cruz Vermelha Americana — Get a Kit: água 3 dias para evacuar, 2 semanas para casa',
    'Defesa Civil — orientações de kit de emergência (contatos 199/193, documentos, revisar a cada 6 meses)',
    'Ministério da Saúde — desinfecção de água com hipoclorito de sódio 2,5%',
    'Ministério da Saúde — Guia Alimentar para Crianças Brasileiras Menores de 2 Anos (2019) e Caderno de Atenção Básica 23',
    'Tabela TACO (Unicamp) — composição dos alimentos',
    'Institute of Medicine (EUA) — Dietary Reference Intakes: energia e água',
    'Projeto Esfera — padrão humanitário mínimo de água para beber (2,5–3 L/dia)',
    'OMS — açúcares livres abaixo de 10% das calorias; Padrões de Crescimento Infantil (2006) e Referência 2007',
    'CDC (EUA) — curvas de crescimento 2000 (peso de 11 a 17 anos)',
    'DIEESE — cesta básica, ração mínima do Decreto-Lei 399/1938',
    'Academia Americana de Pediatria (HealthyChildren.org) — mochila infantil (10–20% do peso) e volume de fórmula',
    'REI (EUA) — mochila de trilha até ~20% do peso corporal',
    'Revisão sistemática (2025) — carga e marcha em idosos: abaixo de 5% do peso corporal',
    'NRC 2006, WSAVA e AAHA — energia de cães e gatos; Purina Institute — água ~1 ml por kcal; AAFCO — energia da ração',
    'National Diaper Bank Network (EUA) — fraldas por dia',
    'USP (PUSP) e IBGE Censo 2010 — consumo de papel higiênico no Brasil',
    'ECA (Lei 8.069/1990) e Estatuto da Pessoa Idosa (Lei 10.741/2003) — faixas de idade',
    'Ready.gov — Make a Plan: dois pontos de encontro e um contato fora da cidade',
    'Defesa Civil Alerta (gov.br) — SMS com o CEP para 40199',
  ],
};
