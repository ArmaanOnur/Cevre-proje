// packages/shared/src/skill-swap.ts

import type { SkillSwap, User, SkillSwapStatus } from '@cevre/supabase'

// Beceri takası detay verisi (kullanıcılar dahil)
export interface SkillSwapDetailData extends SkillSwap {
  offerer: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'verified_at'>
  matched_user?: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'verified_at'> | null
}

// Popüler beceri kategorileri
export const SKILL_CATEGORIES = [
  { id: 'language', label: 'Dil', emoji: '🗣️', examples: ['İngilizce', 'Almanca', 'İspanyolca'] },
  { id: 'music', label: 'Müzik', emoji: '🎵', examples: ['Gitar', 'Piyano', 'Vokal'] },
  { id: 'sports', label: 'Spor', emoji: '⚽', examples: ['Yoga', 'Tenis', 'Yüzme'] },
  { id: 'art', label: 'Sanat', emoji: '🎨', examples: ['Resim', 'Fotoğrafçılık', 'İllüstrasyon'] },
  { id: 'tech', label: 'Teknoloji', emoji: '💻', examples: ['Kodlama', 'Tasarım', 'Video Edit'] },
  { id: 'cooking', label: 'Yemek', emoji: '🍳', examples: ['Pastacılık', 'Dünya Mutfakları', 'Vegan'] },
  { id: 'craft', label: 'El İşi', emoji: '🧶', examples: ['Örgü', 'Seramik', 'Ahşap'] },
  { id: 'business', label: 'İş', emoji: '💼', examples: ['Sunum', 'Pazarlama', 'Finans'] },
  { id: 'wellness', label: 'Sağlık', emoji: '🧘', examples: ['Meditasyon', 'Beslenme', 'Masaj'] },
  { id: 'other', label: 'Diğer', emoji: '✨', examples: ['Bahçecilik', 'Dans', 'Yazarlık'] },
] as const

// Popüler beceri örnekleri (arama için)
export const POPULAR_SKILLS = [
  'İngilizce', 'Gitar', 'Yoga', 'Kodlama', 'Photoshop',
  'Yemek Pişirme', 'Fotoğrafçılık', 'Resim', 'İspanyolca', 'Piyano',
  'Video Editing', 'UI/UX Tasarım', 'Muhasebe', 'Yazarlık', 'Dans',
]

// Durum etiketleri
export function getSkillSwapStatusLabel(status: SkillSwapStatus): {
  label: string
  color: string
  emoji: string
  description: string
} {
  const map: Record<SkillSwapStatus, { label: string; color: string; emoji: string; description: string }> = {
    open: {
      label: 'Açık',
      color: '#3B82F6',
      emoji: '🔍',
      description: 'Eşleşme bekleniyor',
    },
    matched: {
      label: 'Eşleşti',
      color: '#F59E0B',
      emoji: '🤝',
      description: 'İki taraf da kabul etti',
    },
    completed: {
      label: 'Tamamlandı',
      color: '#10B981',
      emoji: '✅',
      description: 'Başarıyla tamamlandı',
    },
    cancelled: {
      label: 'İptal',
      color: '#6B7280',
      emoji: '❌',
      description: 'İptal edildi',
    },
  }
  return map[status]
}

// Beceri kategorisini bul
export function findSkillCategory(skill: string): typeof SKILL_CATEGORIES[number] | null {
  const normalized = skill.toLowerCase().trim()
  
  for (const cat of SKILL_CATEGORIES) {
    if (cat.examples.some(ex => ex.toLowerCase().includes(normalized) || normalized.includes(ex.toLowerCase()))) {
      return cat
    }
  }
  
  return SKILL_CATEGORIES.find(c => c.id === 'other') ?? null
}

// İki beceri karşılıklı eşleşiyor mu?
export function isMatchingPair(
  swap1: Pick<SkillSwap, 'skill_offered' | 'skill_wanted'>,
  swap2: Pick<SkillSwap, 'skill_offered' | 'skill_wanted'>
): boolean {
  const s1Offer = swap1.skill_offered.toLowerCase().trim()
  const s1Want = swap1.skill_wanted.toLowerCase().trim()
  const s2Offer = swap2.skill_offered.toLowerCase().trim()
  const s2Want = swap2.skill_wanted.toLowerCase().trim()
  
  // Karşılıklı tam eşleşme veya yakın eşleşme
  return (
    (s1Offer.includes(s2Want) || s2Want.includes(s1Offer)) &&
    (s1Want.includes(s2Offer) || s2Offer.includes(s1Want))
  )
}

// Beceri formatla (büyük harf)
export function formatSkill(skill: string): string {
  return skill
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
