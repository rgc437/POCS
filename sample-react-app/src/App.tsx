import { useState } from 'react';

type RequestState = {
  tone: 'idle' | 'working' | 'success' | 'error';
  message: string;
};

export default function App() {
  const [state, setState] = useState<RequestState>({
    tone: 'idle',
    message: 'Ready to test the cookie flow.',
  });
  const [hasCookie, setHasCookie] = useState<boolean | null>(null);

  async function callApi(method: 'GET' | 'POST' | 'DELETE') {
    setState({ tone: 'working', message: 'Contacting the Node API…' });

    try {
      const response = await fetch('/api/cookie', {
        method,
        credentials: 'include',
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || 'The request failed.');
      }

      if (method === 'GET') {
        setHasCookie(body.hasSessionCookie);
        setState({
          tone: 'success',
          message: body.hasSessionCookie
            ? 'The API received the session cookie.'
            : 'No valid session cookie was received.',
        });
      } else if (method === 'POST') {
        setHasCookie(true);
        setState({ tone: 'success', message: body.message });
      } else {
        setHasCookie(false);
        setState({ tone: 'success', message: body.message });
      }
    } catch (error) {
      setState({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not connect to the Node API.',
      });
    }
  }

  async function callProtectedApi() {
    setState({ tone: 'working', message: 'Calling the protected API…' });

    try {
      const response = await fetch('/api/protected', {
        credentials: 'include',
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || 'The protected request failed.');
      }

      setState({ tone: 'success', message: body.message });
    } catch (error) {
      setState({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not call the protected API.',
      });
    }
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-7 sm:p-12 lg:p-14">
            <div className="mb-10 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-200">C</span>
              <div>
                <p className="font-semibold text-slate-900">Cookie Lab</p>
                <p className="text-sm text-slate-500">Vite + React + Node.js</p>
              </div>
            </div>

            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Browser security demo</p>
            <h1 className="max-w-xl text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-6xl">Test an HTTP-only cookie and a protected API.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">The Node API creates the cookie. Vite&apos;s local proxy adds the combined authorization header without exposing the token to React code.</p>

            <div className="mt-10 flex flex-wrap gap-3">
              <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60" disabled={state.tone === 'working'} onClick={() => callApi('POST')}>Set cookie</button>
              <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60" disabled={state.tone === 'working'} onClick={() => callApi('GET')}>Check cookie</button>
              <button className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-60" disabled={state.tone === 'working'} onClick={callProtectedApi}>Call protected API</button>
              <button className="rounded-xl px-5 py-3 font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-wait disabled:opacity-60" disabled={state.tone === 'working'} onClick={() => callApi('DELETE')}>Clear cookie</button>
            </div>
          </div>

          <aside className="flex flex-col justify-between bg-slate-950 p-7 text-white sm:p-12 lg:p-14">
            <div>
              <p className="text-sm font-medium text-slate-400">Current browser status</p>
              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className={`h-3 w-3 rounded-full ${hasCookie === true ? 'bg-emerald-400 shadow-[0_0_18px_#34d399]' : hasCookie === false ? 'bg-amber-400' : 'bg-slate-500'}`} />
                <div>
                  <p className="font-semibold">{hasCookie === true ? 'Cookie detected' : hasCookie === false ? 'No cookie detected' : 'Not checked yet'}</p>
                  <p className="mt-1 text-sm text-slate-400">sample_session · HttpOnly</p>
                </div>
              </div>

              <div aria-live="polite" className={`mt-5 rounded-2xl border p-5 text-sm leading-6 ${state.tone === 'error' ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>{state.message}</div>
            </div>

            <div className="mt-14 border-t border-white/10 pt-8">
              <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Local API proxy</p>
              <p className="mt-3 break-all font-mono text-sm text-indigo-300">/api → localhost:3000</p>
              <p className="mt-6 text-sm leading-6 text-slate-400">The proxy reads the HTTP-only cookie and sends <span className="font-mono text-slate-300">Authorization: Basic &lt;id&gt;, Bearer &lt;token&gt;</span>. Browser JavaScript never receives the token.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
