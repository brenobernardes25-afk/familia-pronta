# Família Pronta

**Abrir o app:** https://brenobernardes25-afk.github.io/familia-pronta/

App grátis e de código aberto que prepara a família para uma crise (enchente, apagão, desabamento, evacuação). Em português do Brasil, funciona **offline no celular** (PWA): abre o link, toca em "Adicionar à tela inicial", e depois disso roda sem internet. Nada sai do celular: tudo fica guardado só no aparelho da pessoa.

Três portas na tela inicial:

- **🏠 Ficar em casa (bug-in)** — quantos dias a família aguenta com o que tem em casa, o que acaba primeiro, nota de 0 a 10 e a **lista completa** para a meta (3/7/14/30 dias): cerca de 65 itens em 11 categorias (água, comida, cozinhar sem luz, luz e energia, saúde, higiene e limpeza, bebê, pets, documentos, ferramentas, crianças), cada um com quantidade e prioridade. Comida pela cesta básica do DIEESE (arroz, feijão, macarrão, farinha, leite em pó, enlatados, óleo, açúcar) + sal, café, legumes que duram e uma reserva de 3 dias que não precisa de fogão. Botão "Só o essencial", itens para riscar e imprimir/salvar PDF.
- **🎒 Sair de casa (bug-out / mochila de 72h)** — usa a mesma família. Pergunta se vai a pé ou de carro, o clima (calor/frio/chuva, pode marcar mais de um), o orçamento (básico/médio/completo) e quem usa remédio contínuo, óculos ou tem alergia grave. Monta **uma mochila por pessoa** com quantidade, peso de cada item e prioridade (essencial/importante/extra), soma o peso e avisa quando passa do limite que a pessoa aguenta (adulto, adolescente, criança, idoso).
  - Bebê (até 3 anos) não carrega: as coisas dele vão para a mochila de um adulto. Bebê até 2 anos vai no colo/sling e **o peso dele entra na conta** de quem leva.
  - Pets e itens da família (kit de primeiros socorros, rádio…) vão para quem tem mais folga.
  - Se criança ou idoso passa do limite, água, comida e roupa passam para um adulto que ainda tenha folga.
  - A pé: 1 dia de água nas costas + água sanitária e garrafa para tratar água no caminho. De carro: o resto da água em galões no carro.
  - Botão "mochilas montadas" que lembra de revisar em 6 meses (aparece na tela inicial).
- **📋 Plano da família** — ponto de encontro perto e longe de casa, contato fora da cidade, outros contatos, tipo sanguíneo, alergias, remédios e problemas de saúde de cada um. Gera uma **folha para colar na geladeira** (com 190/192/193/199 e o SMS 40199 da Defesa Civil) e **cartões de bolso** do tamanho de um cartão de crédito, um por pessoa.

**📲 Instalar no celular:** a tela inicial avisa que pelo link o app só abre com internet e ensina a instalar (Android: botão "Instalar agora" quando o Chrome deixa; iPhone: Compartilhar → Adicionar à Tela de Início). Se a pessoa abriu pelo Instagram/Facebook/TikTok, o app percebe e explica como abrir no Chrome ou no Safari, porque o navegador de dentro desses apps não instala.

**💾 Meus dados:** salvar uma cópia em arquivo, restaurar e apagar tudo. O app também pede ao navegador para não apagar os dados sozinho.

Também tem: botão de compartilhar o resultado (WhatsApp/Instagram), modo escuro automático, versão para imprimir de todas as telas e tudo cabe na tela do celular sem rolar para o lado.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Página única |
| `css/style.css` | Visual (claro/escuro automático, impressão) |
| `js/data.js` | **Todos os números**, cada um com a fonte comentada ao lado. Mexa aqui para ajustar valores |
| `js/calc.js` | Cálculos, sem tela: `calcularBugIn()` (ficar em casa) e `calcularBugOut()` (mochilas de 72h) |
| `js/app.js` | Telas e botões |
| `sw.js` | Guarda o app no celular para funcionar offline |
| `manifest.webmanifest` + `icon*.png`, `apple-touch-icon.png`, `icon.svg` | Nome e ícones quando instala no celular (Android e iPhone) |
| `teste.js` | Teste dos cálculos: `node teste.js` |
| `teste-navegador.js` | Teste de verdade no Edge/Chrome, inclusive sem internet: `node teste-navegador.js` |

## Testar no notebook (Windows)

