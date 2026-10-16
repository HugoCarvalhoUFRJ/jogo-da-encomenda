/*
 * Testes do sorteio. Rode de um destes jeitos:
 *   - abra teste/index.html no navegador;
 *   - ou, com Node instalado: node teste/testes.js
 */
(function () {
  'use strict';

  const emNode = typeof module === 'object' && module.exports;
  const E = emNode ? require('../js/rng.js') : window.Encomenda;
  const { versao, locais } = emNode ? require('../js/locais.js') : window.ENCOMENDA_LOCAIS;

  const resultados = [];
  function teste(nome, fn) {
    try {
      fn();
      resultados.push({ nome, ok: true });
    } catch (e) {
      resultados.push({ nome, ok: false, erro: e && e.message ? e.message : String(e) });
    }
  }
  function afirmar(cond, msg) {
    if (!cond) throw new Error(msg || 'falhou');
  }
  function igual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
    }
  }

  const ESPERADO_COMPAT = [
    ['Caio', 'Estádio de futebol', '🦄🐹🐧'],
    ['Ana', 'Navio pirata', '🐰🦄🐹'],
    ['Caio', 'Zoológico', '🐍🦁🐱'],
  ];

  const NOMES = ['Ana', 'Beto', 'Caio', 'Duda', 'Érica', 'Fábio', 'Gil', 'Helô', 'Ivo', 'Jô'];
  const sortear = (s, n, r) => E.sortearRodada(s, n, r, locais, versao);

  // Simula o que cada aparelho mostra: cada jogador roda o sorteio com a lista
  // digitada do seu jeito (ordem embaralhada, maiúsculas e acentos diferentes).
  function variante(lista, k) {
    const rng = E.mulberry32(k + 1);
    const v = E.embaralhar(lista, rng).map((nome) => {
      let x = rng() < 0.5 ? nome.toUpperCase() : nome.toLowerCase();
      if (rng() < 0.5) x = x.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return (rng() < 0.5 ? '  ' : '') + x + (rng() < 0.5 ? ' ' : '');
    });
    return v;
  }

  teste('exatamente 1 impostor e todos os outros com o mesmo local', () => {
    for (let n = 3; n <= NOMES.length; n++) {
      const nomes = NOMES.slice(0, n);
      for (let s = 0; s < 40; s++) {
        for (let r = 1; r <= 12; r++) {
          const semente = 'sem' + s;
          const vistas = nomes.map((eu, k) => {
            const res = sortear(semente, variante(nomes, s * 1000 + r * 10 + k), r);
            const minhaChave = E.chave(eu);
            return res.impostor.chave === minhaChave ? 'IMPOSTOR' : res.local.nome;
          });
          const impostores = vistas.filter((v) => v === 'IMPOSTOR').length;
          igual(impostores, 1, 'impostores (n=' + n + ', s=' + s + ', r=' + r + ')');
          const locaisVistos = new Set(vistas.filter((v) => v !== 'IMPOSTOR'));
          igual(locaisVistos.size, 1, 'locais diferentes (n=' + n + ', s=' + s + ', r=' + r + ')');
        }
      }
    }
  });

  teste('mesmo resultado e mesmo código com ordem/maiúsculas/acentos/espaços diferentes', () => {
    const base = sortear('Pato42', NOMES, 3);
    for (let k = 0; k < 50; k++) {
      const outro = sortear('  pató42 ', variante(NOMES, k), 3);
      igual(outro.impostor.chave, base.impostor.chave, 'impostor');
      igual(outro.local.nome, base.local.nome, 'local');
      igual(outro.conferencia, base.conferencia, 'conferência');
    }
  });

  teste('semente, rodada ou nomes diferentes mudam o código de conferência (quase sempre)', () => {
    let iguais = 0;
    const a = sortear('pato42', NOMES, 1).conferencia.join('');
    for (let s = 0; s < 300; s++) {
      if (sortear('pato' + (100 + s), NOMES, 1).conferencia.join('') === a) iguais++;
    }
    afirmar(iguais <= 2, 'colisões demais: ' + iguais);
    afirmar(sortear('pato42', NOMES, 2).conferencia.join('') !== a || sortear('pato42', NOMES, 3).conferencia.join('') !== a, 'rodada não muda código');
    afirmar(sortear('pato42', NOMES.slice(0, 9), 1).conferencia.join('') !== a || sortear('pato42', NOMES.slice(1), 1).conferencia.join('') !== a, 'nomes não mudam código');
  });

  teste('impostor distribuído de forma uniforme', () => {
    const nomes = NOMES.slice(0, 5);
    const cont = {};
    const T = 20000;
    for (let i = 0; i < T; i++) {
      const r = sortear('s' + (i % 200), nomes, 1 + Math.floor(i / 200));
      cont[r.impostor.chave] = (cont[r.impostor.chave] || 0) + 1;
    }
    const esperado = T / nomes.length;
    for (const k of Object.keys(cont)) {
      afirmar(Math.abs(cont[k] - esperado) / esperado < 0.06, 'desvio grande para ' + k + ': ' + cont[k]);
    }
    igual(Object.keys(cont).length, nomes.length, 'todos foram impostor alguma vez');
  });

  teste('locais distribuídos de forma uniforme entre sementes', () => {
    const cont = {};
    const T = 36000;
    for (let i = 0; i < T; i++) {
      const r = sortear('x' + i, NOMES.slice(0, 4), 1);
      cont[r.local.nome] = (cont[r.local.nome] || 0) + 1;
    }
    const esperado = T / locais.length;
    igual(Object.keys(cont).length, locais.length, 'todos os locais aparecem');
    for (const k of Object.keys(cont)) {
      afirmar(Math.abs(cont[k] - esperado) / esperado < 0.15, 'desvio grande para ' + k + ': ' + cont[k]);
    }
  });

  teste('nenhum local se repete até a lista inteira ser usada', () => {
    for (let s = 0; s < 20; s++) {
      for (let ciclo = 0; ciclo < 3; ciclo++) {
        const vistos = new Set();
        for (let r = 1 + ciclo * locais.length; r <= (ciclo + 1) * locais.length; r++) {
          vistos.add(sortear('c' + s, NOMES.slice(0, 4), r).local.nome);
        }
        igual(vistos.size, locais.length, 'locais únicos no ciclo ' + ciclo);
      }
    }
  });

  teste('entrar ou sair alguém não muda a sequência de locais', () => {
    for (let s = 0; s < 20; s++) {
      for (let r = 1; r <= 60; r++) {
        const a = sortear('t' + s, NOMES.slice(0, 4), r).local.nome;
        const b = sortear('t' + s, NOMES.slice(1, 7), r).local.nome;
        igual(b, a, 'local (s=' + s + ', r=' + r + ')');
      }
    }
  });

  teste('nomes repetidos são detectados (ignorando maiúsculas e acentos)', () => {
    const { jogadores, duplicados } = E.normalizarNomes(['Ana', ' ana ', 'Ána', 'Beto', '', '   ', 'Caio']);
    igual(jogadores.map((j) => j.nome), ['Ana', 'Beto', 'Caio']);
    igual(duplicados.length, 2, 'duplicados');
  });

  teste('vírgulas e espaços extras nos nomes são limpos', () => {
    const { jogadores } = E.normalizarNomes(['Ana,  Maria', '  Zé   Pedro ']);
    igual(jogadores.map((j) => j.nome), ['Ana Maria', 'Zé Pedro']);
  });

  teste('link compacto: ida e volta mantém o mesmo sorteio', () => {
    const casos = [
      ['pato42', ['Ana', 'Beto', 'Caio', 'Duda']],
      ['Meu Pato', ['Érica', 'Zé Pedro', 'João', 'Helô', 'Ça Va']],
      ['a/b#c&d?e', ['Ana/Bia', 'Beto#1', 'Caio&Cia', 'Dudu?', 'Eva%20', 'Fê 🍺']],
      ['x_y', ['Ana_Maria', 'Beto', 'Caio']],
    ];
    for (const [semente, nomes] of casos) {
      for (const rodada of [1, 2, 37]) {
        const hash = E.montarHashLink(semente, nomes, rodada);
        afirmar(!/[#?& ]/.test(hash), 'caractere problemático no link: ' + hash);
        const lido = E.lerHashLink('#' + hash);
        afirmar(lido, 'link não lido: ' + hash);
        igual(lido.rodada, rodada, 'rodada');
        const a = sortear(semente, nomes, rodada);
        const b = sortear(lido.semente, lido.nomes, lido.rodada);
        igual(b.impostor.chave, a.impostor.chave, 'impostor (' + hash + ')');
        igual(b.local.nome, a.local.nome, 'local (' + hash + ')');
        igual(b.conferencia, a.conferencia, 'conferência (' + hash + ')');
      }
    }
  });

  teste('link compacto: formato curto e legível', () => {
    igual(E.montarHashLink('pato42', ['Ana', 'Beto', 'Érica', 'Zé Pedro'], 1), 'pato42/Ana,Beto,Erica,Ze_Pedro');
    igual(E.montarHashLink('pato42', ['Ana', 'Beto', 'Caio'], 5), 'pato42/Ana,Beto,Caio/5');
    igual(E.lerHashLink(''), null);
    igual(E.lerHashLink('#qualquer'), null);
  });

  teste('erros: poucos jogadores, semente vazia, rodada inválida', () => {
    let erros = 0;
    try { sortear('a', ['Ana', 'Beto'], 1); } catch (_) { erros++; }
    try { sortear('   ', ['Ana', 'Beto', 'Caio'], 1); } catch (_) { erros++; }
    try { sortear('a', ['Ana', 'Beto', 'Caio'], 0); } catch (_) { erros++; }
    igual(erros, 3);
  });

  teste('lista de locais: nomes únicos e todos com emoji', () => {
    const nomes = new Set(locais.map((l) => E.chave(l.nome)));
    igual(nomes.size, locais.length, 'nomes únicos');
    afirmar(locais.every((l) => l.emoji && l.emoji.length > 0), 'emoji faltando');
    afirmar(locais.length >= 20, 'poucos locais');
  });

  // Trava de compatibilidade: se este teste quebrar, aparelhos com versões
  // diferentes do site vão sortear coisas diferentes. Só altere de propósito
  // (e troque a versão em locais.js).
  teste('compatibilidade: resultado conhecido para pato42 / Ana, Beto, Caio, Duda', () => {
    const r = [1, 2, 3].map((rod) => {
      const x = sortear('pato42', ['Ana', 'Beto', 'Caio', 'Duda'], rod);
      return [x.impostor.nome, x.local.nome, x.conferencia.join('')];
    });
    igual(r, ESPERADO_COMPAT);
  });

  const ok = resultados.every((r) => r.ok);
  const linhas = resultados.map((r) => (r.ok ? '✔ ' : '✘ ') + r.nome + (r.ok ? '' : '\n    → ' + r.erro));
  linhas.push('', ok ? 'TODOS OS TESTES PASSARAM (' + resultados.length + ')' : 'HÁ TESTES FALHANDO');
  const texto = linhas.join('\n');

  if (emNode) {
    console.log(texto);
    process.exitCode = ok ? 0 : 1;
  } else {
    document.getElementById('saida').textContent = texto;
    document.title = ok ? 'OK' : 'FALHOU';
    document.body.dataset.resultado = ok ? 'ok' : 'falhou';
  }
})();
