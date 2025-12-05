/// <reference types="vite/client" />

// Raw file imports
declare module '*.wire?raw' {
  const content: string
  export default content
}

declare module '*.pulse?raw' {
  const content: string
  export default content
}
