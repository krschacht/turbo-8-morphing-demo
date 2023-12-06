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
    private debug: boolean = false  // don't set this to true in production

    private currentAccount!: CurrentAccount

    private outgoingCallTimeout?: any
    private nativeStartCallTimeout?: any
    private incomingCallTimeout?: any
    private joiningCallDebouncer: boolean = false

    @observable activeCallConnection?: CallConnectionModel // renders Agora call window
    @observable showCallWindow: boolean = false // force pops up the full-screen call overlay
    @observable isMakingOutgoingCall: boolean = false // show spinner on call window

    get myProfilePersonId() { return this.currentAccount.person.id }


    // INIT

    constructor() {
        makeObservable(this)
    }

    public async initialize(currentAccount: CurrentAccount) {
        if (Platform.OS == 'web') return
        this.logEvent('call-service', 'initializing', undefined, { platformOS: Platform.OS, voip_options: this.nativeRNCallKeepOptions() }, undefined)

        this.currentAccount = currentAccount
        this.currentAccount.personData.incomingCallKey = null

        const helperToRegisterOnVoipPushNotification = async(token: any) => {
            try {
                await this.currentAccount.api.patch('vizz_account.device_path', { device: { ios_pushkit_token: token } })
            } catch (error) {
                SentryService.captureError(error)
            }
        }

        if (Platform.OS == 'ios') {
            //TODO: Investigate if we can replace this with Wix notification
            VoipPushNotification.addEventListener('register', async(token) => helperToRegisterOnVoipPushNotification(token))
            VoipPushNotification.addEventListener('notification', (notification) => this.handleRingingNotificationNativeEvent(notification))
            VoipPushNotification.addEventListener('didLoadWithEvents', async(events) => {
                if (!events || !Array.isArray(events) || events.length < 1) return
                this.logEvent('call-service', 'voip-load-with-events', undefined, {events: events}, undefined)

                // Fires when events occured before js bridge initialized. Execute event handlers manually by type.
                for (let voipPushEvent of events) {
                    const {name, data} = voipPushEvent
                    if (name == "RNVoipPushRemoteNotificationsRegisteredEvent") await helperToRegisterOnVoipPushNotification(data)
                    if (name == 'RNVoipPushRemoteNotificationReceivedEvent') this.handleRingingNotificationNativeEvent(data)
                }
            })

            VoipPushNotification.registerVoipToken()

            RNCallKeep.addEventListener('answerCall', (args) => this.handleAnswerCallFromNativeRingingUI(args))
            RNCallKeep.addEventListener('endCall', (args) => this.handleEndCallNativeEvent(args))
            RNCallKeep.addEventListener('didLoadWithEvents', (events) => {
                if (!events || !Array.isArray(events) || events.length < 1) return
                this.logEvent('call-service', 'rn-load-with-events', undefined, {events: events}, undefined)

                for (let RNCallKeepEvent of events) {
                    const {name, data} = RNCallKeepEvent
                    if (name == 'RNCallKeepPerformAnswerCallAction') void this.handleAnswerCallFromNativeRingingUI(data)
                    if (name == 'RNCallKeepPerformEndCallAction') void this.handleEndCallNativeEvent(data)
                }
            })
        }

        await this.rejoinCallAfterInitializeFromCrash()
    }

    public uninitialize() {
        if (Platform.OS == 'ios') {
            VoipPushNotification.removeEventListener('register')
            VoipPushNotification.removeEventListener('notification')
            VoipPushNotification.removeEventListener('didLoadWithEvents')

            RNCallKeep.removeEventListener('answerCall')
            RNCallKeep.removeEventListener('endCall')
            RNCallKeep.removeEventListener('didLoadWithEvents')
        }

        if (this.nativeStartCallTimeout) { clearTimeout(this.nativeStartCallTimeout); this.nativeStartCallTimeout = undefined }
        if (this.outgoingCallTimeout) {
            clearTimeout(this.outgoingCallTimeout)
            this.outgoingCallTimeout = undefined

            if (this.activeCallConnection) {
                const callKey = this.activeCallConnection?.call.key
                void this.helperToLeaveActiveCall(callKey, 'outgoingCallTimeout')
                void this.reportNativeEndCallButNotByUser(callKey, 0)
            }
        }
        if (this.incomingCallTimeout) {
            clearTimeout(this.incomingCallTimeout)
            if (this.currentAccount.personData.incomingCallKey) {
                this.logEvent('call-service', 'uninitialize-reject', undefined, {}, this.currentAccount.personData.incomingCallKey)
                RNCallKeep.rejectCall(this.currentAccount.personData.incomingCallKey)
            }
            this.incomingCallTimeout = null
            this.currentAccount.personData.incomingCallKey = null
        }

        if (Platform.OS == 'ios') {
            // If we are tearing down this class, make sure we leave CallKit in a good state.
            RNCallKeep.endAllCalls()
        }
    }


    // USER ACTIONS TO JOIN CALL

    private handleRingingNotificationNativeEvent(notification: any) {
        this.logEvent('call-service', 'handleRingingNotificationNativeEvent', undefined, {notificaton: notification}, notification.call.key)
        this.consoleDebug(`handleRingingNotificationNativeEvent(${JSON.stringify(notification, null, 4)})`)

        this.currentAccount.personData.incomingCallKey = notification.call.key

        this.incomingCallTimeout = setTimeout(() => {
            this.consoleDebug(`handleRingingNotificationNativeEvent - setTimeout fired to now rejectCall(${notification.call.key})`)
            this.logEvent('call-service', 'ring-timeout', undefined, {}, notification.call.key)
            this.incomingCallTimeout = null
            this.currentAccount.personData.incomingCallKey = null
            RNCallKeep.rejectCall(notification.call.key)
        }, INCOMING_CALL_TIMEOUT_MS) // Stop the call ringing if not answered by this time. Answering call will clear timeout.

        VoipPushNotification.onVoipNotificationCompleted(notification.call.key) // Tells iOS we've processed the start of ringing
    }

    private async helperToJoinCallInApp(call: CallModel, trigger: string) {
        this.consoleDebug(`helperToJoinCallInApp(${call.key}, ${trigger})`)

        const selfParticipant = CallUtils.participantMatchingPerson(call, this.myProfilePersonId)
        if (!selfParticipant) throw Error(`This user ${this.myProfilePersonId} is not a participant in the call: ${call.key}`)

        try {
            await this.currentAccount.api.patch('social.join_participants_path', { call_key: call.key })
        } catch(error) {
            if (!(error instanceof HttpError)) throw error

            const isNotFound = error.status == "not_found"
            // This situation is occurring fairly often and they are all "Call has ended" 404s. We don't know exactly why it's so
            // frequent but the best guess is delayed ringing push notifications. We are going to gracefully handle this situation
            // The precise way to handle depends on which place we called helperToJoinCallInApp() so we need to bubble up this
            // exception one step. This "action" note is what we use further up the stack to know which specific not_found this is.
            if (isNotFound) error.action = "skip_because_call_not_found"

            throw error
        }

        this.updateActiveCallConnectionFromCallAndParticipant(call, selfParticipant)

        this.logEvent('social-call', 'joined', `${call.participants.length} friends`, {
            trigger: trigger,
            profiles: call.participants.map((p) => p.profile),
            number_of_friends: call.participants.length,
        }, call.key)
    }

    private async helperToStartCallNatively(call: CallModel) {
        if (Platform.OS != 'ios') return

        this.logEvent('call-service', 'helperToStartCallNatively', undefined, {call: call}, call.key)

        const selfParticipant = CallUtils.participantMatchingPerson(call, this.myProfilePersonId)
        if (!selfParticipant) {
            this.setShowCallWindow(false)
            return
        }

        const personProfileToCall = CallUtils.participantProfilesExcludingPerson(call, this.currentAccount.person.id).at(0)
        if (!personProfileToCall) return

        RNCallKeep.startCall(call.key, personProfileToCall, undefined, 'generic', CALL_KIT_VIDEO_ENABLED)

        this.nativeStartCallTimeout = setTimeout(() => {
            this.consoleDebug('Setting active CallKit call.')
            RNCallKeep.setCurrentCallActive(call.key)
        }, 1000) //Timeout from RNCallKeep sample code, might be Android only
    }

    public async rejoinCallAfterInitializeFromCrash() {
        this.consoleDebug(`rejoinCallAfterInitializeFromCrash`)
        this.logEvent('call-service', 'check-for-rejoin', undefined, {}, undefined)

        // Attempt to prevent any end call race conditions if we are about to answer a call.
        await AsyncUtils.sleep(2500) //TODO: Ensures that any call we may have been answering has completed first. Better fix?

        if (this.activeCallConnection) return
        if (this.joiningCallDebouncer) return
        this.joiningCallDebouncer = true

        if (this.currentAccount.personData.activeCallKey) {
            this.logEvent('call-service', 'rejoin-call', undefined, {}, this.currentAccount.personData.activeCallKey)

            this.setShowCallWindow(true)

            try {
                const callOnServer = await this.currentAccount.api.get(`social.call_path(${this.currentAccount.personData.activeCallKey})`) as CallModel

                if (callOnServer && !callOnServer.ended_at) {
                    this.consoleDebug(`rejoinCallAfterInitializeFromCrash: rejoin call`)
                    await this.helperToJoinCallInApp(callOnServer, 'restore-call')
                    await this.helperToStartCallNatively(callOnServer)
                } else {
                    this.logEvent('call-service', 'rejoin-call-failed-missing-call', undefined, {}, this.currentAccount.personData.activeCallKey)
                }
            } catch (error) {
                this.setShowCallWindow(false)
                this.currentAccount.personData.activeCallKey = null

                const skipBecauseCallNotFound = (error instanceof HttpError) && error.action == "skip_because_call_not_found"
                if (!skipBecauseCallNotFound) SentryService.captureError(error)
            }
        }

        this.joiningCallDebouncer = false
    }

    public async handleAnswerCallFromNativeRingingUI(args: any) {
        this.consoleDebug(`handleAnswerCallFromNativeRingingUI ${JSON.stringify(args, null, 4)}`)
        this.logEvent('call-service', 'handleAnswerCallFromNativeRingingUI', undefined, {args: args}, args.callUUID)

        if (this.joiningCallDebouncer) return
        this.joiningCallDebouncer = true

        this.setShowCallWindow(true)

        if (this.incomingCallTimeout) { clearTimeout(this.incomingCallTimeout); this.incomingCallTimeout = this.currentAccount.personData.incomingCallKey = null }

        const callKey = args.callUUID

        try {
            const call = await this.currentAccount.api.get(`social.call_path(${callKey})`) as CallModel

            if (call) {
                this.logEvent('social-call', 'tapped', `${call.participants.length} friends`, {
                    profiles: call.participants.map((p) => p.profile),
                    trigger: "notification",
                    number_of_friends: call.participants.length
                }, call.key)

                if (this.currentAccount.personData.activeCallKey && !this.activeCallConnection) { // stale call to clean up before answering new
                    try {
                        await this.currentAccount.api.delete('social.participants_path', { call_key: this.currentAccount.personData.activeCallKey, leave_even_if_joined: true })
                        this.logEvent('social-call', 'stale-cleanup', undefined, undefined, call.key)
                    } catch (error) { console.warn('API error when leaving a stale call', error) }
                }

                await this.helperToJoinCallInApp(call, "notification")
                await this.helperToStartCallNatively(call)
            } else {
                throw new Error('Error trying to answer call')
            }
        } catch(error) {
            this.setShowCallWindow(false)
            this.joiningCallDebouncer = false

            // Make sure we clean up CallKit
            RNCallKeep.endAllCalls()

            const skipBecauseCallNotFound = (error instanceof HttpError) && error.action == "skip_because_call_not_found"
            if (!skipBecauseCallNotFound) SentryService.captureError(error, `Failed to answer: ${callKey}`)
        }

        this.joiningCallDebouncer = false
    }

    public async handleAnswerCallFromAndroidPushNotification(callKey: string) {
        this.consoleDebug(`handleAnswerCallFromAndroidPushNotification ${callKey}`)
        this.logEvent('call-service', 'handleAnswerCallFromAndroidPushNotification', undefined, {}, callKey)

        if (this.joiningCallDebouncer) return
        this.joiningCallDebouncer = true

        this.setShowCallWindow(true)

        if (this.incomingCallTimeout) { clearTimeout(this.incomingCallTimeout); this.incomingCallTimeout = this.currentAccount.personData.incomingCallKey = null }

        try {
            const call = await this.currentAccount.api.get(`social.call_path(${callKey})`) as CallModel

            if (call) {
                this.logEvent('social-call', 'tapped', `${call.participants.length} friends`, {
                    profiles: call.participants.map((p) => p.profile),
                    trigger: "notification",
                    number_of_friends: call.participants.length
                }, call.key)

                if (this.currentAccount.personData.activeCallKey && !this.activeCallConnection) { // stale call to clean up before answering new
                    try {
                        await this.currentAccount.api.delete('social.participants_path', { call_key: this.currentAccount.personData.activeCallKey, leave_even_if_joined: true })
                        this.logEvent('social-call', 'stale-cleanup', undefined, undefined, call.key)
                    } catch (error) { console.warn('API error when leaving a stale call', error) }
                }

                await this.helperToJoinCallInApp(call, "notification")
            } else {
                throw new Error('Error trying to answer call')
            }
        } catch(error) {
            this.setShowCallWindow(false)
            this.joiningCallDebouncer = false

            const skipBecauseCallNotFound = (error instanceof HttpError) && error.action == "skip_because_call_not_found"
            if (!skipBecauseCallNotFound) SentryService.captureError(error, `Failed to answer: ${callKey}`)
        }

        this.joiningCallDebouncer = false
    }

    public async joinCallFromInboxOrChannel(call: CallModel, trigger: string) {
        this.consoleDebug(`joinCallFromInbox()`)
        if (this.incomingCallTimeout) return // force the user to join call from ringing notification

        if (this.joiningCallDebouncer) return
        this.joiningCallDebouncer = true

        // no logging because social-call-tapped gets logged upstream of this function

        this.setShowCallWindow(true)

        try {
            await this.helperToJoinCallInApp(call, trigger)
            await this.helperToStartCallNatively(call)
        } catch(error) {
            this.setShowCallWindow(false)

            const skipBecauseCallNotFound = (error instanceof HttpError) && error.action == "skip_because_call_not_found"
            if (!skipBecauseCallNotFound) SentryService.captureError(error)
        }

        this.joiningCallDebouncer = false
    }

    public async startCallFromAppUIAndJoinCall(personKeys: string[], trigger?: string) {
        this.consoleDebug(`startCallFromAppUIAndJoinCall()`)
        if (this.incomingCallTimeout) return // cannot start a call a different call while device is ringing

        if (this.joiningCallDebouncer) return
        this.joiningCallDebouncer = true

        this.setMakingOutgoingCall(true)
        this.setShowCallWindow(true)

        let call:CallModel|undefined = undefined

        try {
            call = await this.currentAccount.api.post('social.calls_path', {
                people_to_add: personKeys
            }) as CallModel // This will cause our server to deliver a push notification to recipient

            const selfParticipant = CallUtils.participantMatchingPerson(call, this.myProfilePersonId)
            if (selfParticipant) {
                this.updateActiveCallConnectionFromCallAndParticipant(call, selfParticipant)
                this.logEvent('social-call', 'joined', `${call.participants.length} friends`, {
                    profiles: call.participants.map((p) => p.profile),
                    number_of_friends: call.participants.length,
                    trigger: trigger
                }, call.key)
            } else {
                throw Error('Self participant not found in outoing call')
            }
        } catch(error) {
            this.setShowCallWindow(false)
            this.joiningCallDebouncer = false

            if (error instanceof Error) {
                if (error.message.includes('Aborted')) {
                    // HTTP Timeout, log only
                    console.error(error)
                } else {
                    SentryService.captureError(error)
                }
            }
        }

        if (call) {
            await this.helperToStartCallNatively(call)

            this.outgoingCallTimeout = setTimeout(async () => {
                if (call) {
                    await this.helperToLeaveActiveCall(call.key, 'outgoingCallTimeout')
                    await this.reportNativeEndCallButNotByUser(call.key, 0)
                }
                this.outgoingCallTimeout = undefined
            }, OUTGOING_CALL_TIMEOUT_MS) // End outgoing call after X seconds
        }

        this.joiningCallDebouncer = false
    }



    // USER ACTIONS TO LEAVE CALL

    public async leaveCallFromAppUI() {
        const call = this.activeCallConnection?.call
        if (!call) return
        this.logEvent('call-service', 'leaveCallFromAppUI', undefined, call, call.key)

        if (Platform.OS == 'ios') {
            // Only trigger the RNCallKeep end call logic if we know we have an active native call (normal case).
            // Sometimes, we end up in a situation where the call is active in app, but RNCallKeep doesn't know about it,
            // in that case, fall back to simply ending the active call in app.
            const activeCalls = await RNCallKeep.getCalls() as any[]
            if (activeCalls.length > 0) {
                RNCallKeep.endCall(call.key) // will trigger a Native Event
            } else {
                await this.helperToLeaveActiveCall(call.key, 'leaveCallFromAppUI')
            }
        } else if (Platform.OS == 'android') {
            await this.helperToLeaveActiveCall(call.key, 'leaveCallFromAppUI')
        }
    }

    public async handleEndCallNativeEvent(args: any) { // triggered by native call waiting, native reject button, RNCallKeep.endCall(), RNCallKeep.rejectCall()
        this.consoleDebug(`handleEndCallNativeEvent`)

        const callKey = args.callUUID ?? 'unknown'
        this.logEvent('call-service', 'handleEndCallNativeEvent', undefined, args, callKey)

        if (this.activeCallConnection && this.activeCallConnection.call.key == callKey) { // ended an active call
            await this.helperToLeaveActiveCall(callKey, 'callKitEnd')
        }

        if(this.incomingCallTimeout && this.currentAccount.personData.incomingCallKey == callKey) { // native reject button on a ringing call
            clearTimeout(this.incomingCallTimeout)
            this.incomingCallTimeout = this.currentAccount.personData.incomingCallKey = null
            this.logEvent('social-call', 'rejected', undefined, {source: 'callKitEnd'}, callKey)

            try {
                await this.currentAccount.api.delete('social.participants_path', {
                    call_key: callKey,
                    leave_even_if_joined: false, // may have answered on a different device
                })
            } catch (error) {
                SentryService.captureError(error, 'Error leaving call from native event')
            }
        }
    }

    private async helperToLeaveActiveCall(callKey: string, source?: string) {
        this.consoleDebug(`helperToLeaveActiveCall(${callKey}, ${source})`)
        this.logEvent('social-call', 'left', source, {source: source}, callKey)

        this.setShowCallWindow(false)
        this.setMakingOutgoingCall(false)
        this.updateActiveCallConnectionFromCallAndParticipant(undefined)

        try {
            await this.currentAccount.api.delete('social.participants_path', { call_key: callKey, leave_even_if_joined: true })
        } catch (error) {
            SentryService.captureError(error, "Error leaving active call")
        }
    }



    // OTHER USER ACTIONS WHICH ALTER CALLS

    public async inviteToCall(people: PersonModel[]) {
        if (!this.activeCallConnection?.call) return

        this.logEvent('social-call', 'tapped', `${this.activeCallConnection.call.participants.length} friends`, {
            trigger: "addfriend",
            people: this.activeCallConnection.call.participants.map((p) => p.profile),
            number_of_friends: this.activeCallConnection.call.participants.length,
        }, this.activeCallConnection.call.key)

        try {
            await this.currentAccount.api.post('social.participants_path', {
                call_key: this.activeCallConnection.call.key,
                people_to_add: people.map((p) => p.key)
            }) // This will cause our server to deliver a push notification to recipient
        } catch (error) {
            const isNotFound = (error instanceof HttpError) && error.status == "not_found"
            if (!isNotFound) SentryService.captureError(error)
        }
    }



    // PERIODIC POLL FOR SERVER ACTIONS TO ALTER CALLS

    private helperIsActiveCallParticipant(participant: CallParticipantModel): boolean {
        if (!participant.last_joined_at) return false // never joined
        if (!participant.left_call_at) return true // hasn't left yet

        const lastJoinedDate = participant.last_joined_at
        const leftDate = participant.left_call_at

        // if the last join was AFTER the last left, participant is active
        return lastJoinedDate > leftDate
    }

    public async onAppPoll(statusResponse: SocialStatusUpdateModel) {
        this.consoleDebug(`onAppPoll`)

        const calls: CallModel[] = statusResponse.active_calls.sort((c1, c2) => {
            return c1.created_at < c2.created_at ? -1 : 1
        })

        let callNotifications = calls.map((call) => {
            return {
                id: call.key,
                call: call,
                displayUsernames: call.participants
                    .map((p) => {
                        if (p.person_id == this.myProfilePersonId) {
                            return 'Me'
                        } else {
                            return p.profile
                        }
                    }),
                timestamp: call.created_at
            }
        })
            .slice(-3)
            .reverse()

        if (this.incomingCallTimeout && this.currentAccount.personData.incomingCallKey) {
            const matchingCall = calls.filter((c) => c.key == this.currentAccount.personData.incomingCallKey)
            if (matchingCall.length == 0) { // the incoming call might have been ended
                try {
                    const callToVerify = await this.currentAccount.api.get(`social.call_path(${this.currentAccount.personData.incomingCallKey})`) as CallModel

                    if (callToVerify.ended_at) {
                        await this.reportNativeEndCallButNotByUser(this.currentAccount.personData.incomingCallKey, 1)
                        clearTimeout(this.incomingCallTimeout)
                        this.incomingCallTimeout = this.currentAccount.personData.incomingCallKey = null
                    }
                } catch(error) {
                    SentryService.captureError(error)
                }
            }
        }

        // If we are on an active call, make sure we update the latest state from the server
        if (this.activeCallConnection) {
            this.consoleDebug(`Looking for active calls, call count: ${calls.length}`)
            const matchingCall = calls.filter((c) => c.key == this.activeCallConnection?.call.key)
            if (matchingCall.length > 0) {
                const call = matchingCall[0]

                const numberOfActiveParticipants = (call: CallModel) => {
                    return call.participants.map(p => this.helperIsActiveCallParticipant(p)).filter(isResult => isResult == true).length
                }

                const oldActiveCount = numberOfActiveParticipants(this.activeCallConnection.call)
                const newActiveCount = numberOfActiveParticipants(call)
                const unansweredParticipantsCount = call.participants.filter(p => !p.last_joined_at && !p.left_call_at).length

                this.consoleDebug(`updateActiveCall old: ${oldActiveCount} new: ${newActiveCount} unansweredParticipants ${unansweredParticipantsCount}`)

                const selfParticipant = CallUtils.participantMatchingPerson(call, this.myProfilePersonId)
                if (selfParticipant) this.updateActiveCallConnectionFromCallAndParticipant(call, selfParticipant)

                if (this.outgoingCallTimeout && newActiveCount > 1) { // call was just answered
                    clearTimeout(this.outgoingCallTimeout)
                    this.outgoingCallTimeout = undefined
                    this.setMakingOutgoingCall(false)

                    this.logEvent('social-call', 'learned-of-answer', undefined, {
                        call: call,
                        oldActiveCount: oldActiveCount,
                        newActiveCount: newActiveCount,
                        unansweredParticipants: unansweredParticipantsCount
                    }, call.key)
                }

                if (this.outgoingCallTimeout && unansweredParticipantsCount == 0) { // ringing call was just rejected by all recipients
                    clearTimeout(this.outgoingCallTimeout)
                    this.outgoingCallTimeout = undefined

                    callNotifications = callNotifications.filter(cn => cn.call.key != call.key)

                    this.logEvent('social-call', 'learned-of-rejection', undefined, {
                        call: call,
                        oldActiveCount: oldActiveCount,
                        newActiveCount: newActiveCount,
                        unansweredParticipants: unansweredParticipantsCount
                    }, call.key)

                    await this.helperToLeaveActiveCall(call.key, 'friendRejected')
                    await this.reportNativeEndCallButNotByUser(call.key, 2)
                }
            }
        }
    }



    // PRIVATE INTERNAL SETTER ACTIONS

    @action
    private setActiveCallConnection(callConnection: CallConnectionModel | undefined) {
        if (this.activeCallConnection && callConnection && CallUtils.equal(this.activeCallConnection.call, callConnection.call)) {
            return
        }
        this.activeCallConnection = callConnection
    }

    private updateActiveCallConnectionFromCallAndParticipant(call: CallModel | undefined, participant?: CallParticipantModel) {
        this.consoleDebug(`Set active call: ${call?.key ?? 'undefined'}`)
        if (call && participant == undefined) throw('Call was passed without a participant')

        if (call && participant) {
            const callConnection = {
                channel: call.key,
                token: participant.token,
                uid: participant.person_id,
                call: call
            } as CallConnectionModel

            this.setActiveCallConnection(callConnection)
            this.currentAccount.personData.activeCallKey = call.key
        } else {
            this.setActiveCallConnection(undefined)
            this.setMakingOutgoingCall(false)
            this.currentAccount.personData.activeCallKey = null
        }
    }

    @action
    private setMakingOutgoingCall(makingOutgoingCall: boolean) {
        this.isMakingOutgoingCall = makingOutgoingCall
        if (!makingOutgoingCall && this.outgoingCallTimeout) {
            clearTimeout(this.outgoingCallTimeout)
            this.outgoingCallTimeout = undefined
        }
    }

    @action
    private setShowCallWindow(showCallWindow: boolean) {
        this.showCallWindow = showCallWindow
    }


    // OTHER PRIVATE HELPERS

    private nativeRNCallKeepOptions() {
        return {
            ios: {
                appName: 'Lava',
                imageName: 'icn-call-kit.png',
                supportsVideo: CALL_KIT_VIDEO_ENABLED,
                maximumCallGroups: '1',
                maximumCallsPerCallGroup: '1',
                ringtoneSound: 'incoming.m4a',
                includesCallsInRecents: false
            },
            android: {
                alertTitle: 'Permissions required',
                alertDescription: 'This application needs to access your phone accounts',
                cancelButton: 'Cancel',
                okButton: 'Ok',
                imageName: 'phone_account_icon',
                additionalPermissions: [PermissionsAndroid.PERMISSIONS.example],
                // Required to get audio in background when using Android 11
                foregroundService: {
                    channelId: 'com.company.my',
                    channelName: 'Foreground service for Lava',
                    notificationTitle: 'Lava is running on background',
                    notificationIcon: 'Path to the resource icon of the notification',
                },
            }
        }
    }

    private async reportNativeEndCallButNotByUser(uuid: string, reason: number) {
        this.consoleDebug(`reportNativeEndCallButNotByUser(${uuid}, ${reason})`)
        const reasonText:{ [key: number]: string } = { 1: 'FAILED', 2: 'REMOTE_ENDED', 3: 'UNANSWERED', 4: 'ANSWERED_ELSEWHERE', 5: 'DECLINED_ELSEWHERE', 6: 'MISSED'}
        this.logEvent('call-service', 'reportNativeEndCallButNotByUser', reasonText[reason], {reason: reason}, uuid)
        try {
            const calls = await RNCallKeep.getCalls() as any[]
            for (const call of calls) {
                RNCallKeep.reportEndCallWithUUID(call.callUUID, reason) // does not trigger RNCallKeep endCall event
            }
        } catch(e) {
            SentryService.captureError(e)
        }
    }


    private logEvent(thing: string, happened: string, note: string|undefined, props: any, callKey: string|undefined) {
        // disable logging
    }

    private consoleDebug(method: string, force: boolean = false) {
        if (this.debug || force) console.log(`[${this.constructor.name}][${this.currentAccount.person.id}] ${method}`)
    }
}
