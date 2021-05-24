import { BigNumber } from "@ethersproject/bignumber";

export interface PositionFields {
  tickLower: number;
  tickUpper: number;
  liquidity: BigNumber;
}

export enum PositionStatus {
  Inactive,
  InRange,
  OutRange,
}
export function getPositionStatus(
  tickCurrent: number,
  position: PositionFields
): PositionStatus {
  if (position.liquidity.isZero()) {
    return PositionStatus.Inactive;
  } else {
    return position.tickLower < tickCurrent && tickCurrent < position.tickUpper
      ? PositionStatus.InRange
      : PositionStatus.OutRange;
  }
}