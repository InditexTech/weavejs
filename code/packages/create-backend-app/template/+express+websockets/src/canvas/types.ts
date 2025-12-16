export type SkiaFont = {
  family: string
  paths: string[]
}

export type CanvasFont = {
  path: string
  fontFace: {
    family: string
    weight?: string | undefined
    style?: string | undefined
  }
}
