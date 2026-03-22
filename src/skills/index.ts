import { Skill } from "./types";

export type { Skill, SkillParam, SkillContext, SkillResult } from "./types";

// ---------------------------------------------------------------------------
// Skill Imports - Existing Skills
// ---------------------------------------------------------------------------

import { portfolioPulse } from "./portfolioPulse";
import { dcaStrategist } from "./dcaStrategist";
import { fearIndex } from "./fearIndex";
import { whaleRadar } from "./whaleRadar";
import { rugShield } from "./rugShield";
import { newsRadar } from "./newsRadar";
import { tradeJournal } from "./tradeJournal";
import { onboardingGuide } from "./onboardingGuide";
import { councilAnalyzer } from "./councilAnalyzer";
import { consensusDetector } from "./consensusDetector";
import { verdictSynthesizer } from "./verdictSynthesizer";
import { institutionalFlow } from "./institutionalFlow";

// ---------------------------------------------------------------------------
// Skill Imports - New Binance Web3 Skills
// ---------------------------------------------------------------------------

import { cryptoMarketRank } from "./cryptoMarketRank";
import { memeRush } from "./memeRush";
import { addressInfo } from "./addressInfo";
import { tokenAudit } from "./tokenAudit";
import { tokenInfo } from "./tokenInfo";
import { tradingSignal } from "./tradingSignal";
import { spot } from "./spot";
import { squarePost } from "./squarePost";

// ---------------------------------------------------------------------------
// Skill Imports - New Analysis Skills
// ---------------------------------------------------------------------------

import { technicalIndicators } from "./technicalIndicators";
import { orderBookAnalysis } from "./orderBookAnalysis";
import { volumeAnalysis } from "./volumeAnalysis";
import { priceAlerts } from "./priceAlerts";
import { exchangeStats } from "./exchangeStats";
import { futuresData } from "./futuresData";

// ---------------------------------------------------------------------------
// Skill Imports - BSC On-Chain Skills
// ---------------------------------------------------------------------------

import { bscWalletTracker } from "./bsc/bscWalletTracker";
import { bscTransactionAnalyzer } from "./bsc/bscTransactionAnalyzer";
import { bscBlockExplorer } from "./bsc/bscBlockExplorer";
import { bscTokenOnChain } from "./bsc/bscTokenOnChain";
import { bscNftPortfolio } from "./bsc/bscNftPortfolio";
import { bscContractReader } from "./bsc/bscContractReader";
import { bscWhaleMovement } from "./bsc/bscWhaleMovement";
import { sniperDetector } from "./bsc/bscSniperDetector";
import { walletCluster } from "./bsc/bscWalletCluster";
import { burnTracker } from "./bsc/bscBurnTracker";

// ---------------------------------------------------------------------------
// Skill Imports - Advanced Futures Analytics (binance-intelligence-mcp)
// ---------------------------------------------------------------------------

import { smartAccumulation } from "./futures/smartAccumulation";
import { smartMoneyRadar } from "./futures/smartMoneyRadar";
import { whaleFootprint } from "./futures/whaleFootprint";
import { marketImpact } from "./futures/marketImpact";
import { fundingHeatmap } from "./futures/fundingHeatmap";
import { patterns } from "./futures/patterns";
import { correlation } from "./futures/correlation";
import { regime } from "./futures/regime";
import { dcaBacktester } from "./futures/dcaBacktester";
import { volatilityRank } from "./futures/volatilityRank";
import { takerPressure } from "./futures/takerPressure";
import { oiSurge } from "./futures/oiSurge";
import { fundingExtremes } from "./futures/fundingExtremes";
import { fundingHistory } from "./futures/fundingHistory";
import { basisSpread } from "./futures/basisSpread";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  portfolioPulse,
  dcaStrategist,
  fearIndex,
  whaleRadar,
  rugShield,
  newsRadar,
  tradeJournal,
  onboardingGuide,
  councilAnalyzer,
  consensusDetector,
  verdictSynthesizer,
  institutionalFlow,
  cryptoMarketRank,
  memeRush,
  addressInfo,
  tokenAudit,
  tokenInfo,
  tradingSignal,
  spot,
  squarePost,
  technicalIndicators,
  orderBookAnalysis,
  volumeAnalysis,
  priceAlerts,
  exchangeStats,
  futuresData,
  bscWalletTracker,
  bscTransactionAnalyzer,
  bscBlockExplorer,
  bscTokenOnChain,
  bscNftPortfolio,
  bscContractReader,
  bscWhaleMovement,
  sniperDetector,
  walletCluster,
  burnTracker,
  smartAccumulation,
  smartMoneyRadar,
  whaleFootprint,
  marketImpact,
  fundingHeatmap,
  patterns,
  correlation,
  regime,
  dcaBacktester,
  volatilityRank,
  takerPressure,
  oiSurge,
  fundingExtremes,
  fundingHistory,
  basisSpread,
};

