<template>
  <!-- Left: actions + build state -->
  <aside class="admin-sidebar">
    <div class="p-3">
      <h6 class="text-uppercase text-muted small fw-bold mb-3">Actions</h6>

      <div v-if="loadError" class="alert alert-danger py-2 small mb-3">{{ loadError }}</div>

      <div class="d-grid gap-2">
        <button
          class="btn btn-outline-primary btn-sm"
          :disabled="!isDirty || buildState === 'building'"
          @click="onTest"
        >
          <span v-if="buildState === 'building'" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-eye me-1"></i>
          {{ buildState === 'building' ? 'Building…' : 'Test on Preview' }}
        </button>

        <button
          class="btn btn-success btn-sm"
          :disabled="!isDirty || buildState === 'building'"
          @click="onSave"
        >
          <i class="bi bi-cloud-upload me-1"></i>Save to Live Site
        </button>

        <button
          class="btn btn-link btn-sm text-secondary"
          :disabled="!isDirty"
          @click="discardChanges"
        >
          Discard changes
        </button>
      </div>

      <div v-if="buildState === 'done' && previewUrl" class="mt-3">
        <a :href="previewUrl" target="_blank" rel="noopener" class="btn btn-outline-success btn-sm w-100">
          <i class="bi bi-box-arrow-up-right me-1"></i>Open Preview
        </a>
      </div>
      <div v-if="buildState === 'error'" class="alert alert-danger py-2 small mt-3">
        Build failed — check Amplify console.
      </div>
    </div>
  </aside>

  <!-- Main: add form + scores table -->
  <main class="admin-main">
    <h4 class="mb-4">Free Scores</h4>

    <div v-if="loading" class="text-muted">Loading…</div>

    <template v-else>
      <!-- ── Add new score ─────────────────────────────────── -->
      <div class="card mb-4">
        <div class="card-header fw-semibold">Add Score</div>
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <label class="form-label">Film</label>
              <ComboBox
                v-model="newEntry.filmTitle"
                :options-fn="filmOptions"
                placeholder="Film title…"
                :invalid="newV.filmTitle"
                @select="(v) => { newEntry.filmTitle = v; newV.filmTitle = false }"
              />
              <div v-if="newV.filmTitle" class="text-danger small mt-1">{{ newV.filmTitleMsg }}</div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Critic</label>
              <ComboBox
                v-model="newEntry.criticName"
                :options-fn="criticOptions"
                placeholder="Critic name…"
                :invalid="newV.criticName"
                @select="(v) => { newEntry.criticName = v; newV.criticName = false }"
              />
              <div v-if="newV.criticName" class="text-danger small mt-1">{{ newV.criticNameMsg }}</div>
            </div>
            <div class="col-md-2">
              <label class="form-label">Score</label>
              <input
                type="number"
                class="form-control"
                :class="{ 'is-invalid': newV.score }"
                step="0.1"
                min="0.1"
                max="10.0"
                placeholder="e.g. 7.5"
                v-model="newEntry.score"
              />
              <div class="invalid-feedback">One decimal (e.g. 7.5)</div>
            </div>
            <div class="col-md-2">
              <button
                class="btn btn-primary w-100"
                :disabled="adding"
                @click="addScore"
              >
                <span v-if="adding" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-plus-lg me-1"></i>Add
              </button>
            </div>
          </div>
          <div v-if="addError" class="alert alert-danger py-2 small mt-2">{{ addError }}</div>
        </div>
      </div>

      <!-- ── Current scores table ──────────────────────────── -->
      <div v-if="Object.keys(scores).length === 0" class="text-muted">
        No free scores yet.
      </div>

      <div v-else>
        <div
          v-for="(critics, film) in sortedScores"
          :key="film"
          class="card mb-3"
        >
          <div class="card-header d-flex align-items-center justify-content-between">
            <span class="fw-semibold">{{ film }}</span>
            <button
              class="btn btn-link btn-sm text-danger p-0"
              title="Remove all scores for this film"
              @click="removeFilm(film)"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <ul class="list-group list-group-flush">
            <li
              v-for="(score, critic) in critics"
              :key="critic"
              class="list-group-item d-flex align-items-center justify-content-between py-2"
            >
              <span>{{ critic }}</span>
              <div class="d-flex align-items-center gap-3">
                <input
                  type="number"
                  class="form-control form-control-sm score-input"
                  step="0.1"
                  min="0.1"
                  max="10.0"
                  :value="score"
                  @change="(e) => updateScore(film, critic, e.target.value)"
                />
                <button
                  class="btn btn-link btn-sm text-danger p-0"
                  @click="removeScore(film, critic)"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </main>

  <aside class="admin-meta"></aside>
