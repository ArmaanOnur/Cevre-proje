// packages/supabase/src/skill-swap-queries.ts
import type { TypedSupabaseClient } from './client'
import type { InsertDto, UpdateDto } from './database.types'

export const skillSwapQueries = {
  // ─── LİSTE ────────────────────────────────────────────────────────────────
  
  /** Açık teklifleri listele */
  getOpen: (supabase: TypedSupabaseClient, limit = 50) =>
    supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(limit),

  /** Beceri arama (offered veya wanted) */
  search: (supabase: TypedSupabaseClient, query: string, limit = 20) =>
    supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .eq('status', 'open')
      .or(`skill_offered.ilike.%${query}%,skill_wanted.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit),

  /** Kullanıcının teklifleri */
  getMySwaps: (
    supabase: TypedSupabaseClient,
    userId: string,
    status?: 'open' | 'matched' | 'completed' | 'cancelled'
  ) => {
    let query = supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        ),
        matched_user:users!matched_user_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .eq('offerer_id', userId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    return query
  },

  /** Benimle eşleşen teklifler */
  getMatchedWithMe: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .eq('matched_user_id', userId)
      .in('status', ['matched', 'completed'])
      .order('updated_at', { ascending: false }),

  // ─── DETAY ────────────────────────────────────────────────────────────────

  /** Tek teklif detayı */
  getById: (supabase: TypedSupabaseClient, swapId: string) =>
    supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        ),
        matched_user:users!matched_user_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .eq('id', swapId)
      .single(),

  // ─── OLUŞTUR & GÜNCELLE ───────────────────────────────────────────────────

  /** Yeni teklif oluştur */
  create: (
    supabase: TypedSupabaseClient,
    data: Omit<InsertDto<'skill_swaps'>, 'id' | 'created_at' | 'updated_at'>
  ) =>
    supabase
      .from('skill_swaps')
      .insert(data)
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .single(),

  /** Teklifi güncelle */
  update: (
    supabase: TypedSupabaseClient,
    swapId: string,
    data: UpdateDto<'skill_swaps'>
  ) =>
    supabase
      .from('skill_swaps')
      .update(data)
      .eq('id', swapId)
      .select()
      .single(),

  // ─── EŞLEŞME ──────────────────────────────────────────────────────────────

  /** Eşleşme öner (iki kullanıcıyı birbirine bağla) */
  match: (
    supabase: TypedSupabaseClient,
    swapId: string,
    matchedUserId: string
  ) =>
    supabase
      .from('skill_swaps')
      .update({
        status: 'matched',
        matched_user_id: matchedUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', swapId)
      .select()
      .single(),

  /** Potansiyel eşleşmeleri bul (karşılıklı ilgi) */
  findMatches: async (
    supabase: TypedSupabaseClient,
    mySwapId: string,
    myUserId: string
  ) => {
    // Önce kendi swap'imi al
    const { data: mySwap } = await supabase
      .from('skill_swaps')
      .select('skill_offered, skill_wanted')
      .eq('id', mySwapId)
      .single()

    if (!mySwap) return { data: [], error: null }

    // Karşılıklı eşleşen swap'leri bul
    const { data, error } = await supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(
          id, display_name, avatar_url, verified_at
        )
      `)
      .eq('status', 'open')
      .neq('offerer_id', myUserId)
      .ilike('skill_offered', `%${mySwap.skill_wanted}%`)
      .ilike('skill_wanted', `%${mySwap.skill_offered}%`)
      .limit(10)

    return { data, error }
  },

  // ─── DURUM DEĞİŞİKLİKLERİ ─────────────────────────────────────────────────

  /** Eşleşmeyi tamamla */
  complete: (supabase: TypedSupabaseClient, swapId: string) =>
    supabase
      .from('skill_swaps')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', swapId)
      .select()
      .single(),

  /** Teklifi iptal et */
  cancel: (supabase: TypedSupabaseClient, swapId: string) =>
    supabase
      .from('skill_swaps')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', swapId)
      .select()
      .single(),

  /** Eşleşmeyi çöz (geri open'a al) */
  unmatch: (supabase: TypedSupabaseClient, swapId: string) =>
    supabase
      .from('skill_swaps')
      .update({
        status: 'open',
        matched_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', swapId)
      .select()
      .single(),

  // ─── REALTIME ────────────────────────────────────────────────────────────

  /** Teklif değişikliklerini dinle */
  subscribe: (
    supabase: TypedSupabaseClient,
    swapId: string,
    onChange: (payload: any) => void
  ) =>
    supabase
      .channel(`skill_swap_${swapId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'skill_swaps',
        filter: `id=eq.${swapId}`,
      }, onChange)
      .subscribe(),
}
