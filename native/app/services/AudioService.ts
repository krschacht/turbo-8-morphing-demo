import {Platform} from "react-native"
import {Audio, AudioMode, InterruptionModeIOS} from "expo-av"
import {AVPlaybackSource} from "expo-av/src/AV"
import {InterruptionModeAndroid} from "expo-av/src/Audio.types"
import SafeAudioSound from "../lib/SafeAudioSound"

export enum AudioState {
    UNLOADED = 'unloaded',
    PLAYING = 'playing',
    PAUSED = 'paused'
}

class AudioLoadError extends Error {
    code: number = 0

    constructor(message: string) {
      // Pass remaining arguments (including vendor specific ones) to parent constructor
      super(message)

      // Set the prototype explicitly
      Object.setPrototypeOf(this, AudioLoadError.prototype)

      // Maintains proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, AudioLoadError)
      }

      this.name = 'AudioLoadError'
      // Custom debugging information
      this.code = 500
    }
}


class AudioService {
    private debug: boolean = false  // don't set this to true in production

    private labelForConsoleDebug?: string
    private sound: SafeAudioSound
    private sourceUrlOrAV: string | AVPlaybackSource
    private isMuted: boolean = false
    public state: AudioState = AudioState.UNLOADED


    constructor(sourceUrlOrAV: string | AVPlaybackSource, labelForConsoleDebug?: string) {
        this.consoleDebug(`new()`)

        this.state = AudioState.UNLOADED

        this.labelForConsoleDebug = labelForConsoleDebug

        this.sound = new SafeAudioSound()
        this.sourceUrlOrAV = sourceUrlOrAV
    }


    // Public instance methods

    public changeState = {
        // Methods grouped just for readability. We want it to be obvious when you are changing state.
        // The last word of the method name indicates the state it will end in.

        loadAndPause: async() => {
            this.consoleDebug(`changeState.loadAndPause()`)
            if (this.state != AudioState.UNLOADED) throw new Error(`Tried to loadAndPause() from an invalid state (${this.state})`)

            this.state = AudioState.PAUSED
            try {
                await this.load()
                await this.setIsMuted(this.isMuted)
                if (this.state != AudioState.PAUSED) return
                await this.pause()
            } catch(e) {
                this.state = AudioState.UNLOADED
                throw e
            }
        },

        loadAndPlay: async() => {
            this.consoleDebug(`changeState.loadAndPlay()`)
            if (this.state != AudioState.UNLOADED) throw new Error(`Tried to loadAndPlay() from an invalid state (${this.state})`)

            this.state = AudioState.PLAYING
            try {
                await this.load()
                await this.setIsMuted(this.isMuted)
                if (this.state != AudioState.PLAYING) return
                await this.play()
            } catch(e) {
                this.state = AudioState.UNLOADED
                throw e
            }
        },

        loadAndPlayLooping: async() => {
            this.consoleDebug(`changeState.loadAndPlayLooping()`)
            if (this.state != AudioState.UNLOADED) throw new Error(`Tried to loadAndPlayLooping() from an invalid state (${this.state})`)

            this.state = AudioState.PLAYING
            try {
                await this.load()
                await this.setIsMuted(this.isMuted)
                if (this.state != AudioState.PLAYING) return
                await this.play(true)
            } catch(e) {
                this.state = AudioState.UNLOADED
                throw e
            }
        },

        seekAndPause: async(position: number) => {
            this.consoleDebug(`changeState.seekAndPause(${position})`)
            if (this.state != AudioState.PAUSED && this.state != AudioState.PLAYING) throw new Error(`Tried to seekAndPause() from an invalid state (${this.state})`)

            this.state = AudioState.PAUSED
            await this.seek(position)
            if (this.state != AudioState.PAUSED) return
            await this.pause()
        },

        seekAndPlay: async(position: number) => {
            this.consoleDebug(`changeState.seekAndPlay(${position})`)
            if (this.state != AudioState.PAUSED && this.state != AudioState.PLAYING) throw new Error(`Tried to seekAndPlay() from an invalid state (${this.state})`)

            this.state = AudioState.PLAYING
            await this.seek(position)
            if (this.state != AudioState.PLAYING) return
            await this.play()
        },

        play: async() => {
            this.consoleDebug(`changeState.play()`)
            if (this.state == AudioState.PLAYING) return
            if (this.state != AudioState.PAUSED) throw new Error(`Tried to play() from an invalid state (${this.state})`)

            this.state = AudioState.PLAYING
            await this.play()
        },

        pause: async() => {
            this.consoleDebug(`changeState.pause()`)
            if (this.state != AudioState.PLAYING) return

            this.state = AudioState.PAUSED
            await this.pause()
        },

        pauseAndUnload: async() => {
            this.consoleDebug(`changeState.pauseAndUnload()`)
            if (this.state == AudioState.UNLOADED) return

            this.state = AudioState.UNLOADED
            await this.unload()
        }
    }

