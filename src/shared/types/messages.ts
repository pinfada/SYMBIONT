export type SymbiontMessageType =
  | 'CREATE_ORGANISM'
  | 'EVOLVE_ORGANISM'
  | 'PREDICT_ACTION'
  | 'GENERATE_INVITATION'
  | 'SHARED_MUTATION'
  | 'TRIGGER_RITUAL'
  | 'GET_ORGANISM_STATE'
  | 'GET_HISTORY'
  | 'APPLY_VISUAL_MUTATION'
  | 'PING'

export interface SymbiontMessage {
  type: SymbiontMessageType
  payload?: any
}

export interface SymbiontResponse {
  success: boolean
  data?: any
  error?: string
} 