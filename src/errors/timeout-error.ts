export class TimeoutError extends Error {
  name: string
  requestUrl: string
  cause: unknown

  constructor(message: string, requestUrl: string, cause: unknown) {
    super(message)
    this.name = 'TimeoutError'
    this.requestUrl = requestUrl
    this.cause = cause
  }
}
