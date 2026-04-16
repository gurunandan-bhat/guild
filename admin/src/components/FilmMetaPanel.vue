<template>
  <div>
    <p
      class="text-uppercase text-secondary fw-semibold mb-3"
      style="font-size:0.7rem; letter-spacing:0.08em"
    >
      Film Metadata
    </p>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-secondary"></div>
      <p class="text-muted small mt-2">Fetching metadata…</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small">
      <i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
    </div>

    <!-- No data yet -->
    <div v-else-if="!meta" class="text-muted small">
      Enter a TMDB ID or select a film to see metadata.
    </div>

    <!-- Metadata display -->
    <template v-else>
      <!-- Poster -->
      <img
        v-if="posterUrl"
        :src="posterUrl"
        :alt="meta.title"
        class="meta-poster"
      />

      <p class="meta-label">Title</p>
      <p class="fw-semibold mb-2">{{ meta.title }}</p>

      <template v-if="meta.original_title && meta.original_title !== meta.title">
        <p class="meta-label">Original Title</p>
        <p class="mb-2">{{ meta.original_title }}</p>
      </template>

      <p class="meta-label">Release Date</p>
      <p class="mb-2">{{ meta.release_date || '—' }}</p>

      <p class="meta-label">Language</p>
      <p class="mb-2">{{ meta.original_language?.toUpperCase() || '—' }}</p>

      <template v-if="genres.length">
        <p class="meta-label">Genres</p>
        <p class="mb-2">
          <span
            v-for="g in genres"
            :key="g"
            class="badge bg-secondary me-1"
          >{{ g }}</span>
        </p>
      </template>

      <template v-if="director">
        <p class="meta-label">Director</p>
        <p class="mb-2">{{ director }}</p>
      </template>

      <template v-if="cast.length">
        <p class="meta-label">Cast</p>
        <p class="mb-2 small">{{ cast.join(', ') }}</p>
      </template>

      <template v-if="meta.overview">
        <p class="meta-label">Overview</p>
        <p class="small text-secondary">{{ meta.overview }}</p>
      </template>
    </template>
  </div>
</template>

<script>
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

export default {
  name: 'FilmMetaPanel',

  props: {
    meta: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    }
  },

  computed: {
    posterUrl() {
      return this.meta?.poster_path ? `${TMDB_IMG}${this.meta.poster_path}` : null
    },

    genres() {
      return (this.meta?.genres || []).map((g) => g.name)
    },

    director() {
      const crew = this.meta?.credits?.crew || []
      return crew.find((c) => c.job === 'Director')?.name || null
    },

    cast() {
      return (this.meta?.credits?.cast || [])
        .slice(0, 6)
        .map((c) => c.name)
    }
  }
}
</script>
