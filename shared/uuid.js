const chr4 = () => Math.random().toString(16).slice(-4)

export const uuid = () => (
  `${chr4()}${chr4()}-${chr4()}-${chr4()}-${chr4()}-${chr4()}${chr4()}${chr4()}`
)
