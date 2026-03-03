export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-8">
      <div className="text-center max-w-2xl w-full">
        {/* Logo */}
        <div className="text-8xl mb-6">🌿</div>
        <h1 className="text-5xl font-bold text-green-700 mb-3">Çevre</h1>
        <p className="text-xl text-gray-600 mb-2">Yerel Sosyal Aktivite Platformu</p>
        <p className="text-gray-400 mb-12">
          Yakınındaki aktiviteleri keşfet, mahalleni tanı, komşunla bağlan.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <a
            href="/map"
            className="px-8 py-4 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 transition-colors text-lg shadow-lg shadow-green-200"
          >
            🗺️ Haritayı Keşfet
          </a>
          <a
            href="/auth"
            className="px-8 py-4 border-2 border-green-600 text-green-600 rounded-2xl font-semibold hover:bg-green-50 transition-colors text-lg"
          >
            👤 Giriş Yap
          </a>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-green-100">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-800 text-lg mb-1">Aktiviteler</h3>
            <p className="text-sm text-gray-500">Spor, kültür, sanat etkinlikleri — yakınında, sana özel</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-green-100">
            <div className="text-4xl mb-3">🏘️</div>
            <h3 className="font-semibold text-gray-800 text-lg mb-1">Mahalle</h3>
            <p className="text-sm text-gray-500">Komşularınla tanış, mahallene katkı sağla</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-green-100">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-semibold text-gray-800 text-lg mb-1">Beceri Takası</h3>
            <p className="text-sm text-gray-500">Bilgini paylaş, yeni şeyler öğren</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 flex gap-8 justify-center text-center">
          <div>
            <div className="text-2xl font-bold text-green-700">70+</div>
            <div className="text-sm text-gray-400">Veritabanı tablosu</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-700">17</div>
            <div className="text-sm text-gray-400">React Hook</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-700">8</div>
            <div className="text-sm text-gray-400">AI Agent</div>
          </div>
        </div>
      </div>
    </main>
  )
}
