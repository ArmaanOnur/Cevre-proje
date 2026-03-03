# 🚀 ÇEVRE - QUICK START GUIDE

## ⚡ 10 DAKİKADA BAŞLA

### **1. KURULUM (3 dakika)**

```bash
# Projeyi aç
cd cevre-full-with-swarm

# Tüm bağımlılıkları yükle
npm install --workspaces

# AI Swarm'ı hazırla
npm run swarm:setup
```

### **2. API KEYS (2 dakika)**

#### **Supabase:**
```bash
# 1. https://supabase.com → Sign up
# 2. Create New Project
# 3. Copy URL & anon key

# apps/web/.env.local
cp apps/web/.env.example apps/web/.env.local
# Supabase bilgilerini ekle
```

#### **Anthropic (AI Swarm için):**
```bash
# 1. https://console.anthropic.com → Sign up
# 2. API Keys → Create Key
# 3. Copy key

# Terminal'de
export ANTHROPIC_API_KEY='sk-ant-...'
```

#### **Mapbox (Opsiyonel):**
```bash
# https://mapbox.com → Access tokens
# .env.local'e NEXT_PUBLIC_MAPBOX_TOKEN ekle
```

### **3. DATABASE SETUP (3 dakika)**

```bash
# Supabase Dashboard → SQL Editor

# PostGIS aktif et
CREATE EXTENSION IF NOT EXISTS postgis;

# Migration'ları çalıştır (sırayla 001→015)
# packages/supabase/migrations/ klasöründen
```

**Hızlı yol:** Tüm migration'ları birleştir:
```bash
cat packages/supabase/migrations/*.sql > all-migrations.sql
# Supabase SQL Editor'e yapıştır ve çalıştır
```

### **4. BAŞLAT! (1 dakika)**

```bash
# Web app
npm run web
# → http://localhost:3000

# Mobile app (yeni terminal)
npm run mobile
# → QR ile Expo Go'da aç
```

---

## 🤖 AI SWARM İLE İLK FEATURE

### **Örnek: Stories Ekle**

```bash
# Tam otomatik (8 agent çalışır)
npm run swarm "Add Instagram-like 24-hour Stories feature"
```

**Ne olur:**
1. Team Lead: Scope analizi (2 dk)
2. Architect: Database tasarımı (5 dk)
3. Backend: Migration + Queries (10 dk)
4. Frontend: Components + Hooks (10 dk)
5. Designer: Wireframes (3 dk)
6. DevOps: CI/CD setup (3 dk)
7. Security: Audit (3 dk)
8. QA: Tests (5 dk)

**Toplam:** ~40 dakika  
**Çıktı:** Hazır kod + test + dokümantasyon

### **Manuel Review:**

```bash
# Log'u kontrol et
cat ai-swarm/logs/swarm-[latest].json

# Dosyaları review et
# AI'lar oluşturulan dosyaları ai-swarm/output/ altına koyar

# Beğendiysen kopyala:
cp ai-swarm/output/* packages/supabase/migrations/
cp ai-swarm/output/* apps/web/src/
```

---

## 🎯 İLK ADIMLAR

### **1. Projeyi Keşfet**

```bash
# Klasör yapısı
ls -la

# Web app'i aç
cd apps/web/src
```

### **2. Basit Değişiklik Yap**

```typescript
// apps/web/src/app/page.tsx
export default function Home() {
  return (
    <div>
      <h1>Çevre - Merhaba! 👋</h1>
    </div>
  )
}
```

**Kaydet → Tarayıcı otomatik yenilenir ⚡**

### **3. AI Agent'a Sor**

```bash
# Proje hakkında bilgi al
npm run agent team-lead "Explain project structure"

# Mimari tavsiye
npm run agent architect "How to add real-time notifications?"

# Güvenlik kontrolü
npm run agent security "Check authentication security"
```

---

## 📚 DOKÜMANTASYON

```
cevre-full-with-swarm/
├── README.md                    # Genel bakış
├── QUICK_START.md              # Bu dosya
├── PROJECT_STRUCTURE.md         # Detaylı yapı
│
├── apps/web/
│   └── README.md               # Web app dokümantasyonu
│
├── apps/mobile/
│   └── README.md               # Mobile app dokümantasyonu
│
├── packages/supabase/migrations/
│   └── *.sql                   # Database şemaları
│
└── ai-swarm/
    ├── README.md               # AI Swarm rehberi
    └── agents/*/system-prompt.md  # Agent detayları
```

---

## 🐛 SORUN GİDERME

### **"npm install" hatası:**
```bash
node --version  # 18+ olmalı
npm cache clean --force
rm -rf node_modules
npm install --workspaces
```

### **Web app başlamıyor:**
```bash
# .env.local var mı?
cat apps/web/.env.local

# Port 3000 kullanımda mı?
lsof -i :3000
kill -9 [PID]
```

### **AI Swarm çalışmıyor:**
```bash
# API key kontrolü
echo $ANTHROPIC_API_KEY

# Yeniden setup
cd ai-swarm
npm install
```

### **Migration hatası:**
```bash
# PostGIS aktif mi?
# Supabase SQL Editor:
SELECT PostGIS_Version();

# Migration sırası doğru mu?
# 001 → 002 → 003 → ... → 015
```

---

## 💡 PRO TİPLER

### **1. Cursor ile Geliştirme**
```bash
# AI agent output'unu Cursor'a gönder
npm run agent backend "Create Stories queries" > stories.ts
# Cursor'da aç ve implement et
```

### **2. Hızlı Test**
```bash
# Type check
npm run type-check

# Lint
npm run lint
```

### **3. Hot Reload**
- Web: Dosya değiştir → Otomatik yenilenir
- Mobile: Expo Go'da Shake → Reload

### **4. Debug**
```bash
# Web
# Chrome DevTools → Sources

# Mobile
# Expo Go → Shake → Debug Remote JS
```

---

## 🎉 SONRAKI ADIMLAR

1. ✅ Projeyi çalıştır
2. ✅ UI'ı keşfet
3. ✅ AI Swarm ile feature ekle
4. ✅ Kendi feature'ını yaz
5. ✅ Production'a çık

---

**Hazırsın!** Şimdi git ve harika bir platform inşa et! 🚀

**AI Swarm ile 10x daha hızlı geliştir!** 🤖✨
