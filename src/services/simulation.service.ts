import apiClient from '@/utils/client'
import {
  SIMULATION_DATA_QUALITY,
  type SimulationBaseScenarioInput,
  type SimulationBaseScenarioResult,
  type SimulationVariantCalculationResult,
  type SimulationVariantInput,
} from '@/interfaces/simulation.interface'

const BASE_SCENARIOS_URL = '/simulation/base-scenarios'

export interface SimulationFailure {
  code?: string
  message: string
  correlationId?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isBaseScenarioResult = (value: unknown): value is SimulationBaseScenarioResult => {
  if (!isRecord(value)) return false

  if (value.dataQuality === SIMULATION_DATA_QUALITY.COMPLETE) {
    return typeof value.token === 'string' && typeof value.baseScenarioHash === 'string'
  }

  if (value.dataQuality === SIMULATION_DATA_QUALITY.INCOMPLETE) {
    return isRecord(value.error)
  }

  return false
}

const isErrorEnvelope = (
  value: unknown,
): value is { code: string; message: string; correlationId?: string } =>
  isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string'

const envelopeFrom = (value: unknown): SimulationFailure | null => {
  if (isErrorEnvelope(value)) {
    return {
      code: value.code,
      message: value.message,
      correlationId:
        typeof value.correlationId === 'string' ? value.correlationId : undefined,
    }
  }

  if (isRecord(value) && isErrorEnvelope(value.error)) {
    return {
      code: value.error.code,
      message: value.error.message,
      correlationId:
        typeof value.error.correlationId === 'string' ? value.error.correlationId : undefined,
    }
  }

  return null
}

/**
 * Reads only the safe error envelope returned by the simulation API. It never
 * reads producer payloads and never substitutes a local simulation result.
 */
export const simulationFailureFrom = (error: unknown): SimulationFailure => {
  if (isRecord(error)) {
    const response = error.response
    if (isRecord(response)) {
      const failure = envelopeFrom(response.data)
      if (failure !== null) return failure
    }
  }

  return { message: 'No se pudo completar la solicitud de simulación.' }
}

/**
 * Creates a temporary base-scenario handle on the server. The server owns the
 * route/Stock snapshots and fail-closed gates; the client sends only `routeId`.
 * An FR-002 incomplete result is a server response, not a client-side state, so
 * it is returned to the caller instead of being treated as a transport error.
 */
export const simulationService = {
  createBaseScenario: async (
    input: SimulationBaseScenarioInput,
  ): Promise<SimulationBaseScenarioResult> => {
    try {
      const response = await apiClient.post<SimulationBaseScenarioResult>(
        BASE_SCENARIOS_URL,
        input,
      )
      return response.data
    } catch (error) {
      if (isRecord(error)) {
        const response = error.response
        if (isRecord(response) && isBaseScenarioResult(response.data)) {
          return response.data
        }
      }
      throw error
    }
  },

  /**
   * Sends the server-issued token and the permitted variant inputs. All amounts,
   * viability and recommendation values in the response belong to the server.
   */
  calculateVariant: async (
    token: string,
    input: SimulationVariantInput,
  ): Promise<SimulationVariantCalculationResult> => {
    const response = await apiClient.post<SimulationVariantCalculationResult>(
      `${BASE_SCENARIOS_URL}/${encodeURIComponent(token)}/variants/calculate`,
      input,
    )
    return response.data
  },
}
