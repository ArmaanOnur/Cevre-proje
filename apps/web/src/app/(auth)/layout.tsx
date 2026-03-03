/**
 * (auth)/layout.tsx
 * Centered, no-nav layout for unauthenticated flow.
 * White card on gradient background — works for /auth, /auth/verify, /auth/setup
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + app name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-white text-3xl mb-3 shadow-lg">
            🌿
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Çevre</h1>
          <p className="text-sm text-gray-500 mt-1">Yerel sosyal aktivite platformu</p>
        </div>

        {/* Page content card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {children}
        </div>
      </div>
    </main>
  )
}
