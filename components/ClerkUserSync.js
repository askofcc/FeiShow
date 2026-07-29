'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

/**
 * Client-only bridge: keeps GlobalContext signed-in state without calling
 * useUser() during SSG/prerender (which crashes when Clerk auth context is empty).
 */
export default function ClerkUserSync({ onChange }) {
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange({ isLoaded, isSignedIn: Boolean(isSignedIn), user: user || null })
    }
  }, [isLoaded, isSignedIn, user, onChange])

  return null
}
