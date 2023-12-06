import {computed, makeObservable} from "mobx"
import DateUtils from "../utils/DateUtils"
import DataService from "./DataService"
import PersonModel from "../models/PersonModel"

class PersonDataService extends DataService {
    constructor() {
        super({
            'PersonData': [
                { 'person': { 'object': null }},
                { 'deviceKey': { 'string': null }},
                { 'isChild': { 'boolean': null }},
                { 'ageBand': { 'string': null }},
                { 'firstName': {'string': null}},
                { 'onboardingNeeded': { 'boolean': true }},
                { 'audioOnboardingNeeded': { 'boolean': true }},
                { 'ageOnboardingNeeded': { 'boolean': true }},
                { 'profileOnboardingNeeded': { 'boolean': true }},
                { 'useLoggedOut': { 'boolean': false }},
                { 'activeCallKey': {'string': null}},
                { 'incomingCallKey': { 'string': null }},
            ]
        })
        makeObservable(this)
    }

    public async loadPreviousFromStorage(profile?: string) {
        await super.loadPreviousFromStorage(profile)
    }

    @computed
    get person() { return this.get('person') as PersonModel }
    set person(val: PersonModel|null) { this.set('person', val) }

    @computed
    get deviceKey() { return (this.get('distinctId') ?? this.get('deviceKey')) as string }
    set deviceKey(val: string|null) { this.set('deviceKey', val) }

    @computed
    get isChild() { return this.get('isChild') as boolean }
    set isChild(val: boolean) { this.set('isChild', val) }

    @computed
    get ageBand() { return this.get('ageBand') as string }
    set ageBand(val: string) { this.set('ageBand', val) }

    @computed
    get firstName() { return this.get('firstName') as string }
    set firstName(val: string) { this.set('firstName', val) }

    @computed
    get onboardingNeeded() { return this.get('onboardingNeeded') as boolean }
    set onboardingNeeded(val: boolean) { this.set('onboardingNeeded', val) }

    @computed
    get audioOnboardingNeeded() { return this.get('audioOnboardingNeeded') as boolean }
    set audioOnboardingNeeded(val: boolean) { this.set('audioOnboardingNeeded', val) }

    @computed
    get ageOnboardingNeeded() { return this.get('ageOnboardingNeeded') as boolean }
    set ageOnboardingNeeded(val: boolean) { this.set('ageOnboardingNeeded', val) }

    @computed
    get profileOnboardingNeeded() { return this.get('profileOnboardingNeeded') as boolean }
    set profileOnboardingNeeded(val: boolean) { this.set('profileOnboardingNeeded', val) }

    @computed
    get useLoggedOut() { return this.get('useLoggedOut') as boolean }
    set useLoggedOut(val: boolean) { this.set('useLoggedOut', val) }

    @computed
    get activeCallKey() { return this.get('activeCallKey') as string }
    set activeCallKey(val: string|null) { this.set('activeCallKey', val) }

    @computed
    get incomingCallKey() { return this.get('incomingCallKey') as string }
    set incomingCallKey(val: string|null) { this.set('incomingCallKey', val) }
}

export default PersonDataService
