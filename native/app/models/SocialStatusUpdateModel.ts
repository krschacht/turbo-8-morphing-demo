import {CallModel} from "./CallModel"

export interface SocialStatusUpdateModel {
    success: boolean
    friend_presences: string[]
    active_calls: CallModel[]
    call_presences: string[]
    channels: string[]
    chat_token: string
    outgoing_friend_request_profiles: string[]
    profile: string
    presence: string
    not_read_message_stories_count: number
    read_message_stories_count: number
    feed_stories_count: number
}
