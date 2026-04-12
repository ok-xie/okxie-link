import { BizError } from '../errors/biz-error.js'
import type { HttpContext, HttpMiddleware } from '../types/middleware.js'

export type BizErrorHandler<TPayload = unknown, TCode = string | number | undefined> = (
  error: BizError<TPayload, TCode>,
  ctx: HttpContext,
) => void | Promise<void>

export type BizThrowDecision<TPayload = unknown, TCode = string | number | undefined> =
  | boolean
  | ((error: BizError<TPayload, TCode>, ctx: HttpContext) => boolean | Promise<boolean>)

export interface BizMiddlewareOptions<TPayload = unknown, TCode = string | number | undefined> {
  isSuccess: (payload: TPayload) => boolean
  getMessage?: (payload: TPayload) => string
  getCode?: (payload: TPayload) => TCode
  getData?: (payload: TPayload) => unknown
  shouldHandle?: (response: Response) => boolean
  onError?: BizErrorHandler<TPayload, TCode>
  throwOnError?: BizThrowDecision<TPayload, TCode>
}

export function createBizMiddleware<TPayload = unknown, TCode = string | number | undefined>(
  options: BizMiddlewareOptions<TPayload, TCode>,
): HttpMiddleware {
  return async (ctx, next) => {
    await next()

    if (!ctx.response || !shouldHandleResponse(ctx.response, options.shouldHandle)) {
      return
    }

    const payload = (await ctx.json()) as TPayload

    if (!options.isSuccess(payload)) {
      const error = new BizError(
        options.getMessage?.(payload) ?? 'Business validation failed',
        options.getCode?.(payload) as TCode,
        payload,
      )

      ctx.error = error

      if (options.onError) {
        await options.onError(error, ctx)
      }

      if (await shouldThrowBizError(error, ctx, options.throwOnError)) {
        ctx.throw(error)
      }

      return
    }

    if (options.getData) {
      ctx.data = options.getData(payload)
    }
  }
}

function shouldHandleResponse(
  response: Response,
  customShouldHandle?: (response: Response) => boolean,
): boolean {
  if (customShouldHandle) {
    return customShouldHandle(response)
  }

  if (response.status === 204) {
    return false
  }

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  return contentType.includes('application/json')
}

async function shouldThrowBizError<TPayload, TCode>(
  error: BizError<TPayload, TCode>,
  ctx: HttpContext,
  decision?: BizThrowDecision<TPayload, TCode>,
): Promise<boolean> {
  if (decision === undefined) {
    return true
  }

  if (typeof decision === 'function') {
    return decision(error, ctx)
  }

  return decision
}
