/* Teste do relay com fetch simulado: preflight, POST da API e reescrita da playlist. */
import worker from '../relay/worker.js';

const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), method: (options && options.method) || 'GET', body: options && options.body });
  if (String(url).includes('.m3u8')) {
    return new Response('#EXTM3U\n#EXTINF:4,\nseg001.ts\n#EXTINF:4,\n/abs/seg002.ts\n', {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' }
    });
  }
  return new Response(JSON.stringify({ ok: true, echoed: options && options.body }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

const base = 'https://relay.test';

function show(label, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  → ' + detail : ''));
  if (!ok) { process.exitCode = 1; }
}

// 1) preflight
let response = await worker.fetch(new Request(base + '/?u=x', { method: 'OPTIONS' }));
show('OPTIONS devolve 204', response.status === 204, 'status ' + response.status);
const allow = response.headers.get('access-control-allow-methods') || '';
show('preflight permite POST', allow.includes('POST'), allow);
show('preflight libera origem', response.headers.get('access-control-allow-origin') === '*');

// 2) POST da API com corpo JSON
response = await worker.fetch(new Request(base + '/?u=' + encodeURIComponent('https://prod-api.tomatoanimes.com/login/'), {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer xyz' },
  body: JSON.stringify({ email: 'a@b.c' })
}));
const text = await response.text();
show('POST repassado ao upstream', calls.at(-1).method === 'POST', calls.at(-1).method);
show('corpo JSON preservado', String(calls.at(-1).body).includes('a@b.c'), String(calls.at(-1).body));
show('resposta com CORS', response.headers.get('access-control-allow-origin') === '*');
show('resposta chega ao cliente', text.includes('a@b.c'), text.slice(0, 40));

// 3) playlist reescrita
response = await worker.fetch(new Request(base + '/?u=' + encodeURIComponent('https://toad.easylearn-cdn.cloud/1/2/720p.m3u8?policy=abc')));
const playlist = await response.text();
const lines = playlist.split('\n').filter((line) => line && !line.startsWith('#'));
show('segmento relativo virou link do relay', lines[0].startsWith(base + '/?u='), lines[0].slice(0, 60));
show('segmento absoluto virou link do relay', lines[1].startsWith(base + '/?u='), lines[1].slice(0, 60));
show('URL interna codificada', decodeURIComponent(lines[0]).includes('seg001.ts'));

// 4) host fora da lista é recusado
response = await worker.fetch(new Request(base + '/?u=' + encodeURIComponent('https://exemplo-malicioso.com/x')));
show('host desconhecido bloqueado', response.status === 403, 'status ' + response.status);

// 5) API por caminho (é o que o app usa quando o host aponta para cá)
response = await worker.fetch(new Request(base + '/v2/animes/feed?page=1', {
  headers: { authorization: 'Bearer abc', 'user-agent': 'tomato-android' }
}));
show('API por caminho vai para prod-api',
  calls.at(-1).url === 'https://prod-api.tomatoanimes.com/v2/animes/feed?page=1', calls.at(-1).url);
show('resposta da API com CORS', response.headers.get('access-control-allow-origin') === '*');

response = await worker.fetch(new Request(base + '/season/2236/episodes', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer abc' },
  body: JSON.stringify({ page: 1, order: 1 })
}));
show('POST por caminho mantém o corpo', String(calls.at(-1).body).includes('"order":1'), String(calls.at(-1).body));
show('POST vai para a API', calls.at(-1).url === 'https://prod-api.tomatoanimes.com/season/2236/episodes', calls.at(-1).url);

console.log('\nchamadas ao upstream:', calls.length);
