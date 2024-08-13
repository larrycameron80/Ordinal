export const calcLPTokenAmount = async (
  btcAmount: number,
  runeAmount: number
) => {
  return btcAmount + runeAmount;
};

export const calcEstimateAmount = async (
  baseAmount: number,
  direction: string
) => {
  return direction == "rune" ? baseAmount * 10000 : baseAmount / 10000;
};

export const calcPlatformFee = (btcAmount: number) => {
  return 2000;
}