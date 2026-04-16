import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser, signInWithRedirect } from 'aws-amplify/auth'

import HomeView from '@/views/HomeView.vue'
import ReviewListView from '@/views/ReviewListView.vue'
import FreeScoresView from '@/views/FreeScoresView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/reviews',
    name: 'reviews',
    component: ReviewListView,
    meta: { requiresAuth: true }
  },
  {
    path: '/freescores',
    name: 'freescores',
    component: FreeScoresView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  try {
    await getCurrentUser()
    return true
  } catch {
    // No active session — redirect to Cognito Hosted UI
    signInWithRedirect()
    return false
  }
})

export default router
