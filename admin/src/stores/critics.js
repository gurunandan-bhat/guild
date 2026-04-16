import { defineStore } from 'pinia'

const SITE_BASE = import.meta.env.VITE_SITE_BASE_URL || 'https://www.fcgreviews.com'

export const useCriticsStore = defineStore('critics', {
  state: () => ({
    // Array of { name, slug, reviewCount }
    critics: [],
    loaded: false,
    error: null
  }),

  getters: {
    filteredCritics: (state) => (query) => {
      if (!query || query.trim() === '') return state.critics.slice(0, 20)
      const q = query.trim().toLowerCase()
      return state.critics
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 20)
    },

    criticByName: (state) => (name) => {
      const n = name.trim().toLowerCase()
      return state.critics.find((c) => c.name.toLowerCase() === n) || null
    }
  },

  actions: {
    async load() {
      if (this.loaded) return
      try {
        const res = await fetch(`${SITE_BASE}/critics/index.json`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        // data is an array from critics/taxonomy.json
        // Each entry has jsonified page data + ReviewCount
        const arr = Array.isArray(data)
          ? data.map((entry) => ({
              name: entry.Title || entry.LinkTitle || '',
              slug: entry.URLPath
                ? entry.URLPath.replace(/^\/critics\//, '').replace(/\/$/, '')
                : '',
              reviewCount: entry.ReviewCount || 0
            }))
          : []

        // Sort alphabetically by name
        arr.sort((a, b) => a.name.localeCompare(b.name))

        this.critics = arr
        this.loaded = true
      } catch (err) {
        this.error = err.message
      }
    }
  }
})
