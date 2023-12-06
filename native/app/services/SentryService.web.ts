class SentryService {

    public static initialize() {}

    public static async setDeviceKey(deviceKey: string) {}

    public static addAppInfoContext(params: {
        [key: string]: any;
    }) {}

    public static captureError(error: any, context: any | undefined, htmlAttachment?: string) {}

    public static assertionFailure(message: string) {}
}

export default SentryService