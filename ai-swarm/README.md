# 🤖 ÇEVRE AI SWARM - AI AGENT EKİBİ

## 🎯 **NEDİR?**

Çevre projesini geliştirmek için **8 uzman AI agent**'tan oluşan otonom ekip sistemi.

### **8 Agent:**
1. 👔 **Team Lead** - Proje yöneticisi, karar verici
2. 🏗️ **Architect** - Sistem mimarı, database tasarımcısı
3. 💻 **Backend** - Supabase + PostgreSQL geliştirici
4. 📱 **Frontend** - React Native + Next.js geliştirici
5. 🎨 **Designer** - UX/UI tasarımcısı
6. 🔧 **DevOps** - CI/CD ve deployment uzmanı
7. 🛡️ **Security** - Güvenlik denetçisi
8. ✅ **QA** - Test ve kalite güvence

## 🚀 **HIZLI BAŞLANGIÇ**

### **1. Kurulum**
```bash
# Bağımlılıkları yükle
npm install

# API key'ini ayarla
export ANTHROPIC_API_KEY='your-key-here'

# Test et
./scripts/test-api.sh
```

### **2. Tam Swarm Çalıştır**
```bash
# Tüm 8 agent sırayla çalışır
npm run swarm "Add Instagram-like Stories feature"
```

Workflow:
```
User Request
    ↓
Team Lead (Scope)
    ↓
Architect (Design)
    ↓
Backend (Implement)
    ↓
Frontend (UI)
    ↓
DevOps (Deploy)
    ↓
Security (Audit)
    ↓
QA (Test)
    ↓
Team Lead (Final Approval)
```

### **3. Tek Agent Çalıştır**
```bash
# Sadece Team Lead ile konuş
npm run agent team-lead "Analyze Stories feature"

# Sadece Architect
npm run agent architect "Design Stories architecture"
```

## 📁 **DOSYA YAPISI**

```
cevre-ai-swarm/
├── agents/                      # 8 AI Agent
│   ├── 01-team-lead/
│   │   ├── system-prompt.md    # Detaylı rol tanımı
│   │   ├── agent.config.json   # Yapılandırma
│   │   └── run.sh              # Çalıştırma scripti
│   ├── 02-architect/
│   ├── 03-backend/
│   ├── 04-frontend/
│   ├── 05-designer/
│   ├── 06-devops/
│   ├── 07-security/
│   └── 08-qa/
│
├── orchestrator/
│   └── swarm-engine.js         # Ana orkestrasyon motoru
│
├── scripts/
│   ├── setup.sh                # Kurulum
│   ├── test-api.sh             # API test
│   └── run-single-agent.js     # Tek agent runner
│
├── logs/                        # Agent çıktıları
├── shared/                      # Paylaşılan context
└── package.json
```

## 🔧 **KULLANIM ÖRNEKLERİ**

### **Örnek 1: Stories Feature Geliştirme**
```bash
npm run swarm "Add 24-hour Stories like Instagram"
```

**Çıktı:**
```
🤖 Team Lead: APPROVED - Token budget: 250k
🏗️ Architect: 5 tables, 3 RPC functions designed
💻 Backend: Migration + Queries implemented
📱 Frontend: StoriesBar + StoryViewer components
🔧 DevOps: CI/CD updated, health checks added
🛡️ Security: 2 MEDIUM risks found, fixes proposed
✅ QA: 85% coverage, p95 < 300ms ✅
👔 Team Lead: FINAL APPROVAL - Ready to merge
```

Log saved: `logs/swarm-[uuid].json`

### **Örnek 2: Sadece Mimari Analiz**
```bash
npm run agent architect "Design stories feature"
```

**Çıktı:**
```
ARCHITECTURE OUTPUT
═══════════════════════════════════
SERVICE MAP: [detaylı]
ENTITY LIST: stories, transactions, ...
PERFORMANCE TARGETS: p95 < 400ms
```

### **Örnek 3: Güvenlik Denetimi**
```bash
npm run agent security "Audit authentication system"
```

