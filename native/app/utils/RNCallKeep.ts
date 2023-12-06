
export class RNCallKeep {

    public static addEventListener(type: string, handler: (args: string) => void) {}

    public static removeEventListener(type: string) {}

    public static startCall(uuid: string, handle: string, contact?: string, handleType?: string, hasVideo?: boolean) {}

    public static rejectCall(uuid: string) {}

    public static setCurrentCallActive(uuid: string) {}

    public static async getCalls(): Promise<any[]> { return new Promise((resolve) => resolve([]))}

    public static endAllCalls() {}

    public static endCall(uuid: string) {}

    public static reportEndCallWithUUID(uuid: string, reason: number) {}

}