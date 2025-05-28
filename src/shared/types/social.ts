export interface InvitationContext {
  websiteCategory: string
  behaviorPattern: any
  timeOfDay: string
  inferredEmotion: string
  creatorOrganismId: string
}

export type InvitationCode = string

export interface SharedMutationResult {
  id: string
  traitChanges: Record<string, number>
  compatibility: number
  timestamp: number
  mutationType: string
}

export type CollectiveTrigger = string
export interface WakeResult {
  success: boolean
  details?: string
} 