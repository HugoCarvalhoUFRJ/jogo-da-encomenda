/*
 * Interface do Jogo da Encomenda.
 * O sorteio em si fica em rng.js; aqui só cuidamos de telas, link e memória local.
 */
(function () {
  'use strict';

  const E = window.Encomenda;
  const VERSAO = window.ENCOMENDA_LOCAIS.versao;
  const LOCAIS = window.ENCOMENDA_LOCAIS.locais;

  const $ = (sel) => document.querySelector(sel);

  // Cria elementos sem innerHTML (os nomes vêm do link e não são confiáveis).
  function el(tag, props, ...filhos) {
    const n = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
    }
    for (const f of filhos) if (f != null) n.append(f);
    return n;
  }

  // ---------- Memória local (pode falhar em aba anônima: tudo protegido) ----------
  const memoria = {
    ler(k) {
      try {
        const v = localStorage.getItem('encomenda:' + k);
        return v ? JSON.parse(v) : null;
      } catch (_) {
        return null;
      }
    },
    gravar(k, v) {
      try { localStorage.setItem('encomenda:' + k, JSON.stringify(v)); } catch (_) { /* sem memória, segue o jogo */ }
    },
    apagar(k) {
      try { localStorage.removeItem('encomenda:' + k); } catch (_) { /* idem */ }
    },
  };

  // ---------- Estado ----------
  let partida = null; // { semente, jogadores: [{chave, nome}], id }
  let estado = null;  // { jogador: chave|null, rodada, riscados: [nomes], riscadosRodada }

  function montarPartida(semente, nomes) {
    const sem = String(semente || '').trim();
    const { jogadores, duplicados } = E.normalizarNomes(nomes);
    if (!E.chave(sem)) return { erro: 'Falta a semente.' };
    if (duplicados.length) return { erro: 'Nomes repetidos: ' + duplicados.join(', ') + '.' };
    if (jogadores.length < E.MIN_JOGADORES) return { erro: 'São necessários pelo menos ' + E.MIN_JOGADORES + ' jogadores.' };
    const nomesLimpos = jogadores.map((j) => j.nome);
    return { partida: { semente: sem, jogadores, id: E.idPartida(sem, nomesLimpos, VERSAO) } };
  }

  function nomes() {
    return partida.jogadores.map((j) => j.nome);
  }

  function entrarNaPartida(p, rodadaPedida) {
    partida = p;
    const salvo = memoria.ler('partida:' + p.id) || {};
    const rodadaSalva = Number(salvo.rodada) || 1;
    const rodada = Math.max(Number(rodadaPedida) || 1, rodadaSalva);
    const jogadorValido = p.jogadores.some((j) => j.chave === salvo.jogador) ? salvo.jogador : null;
    estado = {
      jogador: jogadorValido,
      rodada,
      riscados: salvo.riscadosRodada === rodada && Array.isArray(salvo.riscados) ? salvo.riscados : [],
      riscadosRodada: rodada,
    };
    if (rodadaSalva > (Number(rodadaPedida) || 1)) {
      avisar('Continuando da rodada ' + rodadaSalva + ' (a última em que você estava).');
    }
    salvar();
  }

  function salvar() {
    if (!partida) return;
    memoria.gravar('partida:' + partida.id, estado);
    memoria.gravar('ultima', { semente: partida.semente, nomes: nomes(), rodada: estado.rodada });
    try { history.replaceState(null, '', linkDaPartida()); } catch (_) { /* file:// em alguns navegadores */ }
  }

  function enderecoBase() {
    const base = location.href.split(/[?#]/)[0];
    // No site publicado, ".../index.html" é o mesmo que ".../" (em file:// não é).
    return /^https?:$/.test(location.protocol) ? base.replace(/index\.html$/, '') : base;
  }

  function linkDaPartida() {
    return enderecoBase() + '#' + E.montarHashLink(partida.semente, nomes(), estado.rodada);
  }

  // ---------- Navegação ----------
  function mostrarTela(nome) {
    document.querySelectorAll('.tela').forEach((t) => { t.hidden = t.id !== 'tela-' + nome; });
    document.body.dataset.tela = nome;
    window.scrollTo(0, 0);
    if (nome === 'inicio') prepararInicio();
    if (nome === 'criar') prepararCriar();
    if (nome === 'compartilhar') prepararCompartilhar();
    if (nome === 'nome') prepararNome();
    if (nome === 'rodada') prepararRodada();
  }

  function irParaJogo() {
    mostrarTela(estado.jogador ? 'rodada' : 'nome');
  }

  document.querySelectorAll('[data-ir]').forEach((b) => {
    b.addEventListener('click', () => mostrarTela(b.dataset.ir));
  });

  // ---------- Toast ----------
  let toastTimer = 0;
  function avisar(texto) {
    const t = $('#toast');
    t.textContent = texto;
    t.classList.add('visivel');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('visivel'), 2800);
  }

  // ---------- Confirmação ----------
  function confirmar(titulo, texto, rotuloSim) {
    const dlg = $('#dlg-confirmar');
    $('#confirmar-titulo').textContent = titulo;
    $('#confirmar-texto').textContent = texto;
    $('#confirmar-sim').textContent = rotuloSim || 'OK';
    if (typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(titulo + '\n\n' + texto));
    return new Promise((resolve) => {
      const fim = (v) => {
        $('#confirmar-sim').onclick = null;
        $('#confirmar-nao').onclick = null;
        dlg.onclose = null;
        if (dlg.open) dlg.close();
        resolve(v);
      };
      $('#confirmar-sim').onclick = () => fim(true);
      $('#confirmar-nao').onclick = () => fim(false);
      dlg.onclose = () => fim(false);
      dlg.showModal();
      $('#confirmar-sim').focus();
    });
  }

  // ---------- Tela: início ----------
  function prepararInicio() {
    const ultima = memoria.ler('ultima');
    const btn = $('#btn-continuar');
    btn.hidden = !(ultima && Array.isArray(ultima.nomes));
    if (!btn.hidden) btn.textContent = '↩ Continuar partida (rodada ' + (ultima.rodada || 1) + ')';
  }

  $('#btn-continuar').addEventListener('click', () => {
    const ultima = memoria.ler('ultima');
    if (!ultima) return;
    const r = montarPartida(ultima.semente, ultima.nomes);
    if (r.erro) { avisar(r.erro); return; }
    entrarNaPartida(r.partida, ultima.rodada);
    irParaJogo();
  });

  // ---------- Tela: criar ----------
  const PALAVRAS = [
    'pato', 'caju', 'sapo', 'tatu', 'bolo', 'pipa', 'mala', 'farol', 'cacto', 'coruja', 'foca', 'jaca',
    'lontra', 'manga', 'panda', 'quiabo', 'sabia', 'tucano', 'urso', 'vespa', 'zebra', 'abacate', 'boto',
    'cuscuz', 'dado', 'esquilo', 'figo', 'girafa', 'iguana', 'jabuti', 'kiwi', 'lhama', 'mico', 'nabo',
    'ostra', 'pacoca', 'pudim', 'tapioca', 'brigadeiro', 'coxinha', 'pastel', 'goiaba', 'pitanga',
  ];
  function novaSemente() {
    const p = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
    return p + String(Math.floor(Math.random() * 90) + 10);
  }

  function linhas(texto) {
    return texto.split(/\r?\n/);
  }

  function prepararCriar() {
    const s = $('#criar-semente');
    if (!s.value.trim()) s.value = novaSemente();
    validarCriar();
  }

  function validarCriar() {
    const { jogadores, duplicados } = E.normalizarNomes(linhas($('#criar-nomes').value));
    const cont = $('#criar-contador');
    const n = jogadores.length;
    let ok = false;
    if (duplicados.length) {
      cont.textContent = '⚠️ Nome repetido: ' + duplicados.join(', ') + '. Use um apelido diferente.';
      cont.className = 'ajuda ruim';
    } else if (n < E.MIN_JOGADORES) {
      cont.textContent = n + (n === 1 ? ' jogador' : ' jogadores') + '. Mínimo de ' + E.MIN_JOGADORES + '.';
      cont.className = 'ajuda';
    } else {
      cont.textContent = '✔ ' + n + ' jogadores: 1 impostor e ' + (n - 1) + ' no local.';
      cont.className = 'ajuda ok';
      ok = true;
    }
    $('#btn-gerar').disabled = !ok || !E.chave($('#criar-semente').value);
  }

  $('#criar-nomes').addEventListener('input', validarCriar);
  $('#criar-semente').addEventListener('input', validarCriar);
  $('#btn-sortear-semente').addEventListener('click', () => {
    $('#criar-semente').value = novaSemente();
    validarCriar();
  });

  $('#form-criar').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const r = montarPartida($('#criar-semente').value, linhas($('#criar-nomes').value));
    if (r.erro) { avisar(r.erro); return; }
    entrarNaPartida(r.partida, 1);
    mostrarTela('compartilhar');
  });

  // ---------- Tela: manual ----------
  $('#form-manual').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const erro = $('#manual-erro');
    const r = montarPartida($('#manual-semente').value, linhas($('#manual-nomes').value));
    if (r.erro) {
      erro.textContent = r.erro;
      erro.hidden = false;
      return;
    }
    erro.hidden = true;
    entrarNaPartida(r.partida, Math.max(1, Math.floor(Number($('#manual-rodada').value)) || 1));
    irParaJogo();
  });

  // ---------- Tela: compartilhar ----------
  function prepararCompartilhar() {
    const link = linkDaPartida();
    $('#link-partida').value = link;
    $('#btn-compartilhar').hidden = typeof navigator.share !== 'function';
    $('#resumo-partida').textContent =
      partida.jogadores.length + ' jogadores · semente "' + partida.semente + '" · rodada ' + estado.rodada;
    $('#btn-ir-jogo').textContent = estado.jogador ? 'Voltar ao jogo →' : 'Escolher meu nome →';

    const qr = $('#qr');
    qr.replaceChildren();
    if (typeof window.QRCode === 'function') {
      try {
        // eslint-disable-next-line no-new
        new window.QRCode(qr, {
          text: link,
          width: 200,
          height: 200,
          colorDark: '#2a2018',
          colorLight: '#fbf7ef',
          correctLevel: window.QRCode.CorrectLevel.M,
        });
        qr.removeAttribute('title'); // a biblioteca coloca o link como title
      } catch (_) {
        qr.replaceChildren(); // link longo demais para QR: fica só o link
      }
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (_) {
      const campo = $('#link-partida');
      campo.value = texto;
      campo.select();
      try { return document.execCommand('copy'); } catch (__) { return false; }
    }
  }

  async function compartilhar() {
    const link = linkDaPartida();
    const texto = '🕵️ Jogo da Encomenda! Abra o link e toque no seu nome:';
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Jogo da Encomenda', text: texto, url: link });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    avisar((await copiar(link)) ? 'Link copiado!' : 'Copie o link manualmente.');
  }

  $('#btn-compartilhar').addEventListener('click', compartilhar);
  $('#btn-copiar').addEventListener('click', async () => {
    avisar((await copiar(linkDaPartida())) ? 'Link copiado!' : 'Copie o link manualmente.');
  });
  $('#btn-ir-jogo').addEventListener('click', irParaJogo);

  // ---------- Tela: escolher nome ----------
  function prepararNome() {
    const lista = $('#lista-nomes');
    lista.replaceChildren();
    for (const j of partida.jogadores) {
      lista.append(
        el('button', { type: 'button', class: 'etiqueta', onclick: () => escolherNome(j) },
          el('small', { text: 'Agente:' }),
          el('strong', { text: j.nome }))
      );
    }
    $('#nome-resumo').textContent =
      partida.jogadores.length + ' jogadores · semente "' + partida.semente + '"';
  }

  async function escolherNome(j) {
    const ok = await confirmar('Você é ' + j.nome + '?', 'Confira bem: cada pessoa deve escolher só o próprio nome.', 'Sou eu!');
    if (!ok) return;
    estado.jogador = j.chave;
    salvar();
    mostrarTela('rodada');
  }

  // ---------- Tela: rodada ----------
  function prepararRodada() {
    const r = E.sortearRodada(partida.semente, nomes(), estado.rodada, LOCAIS, VERSAO);
    const eu = partida.jogadores.find((j) => j.chave === estado.jogador);
    if (!eu) { mostrarTela('nome'); return; }

    fecharCaixa();
    $('#rodada-numero').textContent = 'Nº ' + String(estado.rodada).padStart(2, '0');
    $('#rodada-agente').textContent = eu.nome;
    $('#adesivo-para').textContent = eu.nome;
    $('#rodada-conferencia').textContent = r.conferencia.join('');

    const conteudo = $('#caixa-conteudo');
    if (r.impostor.chave === eu.chave) {
      conteudo.replaceChildren(
        el('span', { class: 'cartao-impostor' },
          el('span', { class: 'rotulo', text: 'Seu local' }),
          el('span', { class: 'destino-vazio', text: '???' }),
          el('span', { class: 'carimbo carimbo-impostor', text: 'Impostor' }),
          el('span', { class: 'dica', text: 'Descubra o local sem se entregar!' }))
      );
    } else {
      conteudo.replaceChildren(
        el('span', { class: 'cartao-local' },
          el('span', { class: 'rotulo', text: 'Seu local' }),
          el('span', { class: 'emoji-local', text: r.local.emoji }),
          el('strong', { class: 'nome-local', text: r.local.nome }),
          el('span', { class: 'dica', text: 'Você não é o impostor. Fique de olho!' }))
      );
    }

    renderizarLocais();
  }

  function renderizarLocais() {
    const lista = $('#lista-locais');
    lista.replaceChildren();
    const riscados = new Set(estado.riscados);
    for (const local of LOCAIS) {
      const riscado = riscados.has(local.nome);
      const b = el('button', {
        type: 'button',
        class: 'ficha' + (riscado ? ' riscada' : ''),
        'aria-pressed': String(riscado),
        onclick: () => alternarRisco(local.nome, b),
      },
      el('span', { class: 'ficha-emoji', 'aria-hidden': 'true', text: local.emoji }),
      el('span', { text: local.nome }));
      lista.append(b);
    }
  }

  function alternarRisco(nome, botao) {
    const s = new Set(estado.riscados);
    if (s.has(nome)) s.delete(nome);
    else s.add(nome);
    estado.riscados = Array.from(s);
    estado.riscadosRodada = estado.rodada;
    botao.classList.toggle('riscada', s.has(nome));
    botao.setAttribute('aria-pressed', String(s.has(nome)));
    salvar();
  }

  function mudarRodada(nova) {
    estado.rodada = nova;
    estado.riscados = [];
    estado.riscadosRodada = nova;
    salvar();
    prepararRodada();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    avisar('Rodada ' + nova + '. Confiram os emojis!');
  }

  $('#btn-proxima').addEventListener('click', async () => {
    const prox = estado.rodada + 1;
    const ok = await confirmar(
      'Ir para a rodada ' + prox + '?',
      'Combinem para todos avançarem juntos. Depois confiram se os 3 emojis batem.',
      'Avançar'
    );
    if (ok) mudarRodada(prox);
  });

  // ---------- A caixa: segure para revelar ----------
  const caixa = $('#caixa');
  let aberta = false;

  function abrirCaixa() {
    if (aberta) return;
    aberta = true;
    caixa.classList.add('aberta');
    caixa.setAttribute('aria-pressed', 'true');
    if (typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(25); } catch (_) { /* sem vibração */ }
    }
  }

  function fecharCaixa() {
    if (!aberta) return;
    aberta = false;
    caixa.classList.remove('aberta');
    caixa.setAttribute('aria-pressed', 'false');
  }

  caixa.addEventListener('pointerdown', (ev) => {
    if (ev.button !== undefined && ev.button > 0) return;
    ev.preventDefault();
    try { caixa.setPointerCapture(ev.pointerId); } catch (_) { /* ok */ }
    abrirCaixa();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => caixa.addEventListener(t, fecharCaixa));
  caixa.addEventListener('contextmenu', (ev) => ev.preventDefault());
  caixa.addEventListener('keydown', (ev) => {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      if (!ev.repeat) abrirCaixa();
    }
  });
  caixa.addEventListener('keyup', (ev) => {
    if (ev.key === ' ' || ev.key === 'Enter') fecharCaixa();
  });
  caixa.addEventListener('blur', fecharCaixa);
  document.addEventListener('visibilitychange', () => { if (document.hidden) fecharCaixa(); });
  window.addEventListener('blur', fecharCaixa);

  // ---------- Menu ----------
  const menu = $('#dlg-menu');
  $('#btn-menu').addEventListener('click', () => {
    menu.querySelector('[data-acao="anterior"]').disabled = estado.rodada <= 1;
    menu.showModal();
  });

  menu.addEventListener('click', async (ev) => {
    if (ev.target === menu) { menu.close(); return; } // clique no fundo escuro
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    menu.close();
    const acao = b.dataset.acao;
    if (acao === 'compartilhar') {
      mostrarTela('compartilhar');
    } else if (acao === 'anterior') {
      const ok = await confirmar('Voltar para a rodada ' + (estado.rodada - 1) + '?', 'Use isto se você avançou sem querer.', 'Voltar');
      if (ok) mudarRodada(estado.rodada - 1);
    } else if (acao === 'trocar') {
      const ok = await confirmar('Trocar de jogador?', 'Use só se você escolheu o nome errado.', 'Trocar');
      if (ok) {
        estado.jogador = null;
        salvar();
        mostrarTela('nome');
      }
    } else if (acao === 'sair') {
      const ok = await confirmar('Sair da partida?', 'Você pode voltar abrindo o link de novo.', 'Sair');
      if (ok) {
        memoria.apagar('ultima');
        partida = null;
        estado = null;
        try { history.replaceState(null, '', enderecoBase()); } catch (_) { /* ok */ }
        mostrarTela('inicio');
      }
    }
  });

  // ---------- Início: lê o link ----------
  function lerLink() {
    const doHash = E.lerHashLink(location.hash);
    if (doHash) return doHash;
    // Formato antigo: ?n=Ana,Beto&s=semente&r=1
    const p = new URLSearchParams(location.search);
    if (p.has('n') && p.has('s')) return { semente: p.get('s'), nomes: p.get('n').split(','), rodada: p.get('r') };
    return null;
  }

  function iniciar() {
    const link = lerLink();
    if (link) {
      const r = montarPartida(link.semente, link.nomes);
      if (r.erro) {
        avisar('Link inválido: ' + r.erro);
        mostrarTela('inicio');
        return;
      }
      entrarNaPartida(r.partida, link.rodada);
      irParaJogo();
      return;
    }
    mostrarTela('inicio');
  }

  // Abrir outro link de partida na mesma aba só muda o "#", sem recarregar a página.
  window.addEventListener('hashchange', () => {
    if (partida && location.hash.slice(1) === E.montarHashLink(partida.semente, nomes(), estado.rodada)) return;
    iniciar();
  });

  iniciar();
})();
