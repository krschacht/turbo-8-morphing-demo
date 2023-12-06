import DeviceModel from "./DeviceModel"

export interface PersonModel {
    id: number
    key: string
    device?: DeviceModel | null
    age?: number
    child?: boolean
    properties?: any
    school_id?: number
    activated_at: string | null | undefined
    verified_at: string | null | undefined
    parent_email_verified: boolean | undefined
}

export default PersonModel
