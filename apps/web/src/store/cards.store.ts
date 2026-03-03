import { create } from 'zustand'

interface CardState {
  cards: any[]
  selectedCard: any | null
  activeCategory: string | null
  userLat: number | null
  userLng: number | null
  isLoading: boolean
  error: string | null
  setCards: (cards: any[]) => void
  addCard: (card: any) => void
  updateCard: (card: any) => void
  selectCard: (card: any | null) => void
  setCategory: (category: string | null) => void
  setUserLocation: (lat: number, lng: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useCardStore = create<CardState>((set) => ({
  cards: [],
  selectedCard: null,
  activeCategory: null,
  userLat: null,
  userLng: null,
  isLoading: false,
  error: null,

  setCards: (cards) => set({ cards }),

  addCard: (card) =>
    set((state) => ({ cards: [card, ...state.cards] })),

  updateCard: (card) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === card.id ? card : c)),
    })),

  selectCard: (selectedCard) => set({ selectedCard }),

  setCategory: (activeCategory) => set({ activeCategory }),

  setUserLocation: (userLat, userLng) => set({ userLat, userLng }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}))
