import { useMemo } from "react";
import differenceInSeconds from "date-fns/differenceInSeconds";
import { BigNumber } from "@ethersproject/bignumber";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";

import { useGasFee } from "./useGasFee";
import { WETH9, MATIC } from "../constants";

export function useTransactionTotals(
  transactions: any[],
  baseToken: Token,
  pool: Pool
) {
  const chainId = baseToken.chainId;

  return useMemo(() => {
    let totalMintValue = CurrencyAmount.fromRawAmount(baseToken, 0);
    let totalBurnValue = CurrencyAmount.fromRawAmount(baseToken, 0);
    let totalCollectValue = CurrencyAmount.fromRawAmount(baseToken, 0);
    let totalTransactionCost = CurrencyAmount.fromRawAmount(
      chainId === 137 ? MATIC[chainId as number] : WETH9[chainId as number],
      "0"
    );

    if (transactions.length && baseToken && pool && chainId) {
      transactions.forEach((tx) => {
        const txValue = pool.token0.equals(baseToken)
          ? pool.priceOf(pool.token1).quote(tx.amount1).add(tx.amount0)
          : pool.priceOf(pool.token0).quote(tx.amount0).add(tx.amount1);
        if (tx.type === "mint") {
          totalMintValue = totalMintValue.add(txValue);
        } else if (tx.type === "burn") {
          totalBurnValue = totalBurnValue.add(txValue);
        } else if (tx.type === "collect") {
          totalCollectValue = totalCollectValue.add(txValue);
        }

        // add gas costs
        totalTransactionCost = totalTransactionCost.add(tx.gas.costCurrency);
      });
    }

    return {
      totalMintValue,
      totalBurnValue,
      totalCollectValue,
      totalTransactionCost,
    };
  }, [transactions, baseToken, pool, chainId]);
}

export function useReturnValue(
  baseToken: Token,
  totalMintValue: CurrencyAmount<Token>,
  totalBurnValue: CurrencyAmount<Token>,
  totalCollectValue: CurrencyAmount<Token>,
  totalTransactionCost: CurrencyAmount<Token>,
  totalCurrentValue: CurrencyAmount<Token>
) {
  const convertGasFee = useGasFee(baseToken);

  return useMemo(() => {
    const totalTransactionCostConverted = convertGasFee(totalTransactionCost);
    const returnValue = totalCurrentValue
      .add(totalBurnValue)
      .add(totalCollectValue)
      .subtract(totalMintValue)
      .subtract(totalTransactionCostConverted);

    const returnPercent =
      (parseFloat(returnValue.toSignificant(2)) /
        parseFloat(
          totalMintValue.add(totalTransactionCostConverted).toSignificant(2)
        )) *
      100;

    return { returnValue, returnPercent };
  }, [
    totalMintValue,
    totalBurnValue,
    totalCollectValue,
    totalTransactionCost,
    totalCurrentValue,
    convertGasFee,
  ]);
}

export function useAPR(
  transactions: any,
  returnPercent: number,
  liquidity: BigNumber
) {
  return useMemo(() => {
    if (!transactions.length) {
      return 0;
    }

    const startDate = new Date(transactions[0].timestamp * 1000);
    const endDate = liquidity.isZero()
      ? new Date(transactions[transactions.length - 1].timestamp * 1000)
      : new Date();
    const secondsSince = differenceInSeconds(endDate, startDate);
    const yearInSeconds = 365 * 24 * 60 * 60;
    return (returnPercent / secondsSince) * yearInSeconds;
  }, [returnPercent, transactions, liquidity]);
}

function calcLiquidity(
  pool: Pool,
  baseToken: Token,
  amount0: CurrencyAmount<Token>,
  amount1: CurrencyAmount<Token>
) {
  return pool.token0.equals(baseToken)
    ? pool.priceOf(pool.token1).quote(amount1).add(amount0)
    : pool.priceOf(pool.token0).quote(amount0).add(amount1);
}

function calcPeriodYield(
  fees: CurrencyAmount<Token>,
  liquidity: CurrencyAmount<Token>,
  periodStart: Date,
  periodEnd: Date
) {
  const zeroAmount = CurrencyAmount.fromRawAmount(liquidity.currency, 0);
  if (liquidity.equalTo(zeroAmount)) {
    return zeroAmount;
  }
  const periodYield = fees.divide(liquidity).multiply(liquidity.decimalScale);
  let secondsSince = differenceInSeconds(periodEnd, periodStart);
  if (secondsSince === 0) {
    return zeroAmount;
  }
  return periodYield.divide(secondsSince);
}

export function useFeeAPY(
  pool: Pool,
  baseToken: Token,
  uncollectedFees: CurrencyAmount<Token>[],
  transactions: any
) {
  return useMemo(() => {
    const zeroAmount = CurrencyAmount.fromRawAmount(baseToken, 0);

    if (!transactions.length) {
      return zeroAmount;
    }

    const periodYieldsPerSecond = [];
    let periodLiquidityAdded = zeroAmount;
    let periodLiquidityRemoved = zeroAmount;
    let periodStart = new Date();

    transactions.forEach(
      ({
        type,
        amount0,
        amount1,
        timestamp,
      }: {
        type: string;
        amount0: CurrencyAmount<Token>;
        amount1: CurrencyAmount<Token>;
        timestamp: number;
      }) => {
        let liquidity = calcLiquidity(pool, baseToken, amount0, amount1);
        if (type === "mint") {
          if (
            periodLiquidityAdded.lessThan(zeroAmount) ||
            periodLiquidityAdded.equalTo(zeroAmount)
          ) {
            periodStart = new Date(timestamp * 1000);
          }
          periodLiquidityAdded = periodLiquidityAdded.add(liquidity);
        } else if (type === "burn") {
          periodLiquidityRemoved = periodLiquidityRemoved.add(liquidity);
        } else if (type === "collect") {
          const periodEnd = new Date(timestamp * 1000);
          const periodYield = calcPeriodYield(
            liquidity,
            periodLiquidityAdded,
            periodStart,
            periodEnd
          );
          periodYieldsPerSecond.push(periodYield);

          // reset period
          periodLiquidityAdded = periodLiquidityAdded.subtract(
            periodLiquidityRemoved
          );
          periodLiquidityRemoved = zeroAmount;
          periodStart = periodEnd;
        }
      }
    );

    // calculate uncollected fee yield
    const totalUncollectedFees =
      uncollectedFees.length > 1
        ? calcLiquidity(pool, baseToken, uncollectedFees[0], uncollectedFees[1])
        : uncollectedFees[0];
    if (!totalUncollectedFees.equalTo(zeroAmount)) {
      const uncollectedYield = calcPeriodYield(
        totalUncollectedFees,
        periodLiquidityAdded,
        periodStart,
        new Date()
      );
      periodYieldsPerSecond.push(uncollectedYield);
    }

    let totalYield = CurrencyAmount.fromRawAmount(baseToken, 0);
    periodYieldsPerSecond.forEach((y) => (totalYield = totalYield.add(y)));

    if (!periodYieldsPerSecond.length) {
      return zeroAmount;
    }

    const yearInSeconds = 365 * 24 * 60 * 60;
    return parseFloat(
      totalYield
        .divide(periodYieldsPerSecond.length)
        .multiply(yearInSeconds)
        .multiply(100)
        .toFixed(2)
    );
  }, [transactions, pool, baseToken, uncollectedFees]);
}
