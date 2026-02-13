type ClassArrayValue = string | false | null | undefined
type ClassMapValue = Record<string, boolean>

export function cn(
  base: string,
  extra?: ClassArrayValue[],
  toggles?: ClassMapValue
): string {
  const classes: string[] = [base]

  if (extra?.length) {
    classes.push(...extra.filter(Boolean) as string[])
  }

  if (toggles) {
    for (const [className, enabled] of Object.entries(toggles)) {
      if (enabled) {
        classes.push(className)
      }
    }
  }

  return classes.join(' ')
}
