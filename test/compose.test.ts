import { describe, expect, it } from 'vitest'
import { DefaultHttpContext } from '../src/context/http-context.js'
import { resolveRequestConfig } from '../src/helpers/request-config.js'
import { compose } from '../src/pipeline/compose.js'

describe('compose', () => {
  it('should run middlewares in onion order', async () => {
    const calls: string[] = []
    const context = new DefaultHttpContext(
      resolveRequestConfig(
        {
          baseUrl: 'https://api.example.com',
        },
        {
          url: '/users',
        },
      ),
    )

    const middleware = compose([
      async (_ctx, next) => {
        calls.push('a:before')
        await next()
        calls.push('a:after')
      },
      async (_ctx, next) => {
        calls.push('b:before')
        await next()
        calls.push('b:after')
      },
    ])

    await middleware(context, async () => {
      calls.push('transport')
    })

    expect(calls).toEqual(['a:before', 'b:before', 'transport', 'b:after', 'a:after'])
  })

  it('should reject when next is called multiple times', async () => {
    const context = new DefaultHttpContext(
      resolveRequestConfig(
        {
          baseUrl: 'https://api.example.com',
        },
        {
          url: '/users',
        },
      ),
    )

    const middleware = compose([
      async (_ctx, next) => {
        await next()
        await next()
      },
    ])

    await expect(
      middleware(context, async () => {
        return
      }),
    ).rejects.toThrow('next() called multiple times')
  })
})
