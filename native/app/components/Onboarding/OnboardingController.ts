import {action, makeObservable, observable} from "mobx"
import {StyleSheet} from "react-native"
import {Color} from "../../utils/AppearanceUtils"
import HomeController, {HomeState} from "../Home/HomeController"
import {CurrentAccount} from "../../../Root/CurrentAccount"
import {SpeechService} from "../../services/SpeechService"

export enum OnboardingState {
    // These steps need to be in the correct order because nextStep() below assumes they are
    BLANK,
    LOADING,
    AUDIO,
    PROFILE,
    AGE,
    DONE
}

export class OnboardingController {
    private debug: boolean = false  // don't set this to true in production

    private currentAccount: CurrentAccount
    public homeController: HomeController
    public speech: SpeechService
    public styles = StyleSheet.create({
        messageText: {
            marginHorizontal: 32,
            marginBottom: 28,
            color: Color.tertiary,
            fontSize: 25,
            fontWeight: '400',
            lineHeight: 36,
            textAlign: 'center'
        },
    })

    @observable state: OnboardingState = OnboardingState.BLANK

    constructor(currentAccount: CurrentAccount, homeController: HomeController) {
        this.consoleDebug(`new()`)

        this.currentAccount = currentAccount
        this.homeController = homeController
        this.speech = new SpeechService(currentAccount)

        makeObservable(this)
    }

    public initialize() {
        this.consoleDebug(`initialize()`)

        if (this.currentAccount.personData.onboardingNeeded) {
            this.setState(OnboardingState.LOADING)
            OnboardingController.setStepState(this.currentAccount, this)
        } else {
            void this.done()
        }
    }

    public uninitialize() {
        this.consoleDebug(`uninitialize()`)
    }


    // Public methods

    public async done() {
        this.consoleDebug(`done()`)
        this.speech.pause()
        this.currentAccount.personData.onboardingNeeded = false
        this.homeController.setState(HomeState.HOME)
    }


    // Private helper methods

    @action
    public setState(state: OnboardingState) {
        this.consoleDebug(`setState(${state})`)
        this.state = state
    }


    // Private instance utility methods

    private consoleDebug(method: string, force: boolean = false) {
        if (this.debug || force) console.log(`${this.constructor.name}: ${method}  state = ${this.state}`)
    }


    // Static methods

    public nextStep() {
        this.consoleDebug(`nextStep()`)

        this.speech.pause()

        const nextStep = OnboardingState[this.state + 1].toLowerCase()

        OnboardingController.setStep(
            nextStep,
            this.currentAccount,
            this,
            'do-not-force', // when advancing naturally through onboarding, we want to allow skipping over a step which has been completed
        )
    }

    public static setStep(
        name: string|undefined,
        currentAccount: CurrentAccount,
        onboardingController?: OnboardingController,
        mode: string = 'force-this-step') {

        switch (name) {
            case 'audio':
                if (mode == 'force-this-step') {
                    currentAccount.personData.audioOnboardingNeeded = true
                    currentAccount.personData.onboardingNeeded = true
                }
                if (onboardingController) this.setStepState(currentAccount, onboardingController)
                return
            case 'profile':
                currentAccount.personData.audioOnboardingNeeded = false

                if (mode == 'force-this-step') {
                    currentAccount.personData.profileOnboardingNeeded = true
                    currentAccount.personData.onboardingNeeded = true
                }
                if (onboardingController) this.setStepState(currentAccount, onboardingController)
                return
            case 'age':
                currentAccount.personData.audioOnboardingNeeded = false
                currentAccount.personData.profileOnboardingNeeded = false

                if (mode == 'force-this-step') {
                    currentAccount.personData.ageOnboardingNeeded = true
                    currentAccount.personData.onboardingNeeded = true
                }
                if (onboardingController) this.setStepState(currentAccount, onboardingController)
                return
            case 'done':
                currentAccount.personData.audioOnboardingNeeded = false
                currentAccount.personData.profileOnboardingNeeded = false
                currentAccount.personData.ageOnboardingNeeded = false

                currentAccount.personData.onboardingNeeded = false
                if (onboardingController) this.setStepState(currentAccount, onboardingController)
                return
        }
    }

    public static setStepState(currentAccount: CurrentAccount, onboardingController: OnboardingController) {
        if (currentAccount.personData.audioOnboardingNeeded) {
            onboardingController.setState(OnboardingState.AUDIO)
        } else if (currentAccount.personData.profileOnboardingNeeded) {
            onboardingController.setState(OnboardingState.PROFILE)
        } else if (currentAccount.personData.ageOnboardingNeeded) {
            onboardingController.setState(OnboardingState.AGE)
        } else {
            void onboardingController.done()
        }
    }
}
