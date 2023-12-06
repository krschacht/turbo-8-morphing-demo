import {CallParticipantModel} from "./CallParticipantModel"

export interface CallModel {
    id: number
    key: string
    started_by_person_id: number
    started_by_person_key: string
    participants: CallParticipantModel[]
    created_at: string
    ended_at?: string
    voice_filter: string
    voice_filter_changed_by_person_key?: string
}
