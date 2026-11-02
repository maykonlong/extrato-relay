# Extrato de Tomate — relay

Repasse com CORS para o CDN do servidor. O navegador não consegue ler os
segmentos de vídeo direto porque o CDN não manda `Access-Control-Allow-Origin`;
este Worker busca a URL assinada e devolve com o cabeçalho, reescrevendo as
playlists `.m3u8` para que cada segmento também passe por aqui.

Não guarda nada: nenhum token, nenhum log de conta.

## Publicar em 2 cliques

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/maykonlong/extrato-relay)

Depois copie o endereço `https://extrato-relay.SEU-USUARIO.workers.dev` e cole em
`relayUrl` no `config.js` do site.

## Ou pela linha de comando

```bash
npx wrangler deploy worker.js --name extrato-relay
```

## Uso

```
https://SEU-WORKER.workers.dev/?u=https%3A%2F%2Fcdn...%2F720p.m3u8%3Fpolicy%3D...
```

`/health` responde `{"ok":true}` para conferir se subiu.
