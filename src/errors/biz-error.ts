export class BizError<TPayload = unknown, TCode = string | number | undefined> extends Error {
  name: string
  code: TCode
  payload: TPayload

  constructor(message: string, code: TCode, payload: TPayload) {
    super(message)
    this.name = 'BizError'
    this.code = code
    this.payload = payload
  }
}
