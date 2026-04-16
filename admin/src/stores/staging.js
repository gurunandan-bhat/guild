import { defineStore } from 'pinia'

export const useStagingStore = defineStore('staging', {
  state: () => ({
    // Array of review objects ready to commit
    // Each item: { id, filmTitle, criticName, mediaType, formData, isEdit, existingSlug }
    staged: [],

    // Index of the item currently loaded into the form for editing (-1 = none)
    activeIndex: -1
  }),

  getters: {
    count: (state) => state.staged.length,
    isEmpty: (state) => state.staged.length === 0,
    activeItem: (state) =>
      state.activeIndex >= 0 ? state.staged[state.activeIndex] : null
  },

  actions: {
    // Add a new review to the staging list
    stage(reviewData) {
      const id = Date.now().toString()
      this.staged.push({ id, ...reviewData })
    },

    // Update an existing staged item (e.g. after re-editing)
    update(id, reviewData) {
      const idx = this.staged.findIndex((s) => s.id === id)
      if (idx !== -1) {
        this.staged[idx] = { id, ...reviewData }
      }
    },

    // Remove an item from the staging list
    remove(id) {
      this.staged = this.staged.filter((s) => s.id !== id)
      if (this.activeIndex >= this.staged.length) {
        this.activeIndex = -1
      }
    },

    // Load a staged item into the form for re-editing
    setActive(id) {
      const idx = this.staged.findIndex((s) => s.id === id)
      this.activeIndex = idx
    },

    clearActive() {
      this.activeIndex = -1
    },

    // Clear all staged items after a successful Save
    clear() {
      this.staged = []
      this.activeIndex = -1
    }
  },

  // Persist staging list to localStorage so it survives accidental tab closes
  persist: true
})
