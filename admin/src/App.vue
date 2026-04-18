<template>
  <div class="admin-layout">
    <!-- Top navbar -->
    <nav class="admin-navbar navbar navbar-expand-lg bg-dark navbar-dark px-3 py-2">
      <span class="navbar-brand fw-bold">FCG Admin</span>
      <div class="ms-auto d-flex align-items-center gap-3">
        <router-link class="nav-link text-white" to="/">New Review</router-link>
        <router-link class="nav-link text-white" to="/reviews">All Reviews</router-link>
        <router-link class="nav-link text-white" to="/freescores">Free Scores</router-link>
        <span v-if="userEmail" class="text-white-50 small">{{ userEmail }}</span>
        <button class="btn btn-sm btn-outline-light" @click="signOut">
          <i class="bi bi-box-arrow-right me-1"></i>Sign out
        </button>
      </div>
    </nav>

    <!-- Three-column body rendered by the active route -->
    <router-view />
  </div>
</template>

<script>
import { signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth'

export default {
  name: 'App',

  data() {
    return {
      userEmail: null
    }
  },

  async created() {
    try {
      const session = await fetchAuthSession()
      this.userEmail = session.tokens?.idToken?.payload?.email || null
    } catch {
      // Not signed in — router guard will redirect
    }
  },

  methods: {
    async signOut() {
      await amplifySignOut()
      window.location.reload()
    }
  }
}
</script>
