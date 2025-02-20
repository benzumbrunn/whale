import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpairs'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairService } from './poolpair.service'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { parseDATSymbol } from '@src/module.api/token.controller'

@Controller('/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    private readonly poolPairService: PoolPairService
  ) {
  }

  /**
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolPairData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolPairData>> {
    const result = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const items: PoolPairData[] = []
    for (const [id, info] of Object.entries(result)) {
      const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(info)
      const apr = await this.poolPairService.getAPR(id, info)
      items.push(mapPoolPair(id, info, totalLiquidityUsd, apr))
    }

    return ApiPagedResponse.of(items, query.size, item => {
      return item.id
    })
  }

  /**
   * @param {string} id of pool pair
   * @return {Promise<PoolPairData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<PoolPairData> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(info)
    const apr = await this.poolPairService.getAPR(id, info)
    return mapPoolPair(String(id), info, totalLiquidityUsd, apr)
  }
}

function mapPoolPair (id: string, info: PoolPairInfo, totalLiquidityUsd?: BigNumber, apr?: PoolPairData['apr']): PoolPairData {
  const [symbolA, symbolB] = info.symbol.split('-')

  return {
    id: id,
    symbol: info.symbol,
    displaySymbol: `${parseDATSymbol(symbolA)}-${parseDATSymbol(symbolB)}`,
    name: info.name,
    status: info.status,
    tokenA: {
      symbol: symbolA,
      displaySymbol: parseDATSymbol(symbolA),
      id: info.idTokenA,
      reserve: info.reserveA.toFixed(),
      blockCommission: info.blockCommissionA.toFixed()
    },
    tokenB: {
      symbol: symbolB,
      displaySymbol: parseDATSymbol(symbolB),
      id: info.idTokenB,
      reserve: info.reserveB.toFixed(),
      blockCommission: info.blockCommissionB.toFixed()
    },
    priceRatio: {
      ab: info['reserveA/reserveB'] instanceof BigNumber ? info['reserveA/reserveB'].toFixed() : info['reserveA/reserveB'],
      ba: info['reserveB/reserveA'] instanceof BigNumber ? info['reserveB/reserveA'].toFixed() : info['reserveB/reserveA']
    },
    commission: info.commission.toFixed(),
    totalLiquidity: {
      token: info.totalLiquidity.toFixed(),
      usd: totalLiquidityUsd?.toFixed()
    },
    tradeEnabled: info.tradeEnabled,
    ownerAddress: info.ownerAddress,
    rewardPct: info.rewardPct.toFixed(),
    customRewards: info.customRewards,
    creation: {
      tx: info.creationTx,
      height: info.creationHeight.toNumber()
    },
    apr
  }
}
