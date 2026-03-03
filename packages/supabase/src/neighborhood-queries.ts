// packages/supabase/src/neighborhood-queries.ts
import type { TypedSupabaseClient } from './client'
import type { InsertDto, UpdateDto } from './database.types'

export const neighborhoodQueries = {
  // ─── LİSTE ────────────────────────────────────────────────────────────────
  
  /** Tüm mahalleleri listele (şehir/ilçe filtreli) */
  getAll: (
    supabase: TypedSupabaseClient,
    filters?: { city?: string; district?: string }
  ) => {
    let query = supabase
      .from('neighborhoods')
      .select('*')
      .order('member_count', { ascending: false })

    if (filters?.city) query = query.eq('city', filters.city)
    if (filters?.district) query = query.eq('district', filters.district)

    return query
  },

  /** Popüler mahalleler (en çok üye) */
  getPopular: (supabase: TypedSupabaseClient, limit = 10) =>
    supabase
      .from('neighborhoods')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(limit),

  // ─── DETAY ────────────────────────────────────────────────────────────────

  /** Tek mahalle detayı (üyeler dahil) */
  getById: (supabase: TypedSupabaseClient, neighborhoodId: string) =>
    supabase
      .from('neighborhoods')
      .select(`
        *,
        neighborhood_members(
          user_id, role, joined_at,
          user:users!user_id(
            id, display_name, avatar_url, verified_at
          )
        )
      `)
      .eq('id', neighborhoodId)
      .single(),

  /** Mahallenin son aktiviteleri */
  getRecentCards: (
    supabase: TypedSupabaseClient,
    city: string,
    district: string,
    limit = 20
  ) =>
    supabase
      .from('activity_cards')
      .select(`
        *,
        creator:users!creator_id(id, display_name, avatar_url)
      `)
      .eq('status', 'active')
      .ilike('location_name', `%${district}%`)
      .order('created_at', { ascending: false })
      .limit(limit),

  // ─── ÜYELİK ───────────────────────────────────────────────────────────────

  /** Kullanıcının mahalle üyeliğini kontrol et */
  checkMembership: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    userId: string
  ) =>
    supabase
      .from('neighborhood_members')
      .select('role')
      .eq('neighborhood_id', neighborhoodId)
      .eq('user_id', userId)
      .maybeSingle(),

  /** Kullanıcının tüm mahalle üyelikleri */
  getMyNeighborhoods: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('neighborhood_members')
      .select(`
        role, joined_at,
        neighborhood:neighborhoods(*)
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false }),

  /** Mahalleye katıl */
  join: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    userId: string
  ) =>
    supabase
      .from('neighborhood_members')
      .insert({
        neighborhood_id: neighborhoodId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single(),

  /** Mahalleden ayrıl */
  leave: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    userId: string
  ) =>
    supabase
      .from('neighborhood_members')
      .delete()
      .eq('neighborhood_id', neighborhoodId)
      .eq('user_id', userId),

  // ─── YÖNETİM (Admin/Moderator) ──────────────────────────────────────────

  /** Üyenin rolünü değiştir (sadece admin) */
  updateMemberRole: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    userId: string,
    newRole: 'member' | 'moderator' | 'admin'
  ) =>
    supabase
      .from('neighborhood_members')
      .update({ role: newRole })
      .eq('neighborhood_id', neighborhoodId)
      .eq('user_id', userId)
      .select()
      .single(),

  /** Üyeyi çıkar (sadece admin/moderator) */
  removeMember: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    userId: string
  ) =>
    supabase
      .from('neighborhood_members')
      .delete()
      .eq('neighborhood_id', neighborhoodId)
      .eq('user_id', userId),

  /** Mahalle bilgilerini güncelle (sadece admin) */
  update: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    data: UpdateDto<'neighborhoods'>
  ) =>
    supabase
      .from('neighborhoods')
      .update(data)
      .eq('id', neighborhoodId)
      .select()
      .single(),

  /** Yeni mahalle oluştur (sistem yöneticisi için) */
  create: (
    supabase: TypedSupabaseClient,
    data: InsertDto<'neighborhoods'>
  ) =>
    supabase
      .from('neighborhoods')
      .insert(data)
      .select()
      .single(),

  // ─── REALTIME ────────────────────────────────────────────────────────────

  /** Mahalle değişikliklerini dinle */
  subscribe: (
    supabase: TypedSupabaseClient,
    neighborhoodId: string,
    onNeighborhoodChange: (payload: any) => void,
    onMemberChange: (payload: any) => void
  ) =>
    supabase
      .channel(`neighborhood_${neighborhoodId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'neighborhoods',
        filter: `id=eq.${neighborhoodId}`,
      }, onNeighborhoodChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'neighborhood_members',
        filter: `neighborhood_id=eq.${neighborhoodId}`,
      }, onMemberChange)
      .subscribe(),
}
