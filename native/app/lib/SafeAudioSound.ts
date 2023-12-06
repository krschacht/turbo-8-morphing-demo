import {Audio, AVPlaybackStatus, AVPlaybackStatusToSet} from "expo-av"
import {AVPlaybackSource} from "expo-av/src/AV"


// SafeAudioSound is intended to expose the same external interface as
// Audio.Sound. It exists is because Audio.Sound has quirks: it will let
// you call methods that it shouldn't and blow up in unexpected ways.
//
// SafeAudioSound should not contain any custom business logic, it's a generic
// class. It should just behave as we expect Audio.Sound to behave and except it
// fails more gracefully with errors that are easier to comprehend.

class SafeAudioSound {
    private sound?: Audio.Sound
    private source?: any
    private loaded: boolean = false
    private loading: boolean = false

    constructor() { }


    // Public instance methods

    public async playAsync() {
        await this.checksBefore('playAsync', this.sound, async (sound) => {
            try {
                this.sound?.playAsync()
            } catch (e) {
                let error = e as Error
                if (error.name == 'NotAllowedError') {
                    console.log(error.toString())
                } else throw e
            }
        })
    }

    public async setIsLoopingAsync(looping: boolean) {
        await this.checksBefore('setIsLoopingAsync', this.sound, async (sound) => {
            this.sound?.setIsLoopingAsync(looping)
        })

    }

    public async replayAsync() {
        await this.checksBefore('replayAsync', this.sound, async (sound) => {
            this.sound?.replayAsync()
        })
    }

    public async playFromPositionAsync(position: number) {
        await this.checksBefore('playFromPositionAsync', this.sound, async (sound) => {
            try {
                this.sound?.playFromPositionAsync(position)
            } catch (e) {
                let error = e as Error
                if (error.name == 'NotAllowedError') {
                    console.log(error.toString())
                } else throw e
            }
        })
    }

    public async pauseAsync() {
        await this.checksBefore('pauseAsync', this.sound, async (sound) => {
            this.sound?.pauseAsync()
        })
    }

    public async setPositionAsync(position: number) {
        await this.checksBefore('setPositionAsync', this.sound, async (sound) => {
            this.sound?.setPositionAsync(position)
        })
    }

    public async setIsMutedAsync(mutedState: boolean) {
        await this.checksBefore('setIsMutedAsync', this.sound, async (sound) => {
            this.sound?.setIsMutedAsync(mutedState)
        })
    }

    public async setVolumeAsync(value: number) {
        await this.checksBefore('setVolumeAsync', this.sound, async (sound) => {
            this.sound?.setVolumeAsync(value)
        })
    }

    public async unloadAsync() {
        this.loaded = false
        await this.sound?.unloadAsync()
        this.sound = undefined
    }

    public async setOnPlaybackStatusUpdate(callback: ((...args: any[]) => any) | null) {
        // this is not wrapped in checksBefore() because we want to call setOnPlaybackStatusUpdate(null) after sound has been unloaded
        this.sound?.setOnPlaybackStatusUpdate(callback)
    }

    // Audio.Sound only has createAsync() as a class method. Instead, we are defining it as an instance method.
    // Here we define an instance method which calls the class method, this enables some of the tracking we're doing.
    public async createAsync(source: AVPlaybackSource, initialStatus: AVPlaybackStatusToSet = {}, onPlaybackStatusUpdate: ((status: AVPlaybackStatus) => void) | null = null, downloadFirst: boolean = true) {
        if (this.loading) return
        this.loading = true
        this.source = source

        const {sound} = await Audio.Sound.createAsync(source, initialStatus, onPlaybackStatusUpdate, downloadFirst)
        this.sound = sound

        this.loaded = true    // this loading / loaded logic ensures that createAsync() cannot be called twice & that no other methods run until the clip is fully loaded
        this.loading = false
    }


    // Private instance methods

    async checksBefore(callingMethod: string, sound?: Audio.Sound, func?: (sound?: Audio.Sound) => void) {
        if (!this.loaded && this.loading) await new Promise(resolve => setTimeout(resolve, 100))
        if (!this.loaded && this.loading) await new Promise(resolve => setTimeout(resolve, 200))
        if (!this.loaded && this.loading) await new Promise(resolve => setTimeout(resolve, 400))

        if (!this.loaded) {
            throw new Error(`${callingMethod}: cannot complete because audio is not loaded.`)
        } else {
            if (!sound) throw new Error(`${callingMethod}: no sound object`)
            const status = await sound?.getStatusAsync()
            if (!(status?.isLoaded ?? false)) {
                throw new Error(`${callingMethod}: audio tried to load but it was unsuccessful. Is it a bad URL? Check: ${this.source?.uri}`)
            }
            if (func && this.loaded) func(sound)
        }
    }
}

export default SafeAudioSound
