import Constants from "expo-constants"

export class ManifestUtils {

    static get env() {
        return Constants.expoConfig?.extra?.reactEnv ?? 'development'
    }

    static get clientUpdateNumber():number {
        return parseInt(Constants.expoConfig?.extra?.updateNumber ?? 0)
    }

    static get railsApiDomain() {
        return Constants.expoConfig?.extra?.railsApiDomain ?? 'lava.co'
    }

    static get railsApiRoutes() {
        return Constants.expoConfig?.extra?.railsApiRoutes ?? {}
    }

    static get reactEnv() {
        return Constants.expoConfig?.extra?.reactEnv ?? 'development'
    }

    static get clientVersion() {
        return Constants.expoConfig?.version ?? "1.0.0"
    }
}