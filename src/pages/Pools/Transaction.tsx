import React, { useMemo } from "react";
import { Price, Token, CurrencyAmount } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";
import format from "date-fns/format";

import { useCurrencyConversions } from "../../CurrencyConversionsProvider";
import TokenSymbol from "../../ui/TokenLabel";

import { BLOCK_EXPLORER_URL } from "../../constants";

export interface TransactionProps {
  id: string;
  pool: Pool;
  baseToken: Token;
  timestamp: number;
  type: string;
  amount0: CurrencyAmount<Token>;
  amount1: CurrencyAmount<Token>;
  priceLower: Price<Token, Token>;
  priceUpper: Price<Token, Token>;
  gas: { costCurrency: CurrencyAmount<Token> };
}

function Transaction({
  id,
  pool,
  baseToken,
  timestamp,
  type,
  amount0,
  amount1,
  priceLower,
  priceUpper,
  gas,
}: TransactionProps) {
  const { convertToGlobalFormatted, formatCurrencyWithSymbol } =
    useCurrencyConversions();
  const totalLiquidity = useMemo(() => {
    if (!baseToken || !pool) {
      return 0;
    }
    return pool.token0.equals(baseToken)
      ? pool.priceOf(pool.token1).quote(amount1).add(amount0)
      : pool.priceOf(pool.token0).quote(amount0).add(amount1);
  }, [baseToken, pool, amount0, amount1]);

  const { percent0, percent1 } = useMemo(() => {
    if (
      !baseToken ||
      !pool ||
      totalLiquidity === 0 ||
      totalLiquidity.equalTo(0)
    ) {
      return { percent0: "0", percent1: "0" };
    }
    const [value0, value1] = pool.token0.equals(baseToken)
      ? [amount0, pool.priceOf(pool.token1).quote(amount1)]
      : [pool.priceOf(pool.token0).quote(amount0), amount1];
    const calcPercent = (val: CurrencyAmount<Token>) =>
      (
        (parseFloat(val.toSignificant(15)) /
          parseFloat(totalLiquidity.toSignificant(15))) *
        100
      ).toFixed(2);

    return { percent0: calcPercent(value0), percent1: calcPercent(value1) };
  }, [totalLiquidity, pool, baseToken, amount0, amount1]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mint":
        return "Add liquidity";
      case "burn":
        return "Remove liquidity";
      case "collect":
        return "Collect fees";
    }
  };

  return (
    <tr className="">
      <td>
        <a
          href={`${BLOCK_EXPLORER_URL[baseToken.chainId]}/tx/${id}`}
          className="text-blue-500"
        >
          {format(new Date(timestamp * 1000), "yyyy-MM-dd'T'HH:mm:ss")}
        </a>
      </td>
      <td>{getTypeLabel(type)}</td>
      <td>
        <div>
          <TokenSymbol symbol={pool.token0.symbol} />: {amount0.toFixed(4)}(
          {percent0}%)
        </div>
        <div>
          <TokenSymbol symbol={pool.token1.symbol} />: {amount1.toFixed(4)}(
          {percent1}%)
        </div>
      </td>
      <td>
        {totalLiquidity !== 0
          ? convertToGlobalFormatted(totalLiquidity)
          : formatCurrencyWithSymbol(0, 1)}
      </td>
      <td>{convertToGlobalFormatted(gas.costCurrency)}</td>
    </tr>
  );
}

export default Transaction;
