import { useEffect, useState } from "react"

/**
 * Same breakpoint the Layout uses to swap the sidebar for the floating
 * bottom nav (NARROW_BREAKPOINT = 768).
 */
export const NARROW_VIEWPORT_QUERY = "(max-width: 767.98px)"

function matches(query: string): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  )
}

export function useMediaQuery(query: string): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query))

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mediaQuery = window.matchMedia(query)
    const update = () => setIsMatch(mediaQuery.matches)
    update()
    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [query])

  return isMatch
}

export function useIsNarrowViewport(): boolean {
  return useMediaQuery(NARROW_VIEWPORT_QUERY)
}
