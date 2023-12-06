import {action, makeObservable, observable} from "mobx"
import {AppState as ReactNativeAppState, AppStateStatus, NativeEventSubscription} from "react-native"

export enum NativeState {
    COLD_START = 'cold_start',
    FOREGROUND = 'foreground',
    BACKGROUND = 'background',
}

export enum RawState {
    ACTIVE = 'active',
    BACKGROUND = 'background',
    INACTIVE = 'inactive',
    UNKNOWN = 'unknown', // not sure what this is
    EXTENSION = 'extension', // not sure what this is
    // all of these ^ copied from AppState in react-native

    REFRESH = 'refresh', // triggered by task manager
    WAKEUP = 'wakeup', // trigger by task manager
}

class NativeStateService {
    private debug: boolean = false  // don't set this to true in production

    private stateChangeListener?: NativeEventSubscription

    @observable rawState: RawState
    @observable state: NativeState

    private helperToMapBothStateTypesToRawState(state: AppStateStatus | RawState) {
        switch (state) {
            case 'active': return RawState.ACTIVE
            case 'background': return RawState.BACKGROUND
            case 'inactive': return RawState.INACTIVE
            case 'unknown': return RawState.UNKNOWN
            case 'extension': return RawState.EXTENSION
            default: return RawState.BACKGROUND
        }
    }

    constructor() {
        this.consoleDebug(`new()`)

        this.rawState = this.helperToMapBothStateTypesToRawState(ReactNativeAppState.currentState)
        this.state = NativeState.COLD_START

        makeObservable(this)
    }

    public initialize(fixedRawStateWhichNeverChanges?: RawState) {
        this.consoleDebug(`initialize()`)

        if (!fixedRawStateWhichNeverChanges) {
            this.stateChangeListener = ReactNativeAppState.addEventListener('change', (appState: AppStateStatus) => {
                this.updateRawState(this.helperToMapBothStateTypesToRawState(appState))
                this.updateState(this.rawStateToState(this.rawState))
            })
        }

        // We did not initially re-set things here but there can be a tiny gap between constructor & the event listener
        this.updateRawState(this.helperToMapBothStateTypesToRawState(fixedRawStateWhichNeverChanges ?? ReactNativeAppState.currentState))
        this.updateState(this.rawStateToState(this.rawState))
    }

    public uninitialize() {
        this.consoleDebug(`uninitialize()`)
        if (this.stateChangeListener) this.stateChangeListener.remove()
    }


    // Private methods

    @action
    private updateRawState(rawState: RawState) {
        this.consoleDebug(`updateRawState(${rawState})`)
        if (this.rawState != rawState) this.rawState = rawState
    }

    @action
    private updateState(state: NativeState) {
        this.consoleDebug(`updateState(${state})`)
        if (this.state == state) return
        this.state = state
    }

    private rawStateToState(rawState: RawState) {
        // When an iOS app gets an iOS permission dialog it goes into
        // inactive state, and after the user accepts or rejects the
        // permission request then it goes back to 'active'. Likewise
        // when app switcher is opened or when a FaceTime call comes in.
        // This is why we are considering inactive to still be foreground.
        // https://docs.expo.dev/versions/latest/react-native/appstate/

        if (rawState == 'active' || rawState == 'inactive')
            return NativeState.FOREGROUND
        else
            return NativeState.BACKGROUND
    }

    // Private instance utility methods

    private consoleDebug(method: string, force: boolean = false) {
        if(this.debug || force) console.log(`${this.constructor.name}: ${method}  state = ${this.state}`)
    }
}

export default NativeStateService