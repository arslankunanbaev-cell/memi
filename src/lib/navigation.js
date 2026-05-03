export function navigateWithTransition(navigate, to, options) {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(() => {
      navigate(to, options)
    })
    return
  }

  navigate(to, options)
}
