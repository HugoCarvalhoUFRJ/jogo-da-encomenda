# 🕵️ Jogo da Encomenda

Todos sabem **onde estão**… menos um.

Jogo de dedução para jogar ao vivo com amigos, cada um no próprio celular. Funciona como um site estático: não tem servidor nem cadastro, e não precisa de internet durante a partida depois que a página carregou.

## Regras

- São **N jogadores** (mínimo 3). **N − 1** recebem o mesmo **local** sorteado (hospital, usina nuclear, avião…). **1** jogador é o **impostor** e não sabe o local.
- Os jogadores fazem perguntas uns aos outros:
  - quem sabe o local tenta descobrir o impostor sem entregar o local;
  - o impostor tenta descobrir o local sem se denunciar.
- No fim, votem em quem acham que é o impostor. Se o impostor for pego, ainda pode tentar adivinhar o local para virar o jogo.

## Como jogar pelo site

1. O **anfitrião** toca em **Criar partida**, digita o nome de todo mundo (um por linha) e toca em **Gerar partida**.
2. Ele manda o link no grupo (botão **Compartilhar**) ou mostra o QR code.
3. Cada jogador abre o link e **toca no próprio nome**. O celular lembra a escolha.
4. Todos conferem em voz alta os **3 emojis do selo**. Se forem iguais em todos os celulares, a partida está sincronizada.
5. Cada um **segura a caixa** para ver onde está. Ao soltar, ela fecha de novo.
6. Para jogar outra rodada, todos tocam em **Próxima rodada**. Não precisa de link novo.

Sem link? Use **Entrar digitando a semente**. Todos digitam a mesma semente e os mesmos nomes. A ordem dos nomes, maiúsculas e acentos não importam.

## Como funciona sem servidor

O sorteio é **determinístico**. A partir de `semente + lista de nomes + número da rodada`, todo navegador calcula exatamente o mesmo resultado: um hash ([cyrb53](js/rng.js)) alimenta um gerador pseudoaleatório (mulberry32). Assim, todos os celulares "concordam" sobre o local e sobre quem é o impostor sem trocar mensagens, e cada um só mostra o resultado do próprio jogador.

- Os nomes são normalizados (sem acentos, minúsculas, ordem alfabética) antes do sorteio.
- Os locais não se repetem até a lista inteira ser usada.
- O código de 3 emojis serve para detectar erros de digitação ou versões diferentes.

> Dá para trapacear tocando no nome de outra pessoa. É um jogo entre amigos, então vale a honra! 😉

## Estrutura

```
index.html        página única com todas as telas
css/style.css     visual (papelão, etiquetas e carimbos; claro/escuro automático)
js/locais.js      lista de locais (com versão)
js/rng.js         sorteio determinístico
js/app.js         telas, link, memória local
teste/            testes do sorteio (abra teste/index.html no navegador)
```

### Editando os locais

Edite [js/locais.js](js/locais.js). **Sempre que mudar a lista, troque a `versao`** (ex.: `'v2'` → `'v3'`). Quem estiver com a versão antiga em cache vai ver emojis de conferência diferentes, em vez de receber outro local sem perceber. Depois atualize o teste de compatibilidade em [teste/testes.js](teste/testes.js): rode os testes, que mostram o valor novo, e copie esse valor para `ESPERADO_COMPAT`.

## Rodando localmente

Basta abrir `index.html` no navegador, com dois cliques no arquivo. Para testar o sorteio, abra `teste/index.html`, ou rode `node teste/testes.js` se tiver Node instalado.

## Publicando no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos para a branch `main`.
2. No repositório, vá em **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em um ou dois minutos, o site fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
