<template>
  <div class="d-flex flex-column h-100 gap-3">

    <!-- ── Recent Films ──────────────────────────────────────── -->
    <div>
      <p class="text-uppercase text-secondary fw-semibold mb-2" style="font-size:0.7rem; letter-spacing:0.08em">
        Recent Films
      </p>
      <div v-if="filmsStore.films.length === 0" class="text-muted small">Loading…</div>
      <ul class="list-unstyled mb-0">
        <li
          v-for="film in filmsStore.recentFilms"
          :key="film.title"
          class="staging-item"
          @click="$emit('select-film', film)"
          :title="film.title"
        >
          <span class="film-title">{{ film.title }}</span>
        </li>
      </ul>
    </div>

    <!-- ── Staged Reviews ────────────────────────────────────── -->
    <div class="mt-auto">
      <p class="text-uppercase text-secondary fw-semibold mb-2" style="font-size:0.7rem; letter-spacing:0.08em">
        Staged
        <span v-if="stagingStore.count" class="badge bg-primary ms-1">{{ stagingStore.count }}</span>
      </p>

      <div v-if="stagingStore.isEmpty" class="text-muted small">No reviews staged yet.</div>

      <ul class="list-unstyled mb-3">
        <li
          v-for="item in stagingStore.staged"
          :key="item.id"
          class="staging-item"
          @click="reEdit(item)"
          :title="`${item.filmTitle} · ${item.criticName}`"
        >
          <i :class="`bi ${mediaIcon(item.mediaType)} text-secondary me-1`" style="font-size:0.75rem"></i>
          <span class="film-title">{{ item.filmTitle }}</span>
          <span class="text-muted small ms-1" style="white-space:nowrap">{{ item.criticName.split(' ').pop() }}</span>
          <button
            type="button"
            class="btn btn-sm p-0 ms-1 text-danger"
            @click.stop="stagingStore.remove(item.id)"
            title="Remove"
          >
            <i class="bi bi-x"></i>
          </button>
        </li>
      </ul>

      <!-- Test & Save buttons -->
      <div class="d-grid gap-2">
        <button
          class="btn btn-outline-primary btn-sm"
          :disabled="stagingStore.isEmpty || buildState === 'building'"
          @click="$emit('test')"
        >
          <span v-if="buildState === 'building'" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-play-circle me-1"></i>
          {{ buildState === 'building' ? 'Building…' : 'Test' }}
        </button>
        <button
          class="btn btn-success btn-sm"
          :disabled="stagingStore.isEmpty || buildState === 'building'"
          @click="$emit('save')"
        >
          <i class="bi bi-cloud-upload me-1"></i>Save to Live
        </button>
      </div>

      <!-- Preview URL after build -->
      <div v-if="previewUrl" class="mt-2">
        <a :href="previewUrl" target="_blank" rel="noopener" class="btn btn-link btn-sm p-0">
          <i class="bi bi-box-arrow-up-right me-1"></i>Open Preview
        </a>
      </div>
    </div>

  </div>
</template>

<script>
import { useFilmsStore } from '@/stores/films'
import { useStagingStore } from '@/stores/staging'

const MEDIA_ICONS = {
  print:   'bi-newspaper',
  audio:   'bi-mic-fill',
  video:   'bi-play-btn-fill',
  spotify: 'bi-spotify'
}

export default {
  name: 'StagingPanel',

  props: {
    buildState: {
      type: String,
      default: 'idle' // 'idle' | 'building' | 'done' | 'error'
    },
    previewUrl: {
      type: String,
      default: null
    }
  },

  emits: ['select-film', 'test', 'save', 're-edit'],

  computed: {
    filmsStore() { return useFilmsStore() },
    stagingStore() { return useStagingStore() }
  },

  methods: {
    mediaIcon(type) {
      return MEDIA_ICONS[type] || 'bi-newspaper'
    },

    reEdit(item) {
      this.stagingStore.setActive(item.id)
      this.$emit('re-edit', item)
    }
  }
}
</script>
