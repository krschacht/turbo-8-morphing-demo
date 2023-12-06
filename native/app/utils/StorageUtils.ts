import AsyncStorage from "@react-native-async-storage/async-storage"

export class StorageUtils {
    private static debug = false

    public static async get<T>(key: string): Promise<T | null> {
        try {
            const raw = await AsyncStorage.getItem(key)
            StorageUtils.consoleDebug('get()', `${key} = ${raw}`)
            if (!raw) return null
            return JSON.parse(raw) as T
        } catch (e) {
            console.error(e)
            return null
        }
    }

    public static async set<T>(value: T|null, key: string): Promise<boolean> {
        StorageUtils.consoleDebug('set()', `${key} to ${value}`)
        try {
            if (value != null) {
                const raw = JSON.stringify(value)
                await AsyncStorage.setItem(key, raw)
            } else {
                await AsyncStorage.removeItem(key)
            }
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    private static consoleDebug(method: string, details?: string) {
        if (StorageUtils.debug) console.log(`Storage: ${method}  ${details ? details : ''}`)
    }
}
