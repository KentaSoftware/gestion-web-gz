export const SIMULATION_DATA_QUALITY = {
  COMPLETE: 'COMPLETE',
  INCOMPLETE: 'INCOMPLETE',
} as const

export type SimulationDataQuality =
  (typeof SIMULATION_DATA_QUALITY)[keyof typeof SIMULATION_DATA_QUALITY]

export const SIMULATION_VIABILITY = {
  VIABLE: 'VIABLE',
  NOT_VIABLE: 'NOT_VIABLE',
  INCOMPLETE: 'INCOMPLETE',
} as const

export type SimulationViability =
  (typeof SIMULATION_VIABILITY)[keyof typeof SIMULATION_VIABILITY]

export const SIMULATION_RISK_CODES = {
  INCOMPLETE_DATA: 'INCOMPLETE_DATA',
  CAPACITY_EXCEEDED_WEIGHT: 'CAPACITY_EXCEEDED_WEIGHT',
  CAPACITY_EXCEEDED_VOLUME: 'CAPACITY_EXCEEDED_VOLUME',
  NEGATIVE_MARGIN: 'NEGATIVE_MARGIN',
} as const

export type SimulationRiskCode =
  (typeof SIMULATION_RISK_CODES)[keyof typeof SIMULATION_RISK_CODES]

export const SIMULATION_ERROR_CODES = {
  DISABLED: 'SIMULATION_DISABLED',
  CONTRACT_NOT_APPROVED: 'SIMULATION_CONTRACT_NOT_APPROVED',
  CONTRACT_INCOMPATIBLE: 'SIMULATION_CONTRACT_INCOMPATIBLE',
  SNAPSHOT_INCOMPLETE: 'SIMULATION_SNAPSHOT_INCOMPLETE',
  BASE_SCENARIO_INVALID: 'SIMULATION_BASE_SCENARIO_INVALID',
  TOKEN_INVALID: 'SIMULATION_TOKEN_INVALID',
  TOKEN_EXPIRED: 'SIMULATION_TOKEN_EXPIRED',
  INPUT_INVALID: 'SIMULATION_INPUT_INVALID',
  RUN_NOT_FOUND: 'SIMULATION_RUN_NOT_FOUND',
  RUN_TRANSITION_INVALID: 'SIMULATION_RUN_TRANSITION_INVALID',
  EVIDENCE_IMMUTABLE: 'SIMULATION_EVIDENCE_IMMUTABLE',
  CONFIGURATION_UNAVAILABLE: 'SIMULATION_CONFIGURATION_UNAVAILABLE',
  PRODUCER_UNAVAILABLE: 'SIMULATION_PRODUCER_UNAVAILABLE',
  REPOSITORY_ERROR: 'SIMULATION_REPOSITORY_ERROR',
} as const

export type SimulationErrorCode =
  (typeof SIMULATION_ERROR_CODES)[keyof typeof SIMULATION_ERROR_CODES]

export interface SimulationErrorEnvelope {
  code: SimulationErrorCode
  message: string
  correlationId?: string
}

export interface SimulationSnapshotHandleVersions {
  routeContractVersion: string
  stockContractVersion: string
  rulesVersion: string
}

export interface SimulationBaseScenarioInput {
  routeId: string
}

export interface SimulationBaseScenarioCompleteResult {
  dataQuality: typeof SIMULATION_DATA_QUALITY.COMPLETE
  token: string
  baseScenarioHash: string
  versions: SimulationSnapshotHandleVersions
}

export interface SimulationBaseScenarioIncompleteResult {
  dataQuality: typeof SIMULATION_DATA_QUALITY.INCOMPLETE
  error: SimulationErrorEnvelope
  missingField?: string
}

export type SimulationBaseScenarioResult =
  | SimulationBaseScenarioCompleteResult
  | SimulationBaseScenarioIncompleteResult

export interface SimulationOverride {
  key: string
  value: number
}

export interface SimulationDirectLoadLine {
  productId: string
  quantity: number
  projectedSalesQuantity: number
}

export interface SimulationVariantInput {
  name: string
  presetVersionId?: string
  overrides: SimulationOverride[]
  directLoad: SimulationDirectLoadLine[]
}

export interface SimulationCalculationComponent {
  code: string
  amountArs: number
}

export interface SimulationCalculationTotals {
  revenueArs: number
  merchandiseCostArs: number
  operatingCostArs: number
  marginArs: number
}

export interface SimulationCalculationResult {
  baseScenarioHash: string
  variantId: string
  dataQuality: typeof SIMULATION_DATA_QUALITY.COMPLETE
  viability: SimulationViability
  recommended: boolean
  risks: SimulationRiskCode[]
  components: SimulationCalculationComponent[]
  totals: SimulationCalculationTotals
  calculatedAt: string
}

export interface SimulationIncompleteCalculationResult {
  baseScenarioHash: string
  variantId: string
  dataQuality: typeof SIMULATION_DATA_QUALITY.INCOMPLETE
  viability: typeof SIMULATION_VIABILITY.INCOMPLETE
  recommended: false
  risks: SimulationRiskCode[]
  missingFields: string[]
  calculatedAt: string
}

export type SimulationVariantCalculationResult =
  | SimulationCalculationResult
  | SimulationIncompleteCalculationResult
