<template>
  <form @submit.prevent>

    <!-- ── Type selector ────────────────────────────────────── -->
    <div class="type-selector btn-group w-100 mb-4" role="group">
      <template v-for="t in mediaTypes" :key="t.value">
        <input
          type="radio"
          class="btn-check"
          :id="`type-${t.value}`"
          :value="t.value"
          v-model="form.media"
          autocomplete="off"
        />
        <label class="btn btn-outline-secondary" :for="`type-${t.value}`">
          <i :class="`bi ${t.icon} me-1`"></i>{{ t.label }}
        </label>
      </template>
    </div>

    <!-- Edit mode indicator -->
    <div v-if="isEditMode" class="alert alert-info py-2 d-flex align-items-center gap-2 mb-3">
      <i class="bi bi-pencil-fill"></i>
      <span class="edit-mode-badge">
        Editing existing review — <strong>{{ form.filmTitle }}</strong> by <strong>{{ form.criticName }}</strong>
      </span>
      <button type="button" class="btn-close btn-close ms-auto" @click="resetForm"></button>
    </div>

    <!-- ── Row 1: Critic / Film / Show Type / TMDB ID ──────── -->
    <div class="row g-2 mb-3">
      <div class="col-md-3">
        <label class="form-label fw-semibold">Critic</label>
        <ComboBox
          v-model="form.criticName"
          :options-fn="criticOptions"
          placeholder="Critic name…"
          :invalid="v.criticName"
          invalid-message="Required"
          @select="onCriticSelect"
        />
      </div>
      <div class="col-md-4">
        <label class="form-label fw-semibold">Film Title</label>
        <ComboBox
          v-model="form.filmTitle"
          :options-fn="filmOptions"
          placeholder="Film title…"
          :invalid="v.filmTitle"
          invalid-message="Required"
          @select="onFilmSelect"
          @update:model-value="onFilmInput"
        />
      </div>
      <div class="col-md-2">
        <label class="form-label fw-semibold">Type</label>
        <div class="btn-group w-100" role="group">
          <input type="radio" class="btn-check" id="show-movie" value="movie" v-model="form.showType" autocomplete="off" />
          <label class="btn btn-outline-secondary btn-sm" for="show-movie">Movie</label>
          <input type="radio" class="btn-check" id="show-tv" value="tv" v-model="form.showType" autocomplete="off" />
          <label class="btn btn-outline-secondary btn-sm" for="show-tv">TV</label>
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label fw-semibold">TMDB ID</label>
        <input
          type="number"
          class="form-control"
          placeholder="e.g. 1396"
          v-model.number="form.tmdbId"
          @change="onTmdbIdChange"
        />
      </div>
    </div>

    <!-- ── Row 2: Subtitle / Opening / Publication / Score ─── -->
    <div class="row g-2 mb-3">
      <div class="col-md-5">
        <label class="form-label fw-semibold">Subtitle</label>
        <input type="text" class="form-control" v-model="form.subtitle" placeholder="Review headline…" />
      </div>
      <div v-if="showOpening" class="col-md-4">
        <label class="form-label fw-semibold">Opening Quote</label>
        <input type="text" class="form-control" v-model="form.opening" placeholder="One-line tease…" />
      </div>
      <div class="col-md-3" :class="showOpening ? 'col-md-3' : 'col-md-4'">
        <label class="form-label fw-semibold">Score <span class="text-muted fw-normal">(1–10)</span></label>
        <input
          type="number"
          class="form-control"
          :class="{ 'is-invalid': v.score }"
          min="1"
          max="10"
          v-model.number="form.score"
        />
        <div class="invalid-feedback">Enter a score between 1 and 10</div>
      </div>
    </div>

    <!-- Publication (Print only) -->
    <div v-if="showPublication" class="row g-2 mb-3">
      <div class="col-md-5">
        <label class="form-label fw-semibold">Publication</label>
        <input type="text" class="form-control" v-model="form.publication" placeholder="e.g. The Hindu…" />
      </div>
    </div>

    <!-- ── Row 3: Body / embed + image ──────────────────────── -->
    <div class="row g-2 mb-3">

      <!-- Print: body text + image upload -->
      <template v-if="form.media === 'print'">
        <div class="col-md-8">
          <label class="form-label fw-semibold">Review Body</label>
          <textarea
            class="form-control review-textarea"
            v-model="form.body"
            placeholder="Paste or type the review text…"
          ></textarea>
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Review Image</label>
          <input type="file" class="form-control" accept="image/*" @change="onImageChange" />
          <div v-if="imagePreviewUrl" class="mt-2">
            <img :src="imagePreviewUrl" class="img-fluid rounded" alt="Preview" />
          </div>
        </div>
      </template>

      <!-- Audio: path + caption + image upload -->
      <template v-else-if="form.media === 'audio'">
        <div class="col-md-8">
          <label class="form-label fw-semibold">Audio File Path</label>
          <input type="text" class="form-control mb-2" v-model="form.audioPath" placeholder="/audio/filename.mp3" />
          <label class="form-label fw-semibold">Caption</label>
          <input type="text" class="form-control" v-model="form.audioCaption" placeholder="Caption text…" />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Review Image</label>
          <input type="file" class="form-control" accept="image/*" @change="onImageChange" />
          <div v-if="imagePreviewUrl" class="mt-2">
            <img :src="imagePreviewUrl" class="img-fluid rounded" alt="Preview" />
          </div>
        </div>
      </template>

      <!-- Video: YouTube ID -->
      <template v-else-if="form.media === 'video'">
        <div class="col-md-6">
          <label class="form-label fw-semibold">YouTube Video ID</label>
          <input type="text" class="form-control" v-model="form.youtubeId" placeholder="e.g. dQw4w9WgXcQ" />
        </div>
      </template>

      <!-- Spotify: episode ID -->
      <template v-else-if="form.media === 'spotify'">
        <div class="col-md-6">
          <label class="form-label fw-semibold">Spotify Episode ID</label>
          <input type="text" class="form-control" v-model="form.spotifyId" placeholder="Spotify episode ID…" />
        </div>
      </template>

    </div>

    <!-- ── Row 4: Source URL (Print + Video) ────────────────── -->
    <div v-if="showSource" class="row g-2 mb-4">
      <div class="col-md-10">
        <label class="form-label fw-semibold">Source URL</label>
        <input type="url" class="form-control" v-model="form.source" placeholder="https://…" />
      </div>
    </div>

    <!-- ── Action buttons ────────────────────────────────────── -->
    <div class="d-flex gap-2">
      <button type="button" class="btn btn-outline-secondary" @click="previewReview">
        <i class="bi bi-eye me-1"></i>Preview
      </button>
      <button type="button" class="btn btn-primary" @click="stageReview">
        <i class="bi bi-plus-circle me-1"></i>
        {{ isEditMode ? 'Update in Staging' : 'Add to Staging' }}
      </button>
      <button type="button" class="btn btn-link text-secondary ms-auto" @click="resetForm">
        Clear
      </button>
    </div>

  </form>

  <!-- ── Preview modal ─────────────────────────────────────── -->
  <div
    class="modal fade"
    id="previewModal"
    tabindex="-1"
    ref="previewModal"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Preview — {{ form.filmTitle }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="text-muted small mb-1">
            <strong>{{ form.criticName }}</strong>
            <span v-if="form.publication"> · {{ form.publication }}</span>
            <span v-if="form.score" class="ms-2 badge bg-dark">{{ form.score }}/10</span>
          </p>
          <h5 v-if="form.subtitle" class="mb-1">{{ form.subtitle }}</h5>
          <p v-if="form.opening" class="fst-italic text-secondary">{{ form.opening }}</p>
          <hr />
          <template v-if="form.media === 'print'">
            <p style="white-space: pre-wrap">{{ form.body }}</p>
          </template>
          <template v-else-if="form.media === 'audio'">
            <p class="text-muted">Audio: <code>{{ form.audioPath }}</code></p>
            <p v-if="form.audioCaption">{{ form.audioCaption }}</p>
          </template>
          <template v-else-if="form.media === 'video'">
            <p class="text-muted">YouTube ID: <code>{{ form.youtubeId }}</code></p>
          </template>
          <template v-else-if="form.media === 'spotify'">
            <p class="text-muted">Spotify ID: <code>{{ form.spotifyId }}</code></p>
          </template>
          <p v-if="form.source" class="mt-2">
            <a :href="form.source" target="_blank" rel="noopener">Read full review ↗</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import ComboBox from '@/components/ComboBox.vue'
import { useFilmsStore } from '@/stores/films'
import { useCriticsStore } from '@/stores/critics'
import { useStagingStore } from '@/stores/staging'

const SITE_BASE = import.meta.env.VITE_SITE_BASE_URL ?? 'https://www.fcgreviews.com'

const EMPTY_FORM = () => ({
  media: 'print',
  showType: 'movie',
  criticName: '',
  filmTitle: '',
  tmdbId: null,
  subtitle: '',
  opening: '',
  publication: '',
  score: null,
  body: '',
  audioPath: '',
  audioCaption: '',
  youtubeId: '',
  spotifyId: '',
  source: '',
  img: ''
})

export default {
  name: 'ReviewForm',
  components: { ComboBox },

  emits: ['tmdb-requested'],

  data() {
    return {
      form: EMPTY_FORM(),

      // Validation flags
      v: { criticName: false, filmTitle: false, score: false },

      // Image upload
      imageFile: null,
      imagePreviewUrl: null,

      // Edit mode state
      isEditMode: false,
      existingSlug: null,
      existingId: null, // staging item id if we're re-editing a staged item

      // Debounce timer for auto-detect
      detectTimer: null,

      mediaTypes: [
        { value: 'print',   label: 'Print',   icon: 'bi-newspaper' },
        { value: 'audio',   label: 'Audio',   icon: 'bi-mic-fill' },
        { value: 'video',   label: 'Video',   icon: 'bi-play-btn-fill' },
        { value: 'spotify', label: 'Spotify', icon: 'bi-spotify' }
      ]
    }
  },

  computed: {
    showOpening()     { return ['print', 'audio'].includes(this.form.media) },
    showPublication() { return this.form.media === 'print' },
    showSource()      { return ['print', 'video'].includes(this.form.media) }
  },

  mounted() {
    // Check if staging store has an active item to re-edit
    const staging = useStagingStore()
    if (staging.activeItem) {
      this.loadFromStaging(staging.activeItem)
    }
  },

  methods: {
    // ── Autocomplete option providers ──────────────────────

    filmOptions(query) {
      const store = useFilmsStore()
      return store.filteredFilms(query).map((f) => f.title)
    },

    criticOptions(query) {
      const store = useCriticsStore()
      return store.filteredCritics(query).map((c) => c.name)
    },

    // ── Field event handlers ────────────────────────────────

    onFilmSelect(title) {
      this.form.filmTitle = title
      this.tryAutoDetect()
    },

    onFilmInput(val) {
      this.form.filmTitle = val
      clearTimeout(this.detectTimer)
      this.detectTimer = setTimeout(() => this.tryAutoDetect(), 500)
    },

    onCriticSelect(name) {
      this.form.criticName = name
      this.tryAutoDetect()
    },

    onTmdbIdChange() {
      if (this.form.tmdbId) {
        this.$emit('tmdb-requested', {
          tmdbId:    this.form.tmdbId,
          filmTitle: this.form.filmTitle,
          showType:  this.form.showType
        })
      }
    },

    onImageChange(e) {
      const file = e.target.files[0]
      if (!file) return
      this.imageFile = file
      this.imagePreviewUrl = URL.createObjectURL(file)
      // Suggest img filename based on current slug
      this.form.img = file.name
    },

    // ── Auto Create/Edit detection ──────────────────────────

    async tryAutoDetect() {
      const { filmTitle, criticName } = this.form
      if (!filmTitle.trim() || !criticName.trim()) return

      // Don't fetch if the film isn't in the store — it's a new film
      // and can't have existing reviews. This also prevents 404s in the
      // console on every keystroke while the user is still typing.
      if (!useFilmsStore().filmByTitle(filmTitle)) return

      // Derive slug: kebab-case of the film title
      const slug = filmTitle.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      try {
        const res = await fetch(`${SITE_BASE}/mreviews/${slug}/index.json`)
        if (!res.ok) return // new film — stay in create mode
        const data = await res.json()

        const reviews = data.Reviews || []
        const match = reviews.find((r) => {
          const critics = r.Critic || r.Params?.critics || []
          return critics.some(
            (c) => c.trim().toLowerCase() === criticName.trim().toLowerCase()
          )
        })

        if (match) {
          this.loadFromReviewJson(match)
        }
      } catch {
        // Network error or new film — stay in create mode
      }
    },

    loadFromReviewJson(reviewJson) {
      const p = reviewJson.Params || {}
      this.form.media       = p.media      || 'print'
      this.form.subtitle    = p.subtitle   || ''
      this.form.opening     = p.opening    || ''
      this.form.publication = p.publication|| ''
      this.form.score       = Array.isArray(p.scores) ? p.scores[0] : (p.score || null)
      this.form.source      = p.source     || ''
      this.form.img         = p.img        || ''
      this.form.body        = reviewJson.Content || ''

      // Embed-type fields from the shortcode body
      if (this.form.media === 'audio') {
        const m = this.form.body.match(/path="([^"]*)".*?caption="([^"]*)"/)
        if (m) { this.form.audioPath = m[1]; this.form.audioCaption = m[2] }
      } else if (this.form.media === 'video') {
        const m = this.form.body.match(/id="([^"]*)"/)
        if (m) this.form.youtubeId = m[1]
      } else if (this.form.media === 'spotify') {
        const m = this.form.body.match(/id="([^"]*)"/)
        if (m) this.form.spotifyId = m[1]
      }

      this.existingSlug = reviewJson.ReviewPath || null
      this.isEditMode = true
    },

    loadFromStaging(item) {
      this.form = { ...item.formData }
      this.isEditMode = item.isEdit || false
      this.existingSlug = item.existingSlug || null
      this.existingId = item.id
    },

    // ── Validation ──────────────────────────────────────────

    validate() {
      this.v.criticName = !this.form.criticName.trim()
      this.v.filmTitle  = !this.form.filmTitle.trim()
      this.v.score      = !this.form.score || this.form.score < 1 || this.form.score > 10
      return !this.v.criticName && !this.v.filmTitle && !this.v.score
    },

    // ── Staging ─────────────────────────────────────────────

    stageReview() {
      if (!this.validate()) return

      const staging = useStagingStore()
      const payload = {
        filmTitle:    this.form.filmTitle,
        criticName:   this.form.criticName,
        mediaType:    this.form.media,
        formData:     { ...this.form },
        imageFile:    this.imageFile,
        isEdit:       this.isEditMode,
        existingSlug: this.existingSlug
      }

      if (this.existingId) {
        staging.update(this.existingId, payload)
      } else {
        staging.stage(payload)
      }

      staging.clearActive()
      this.resetForm()
    },

    // ── Preview modal ────────────────────────────────────────

    previewReview() {
      if (!this.$refs.previewModal) return
      const modal = new Modal(this.$refs.previewModal)
      modal.show()
    },

    // ── Reset ────────────────────────────────────────────────

    resetForm() {
      this.form = EMPTY_FORM()
      this.imageFile = null
      this.imagePreviewUrl = null
      this.isEditMode = false
      this.existingSlug = null
      this.existingId = null
      this.v = { criticName: false, filmTitle: false, score: false }
      const staging = useStagingStore()
      staging.clearActive()
    },

    // ── Called by parent to pre-fill a film (from recent-films click) ──

    prefillFilm(film) {
      this.form.filmTitle = film.title
      if (film.tmdbId) this.form.tmdbId = film.tmdbId
      this.tryAutoDetect()
    }
  }
}
</script>
