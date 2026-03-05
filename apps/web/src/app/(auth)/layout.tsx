/**
 * (auth)/layout.tsx
 * Full-screen centered layout for unauthenticated flow.
 * White card on soft gradient background — /auth, /auth/verify, /auth/setup
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-up">

        {/* ── App identity ──────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200 flex items-center justify-center text-3xl mb-4">
            🌿
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Çevre</h1>
          <p className="text-sm text-slate-500 mt-1">Yerel sosyal aktivite platformu</p>
        </div>

        {/* ── Content card ──────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-card-md border border-slate-100/80 px-6 py-7">
          {children}
        </div>

        {/* ── Footer links ──────────────────────────────────── */}
        <p className="text-center text-[11px] text-slate-400 mt-5 leading-relaxed px-2">
          Devam ederek{' '}
          <a href="#" className="text-emerald-600 hover:underline font-medium">Kullanım Koşulları</a>
          {'\'nı ve '}
          <a href="#" className="text-emerald-600 hover:underline font-medium">Gizlilik Politikası</a>
          {'\'nı kabul edersin.'}
        </p>
      </div>
    </main>
  )
}

