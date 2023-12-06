import SentryService from "../services/SentryService"
import AudioService from "../services/AudioService"
import {CurrentAccount} from "../../Root/CurrentAccount"

export class SpeechService {

    private account: CurrentAccount
    private unloaded: boolean = false
    private audio?: AudioService
    private soundLoadedWithPhrase?: string
    private preloadedPhrases: { [key: string]: string } = {}
    private preloadedAudioUrls: { [key: string]: string } = {}
    private preloadedAudios: { [phrase: string]: AudioService } = {}
    private currentPhrase?: string

    private files: { [key: string]: string } = {
        "Sound check! Can you hear this? Is your volume on? If so, tap the thumbs up to get started.": require('../assets/file_99c4f2b3-79ad-4d07-9fa2-737e1975eee8.mp3'),
        "Ready? Let's get you connected. What is your \"first\" name?": require('../assets/file_cb8ad6af-fbd2-404f-b9a0-ae9f9c070c4e.mp3'),
        "Type a Lava name that your friends will see.": require('../assets/file_5fa24107-4ba7-445a-8cbc-0355fde8092d.mp3'),
        "How \"old\" are you?": require('../assets/file_86043eea-5c9b-4754-96ca-f8bfe9c27bf5.mp3'),
        "What month is your birthday?": require('../assets/file_4b3ee57b-daf3-47bb-8982-d59f2bbd0c4a.mp3'),
        "What year were you born?": require('../assets/file_3daaaf5e-0801-4eb2-8872-4f2cae592afc.mp3'),
    }

    constructor(account: CurrentAccount) {
        this.account = account
    }

    public unload() {
        this.unloaded = true
        this.soundLoadedWithPhrase = undefined
        this.audio?.changeState.pauseAndUnload()
    }

    public pause() {
        this.audio?.changeState.pause()
    }

    public restart() {
        this.audio?.changeState.seekAndPlay(0)
    }

    public preloadPhrase(key: string, phrase: string) {
        if (this.preloadedPhrases[key] && this.preloadedPhrases[key] == phrase) return
        this.preloadedPhrases[key] = phrase
        this.getAudioFileForPhrase(phrase).then()
    }

    public async speakPreloadedPhrase(key: string, onFinish: (() => void) | undefined = undefined) {
        await this.speak(this.preloadedPhrases[key], onFinish)
    }

    public async speakPreloadedPhraseAndWait(key: string, onFinish: (() => void) | undefined = undefined) {
        await this.speakAndWait(this.preloadedPhrases[key], onFinish)
    }

    public unloadPreloadedPhrase(key: string) {
        const vizzAudio = this.preloadedAudios[this.preloadedPhrases[key]]
        if (vizzAudio) {
            vizzAudio.changeState.pauseAndUnload().then(() => {
                delete this.preloadedAudios[this.preloadedPhrases[key]]
            })
        }
    }

    public async speak(phrase: string, onFinish: (() => void) | undefined = undefined) {
        await this.speakAndWait(phrase, onFinish, false) // false = only waits for playing to start
    }

    public async speakAndWait(phrase: string, onFinish: (() => void) | undefined = undefined, waitForAllOperations: boolean = true) {
        if (this.unloaded) return
        if (this.soundLoadedWithPhrase && this.soundLoadedWithPhrase != phrase) {
            this.pause()
        }

        this.currentPhrase = phrase
        try {
            if (this.soundLoadedWithPhrase && this.soundLoadedWithPhrase == phrase) {
                this.audio?.changeState.seekAndPlay(0)
            } else {
                const newVizzAudio = await this.getAndCacheVizzAudioForPhrase(phrase)
                if (this.currentPhrase != phrase) return // another call to speak may have been executed so we short circuit this call
                if (newVizzAudio != undefined) {
                    if (this.audio) {
                        await this.audio.changeState.pauseAndUnload()
                        delete this.preloadedAudios[phrase]
                    }
                    this.audio = newVizzAudio

                    await this.audio.changeState.play()
                    this.soundLoadedWithPhrase = phrase
                }
            }
            if (this.audio) { // outside the conditional b/c we may be re-using an old sound object
                const audio = this.audio

                if (!waitForAllOperations) {
                    if (onFinish) {
                        await audio.setOnFinishListener(onFinish)
                    }
                } else {
                    await new Promise( async (resolve, reject) => {
                        try {
                            await audio.setOnFinishListener(() =>  {
                                resolve('Done playing')
                            })
                        } catch (error) {
                            reject(error)
                        }
                    })
                }
            }
        } catch (e) {
            this.audio = undefined
            console.error(e)
            SentryService.captureError(e)
        }
    }

    private async getAndCacheVizzAudioForPhrase(phrase: string) {
        let tries = 0
        const retryLimit = 50
        const waitForMS = 100

        const existingVizzAudio = this.preloadedAudios[phrase]
        if (existingVizzAudio) return existingVizzAudio

        const audioFile = await this.getAudioFileForPhrase(phrase)
        if (!audioFile) return undefined

        const audio = new AudioService(audioFile)
        this.preloadedAudios[phrase] = audio
        await this.preloadedAudios[phrase].changeState.loadAndPause()

        return this.preloadedAudios[phrase]
    }

    private async getAudioFileForPhrase(phrase: string) {
        let audioFile: string|undefined = undefined

        const existingAudioUrl = this.preloadedAudioUrls[phrase]
        if (existingAudioUrl) return existingAudioUrl

        if (this.unloaded) return undefined

        audioFile = this.files[phrase]

        if (!audioFile) return undefined
        this.preloadedAudioUrls[phrase] = audioFile

        return audioFile
    }
}
