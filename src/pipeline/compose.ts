import type { HttpMiddleware, Next } from '../types/middleware.js'

export function compose<TData = unknown, TJson = unknown>(
  middlewares: readonly HttpMiddleware<TData, TJson>[],
): HttpMiddleware<TData, TJson> {
  return async (ctx, next) => {
    let index = -1

    async function dispatch(position: number): Promise<void> {
      if (position <= index) {
        throw new Error('next() called multiple times')
      }

      index = position

      const middleware = position === middlewares.length ? next : middlewares[position]

      if (!middleware) {
        return
      }

      await middleware(ctx, () => dispatch(position + 1))
    }

    await dispatch(0)
  }
}

export function createNoopNext(): Next {
  return async () => {}
}