export const SKILL_INSTANCES: Record<string, Skill> = {
  portfolioPulse,
  dcaStrategist,
  fearIndex,
  whaleRadar,
  rugShield,
  newsRadar,
  tradeJournal,
  onboardingGuide,
  councilAnalyzer,
  consensusDetector,
  verdictSynthesizer,
  institutionalFlow,
  cryptoMarketRank,
  memeRush,
  addressInfo,
  tokenAudit,
  tokenInfo,
  tradingSignal,
  spot,
  squarePost,
  technicalIndicators,
  orderBookAnalysis,
  volumeAnalysis,
  priceAlerts,
  exchangeStats,
  futuresData,
  bscWalletTracker,
  bscTransactionAnalyzer,
  bscBlockExplorer,
  bscTokenOnChain,
  bscNftPortfolio,
  bscContractReader,
  bscWhaleMovement,
  sniperDetector,
  walletCluster,
  burnTracker,
  smartAccumulation,
  smartMoneyRadar,
  whaleFootprint,
  marketImpact,
  fundingHeatmap,
  patterns,
  correlation,
  regime,
  dcaBacktester,
  volatilityRank,
  takerPressure,
  oiSurge,
  fundingExtremes,
  fundingHistory,
  basisSpread,
};

// ---------------------------------------------------------------------------
// Skill Registry — lookup by id
// ---------------------------------------------------------------------------

const ALL_SKILLS: Skill[] = [
  portfolioPulse,
  dcaStrategist,
  fearIndex,
  whaleRadar,
  rugShield,
  newsRadar,
  tradeJournal,
  onboardingGuide,
  councilAnalyzer,
  consensusDetector,
  verdictSynthesizer,
  institutionalFlow,
  cryptoMarketRank,
  memeRush,
  addressInfo,
  tokenAudit,
  tokenInfo,
  tradingSignal,
  spot,
  squarePost,
  technicalIndicators,
  orderBookAnalysis,
  volumeAnalysis,
  priceAlerts,
  exchangeStats,
  futuresData,
  bscWalletTracker,
  bscTransactionAnalyzer,
  bscBlockExplorer,
  bscTokenOnChain,
  bscNftPortfolio,
  bscContractReader,
  bscWhaleMovement,
  sniperDetector,
  walletCluster,
  burnTracker,
  smartAccumulation,
  smartMoneyRadar,
  whaleFootprint,
  marketImpact,
  fundingHeatmap,
  patterns,
  correlation,
  regime,
  dcaBacktester,
  volatilityRank,
  takerPressure,
  oiSurge,
  fundingExtremes,
  fundingHistory,
  basisSpread,
];

export const skillRegistry = new Map<string, Skill>(ALL_SKILLS.map((s) => [s.id, s]));

/**
 * Look up a skill by its full namespaced id.
 * @example getSkill('claw-council/rug-shield')
 */
export function getSkill(id: string): Skill | undefined {
  return skillRegistry.get(id);
}
