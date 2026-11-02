
import worker from "./worker.js";
const calls = [];
globalThis.fetch = async (u, o) => { calls.push(String(u)); return new Response("{}", {status:200, headers:{"content-type":"application/json"}}); };
const base = "https://relay.test";
const res = await worker.fetch(new Request(base + "/v2/animes/feed?page=1", {headers:{authorization:"Bearer abc"}}));
console.log("status:", res.status);
console.log("body:", (await res.text()).slice(0,200));
console.log("calls:", calls);
