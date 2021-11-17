import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'

describe('stats', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await createToken(container, 'A')
    await mintTokens(container, 'A')
    await createToken(container, 'B')
    await mintTokens(container, 'B')

    await createPoolPair(container, 'A', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await createPoolPair(container, 'B', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await createToken(container, 'USDT')
    await createPoolPair(container, 'USDT', 'DFI')
    await mintTokens(container, 'USDT')
    await addPoolLiquidity(container, {
      tokenA: 'USDT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 431.51288,
      shareAddress: await getNewAddress(container)
    })
    await createToken(container, 'USDC')
    await createPoolPair(container, 'USDC', 'DFI')
    await mintTokens(container, 'USDC')
    await addPoolLiquidity(container, {
      tokenA: 'USDC',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 431.51288,
      shareAddress: await getNewAddress(container)
    })
    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should get stat data', async () => {
    const data = await client.stats.get()

    expect(data).toStrictEqual({
      count: {
        blocks: 122,
        prices: 0,
        tokens: 9,
        masternodes: 8
      },
      burned: {
        address: 0,
        emission: 7323.58,
        fee: 4,
        total: 7327.58
      },
      tvl: {
        dex: 5853.942343505482,
        masternodes: 185.39423435054823,
        total: 6039.336577856031
      },
      price: {
        usd: 2.317427929381853,
        usdt: 2.317427929381853
      },
      masternodes: {
        locked: [
          {
            count: 8,
            tvl: 185.39423435054823,
            weeks: 0
          }
        ]
      },
      emission: {
        total: 405.04,
        anchor: 0.081008,
        dex: 103.08268,
        community: 19.887464,
        masternode: 134.999832,
        burned: 146.989016
      },
      blockchain: {
        difficulty: expect.any(Number)
      },
      net: {
        protocolversion: expect.any(Number),
        subversion: expect.any(String),
        version: expect.any(Number)
      },
      supply: {
        total: 12000000000,
        circulating: expect.any(Number),
        emission: expect.any(Number),
        burned: 7327.58
      }
    })
  })
})
