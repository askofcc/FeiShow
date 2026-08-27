describe('Feishu tenant access token', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      FEISHU_APP_ID: 'app-id',
      FEISHU_APP_SECRET: 'app-secret'
    }
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        code: 0,
        msg: 'ok',
        tenant_access_token: 'token-1',
        expire: 7200
      })
    })
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it('shares one token request across concurrent callers', async () => {
    const { getTenantAccessToken } = require('@/lib/feishu/auth')

    const tokens = await Promise.all([
      getTenantAccessToken(),
      getTenantAccessToken(),
      getTenantAccessToken()
    ])

    expect(tokens).toEqual(['token-1', 'token-1', 'token-1'])
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
