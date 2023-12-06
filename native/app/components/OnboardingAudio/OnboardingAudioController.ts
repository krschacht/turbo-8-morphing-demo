import {action, makeObservable, observable} from "mobx"
import {CurrentAccount} from "../../../Root/CurrentAccount"
import {OnboardingController} from "../Onboarding/OnboardingController"

export enum OnboardingAudioState {
    LOADING,
    LOADED
}

export class OnboardingAudioController {
    private debug: boolean = false  // don't set this to true in production

    private currentAccount!: CurrentAccount
    public onboardingController!: OnboardingController

    @observable state: OnboardingAudioState = OnboardingAudioState.LOADING

    constructor(currentAccount: CurrentAccount, onboardingController: OnboardingController) {
        this.consoleDebug(`new()`)

        this.currentAccount = currentAccount
        this.onboardingController = onboardingController

        this.onboardingController.speech.preloadPhrase('audio-intro', `Sound check! Can you hear this? Is your volume on? If so, tap the thumbs up to get started.`)

        makeObservable(this)
    }

    public async initialize() {
        this.consoleDebug(`initialize()`)
        if (this.state != OnboardingAudioState.LOADING) return

        this.setState(OnboardingAudioState.LOADED)
    }

    public uninitialize() {
        this.consoleDebug(`uninitialize()`)
        this.onboardingController.speech.unloadPreloadedPhrase('audio-intro')
    }


    // Public methods

    public async startStep() {
        this.consoleDebug(`startStep()`)

        await this.onboardingController.speech.speakPreloadedPhrase('audio-intro')
    }

    public replayAudio() {
        this.onboardingController.speech.restart()
    }

    public nextStep() {
        this.consoleDebug(`nextStep()`)

        this.onboardingController.speech.pause()
        this.onboardingController.nextStep()
    }


    // Private helper methods

    @action
    private setState(state: OnboardingAudioState) {
        this.consoleDebug(`setState()`)
        this.state = state
    }


    // Private instance utility methods

    private consoleDebug(method: string, force: boolean = false) {
        if (this.debug || force) console.log(`${this.constructor.name}: ${method}  state = ${this.state}`)
    }
}
