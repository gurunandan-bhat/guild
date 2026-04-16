<template>
  <!-- Left: staging panel -->
  <aside class="admin-sidebar">
    <StagingPanel
      :build-state="buildState"
      :preview-url="previewUrl"
      @select-film="onFilmSelected"
      @re-edit="onReEdit"
      @test="onTest"
      @save="onSave"
    />
  </aside>

  <!-- Centre: review form -->
  <main class="admin-main">
    <ReviewForm
      ref="reviewForm"
      @tmdb-requested="fetchMeta"
    />
  </main>

  <!-- Right: film metadata panel -->
  <aside class="admin-meta">
    <FilmMetaPanel
      :meta="filmMeta"
      :loading="metaLoading"
      :error="metaError"
    />
  </aside>
</template>

<script>
import StagingPanel  from '@/components/StagingPanel.vue'
import ReviewForm    from '@/components/ReviewForm.vue'
import FilmMetaPanel from '@/components/FilmMetaPanel.vue'
import { useFilmsStore }   from '@/stores/films'
import { useCriticsStore } from '@/stores/critics'
import { useStagingStore } from '@/stores/staging'

const API = import.meta.env.VITE_API_BASE_URL || ''

export default {
  name: 'HomeView',
  components: { StagingPanel, ReviewForm, FilmMetaPanel },

  data() {
    return {
      // Film metadata panel
      filmMeta:    null,
      metaLoading: false,
      metaError:   null,

      // Build / deploy state
      buildState:  'idle',  // 'idle' | 'building' | 'done' | 'error'
      previewUrl:  null,
      pollTimer:   null
    }
  },

  async created() {
    // Load Pinia stores on mount — single fetch per session
    const films   = useFilmsStore()
    const critics = useCriticsStore()
    await Promise.all([films.load(), critics.load()])
  },

  unmounted() {
    clearInterval(this.pollTimer)
  },

  methods: {
    // ── Film selected from recent list ──────────────────────

    onFilmSelected(film) {
      this.$refs.reviewForm.prefillFilm(film)
      if (film.tmdbId) this.fetchMeta({ tmdbId: film.tmdbId, filmTitle: film.title, showType: 'movie' })
    },

    // ── Re-edit a staged item ───────────────────────────────

    onReEdit(item) {
      this.$refs.reviewForm.loadFromStaging(item)
      if (item.formData?.tmdbId) {
        this.fetchMeta({
          tmdbId:    item.formData.tmdbId,
          filmTitle: item.formData.filmTitle,
          showType:  item.formData.showType || 'movie'
        })
      }
    },

    // ── TMDB metadata fetch ─────────────────────────────────
    // Accepts { tmdbId, filmTitle, showType }

    async fetchMeta({ tmdbId, filmTitle, showType }) {
      if (!tmdbId) return
      this.metaLoading = true
      this.metaError   = null
      this.filmMeta    = null
      try {
        const token = await getToken()
        const res = await fetch(`${API}/meta/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tmdbId, filmTitle: filmTitle || '', showType: showType || 'movie' })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.filmMeta = await res.json()
      } catch (err) {
        this.metaError = `Could not load metadata: ${err.message}`
      } finally {
        this.metaLoading = false
      }
    },

    // ── Test: commit to preview branch ─────────────────────

    async onTest() {
      const staging = useStagingStore()
      if (staging.isEmpty) return
      this.buildState = 'building'
      this.previewUrl = null
      try {
        const token = await getToken()
        await fetch(`${API}/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reviews: staging.staged, branch: 'preview' })
        })
        this.pollBuildStatus()
      } catch (err) {
        this.buildState = 'error'
        alert(`Commit failed: ${err.message}`)
      }
    },

    // ── Poll Amplify build status ───────────────────────────

    pollBuildStatus() {
      clearInterval(this.pollTimer)
      this.pollTimer = setInterval(async () => {
        try {
          const token = await getToken()
          const res = await fetch(`${API}/build-status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const { status, url } = await res.json()
          if (status === 'SUCCEED') {
            clearInterval(this.pollTimer)
            this.buildState = 'done'
            this.previewUrl = url
            window.open(url, '_blank', 'noopener')
          } else if (status === 'FAILED') {
            clearInterval(this.pollTimer)
            this.buildState = 'error'
            alert('Preview build failed. Check Amplify console.')
          }
          // Otherwise still building — keep polling
        } catch {
          // Transient network error — keep polling
        }
      }, 15000) // every 15 seconds
    },

    // ── Save: merge preview → main ──────────────────────────

    async onSave() {
      const staging = useStagingStore()
      if (staging.isEmpty) return
      if (!confirm(`Save ${staging.count} review(s) to the live site?`)) return

      try {
        const token = await getToken()
        await fetch(`${API}/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reviews: staging.staged, branch: 'main' })
        })
        staging.clear()
        this.buildState = 'idle'
        this.previewUrl = null
        alert('Saved! The live site will rebuild shortly.')
      } catch (err) {
        alert(`Save failed: ${err.message}`)
      }
    }
  }
}

// Helper — get current Cognito JWT
async function getToken() {
  const { fetchAuthSession } = await import('aws-amplify/auth')
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() || ''
}
</script>
