export class AbortError extends Error {
  name: string
  requestUrl: string
  cause: unknown

  constructor(message: string, requestUrl: string, cause: unknown) {
    super(message)
    this.name = 'AbortError'
    this.requestUrl = requestUrl
    this.cause = cause
  }
}
