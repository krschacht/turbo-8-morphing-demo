import {action, makeObservable, observable} from "mobx"
import {PermissionsAndroid, Platform} from 'react-native'
import {AsyncUtils} from "../utils/AsyncUtils"
import SentryService from "./SentryService"
import {HttpError} from "./RailsAPIService"
import {CallModel} from "../models/CallModel"
import {CallUtils} from "../utils/CallUtils"
import {CallParticipantModel} from "../models/CallParticipantModel"
import {SocialStatusUpdateModel} from "../models/SocialStatusUpdateModel"
import {CurrentAccount} from "../../Root/CurrentAccount"
import {CallConnectionModel} from "../models/CallConnectionModel"
import {VoipPushNotification} from "../utils/VoipPushNotification"
import {RNCallKeep} from "../utils/RNCallKeep"
import PersonModel from "../models/PersonModel"

const CALL_KIT_VIDEO_ENABLED = true
const INCOMING_CALL_TIMEOUT_MS = 28000
const OUTGOING_CALL_TIMEOUT_MS = 30000

export class CallService {

    constructor() { }

    public async initialize(currentAccount: CurrentAccount) {}

    public uninitialize() { }


    // USER ACTIONS TO JOIN CALL

    private handleRingingNotificationNativeEvent(notification: any) { }

    private async helperToJoinCallInApp(call: CallModel, trigger: string) { }

    private async helperToStartCallNatively(call: CallModel) { }

    public async rejoinCallAfterInitializeFromCrash() { }

    public async handleAnswerCallFromNativeRingingUI(args: any) { }

    public async handleAnswerCallFromAndroidPushNotification(callKey: string) { }

    public async joinCallFromInboxOrChannel(call: CallModel, trigger: string) { }

    public async startCallFromAppUIAndJoinCall(personKeys: string[], trigger?: string) { }


    // USER ACTIONS TO LEAVE CALL

    public async leaveCallFromAppUI() { }

    public async handleEndCallNativeEvent(args: any) { }

    private async helperToLeaveActiveCall(callKey: string, source?: string) { }


    // OTHER USER ACTIONS WHICH ALTER CALLS

    public async inviteToCall(people: PersonModel[]) { }


    // PERIODIC POLL FOR SERVER ACTIONS TO ALTER CALLS

    private helperIsActiveCallParticipant(participant: CallParticipantModel) { }

    public async onAppPoll(statusResponse: SocialStatusUpdateModel) { }


    // PRIVATE INTERNAL SETTER ACTIONS

    @action
    private setActiveCallConnection(callConnection: CallConnectionModel | undefined) { }

    private updateActiveCallConnectionFromCallAndParticipant(call: CallModel | undefined, participant?: CallParticipantModel) { }

    @action
    private setMakingOutgoingCall(makingOutgoingCall: boolean) { }

    @action
    private setShowCallWindow(showCallWindow: boolean) { }


    // OTHER PRIVATE HELPERS

    private nativeRNCallKeepOptions() { }

    private async reportNativeEndCallButNotByUser(uuid: string, reason: number) { }

    private logEvent(thing: string, happened: string, note: string|undefined, props: any, callKey: string|undefined) { }

    private consoleDebug(method: string, force: boolean = false) { }
}