</template>

<script>
import ComboBox from '@/components/ComboBox.vue'
import { useFilmsStore }   from '@/stores/films'
import { useCriticsStore } from '@/stores/critics'

const API       = import.meta.env.VITE_API_BASE_URL  || ''
const SITE_BASE = import.meta.env.VITE_SITE_BASE_URL ?? 'https://www.fcgreviews.com'

const EMPTY_ENTRY = () => ({ filmTitle: '', criticName: '', score: '' })

export default {
  name: 'FreeScoresView',
  components: { ComboBox },

  data() {
    return {
      // Loaded scores — deep copy kept as `original` for discard
      scores:   {},
      original: {},
      loading:  true,
      loadError: null,

      // Add-new-score form
      newEntry: EMPTY_ENTRY(),
      newV: { filmTitle: false, filmTitleMsg: '', criticName: false, criticNameMsg: '', score: false },
      addError: null,
      adding: false,

      // Build / deploy state (mirrors HomeView)
      buildState: 'idle',  // 'idle' | 'building' | 'done' | 'error'
      previewUrl: null,
      pollTimer:  null
    }
  },

  computed: {
    isDirty() {
      return JSON.stringify(this.scores) !== JSON.stringify(this.original)
    },
    sortedScores() {
      return Object.fromEntries(
        Object.entries(this.scores).sort(([a], [b]) => a.localeCompare(b))
      )
    }
  },

  async created() {
    const films   = useFilmsStore()
    const critics = useCriticsStore()
    await Promise.all([films.load(), critics.load()])
    await this.loadScores()
  },

  unmounted() {
    clearInterval(this.pollTimer)
  },

  methods: {
    // ── Load ────────────────────────────────────────────────

    async loadScores() {
      this.loading   = true
      this.loadError = null
      try {
        const token = await getToken()
        const res = await fetch(`${API}/freescores`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        this.scores   = data
        this.original = JSON.parse(JSON.stringify(data))
      } catch (err) {
        this.loadError = `Failed to load scores: ${err.message}`
      } finally {
        this.loading = false
      }
    },

    // ── ComboBox option providers ────────────────────────────

    filmOptions(query) {
      return useFilmsStore().filteredFilms(query).map((f) => f.title)
    },

    criticOptions(query) {
      return useCriticsStore().filteredCritics(query).map((c) => c.name)
    },

    // ── Add score (with validation) ──────────────────────────

    async addScore() {
      this.addError = null
      const { filmTitle, criticName, score } = this.newEntry

      // Client-side field validation
      let ok = true

      if (!filmTitle.trim()) {
        this.newV.filmTitle = true
        this.newV.filmTitleMsg = 'Required'
        ok = false
      } else if (!useFilmsStore().filteredFilms(filmTitle).some(f => f.title === filmTitle)) {
        this.newV.filmTitle = true
        this.newV.filmTitleMsg = 'Film not found in mreviews'
        ok = false
      } else {
        this.newV.filmTitle = false
      }

      if (!criticName.trim()) {
        this.newV.criticName = true
        this.newV.criticNameMsg = 'Required'
        ok = false
      } else if (!useCriticsStore().filteredCritics(criticName).some(c => c.name === criticName)) {
        this.newV.criticName = true
        this.newV.criticNameMsg = 'Critic not found'
        ok = false
      } else {
        this.newV.criticName = false
      }

      const parsed = parseFloat(score)
      if (!score || isNaN(parsed) || !isValidScore(score)) {
        this.newV.score = true
        ok = false
      } else {
        this.newV.score = false
      }

      if (!ok) return

      // Check that the critic has not already reviewed this film
      this.adding = true
      try {
        const hasReview = await this.criticHasReview(filmTitle, criticName)
        if (hasReview) {
          this.addError = `${criticName} has already reviewed "${filmTitle}" — free scores are only for un-reviewed films.`
          return
        }
      } finally {
        this.adding = false
      }

      // All good — add to local scores
      if (!this.scores[filmTitle]) {
        this.scores[filmTitle] = {}
      }
      this.scores[filmTitle][criticName] = parsed
      this.newEntry = EMPTY_ENTRY()
    },

    // ── Check critic has existing review via Hugo JSON ───────

    async criticHasReview(filmTitle, criticName) {
      const slug = filmTitle.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      try {
        const res = await fetch(`${SITE_BASE}/mreviews/${slug}/index.json`)
        if (!res.ok) return false   // no reviews for this film yet
        const data = await res.json()
        const reviews = data.Reviews || []
        return reviews.some((r) => {
          const critics = r.Params?.critics || []
          return critics.some(
            (c) => c.trim().toLowerCase() === criticName.trim().toLowerCase()
          )
        })
      } catch {
        return false
      }
    },

    // ── Edit / remove ────────────────────────────────────────

    updateScore(film, critic, raw) {
      const val = parseFloat(raw)
      if (!isNaN(val) && isValidScore(raw)) {
        this.scores[film][critic] = val
      }
    },

    removeScore(film, critic) {
      delete this.scores[film][critic]
      if (Object.keys(this.scores[film]).length === 0) {
        delete this.scores[film]
      }
    },

    removeFilm(film) {
      if (!confirm(`Remove all free scores for "${film}"?`)) return
      delete this.scores[film]
    },

    discardChanges() {
      this.scores = JSON.parse(JSON.stringify(this.original))
    },

    // ── Test: commit to preview branch ───────────────────────

    async onTest() {
      if (!this.isDirty) return
      this.buildState = 'building'
      this.previewUrl = null
      try {
        const token = await getToken()
        const res = await fetch(`${API}/freescores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ scores: this.scores, branch: 'preview' })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.pollBuildStatus()
      } catch (err) {
        this.buildState = 'error'
        alert(`Commit failed: ${err.message}`)
      }
    },

    // ── Poll Amplify build status ─────────────────────────────

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
          }
        } catch {
          // Transient network error — keep polling
        }
      }, 15000)
    },

    // ── Save: commit directly to main ────────────────────────

    async onSave() {
      if (!this.isDirty) return
      if (!confirm('Save free scores to the live site?')) return
      try {
        const token = await getToken()
        const res = await fetch(`${API}/freescores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ scores: this.scores, branch: 'main' })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Commit succeeded — update baseline so isDirty resets
        this.original = JSON.parse(JSON.stringify(this.scores))
        this.buildState = 'idle'
        this.previewUrl = null
        alert('Saved! The live site will rebuild shortly.')
      } catch (err) {
        alert(`Save failed: ${err.message}`)
      }
    }
  }
}

// Score must be a positive number with exactly one decimal digit.
function isValidScore(raw) {
  return /^\d+\.\d$/.test(String(raw).trim()) && parseFloat(raw) > 0 && parseFloat(raw) <= 10
}

async function getToken() {
  const { fetchAuthSession } = await import('aws-amplify/auth')
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() || ''
}
</script>

<style scoped>
.score-input {
  width: 5rem;
  text-align: right;
}
</style>