## ⚙️ **YAPILANDIRMA**

### **Environment Variables:**
```bash
# Zorunlu
export ANTHROPIC_API_KEY='sk-ant-...'

# Opsiyonel
export SWARM_MAX_TOKENS=1000000    # Token bütçesi
export SWARM_RETRY_LIMIT=3         # Hata retry limiti
export SWARM_SELF_HEALING=true     # Otomatik düzeltme
```

### **Agent Config (agent.config.json):**
```json
{
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.3,
  "max_tokens": 4000
}
```

## 📊 **SWARM LOG ÇIKTISI**

Her swarm çalıştırması JSON log oluşturur:

```json
{
  "correlationId": "uuid",
  "featureRequest": "Add Stories",
  "tokenUsage": 245000,
  "duration": 180000,
  "history": [
    {
      "agent": "team-lead",
      "phase": "SPEC",
      "output": "...",
      "tokens": 3500
    }
  ],
  "approved": true
}
```

## 🔄 **SELF-HEALING**

Swarm otomatik olarak hataları düzeltir:

```
Implementation
    ↓
Test FAILED
    ↓
Classify Error (RETRYABLE?)
    ↓ YES
Root Cause Analysis
    ↓
Auto-Fix
    ↓
Re-Test
    ↓ SUCCESS
Continue
```

Retry limit: 3 kez
Retry limit aşılırsa → Escalate to Team Lead

## 🎓 **AGENT PROMPT ÖZELLEŞTİRME**

Her agent'ın `system-prompt.md` dosyasını düzenleyerek davranışını değiştirebilirsin:

```bash
# Team Lead'in approval kriterlerini sıkılaştır
vim agents/01-team-lead/system-prompt.md

# Architect'in performans hedeflerini güncelle
vim agents/02-architect/system-prompt.md
```

## 📈 **TOKEN KULLANIMI**

| Feature Tipi | Tahmini Token |
|--------------|---------------|
| Basit (form) | 50,000 |
| Orta (stories) | 250,000 |
| Karmaşık (stories) | 500,000 |

**Maliyet:** ~$3 per 250k tokens (Claude Sonnet 4)

## 🐛 **SORUN GİDERME**

### **"API key not found"**
```bash
export ANTHROPIC_API_KEY='your-key'
echo $ANTHROPIC_API_KEY  # Verify
```

### **"Agent failed to respond"**
- Log'u kontrol et: `logs/[agent-name]-*.log`
- API rate limit aşıldı mı kontrol et
- Retry ile tekrar dene

### **"Token budget exceeded"**
- Feature'ı küçük parçalara böl
- Agent output'larını incele (gereksiz tekrar var mı?)

## 🔗 **ENTEGRASYON**

### **Cursor ile Kullanım:**
```bash
# Cursor'da terminal aç
npm run agent backend "Implement Stories feature"

# Output'u Cursor Composer'a yapıştır
```

### **CI/CD Pipeline:**
```yaml
# .github/workflows/ai-review.yml
- name: AI Architecture Review
  run: |
    npm run agent architect "Review PR changes"
```

## 📚 **DAHA FAZLA BİLGİ**

- **Agent Prompt'ları:** `agents/*/system-prompt.md`
- **Orchestrator Kodu:** `orchestrator/swarm-engine.js`
- **Protocol Tanımları:** `shared/protocols/`
- **Örnek Log'lar:** `logs/example-*.json`

## 🤝 **KATKIDA BULUNMA**

Yeni agent eklemek için:
```bash
mkdir agents/09-new-agent
cp agents/01-team-lead/system-prompt.md agents/09-new-agent/
# Prompt'u düzenle
```

## 📞 **DESTEK**

Sorun yaşarsan:
1. Log'ları kontrol et: `logs/`
2. API key'i doğrula
3. Node.js versiyonunu kontrol et (18+)

---

**ÇEVRE AI SWARM ile feature development'ı otomatize et!** 🚀

**Kurulum:** 5 dakika  
**İlk feature:** 10 dakika  
**ROI:** ∞ (zaman tasarrufu)