    public async setVolume(volume: number) {
        this.consoleDebug(`setVolume(${volume})`)
        if (this.state == AudioState.UNLOADED) return

        try {
            await this.sound.setVolumeAsync(volume)
        } catch(e) {
            if (!(e instanceof AudioLoadError)) {
                this.consoleDebug(`setVolume() failed to complete: ${e}`)
            }
        }
    }

    public async setIsMuted(mute: boolean) {
        this.consoleDebug(`setIsMuted(${mute})`)
        this.isMuted = mute

        if (this.state == AudioState.UNLOADED) return

        try {
            await this.sound.setIsMutedAsync(this.isMuted)
        } catch(e) {
            if (!(e instanceof AudioLoadError)) {
                this.consoleDebug(`setIsMuted() failed to complete: ${e}`)
            }
        }
    }

    public async setOnFinishListener(callback: (() => void)) {
        this.consoleDebug(`setOnFinishListener(callback)`)

        await this.sound.setOnPlaybackStatusUpdate((status) => {
            if ((status as any).didJustFinish) {
                callback()
                this.sound?.setOnPlaybackStatusUpdate(null)
            }
        })
    }


    // Private instance methods

    private async unload()  { this.consoleDebug(`unload()`); await this.sound.unloadAsync() }

    private async load() {
        this.consoleDebug(`load()`)

        if (typeof this.sourceUrlOrAV === 'string') {
            //if (!await this.railsApi.ping(this.sourceUrlOrAV)) throw new Error(`Unable to load audio. Is this url valid? ${this.sourceUrlOrAV}`)
            await this.sound.createAsync({uri: this.sourceUrlOrAV})
        } else
            await this.sound.createAsync(this.sourceUrlOrAV)
    }

    private async play(looping?: boolean) {
        this.consoleDebug(`play()`)
        try {
            await this.sound.playAsync()
            if (looping) this.sound.setIsLoopingAsync(true)
        } catch(e) {
            if (e instanceof AudioLoadError) {
                this.consoleDebug(`play() failed to complete: ${e}`, true)
            }
        }
    }

    private async pause()  {
        this.consoleDebug(`pause()`)
        try {
            await this.sound.pauseAsync()
        } catch(e) {
            if (e instanceof AudioLoadError) {
                this.consoleDebug(`pause() failed to complete: ${e}`, true)
            }
        }
    }

    private async seek(position: number){
        this.consoleDebug(`seek(${position})`)
        try {
            await this.sound.setPositionAsync(position)
        } catch(e) {
            if (e instanceof AudioLoadError) {
                this.consoleDebug(`seek() failed to complete: ${e}`, true)
            }
        }
    }


    private consoleDebug(method: string, force?: boolean) {
        if(this.debug || force) console.log(`   VizzAudio: ${method}  [${this.labelForConsoleDebug || ''}]`)
    }


    // Class methods

    public static async changeToAudioPlaybackMode() {
        if (Platform.OS == 'web') return

        const mode = Platform.select<Partial<AudioMode>>({
            android: {
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix
            },
            ios: {
                playsInSilentModeIOS: true,
                allowsRecordingIOS: false,
                interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
                staysActiveInBackground: true
            },
        })
        if (mode) {
            await Audio.setAudioModeAsync(mode)
                .then((s) => `Audio session configured: ${s}`)
        }
    }

    public static async changeToAudioRecordingMode() {
        if (Platform.OS == 'web') return

        const mode = Platform.select<Partial<AudioMode>>({
            android: {
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix
            },
            ios: {
                allowsRecordingIOS: true,
                interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true
            },
        })
        if (mode) {
            await Audio.setAudioModeAsync(mode)
                .then((s) => `Audio session configured: ${s}`)
        }
    }
}

export default AudioService
