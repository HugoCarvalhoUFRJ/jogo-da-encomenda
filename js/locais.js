/*
 * Lista de locais do Jogo da Encomenda.
 *
 * IMPORTANTE: a versão entra no sorteio. Se você alterar a lista (adicionar,
 * remover ou reordenar locais) ou o sorteio em rng.js, troque a versão (ex.: 'v3' → 'v4'). Assim, quem estiver
 * com o site antigo em cache vê códigos de conferência diferentes, em vez de
 * receber um local diferente sem perceber.
 */
(function (raiz) {
  'use strict';

  const dados = {
    // A ordem aqui entra no sorteio; na tela os locais aparecem em ordem alfabética.
    versao: 'v3',
    locais: [
      { nome: 'Hospital', emoji: '🏥' },
      { nome: 'Usina nuclear', emoji: '☢️' },
      { nome: 'Fábrica', emoji: '🏭' },
      { nome: 'Avião', emoji: '✈️' },
      { nome: 'Navio pirata', emoji: '🏴‍☠️' },
      { nome: 'Escola', emoji: '🏫' },
      { nome: 'Banco', emoji: '🏦' },
      { nome: 'Circo', emoji: '🎪' },
      { nome: 'Estação espacial', emoji: '🚀' },
      { nome: 'Praia', emoji: '🏖️' },
      { nome: 'Restaurante', emoji: '🍽️' },
      { nome: 'Delegacia', emoji: '🚓' },
      { nome: 'Cassino', emoji: '🎰' },
      { nome: 'Supermercado', emoji: '🛒' },
      { nome: 'Cinema', emoji: '🎬' },
      { nome: 'Hotel', emoji: '🏨' },
      { nome: 'Igreja', emoji: '⛪' },
      { nome: 'Estádio de futebol', emoji: '🏟️' },
      { nome: 'Base militar', emoji: '🪖' },
      { nome: 'Zoológico', emoji: '🦁' },
      { nome: 'Trem', emoji: '🚆' },
      { nome: 'Academia', emoji: '🏋️' },
      { nome: 'Biblioteca', emoji: '📚' },
      { nome: 'Boate', emoji: '🪩' },
      { nome: 'Fazenda', emoji: '🚜' },
      { nome: 'Parque de diversões', emoji: '🎢' },
      { nome: 'Festa de casamento', emoji: '💒' },
      { nome: 'Agência dos Correios', emoji: '📦' },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = dados;
  else raiz.ENCOMENDA_LOCAIS = dados;
})(typeof window !== 'undefined' ? window : globalThis);
