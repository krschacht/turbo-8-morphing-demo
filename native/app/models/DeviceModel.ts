import AuthenticationModel from "./AuthenticationModel"
import { Platform } from 'react-native'

export interface DeviceModel {
    id: number
    key: string
    installation_key: string
    person_id: number
    authentication?: AuthenticationModel | null

    environment?: string
    time_zone_offset_in_minutes?: number
    category?: 'phone' | 'tablet' | 'desktop' | 'tv' | 'unknown'
    platform?: typeof Platform.OS;
    server_update_number?: number | null
    client_update_number?: number | null
    expo_push_token?: string
    ios_push_token?: string
    ios_pushkit_token?: string
    android_push_token?: string

    fingerprint_referrer?: string | null
}

export default DeviceModel

export interface DeviceAttributes extends Partial<DeviceModel> {}