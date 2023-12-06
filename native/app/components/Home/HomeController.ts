import {action, makeObservable, observable, reaction} from "mobx"
import {RootController} from "../../../Root/RootController"
import {CurrentAccount} from "../../../Root/CurrentAccount"


export enum HomeState {
    ONBOARDING,
    HOME,
}

class HomeController {
    private debug: boolean = false  // don't set this to true in production

    private currentAccount!: CurrentAccount
    public appController: RootController

    @observable state: HomeState = HomeState.ONBOARDING;    @action public setState(state: HomeState) { this.state = state }
    @observable friends: string[] = [];                     @action public setFriends(friends: string[]) { this.friends = friends }
    private cleanUpAppStateHandler?: any
    private intervalHandler?: any


    constructor(currentAccount: CurrentAccount, appController: RootController) {
        this.consoleDebug(`new()`)

        this.currentAccount = currentAccount
        this.appController = appController

        makeObservable(this)
    }


    // Public instance init methods

    public async initialize() {
        this.consoleDebug(`initialize()`)

        this.cleanUpAppStateHandler = reaction(() => this.appController.nativeState.state, (state) => {
            if (state == 'foreground')
                this.onAppForeground()
            else if (state == 'background')
                this.onAppBackground()
        })

        this.intervalHandler = setInterval(async() => {
            const friends = await this.currentAccount.api.patch('social.profile_update_path', {})
            this.setFriends(friends as string[])
        }, 3000)

        this.onAppForeground()
    }

    public uninitialize() {
        this.consoleDebug(`uninitialize()`)
        if (this.cleanUpAppStateHandler) this.cleanUpAppStateHandler()
        if (this.intervalHandler) clearInterval(this.intervalHandler)
    }


    // Private instance init methods

    private onAppForeground() {
        // simplified
    }

    private onAppBackground() {
        // simplified
    }

    public backToOnboarding() {
        this.consoleDebug(`backToOnboarding()`)
        this.currentAccount.personData.onboardingNeeded = true
        this.currentAccount.personData.useLoggedOut = false
        this.currentAccount.personData.audioOnboardingNeeded = true
        this.currentAccount.personData.profileOnboardingNeeded = true
        this.currentAccount.personData.ageOnboardingNeeded = true

        this.setState(HomeState.ONBOARDING)
    }


    // END

    // Private instance utility methods

    private consoleDebug(method: string, force: boolean = false) {
        if (this.debug || force) console.log(`${this.constructor.name}: ${method}`)
    }
}

export default HomeController
