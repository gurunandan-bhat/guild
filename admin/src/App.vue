<template>
  <div class="admin-layout">
    <!-- Top navbar -->
    <nav class="admin-navbar navbar navbar-expand-lg bg-dark navbar-dark px-3 py-2">
      <span class="navbar-brand fw-bold">FCG Admin</span>
      <div class="ms-auto d-flex align-items-center gap-3">
        <router-link class="nav-link text-white" to="/">New Review</router-link>
        <router-link class="nav-link text-white" to="/reviews">All Reviews</router-link>
        <router-link class="nav-link text-white" to="/freescores">Free Scores</router-link>
        <button class="btn btn-sm btn-outline-light ms-3" @click="signOut">
          <i class="bi bi-box-arrow-right me-1"></i>Sign out
        </button>
      </div>
    </nav>

    <!-- Three-column body rendered by the active route -->
    <router-view />
  </div>
</template>

<script>
import { signOut as amplifySignOut } from 'aws-amplify/auth'

export default {
  name: 'App',
  methods: {
    async signOut() {
      await amplifySignOut()
      window.location.reload()
    }
  }
}
</script>
