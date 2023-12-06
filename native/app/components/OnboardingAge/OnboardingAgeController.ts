import {action, makeObservable, observable} from "mobx"
import {CurrentAccount} from "../../../Root/CurrentAccount"
import {OnboardingController} from "../Onboarding/OnboardingController"

export enum OnboardingAgeState {
    LOADING,
    AGE,
    MONTH,
    YEAR
}

export enum AgeBand {
    CHILD_2_4 = 'child-2-4',
    CHILD_5_8 = 'child-5-8',
    CHILD_9_12 = 'child-9-12',
    CHILD_1 = 'child-1',
    CHILD_2 = 'child-2',
    CHILD_3 = 'child-3',
    CHILD_4 = 'child-4',
    CHILD_5 = 'child-5',
    CHILD_6 = 'child-6',
    CHILD_7 = 'child-7',
    CHILD_8 = 'child-8',
    CHILD_9 = 'child-9',
    CHILD_10 = 'child-10',
    CHILD_11 = 'child-11',
    CHILD_12 = 'child-12',
    TEEN = 'teen',
    GROWN_UP = 'grown-up'
}

export type AgeBandItem = {
    id: AgeBand
    title: string
}


export class OnboardingAgeController {
    private debug: boolean = false  // don't set this to true in production

    private currentAccount: CurrentAccount
    public onboardingController: OnboardingController

    @observable state: OnboardingAgeState = OnboardingAgeState.LOADING;     @action private setState(state: OnboardingAgeState) { this.state = state }
    @observable errorMessage?: string;                                      @action public setErrorMessage(message?: string) { this.errorMessage = message }
    private ageBand?: AgeBand
    private isChild?: boolean
    private currentAge?: number
    private birthMonth?: number
    private birthYear?: number
    @observable possibleBirthYear?: number;                                 @action private setPossibleBirthYear(year?: number) { this.possibleBirthYear = year }

    constructor(currentAccount: CurrentAccount, onboardingController: OnboardingController) {
        this.consoleDebug(`new()`)

        this.currentAccount = currentAccount
        this.onboardingController = onboardingController

        makeObservable(this)
    }

    public async initialize() {
        this.consoleDebug(`initialize()`)
        if (this.state != OnboardingAgeState.LOADING) return

        this.onboardingController.speech.preloadPhrase('age-intro', `How "old" are you?`)
        this.onboardingController.speech.preloadPhrase('age-month', `What month is your birthday?`)
        this.onboardingController.speech.preloadPhrase('age-year', `What year were you born?`)
    }

    public uninitialize() {
        this.consoleDebug(`uninitialize()`)
        this.onboardingController.speech.unloadPreloadedPhrase('age-intro')
        this.onboardingController.speech.unloadPreloadedPhrase('age-month')
        this.onboardingController.speech.unloadPreloadedPhrase('age-year')
    }


    // Public methods

    public AgeBands() {
        return [
            { id: AgeBand.CHILD_1, title: '1' },
            { id: AgeBand.CHILD_2, title: '2' },
            { id: AgeBand.CHILD_3, title: '3' },
            { id: AgeBand.CHILD_4, title: '4' },
            { id: AgeBand.CHILD_5, title: '5' },
            { id: AgeBand.CHILD_6, title: '6' },
            { id: AgeBand.CHILD_7, title: '7' },
            { id: AgeBand.CHILD_8, title: '8' },
            { id: AgeBand.CHILD_9, title: '9' },
            { id: AgeBand.CHILD_10, title: '10' },
            { id: AgeBand.CHILD_11, title: '11' },
            { id: AgeBand.CHILD_12, title: '12' },
            { id: AgeBand.TEEN, title: 'a teen' },
            { id: AgeBand.GROWN_UP, title: 'a grown-up' }
        ] as AgeBandItem[]
    }

    public async startStep() {
        this.consoleDebug(`startStep()`)

        this.setState(OnboardingAgeState.AGE)
        await this.onboardingController.speech.speakPreloadedPhrase('age-intro')
    }

    public async onAgeBandSelected(bandItem: AgeBandItem) {
        this.setErrorMessage(undefined)

        this.ageBand = bandItem.id
        this.isChild = (this.ageBand != AgeBand.GROWN_UP && this.ageBand != AgeBand.TEEN)
        this.currentAccount.personData.isChild = this.isChild
        this.currentAccount.personData.ageBand = this.ageBand

        if (parseInt(bandItem.title)){
            this.currentAge = parseInt(bandItem.title)
        }

        if (this.isChild) {
            this.setState(OnboardingAgeState.MONTH)
            await this.onboardingController.speech.speakPreloadedPhrase('age-month')
        } else
            this.nextStep()
    }

    public async onMonthSelected(birthMonth: number) {
        this.birthMonth = birthMonth

        const monthString = Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")[birthMonth-1]

        if (birthMonth != ((new Date()).getMonth() + 1) && this.currentAge) {
            this.birthYear = (new Date()).getFullYear() - this.currentAge
            this.nextStep()

        } else {
            await this.onboardingController.speech.speakPreloadedPhrase('age-year')

            if (this.currentAge) {
                this.setPossibleBirthYear((new Date()).getFullYear() - this.currentAge)
                this.birthYear = this.possibleBirthYear
            }

            this.setState(OnboardingAgeState.YEAR)
        }
    }

    public async onYearSelected(birthYear: number) {
        this.birthYear = birthYear

        this.onboardingController.speech.pause()

        this.nextStep()
    }

    public async nextStep() {
        this.consoleDebug(`nextStep()`)

        this.onboardingController.speech.pause()

        const verifiedAt = this.isChild ? null : (new Date())
        await this.currentAccount.api.patch("vizz_account.person_path", {
            age_band: this.ageBand,
            child: this.isChild,
            age: this.currentAge,
            birth_month: this.birthMonth,
            birth_year: this.birthYear,
            verified_at: verifiedAt,
        })

        this.onboardingController.nextStep()
    }


    // Private instance utility methods

    private consoleDebug(method: string, force: boolean = false) {
        if (this.debug || force) console.log(`${this.constructor.name}: ${method}  state = ${this.state}`)
    }
}
