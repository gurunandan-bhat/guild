import { defineStore } from 'pinia'

const SITE_BASE = import.meta.env.VITE_SITE_BASE_URL ?? 'https://www.fcgreviews.com'

export const useFilmsStore = defineStore('films', {
  state: () => ({
    // Flat array of { title, slug, tmdbId, posterPath, lastReviewDate }
    // Transformed from /mreviews/index.json on app startup
    films: [],
    loaded: false,
    error: null
  }),

  getters: {
    // Returns films filtered by a query string (case-insensitive substring match)
    filteredFilms: (state) => (query) => {
      if (!query || query.trim() === '') return state.films.slice(0, 20)
      const q = query.trim().toLowerCase()
      return state.films
        .filter((f) => f.title.toLowerCase().includes(q))
        .slice(0, 20)
    },

    // Look up a single film by exact title (case-insensitive)
    filmByTitle: (state) => (title) => {
      const t = title.trim().toLowerCase()
      return state.films.find((f) => f.title.toLowerCase() === t) || null
    },

    // Most recently reviewed films for the sidebar
    recentFilms: (state) => {
      return state.films.slice(0, 15)
    }
  },

  actions: {
    async load() {
      if (this.loaded) return
      try {
        const res = await fetch(`${SITE_BASE}/mreviews/index.json`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        // data is a map keyed by md5 hash — transform to sorted array
        // Each entry shape (from taxonomy.json template):
        // { LinkTitle, URLPath, AverageScore, LocalPosterPath, ... }
        const arr = Object.values(data).map((entry) => ({
          title: entry.LinkTitle,
          slug: entry.URLPath ? entry.URLPath.replace(/^\/mreviews\//, '').replace(/\/$/, '') : '',
          posterPath: entry.LocalPosterPath || null,
          averageScore: entry.AverageScore || null,
          lastReviewDate: entry.Date || null
        }))

        // Sort by last review date descending (most recent first)
        arr.sort((a, b) => {
          if (!a.lastReviewDate) return 1
          if (!b.lastReviewDate) return -1
          return new Date(b.lastReviewDate) - new Date(a.lastReviewDate)
        })

        this.films = arr
        this.loaded = true
      } catch (err) {
        this.error = err.message
      }
    },

    // Optimistically add a new film after a successful commit
    addFilm(film) {
      this.films.unshift(film)
    }
  }
})
