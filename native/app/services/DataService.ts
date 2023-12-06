import {action, makeObservable, observable, runInAction} from "mobx"
import {StorageUtils} from "../utils/StorageUtils"

// Example object for initialization. These interfaces enforce this:
//
// 'primaryUser': [
//     'age': { 'number': 0 },
//     'favoriteNumber': { 'number': null },
//     'name': { 'string': null },
// ]

interface valueInit {
    // Examples of the values are the end of the row:
    //
    // { 'number': 0 }
    // { 'number': null }
    // { 'string': 'hello' }
    // { 'boolean': false }
    [index: string]: number|string|boolean|object|null
}

interface keyValue {
    // Example of a row:
    //
    // { 'age': { ...valueInit in here... } }
    [index: string]: valueInit
}

// This is the full object
interface dataObj {
    [index: string]: keyValue[]
}

class DataService {
    private debug: boolean = false  // don't set this to true in production
    private profile: string = 'device'
    private obj: dataObj
    private context: string
    private dataKeys: string[]
    private dataTypes: string[]
    private defaultValues: (number|string|boolean|object|null)[]
    @observable
    private dataValues: (number|string|boolean|object|null)[]

    constructor(obj: dataObj) {
        this.consoleDebug(`new()`)
        this.obj = obj
        this.context = Object.keys(this.obj)[0]
        this.dataKeys = []
        this.dataTypes = []
        this.defaultValues = []
        this.dataValues = []

        const keyValuePairs = this.obj[this.context]
        keyValuePairs.forEach(pair => {
            const key = Object.keys(pair)[0]
            this.dataKeys.push(key)

            const valueInit = Object.values(pair)[0]
            const valueType = Object.keys(valueInit)[0]
            const defaultValue = Object.values(valueInit)[0]
            this.dataTypes.push(valueType)
            this.defaultValues.push(defaultValue)
            this.dataValues.push(null) // we want initial value in memory to be null until it's read from storage
        })

        makeObservable(this)
    }

    @action
    public resetValues() {
        for (let i = 0; i <= this.dataKeys.length; i++) {
            this.set(this.dataKeys[i], this.defaultValues[i])
        }
    }

    public async getFromStorage(key: string) {
        return await StorageUtils.get(`${this.profile}.${this.context}.${key}`)
    }

    public async loadPreviousFromStorage(profile?: string) {
        if (profile) this.profile = profile
        for (let i = 0; i <= this.dataKeys.length; i++) {
            const value = await this.getFromStorage(this.dataKeys[i])

            if (typeof value == this.dataTypes[i]) {
                // @ts-ignore: the conditional confirms the type but TS doesn't realize that
                runInAction(() => { this.dataValues[i] = value })
            } else { // invalid value or no value found in Storage
                this.set(this.dataKeys[i], this.defaultValues[i])
            }
        }
    }

    public get(key: string) {
        this.consoleDebug(`get(${key})`)
        this.checkKey(key)
        return this.dataValues[this.dataKeys.indexOf(key)]
    }

    @action
    public set(key: string, newValue: number|string|boolean|object|null) {
        this.consoleDebug(`set(${key}, ${newValue})`)
        return this.setData(key, newValue)
    }

    get keys() {
        this.consoleDebug(`keys()`)
        return this.dataKeys
    }

    public async setDataAsync(key: string, value: number|string|boolean|object|null) {
        const fullKey = this.setData(key, value, true) as string
        await StorageUtils.set(value, fullKey)
    }


    // Private

    private setData(key: string, value: number|string|boolean|object|null, skipStorage?: boolean) {
        this.consoleDebug(`setData(${key}, ${value})`)

        let valueToSet:number|string|boolean|object|null|undefined = undefined
        let currentValue = this.dataValues[this.dataKeys.indexOf(key)]
        let dataType = this.dataTypes[this.dataKeys.indexOf(key)]

        if (currentValue !== undefined && dataType !== undefined) {
            if (dataType == 'string') valueToSet = this.setStringData(value)
            if (dataType == 'number') valueToSet = this.setNumberData(value)
            if (dataType == 'boolean') valueToSet = this.setBooleanData(value)
            if (dataType == 'object') valueToSet = this.setObjectData(value)

            if (valueToSet === undefined)
                throw new Error(`Data: Could not set ${key} to ${value} (${dataType}) for some unknown reason.`)
            else
                runInAction(() => { if (valueToSet !== undefined) this.dataValues[this.dataKeys.indexOf(key)] = valueToSet })

            // This is async but we don't wait, this is an "eventual write". We can set and read instantly because
            // we saved the "set" value in memory and the getter returns the value from memory.
            if (!this.valuesEqual(valueToSet, currentValue)) {
                const fullKey = `${this.profile}.${this.context}.${key}`
                if (skipStorage) return fullKey // always returns a string
                StorageUtils.set(valueToSet, fullKey)
            }
        } else {
            this.consoleDebug(`### Failed to pass dataValue and dataType checker`)
        }

        return this.dataValues[this.dataKeys.indexOf(key)]
    }

    private setStringData(value: number|string|boolean|object|null) {
        if (value == null || typeof value == 'string')
            return value
        else
            throw new Error('Data: Tried to set a string to something other than a string or null.')
    }

    private setNumberData(value: number|string|boolean|object|null) {
        if (value == null || typeof value == 'number')
            return value
        else
            throw new Error('Data: Tried to set a number to something other than a number or null.')
    }

    private setBooleanData(value: number|string|boolean|object|null) {
        if (value == null || typeof value == 'boolean')
            return value
        else
            throw new Error('Data: Tried to set a boolean to something other than true or false.')
    }

    private setObjectData(value: number|string|boolean|object|null) {
        if (value == null || typeof value == 'object')
            return value
        else
            throw new Error('Data: Tried to set an object to something other than an object or null.')
    }

    private checkKey(key: string) {
        if (!this.dataKeys.includes(key))
            throw new Error(`Data: Tried to access invalid key: ${key}`)
    }

    private valuesEqual(val1: number|string|boolean|object|null|undefined, val2: number|string|boolean|object|null|undefined) {
        if ( (typeof val1 == 'object' && val1 != null) ||
             (typeof val2 == 'object' && val2 != null) ) {
                return JSON.stringify(val1) === JSON.stringify(val2)
        } else
            return val1 == val2
    }

    private consoleDebug(method: string, force?: boolean) {
        if(this.debug || force) console.log(`Data: ${method}`)
    }
}

export default DataService
