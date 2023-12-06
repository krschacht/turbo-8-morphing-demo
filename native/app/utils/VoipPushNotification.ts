
export class VoipPushNotification {

    public static addEventListener(type: string, handler: (args: string) => void) {}

    public static removeEventListener(type: string) {}

    public static onVoipNotificationCompleted(uuid: string) {}

    public static registerVoipToken() {}
}