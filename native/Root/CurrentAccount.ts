import {action, computed, makeObservable, observable, runInAction} from "mobx"
import {createContext} from "react"
import PersonDataService from "../app/services/PersonDataService"
import {ManifestUtils} from "../app/utils/ManifestUtils"
import PersonModel from "../app/models/PersonModel"
import RailsAPIService from "../app/services/RailsAPIService"

export class CurrentAccount {
    private debug: boolean = false  // don't set this to true in production

    @observable serverCheckForAutoUpdate: boolean = true
    @observable clientCheckForAutoUpdate: boolean = true
    @observable serverUpdateNumber: number | null = null
    @observable serverVersion: string | null = null
    @observable app: string | null = null
    @observable disabledFeatures: string[] = []
    @observable appError?: Error;                              @action public setAppError(error?: Error) { this.appError = error }

    private railsAPI = new RailsAPIService()
    public personData = new PersonDataService()

    private initializeCompleted: boolean = false

    // Public instance methods

    constructor() {
        this.serverUpdateNumber = ManifestUtils.clientUpdateNumber
        this.serverVersion = ManifestUtils.clientVersion as string
        this.serverCheckForAutoUpdate = true
        this.clientCheckForAutoUpdate = true

        makeObservable(this)
    }

    public async initialize(source?: string) {
        this.consoleDebug(`initialize(${source})`)
        if (this.initializeCompleted) return

        await this.personData.loadPreviousFromStorage()

        this.initializeCompleted = true
    }

    @computed
    get person() { return this.personData.get('person') as PersonModel }

    @computed
    get device() { return (this.personData.get('person') as PersonModel)?.device }

    @computed
    get authentication() { return (this.personData.get('person') as PersonModel)?.device?.authentication }

    @computed
    get isLoggedIn() { return (this.personData.get('person') as PersonModel)?.device?.authentication !== undefined}

    public api = {
        // Methods grouped just for readability

        get: async(route: string, queryStringParams: object = {}, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) => {
            let response
            try {
                response = await this.railsAPI.get(route, queryStringParams, retry, signal, showNetworkErrors)
            } catch(error) {
                if (!this.appError) throw error
            }
            if (!this.appError) this.railsApiSideEffects()
            if (!this.appError) return response
        },

        post: async(route: string, payload: any, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) => {
            let response
            try {
                response = await this.railsAPI.post(route, payload, retry, signal, showNetworkErrors)
            } catch(error) {
                if (!this.appError) throw error
            }
            if (!this.appError) this.railsApiSideEffects()
            if (!this.appError) return response
        },

        patch: async(route: string, payload: any, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) => {
            let response
            try {
                response = await this.railsAPI.patch(route, payload, retry, signal, showNetworkErrors)
            } catch(error) {
                if (!this.appError) throw error
            }
            if (!this.appError) this.railsApiSideEffects()
            if (!this.appError) return response
        },

        delete: async(route: string, queryStringParams: object = {}, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) => {
            let response
            try {
                response = await this.railsAPI.delete(route, queryStringParams, retry, signal, showNetworkErrors)
            } catch(error) {
                if (!this.appError) throw error
            }
            if (!this.appError) this.railsApiSideEffects()
            if (!this.appError) return response
        },
    }

    // Private instance methods

    private railsApiSideEffects() {
        if (this.serverCheckForAutoUpdate != this.railsAPI.serverCheckForAutoUpdate)
            runInAction(() => this.serverCheckForAutoUpdate = this.railsAPI.serverCheckForAutoUpdate)

        if (this.serverUpdateNumber != this.railsAPI.serverUpdateNumber)
            runInAction(() => this.serverUpdateNumber = this.railsAPI.serverUpdateNumber)

        if (this.serverVersion != this.railsAPI.serverVersion)
            runInAction(() => this.serverVersion = this.railsAPI.serverVersion)

        if (this.app != this.railsAPI.app)
            runInAction(() => this.app = this.railsAPI.app)

        const lowercaseDisabledFeatures = this.railsAPI.disabledFeatures.map(s => s.toLowerCase())
        const disabledFeaturesChanged = (JSON.stringify(this.disabledFeatures) !== JSON.stringify(lowercaseDisabledFeatures))

        if (disabledFeaturesChanged)
            runInAction(() => this.disabledFeatures = lowercaseDisabledFeatures)
    }

    @action
    public setClientCheckForAutoUpdate(check: boolean) {
        this.clientCheckForAutoUpdate = check
    }

    @computed
    get checkForAutoUpdate() {
        return this.serverCheckForAutoUpdate && this.clientCheckForAutoUpdate
    }

    private consoleDebug(method: string, details: any = '') {
        if (this.debug) console.log(`${this.constructor.name}: ${method}`, details)
    }
}

const CurrentAccountContext = createContext<CurrentAccount>(new CurrentAccount())
export default CurrentAccountContext
