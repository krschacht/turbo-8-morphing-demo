import {action, makeObservable, observable, reaction} from "mobx"
import {CurrentAccount} from "../../../Root/CurrentAccount"
import {RootController} from "../../../Root/RootController"
import {OnboardingController} from "../Onboarding/OnboardingController"
import {AsyncUtils} from "../../utils/AsyncUtils"

export enum OnboardingProfileState {
    LOADING,
    FIRST_NAME,
    LAVA_NAME,
    SUBMITTING,
}

export class OnboardingProfileController {
    private debug: boolean = false  // don't set this to true in production

    private currentAccount: CurrentAccount
    public appController: RootController
    public onboardingController: OnboardingController

    @observable state: OnboardingProfileState = OnboardingProfileState.LOADING;         @action public setState(state: OnboardingProfileState) { this.state = state }
    @observable firstName?: string;                                 @action public setFirstName(name?: string) { this.firstName = name }
    @observable nickname?: string;                                  @action public setNickname(name?: string) { this.nickname = name }
    @observable errorMessage?: string;                              @action public setErrorMessage(message?: string) { this.errorMessage = message }

    public static LAVA_BOT_USERNAME = 'Lava_Bot'

    constructor(currentAccount: CurrentAccount, appController: RootController, onboardingController: OnboardingController) {
        this.consoleDebug(`new()`)

        this.currentAccount = currentAccount
        this.appController = appController
        this.onboardingController = onboardingController

        makeObservable(this)
    }

    public async initialize() {
        this.consoleDebug(`initialize()`)
        if (this.state != OnboardingProfileState.LOADING) return

        this.onboardingController.speech.preloadPhrase('profile-first', `Ready? Let's get you connected. What is your "first" name?`)
        this.onboardingController.speech.preloadPhrase('profile-lava-name', `Type a Lava name that your friends will see.`)

        if (!this.currentAccount.personData.useLoggedOut)
            this.setState(OnboardingProfileState.FIRST_NAME)
        else
            this.nextStep()
    }

    public uninitialize() {
        this.consoleDebug(`uninitialize()`)

        this.onboardingController.speech.unloadPreloadedPhrase('profile-first')
        this.onboardingController.speech.unloadPreloadedPhrase('profile-lava-name')
    }


    // Public methods

    public async startStep() {
        this.consoleDebug(`startStep()`)

        await this.onboardingController.speech.speakPreloadedPhrase('profile-first')
    }

    public onChangeFirstName(text: string) {
        const cleanText = text.replace(/[^A-Za-z]/g, '')
        this.setFirstName(cleanText.charAt(0).toUpperCase() + cleanText.slice(1)) // capitalize first letter
    }

    public onChangeNickname(text: string) {
        const cleanText = text.replace(/[^A-Za-z0-9_~]/g, '')
        this.setNickname(cleanText.charAt(0).toUpperCase() + cleanText.slice(1)) // capitalize first letter
    }

    public async onFirstNameSubmitted() {
        this.consoleDebug(`onFirstNameSubmitted()`)

        if (!this.firstName || this.firstName.length < 2) return

        this.onboardingController.speech.pause()
        this.setErrorMessage(undefined)

        void this.lavaName()
    }

    public async lavaName() {
        const color = ['Red', 'Green', 'Blue', 'Purple', 'Brown']
        const animal = ['Dog', 'Cat', 'Zeebra', 'Elephant', 'Turtle']

        const randomColor = color[Math.floor(Math.random() * color.length)]
        const randomAnimal = animal[Math.floor(Math.random() * animal.length)]

        this.setNickname(randomColor + randomAnimal)

        this.setErrorMessage(undefined)
        this.setState(OnboardingProfileState.LAVA_NAME)

        await this.onboardingController.speech.speakPreloadedPhrase('profile-lava-name')
    }

    public async nextStep() {
        this.consoleDebug(`nextStep()`)

        this.onboardingController.speech.pause()

        await this.currentAccount.api.post('social.profile_create_path', {
            first_name: this.firstName,
            nickname: this.nickname,
        })
        this.onboardingController.nextStep()
    }


    // Private instance utility methods

    private consoleDebug(method: string, force: boolean = false) {
        if (this.debug || force) console.log(`${this.constructor.name}: ${method}  state = ${this.state}`)
    }
}