**1. Testes automáticos** (precisa do [Node.js](https://nodejs.org) 22 ou mais novo). Na pasta do projeto:

```
node teste.js
```

Tem que terminar com **"Tudo certo."** (são mais de 40 conferências dos números: água, comida, fraldas, fórmula, pets, peso das mochilas, casos estranhos como família vazia ou só bebê).

```
node teste-navegador.js
```

Abre o Edge ou o Chrome escondido, usa o app como uma pessoa usaria (digita, marca itens, preenche o plano, imprime), confere a tela de celular e o modo escuro, e no fim **desliga o servidor para ver se o app abre sem internet**. Tem que terminar com **"Tudo certo no navegador."**

Para rodar o mesmo teste no site publicado (no PowerShell):

```
$env:URL="https://brenobernardes25-afk.github.io/familia-pronta/"; node teste-navegador.js
```

**2. Abrir e mexer você mesmo.** Precisa abrir por servidor, não clicando duas vezes no arquivo (o modo offline não funciona via `file://`):

```
python -m http.server 8000
```

E abra `http://localhost:8000`.

## Publicar no GitHub Pages

1. Crie um repositório público (ex.: `familia-pronta`) e envie esta pasta.
2. Settings → Pages → Branch `main`, pasta `/ (root)` → Save.
3. O link fica `https://SEU-USUARIO.github.io/familia-pronta/`. É esse que vai na bio/direct. **Já publicado em:** https://brenobernardes25-afk.github.io/familia-pronta/ (repositório: https://github.com/brenobernardes25-afk/familia-pronta).
   Para enviar uma atualização: `git add -A`, `git commit -m "o que mudou"`, `git push`. O site atualiza em ~1 minuto.
4. **A cada atualização**, mude `V = 'fp-v4'` em `sw.js` (v5, v6...), senão o celular continua com a versão antiga. Se criar arquivo novo, coloque o nome dele na lista `ARQ` do `sw.js`. Versão atual: **fp-v4**.

## De onde vêm os números

Fontes usadas (a lista completa também aparece no app, em "Fontes dos números"): Ready.gov/FEMA, Cruz Vermelha Americana, Defesa Civil, Ministério da Saúde (água sanitária, alimentação de menores de 2 anos, fórmula), OMS (curvas de crescimento, açúcar), Tabela TACO (Unicamp), IOM (calorias e água por idade), Projeto Esfera, DIEESE (cesta básica), Academia Americana de Pediatria (mochila infantil e fórmula), CDC (peso de 11 a 17 anos), NRC/WSAVA/AAHA/AAFCO (cães e gatos), ECA e Estatuto da Pessoa Idosa (faixas de idade).

### Números sem fonte oficial (marcados no `data.js`)

Marcados como `ESTIMATIVA` ou `ADAPTAÇÃO`:

- **Quantidades de higiene e consumo da lista de casa**: sabonete (1 por pessoa por semana), pasta de dente, absorventes (2 pacotes por mulher por mês), lenços umedecidos, sacos de lixo (1 rolo por semana), areia de gato, legumes em lata (1 a cada 2 dias por pessoa) e soro (2 envelopes por pessoa). O item tem fonte (Ready.gov, Ministério da Saúde); a quantidade é nossa.
- **Peso de cada item da mochila** (lanterna, roupa, fralda, sachê, garrafa…): peso típico do produto, não norma.
- **Divisão da comida da mochila** (biscoito, amendoim, sardinha): o total de calorias tem fonte (IOM/TACO), a divisão entre os itens é nossa.
- **1 dia de água nas costas**: Ready.gov pede 3 dias no kit, mas 3 dias de água estouram o peso de quase todo mundo. Os outros 2 dias saem de água tratada no caminho, ou dos galões no carro.
- **Limite de carga**: adulto 20% (REI, guia de trilha; não existe norma civil), adolescente 15% (meio da faixa da Academia Americana de Pediatria), idoso 5% (uma única revisão científica de 2025).
- **Bebê no colo conta no peso até 2 anos**: decisão do app.
- **Cesta do "Ficar em casa"**: proporções adaptadas da cesta básica DIEESE (Decreto-Lei 399/1938), com açúcar limitado a 10% das calorias (OMS).
- **Fraldas por dia**: fonte é uma ONG (National Diaper Bank Network) e um fabricante, não um órgão de governo.
- **Papel higiênico**: média de consumo brasileira (USP e Censo 2010), não norma.
- **Fórmula**: diluição de 15 g de pó por 100 ml e lata de 800 g seguem o rótulo comum; cada marca tem o seu.
- **Ajuste de calorias pelo peso do adulto** (±25%): regra nossa.

## Próximos passos

1. **Testar no celular de verdade** (Android e iPhone): abrir o link, instalar na tela inicial, ligar o modo avião e abrir.
2. Pedir para um profissional (Defesa Civil, pediatra, nutricionista) revisar os números marcados como ESTIMATIVA.
3. Imagem para compartilhar (cartão "minha família aguenta X dias" pronto para story).

## Licença

Código aberto sob a licença MIT (arquivo `LICENSE`): qualquer pessoa pode usar, copiar e adaptar, mantendo o aviso de licença.

## Ao pedir ajuda ao Claude no notebook

Mande esta pasta e diga: "Continue o Família Pronta pelo README, próximo passo: X". Está tudo aqui. Antes de entregar, rode `node teste.js` e `node teste-navegador.js`.
