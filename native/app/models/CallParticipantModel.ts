
export interface CallParticipantModel {
    id: number
    person_id: number
    person_key: string
    person_verified: boolean
    token: string
    last_joined_at?: string
    left_call_at?: string
    profile: string
    story_type: 'Participant'
}