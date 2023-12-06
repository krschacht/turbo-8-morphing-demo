import {AppState} from "react-native"

export class AsyncUtils {

    public static async sleep(ms: number) {
        const state = AppState.currentState
        await new Promise(r => setTimeout(r, ms))
    }
}