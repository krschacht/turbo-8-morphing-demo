import {CallModel} from "./CallModel"

export interface CallConnectionModel {
    channel: string
    token: string
    uid: number
    call: CallModel
}