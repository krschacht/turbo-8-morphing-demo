import {action, IReactionDisposer, makeObservable, observable, reaction} from "mobx"
import {createContext} from "react"
import {Platform} from "react-native"
import {CurrentAccount} from "./CurrentAccount"
import NativeStateService, {NativeState} from "../app/services/NativeStateService"
import SentryService from "../app/services/SentryService"
import {CallService} from "../app/services/CallService"
import AudioService from "../app/services/AudioService"

export enum RootState {
    INITIALIZING,
    APP_UPDATING,
    BINARY_OUTDATED_GOTO_APP_STORE,
    UPDATE_AHEAD_CANNOT_DOWNGRADE,
    EXTENDED_DELAY,
    INIT_ERROR,
    UPDATE_FAILED,
    LOW_DISK_SPACE,
    LOADED,
    SUSPENDED, // app was READY but has been temporarily halted
}

export class RootController {
    private debug: boolean = false  // don't set this to true in production

    public currentAccount!: CurrentAccount
    public call!: CallService
    public nativeState: NativeStateService

    private initializeCompleted: boolean = false
    private stateChangeReaction?: IReactionDisposer
    private foregroundBackgroundReaction?: IReactionDisposer
    private monitorServerUpdateNumberReaction?: IReactionDisposer
    private checkForAutoUpdateReaction?: IReactionDisposer
    private restartBackgroundAfterCallReaction?: IReactionDisposer

    @observable state: RootState = RootState.INITIALIZING;    @action public setState(state: RootState) { this.state = state }
    @observable error?: Error;                              @action public setError(error?: Error) { this.currentAccount?.setAppError(error); this.error = error }


    constructor() {
        this.consoleDebug(`new()`)

        this.call = new CallService()
        this.nativeState = new NativeStateService()

        makeObservable(this)
    }

    // Public instance methods

    public async initialize(currentAccount: CurrentAccount) {
        this.consoleDebug(`initialize()`)
        if (this.initializeCompleted) return

        this.currentAccount = currentAccount

        // Initialize all Services

        if (this.isNative) await this.call.initialize(this.currentAccount)
        this.nativeState.initialize() // everything before this will get the NativeState change out of COLD_START

        this.stateChangeReaction = reaction(() => this.state, (state) => {
            if (state == RootState.LOADED) this.onLoaded()
        })

        this.foregroundBackgroundReaction = reaction(() => this.nativeState.state, async(newState, oldState) => {
            if (oldState == NativeState.COLD_START) return  // This should never happen since we don't register
                                                            // the reaction until after app is foregrounded, but
                                                            // it's here just in case

            if (newState == NativeState.FOREGROUND) {
                try {
                    await this.onForeground()
                } catch (error) {
                    await this.onLoadError(error as Error)
                    if (this.errorType(error as Error) == 'unknown') SentryService.captureError(error)
                }
            }
            if (newState == NativeState.BACKGROUND) this.onBackground()
        }) // this is not registered in onLoaded() because the app could initialize from the background so it won't get to LOADED on 1st launch

        this.initializeCompleted = true
    }

    public async uninitialize(mode?: string) {
        this.consoleDebug(`uninitialize()`)

        this.initializeCompleted = false

        if (this.call) this.call.uninitialize()
        if (this.nativeState) this.nativeState.uninitialize()
        if (this.stateChangeReaction) this.stateChangeReaction()
        if (this.foregroundBackgroundReaction) this.foregroundBackgroundReaction()
        if (this.monitorServerUpdateNumberReaction) this.monitorServerUpdateNumberReaction()
        if (this.checkForAutoUpdateReaction) this.checkForAutoUpdateReaction()
        if (this.restartBackgroundAfterCallReaction) this.restartBackgroundAfterCallReaction()
    }

    public async onColdStart() {
        this.consoleDebug(`onColdStart()`)

        if (this.nativeState.state == NativeState.FOREGROUND) {
            await this.onForeground()
        }
        if (this.nativeState.state == NativeState.BACKGROUND) console.log() // do nothing. App will sit in .LOADING and social/HomeController will no longer initialize in the background
    }

    public async onForeground() {
        this.consoleDebug(`onForeground()`)

        try {
            this.setError(undefined)

            await AudioService.changeToAudioPlaybackMode()
            this.setState(RootState.LOADED)

            const response = await this.currentAccount.api.get('server_update_number')
        } catch (error) {
            SentryService.captureError(error)
            error = new Error('Unable to initialize your account.')
            throw error
        }
    }

    public async onLoadError(error: Error) {
        this.consoleDebug(`onLoadError(${error.message})`)

        this.setError(error)
        this.setState(RootState.INIT_ERROR)
    }

    public internetConnectionError(error?: Error) {
        if (!error || !error?.stack || !error.message) return false
        error = error as Error

        const msg = error.message
        if (msg.includes('Network request failed') ||
            msg.includes('The request timed out') ||
            msg.includes('The Internet connection appears to be offline') ||
            msg.includes('Network Error')
        ) {
            return true
        }

        return false
    }

    public errorType(error?: Error) {
        if (!error) return 'unknown'

        if (this.internetConnectionError(error as Error)) {
            return 'internet'
        } else if ((error as Error).message.includes('Unable to initialize')) {
            return 'account'
        } else {
            return 'unknown'
        }
    }

    public async onLoaded() { // Must be idempotent. Even after the app state is LOADED it can move to another state and back to LOADED
        this.consoleDebug(`onLoaded()`)

        if (!this.monitorServerUpdateNumberReaction) {
            this.monitorServerUpdateNumberReaction = reaction(() => this.currentAccount.serverUpdateNumber, async(newUpdateNumber, oldUpdateNumber) => {
                if (this.nativeState.state != NativeState.FOREGROUND || this.state != RootState.LOADED) return
            })
        }

        if (!this.checkForAutoUpdateReaction) {
            this.checkForAutoUpdateReaction = reaction(() => this.currentAccount.serverCheckForAutoUpdate, async(reaction) => {
                if (this.nativeState.state != NativeState.FOREGROUND || this.state != RootState.LOADED) return
            })
        }
    }

    public async onBackground() {
        this.consoleDebug(`onBackground()`)

        this.currentAccount.setClientCheckForAutoUpdate(true)
    }

    public async retryUpdate() {
        await this.currentAccount.api.get('server_update_number') // this is a dummy API call just-in-case no other API calls happened
    }


    // Private instance utility methods

    private get isNative() {
        return Platform.OS != 'web'
    }

    private consoleDebug(method: string, force: boolean = false) {
        if(this.debug || force) console.log(`${this.constructor.name}: ${method}  state = ${this.state}`)
    }
}

const AppControllerContext = createContext<RootController>(new RootController())
export default AppControllerContext
