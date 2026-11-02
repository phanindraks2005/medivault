// Shared motion values so every screen moves the same way.
export const ease = [0.22, 1, 0.36, 1] as const

export const duration = {
  press: 0.15,
  small: 0.22,
  enter: 0.32,
}

export const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: duration.enter, ease } },
}

export const stagger = (delayChildren = 0.04, staggerChildren = 0.05) => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
})

// Interactive cards lift slightly on hover and settle on press.
export const lift = {
  whileHover: { y: -2 },
  whileTap: { y: 0, scale: 0.995 },
  transition: { duration: duration.press, ease },
}
