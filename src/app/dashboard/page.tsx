'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { generateSigningKey, signTaskPayload } from '@/utils/crypto2035';

type Capability = { id: string; method: string; path: string; status: string };
type Inventory = {
  edition: string;
  environment: string;
  capabilities: Capability[];
  foundations: Record<string, { status: string }>;
};
type RequestLog = { id: string; at: string; status: number | null; response: unknown };

export default function SovereignDashboard() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [inventoryError, setInventoryError] = useState('');
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [identity, setIdentity] = useState('');
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const keys = useRef<CryptoKeyPair | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function discover() {
      try {
        const response = await fetch('/api/capabilities', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`Discovery returned HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.capabilities) || !data.foundations || typeof data.foundations !== 'object') {
          throw new Error('Invalid capability inventory');
        }
        setInventory(data as Inventory);
      } catch (error) {
        if (!controller.signal.aborted) setInventoryError(error instanceof Error ? error.message : 'Discovery failed');
      }
    }
    void discover();
    return () => controller.abort();
  }, []);

  async function sendSignedRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    setRequestError('');
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setRequestError('Enter latitude from -90 to 90 and longitude from -180 to 180.');
      return;
    }
    sending.current = true;
    setBusy(true);
    const id = crypto.randomUUID();
    try {
      keys.current ??= await generateSigningKey();
      const envelope = await signTaskPayload({
        jsonrpc: '2.0', method: 'generate_risk_matrix',
        params: { target_coordinates: { lat, lng } }, id,
      }, keys.current, window.location.origin);
      setIdentity(envelope.identity);
      const response = await fetch('/api/swarm/execute2035', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope), signal: AbortSignal.timeout(15000),
      });
      const result: unknown = await response.json();
      setLogs(previous => [{ id, at: new Date().toISOString(), status: response.status, response: result }, ...previous].slice(0, 20));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setRequestError(message);
      setLogs(previous => [{ id, at: new Date().toISOString(), status: null, response: { error: message } }, ...previous].slice(0, 20));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const card = 'rounded-2xl border border-slate-800 bg-slate-900/70 p-6';
  const input = 'mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400';

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-800 pb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">AgentSwarm.in / 2a Edition</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sovereign control plane</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Inspect agent-facing capabilities and send a signed gateway request. This foundation does not execute proof-backed tasks or transfer funds.</p>
          </div>
          <a href="/api/capabilities" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-400">View capability JSON</a>
        </header>

        <section aria-label="Runtime status" className="grid gap-4 sm:grid-cols-3">
          {[
            ['Execution', 'Blocked', 'A real STARK verifier is not connected.'],
            ['Wallets', 'Not connected', 'No stablecoins move through this dashboard.'],
            ['Identity', 'Software signing', 'Session key; no hardware attestation.'],
          ].map(([title, status, detail]) => (
            <div key={title} className={card}>
              <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
              <p className="mt-3 text-xl font-semibold text-amber-300">{status}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className={card} aria-labelledby="gateway-title">
            <h2 id="gateway-title" className="text-lg font-semibold">Signed request playground</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Creates a browser session Ed25519 key and signs the payload, origin, route, nonce, and expiry. The configured gateway returns HTTP 501 until proof verification is available; an unconfigured gateway returns 503.</p>
            <form onSubmit={sendSignedRequest} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-300">Latitude
                  <input className={input} type="number" min="-90" max="90" step="any" required value={latitude} onChange={e => setLatitude(e.target.value)} />
                </label>
                <label className="text-sm text-slate-300">Longitude
                  <input className={input} type="number" min="-180" max="180" step="any" required value={longitude} onChange={e => setLongitude(e.target.value)} />
                </label>
              </div>
              <button type="submit" disabled={busy} className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-50">{busy ? 'Signing and sending…' : 'Send signed request'}</button>
              {requestError && <p role="alert" className="text-sm text-rose-300">{requestError}</p>}
              {identity && <div className="rounded-lg bg-slate-950 p-3"><p className="text-xs text-slate-400">Session public key (base64)</p><code className="mt-2 block break-all text-xs text-cyan-300">{identity}</code></div>}
            </form>
          </section>

          <section className={card} aria-labelledby="response-title">
            <h2 id="response-title" className="text-lg font-semibold">Gateway responses</h2>
            <p className="mt-2 text-sm text-slate-400">Local request history, limited to 20 entries. These are not durable task events or execution commits.</p>
            <div aria-live="polite" aria-busy={busy} className="mt-5 max-h-[32rem] space-y-4 overflow-auto">
              {logs.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-5 text-sm text-slate-400">No requests sent in this session.</p>}
              {logs.map(log => <article key={log.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400"><time dateTime={log.at}>{log.at}</time><span className="font-bold text-amber-300">{log.status === null ? 'Transport error' : `HTTP ${log.status}`}</span></div>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-300">{JSON.stringify(log.response, null, 2)}</pre>
              </article>)}
            </div>
          </section>
        </div>

        <section className={card} aria-labelledby="capabilities-title">
          <h2 id="capabilities-title" className="text-lg font-semibold">Machine-readable service inventory</h2>
          {inventoryError && <p role="alert" className="mt-3 text-sm text-rose-300">{inventoryError}</p>}
          {!inventory && !inventoryError && <p role="status" className="mt-3 text-sm text-slate-400">Loading capabilities…</p>}
          {inventory && <>
            <p className="mt-2 text-sm text-slate-400">{inventory.edition} · {inventory.environment}</p>
            <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm">
              <caption className="sr-only">Available API routes and their implementation status</caption>
              <thead className="border-b border-slate-700 text-slate-400"><tr><th scope="col" className="py-3 pr-4">Capability</th><th scope="col" className="py-3 pr-4">Endpoint</th><th scope="col" className="py-3">Status</th></tr></thead>
              <tbody>{inventory.capabilities.map(cap => <tr key={cap.id} className="border-b border-slate-800"><th scope="row" className="py-3 pr-4 font-medium">{cap.id}</th><td className="py-3 pr-4 font-mono text-xs text-slate-400">{cap.method} {cap.path}</td><td className="py-3 text-amber-300">{cap.status}</td></tr>)}</tbody>
            </table></div>
            <h3 className="mt-6 text-sm font-semibold">Peer infrastructure</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(inventory.foundations).map(([name, foundation]) => <div key={name} className="rounded-lg bg-slate-950 p-3"><dt className="text-xs text-slate-400">{name.replaceAll('_', ' ')}</dt><dd className="mt-2 text-sm text-amber-300">{foundation.status}</dd></div>)}</dl>
          </>}
        </section>
        <footer className="text-xs leading-6 text-slate-500">The existing demo remains at <a href="/" className="text-cyan-400 underline">/</a>. No client-side approval bypass, fabricated receipt, or simulated settlement is added here.</footer>
      </div>
    </main>
  );
}
