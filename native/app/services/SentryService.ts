import {ManifestUtils} from "../utils/ManifestUtils"
import {Platform} from "react-native"

class SentryService {

    public static initialize() {
        if (ManifestUtils.reactEnv == 'development') return
    }

    private static dist() {
        return `${ManifestUtils.reactEnv}-${ManifestUtils.clientUpdateNumber}`
    }

    public static async setDeviceKey(deviceKey: string) {
        if (Platform.OS == 'web') return

        // Sentry calls removed
    }

    public static addAppInfoContext(params: {
        [key: string]: any;
    }) {
        if (Platform.OS == 'web') return

        // Sentry calls removed
    }

    public static captureError(error: any, context?: any | undefined, htmlAttachment?: string) {
        if (Platform.OS == 'web') return

        console.error(error)

        // Sentry calls removed
    }
}

export default SentryService