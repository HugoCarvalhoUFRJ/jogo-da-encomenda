/*
 * Sorteio determinístico do Jogo da Encomenda.
 *
 * Todo aparelho que recebe a mesma semente, a mesma lista de nomes e o mesmo
 * número de rodada calcula exatamente o mesmo resultado (local + impostor),
 * sem precisar de servidor. Por isso só usamos operações inteiras de 32 bits
 * (Math.imul, >>>), que são idênticas em qualquer navegador, e nunca
 * Math.random() ou localeCompare().
 */
(function (raiz) {
  'use strict';

  // Hash de string → inteiro de 53 bits (cyrb53, domínio público).
  function cyrb53(str, seed) {
    seed = seed || 0;
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  // Gerador pseudoaleatório de 32 bits: devolve números em [0, 1).
  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngDe(texto) {
    return mulberry32(cyrb53(texto) % 4294967296);
  }

  // Fisher–Yates usando o gerador determinístico.
  function embaralhar(lista, rng) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function semAcentos(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // Forma canônica para comparar: sem acentos, minúsculas, espaços únicos.
  function chave(texto) {
    return semAcentos(texto)
      .replace(/[,_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // Forma de exibição: mantém acentos e maiúsculas, só arruma espaços.
  // Vírgulas e "_" viram espaço porque têm função especial no link.
  function limparNome(texto) {
    return String(texto).normalize('NFC').replace(/[,_]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /*
   * Link compacto: #semente/Nome1,Nome2,...[/rodada]
   * Acentos saem e espaços viram "_" para evitar %C3%A9 e %20, que deixam o link
   * enorme. Como o sorteio já ignora acentos e maiúsculas, o resultado não muda.
   */
  function paraLink(texto) {
    return encodeURIComponent(semAcentos(limparNome(texto)).replace(/ /g, '_'));
  }

  function deLink(texto) {
    let t = texto;
    try { t = decodeURIComponent(texto); } catch (_) { /* usa como veio */ }
    return limparNome(t);
  }

  function montarHashLink(semente, nomes, rodada) {
    let h = paraLink(semente) + '/' + nomes.map(paraLink).join(',');
    if (rodada > 1) h += '/' + rodada;
    return h;
  }

  // Devolve { semente, nomes, rodada } ou null se o texto não for um link de partida.
  function lerHashLink(hash) {
    const partes = String(hash || '').replace(/^#/, '').split('/');
    if (partes.length < 2 || !partes[0] || !partes[1]) return null;
    return {
      semente: deLink(partes[0]),
      nomes: partes[1].split(',').map(deLink),
      rodada: Number(partes[2]) || 1,
    };
  }

  // Ordena por código de caractere (não por localeCompare, que varia entre aparelhos).
  function normalizarNomes(lista) {
    const vistos = new Map();
    const duplicados = [];
    for (const bruto of lista) {
      const nome = limparNome(bruto);
      if (!nome) continue;
      const k = chave(nome);
      if (vistos.has(k)) {
        duplicados.push(nome);
        continue;
      }
      vistos.set(k, nome);
    }
    const jogadores = Array.from(vistos, ([k, nome]) => ({ chave: k, nome }));
    jogadores.sort((a, b) => (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));
    return { jogadores, duplicados };
  }

  const MIN_JOGADORES = 3;

  // 32 emojis → 32³ = 32.768 combinações de código de conferência.
  const EMOJIS_CONFERENCIA = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🦆', '🦉', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🐢', '🐍', '🦖', '🐙', '🦀', '🐳',
  ];

  function textoBase(semente, jogadores, versao) {
    return ['encomenda', versao, chave(semente), jogadores.map((j) => j.chave).join(',')].join('|');
  }

  function idPartida(semente, nomes, versao) {
    const { jogadores } = normalizarNomes(nomes);
    return cyrb53(textoBase(semente, jogadores, versao)).toString(36);
  }

  /*
   * Sorteia a rodada. Retorna:
   *   jogadores    — lista normalizada [{chave, nome}]
   *   impostor     — um item de `jogadores`
   *   local        — um item de `locais`
   *   conferencia  — 3 emojis; iguais em todos os aparelhos = partida sincronizada
   */
  function sortearRodada(semente, nomes, rodada, locais, versao) {
    const { jogadores } = normalizarNomes(nomes);
    const n = jogadores.length;
    if (n < MIN_JOGADORES) throw new Error('São necessários pelo menos ' + MIN_JOGADORES + ' jogadores.');
    if (!chave(semente)) throw new Error('A semente não pode ficar vazia.');
    rodada = Math.floor(Number(rodada));
    if (!(rodada >= 1)) throw new Error('A rodada deve ser um número a partir de 1.');

    const base = textoBase(semente, jogadores, versao);

    // Locais: uma permutação por "ciclo" — nenhum local se repete até a lista acabar.
    // Depende só da semente (não dos nomes): se alguém entra ou sai no meio do
    // jogo, a sequência de locais continua de onde estava, sem repetir.
    const L = locais.length;
    const ciclo = Math.floor((rodada - 1) / L);
    const baseLocais = ['encomenda', versao, chave(semente)].join('|');
    const ordem = embaralhar(locais.map((_, i) => i), rngDe(baseLocais + '|locais|' + ciclo));
    const local = locais[ordem[(rodada - 1) % L]];

    const rng = rngDe(base + '|rodada|' + rodada);
    const impostor = jogadores[Math.floor(rng() * n)];

    const rc = rngDe(base + '|conferencia|' + rodada);
    const conferencia = [0, 1, 2].map(
      () => EMOJIS_CONFERENCIA[Math.floor(rc() * EMOJIS_CONFERENCIA.length)]
    );

    return { jogadores, impostor, local, conferencia, rodada };
  }

  const api = {
    cyrb53,
    mulberry32,
    embaralhar,
    chave,
    limparNome,
    normalizarNomes,
    idPartida,
    sortearRodada,
    montarHashLink,
    lerHashLink,
    MIN_JOGADORES,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Encomenda = api;
})(typeof window !== 'undefined' ? window : globalThis);
