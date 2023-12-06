import {CallModel} from "../models/CallModel"
import {CallParticipantModel} from "../models/CallParticipantModel"

export class CallUtils {

    public static equal(c1?: CallModel, c2?: CallModel) {
        if (!c1 && !c2) return true
        if (!c1 || !c2) return false


        const call1VerifiedCount = c1.participants.filter(participant => participant.person_verified).length
        const call2VerifiedCount = c2.participants.filter(participant => participant.person_verified).length

        return c1.key == c2.key &&
            c1.participants.length == c2.participants.length &&
            c1.voice_filter == c2.voice_filter &&
            call1VerifiedCount == call2VerifiedCount
    }

    public static participantMatchingPerson(call: CallModel, personId: number): CallParticipantModel | undefined {
        const matchingParticipants = call.participants.filter((p) => {
            return p.person_id == personId
        })
        return matchingParticipants.length > 0 ? matchingParticipants[0] : undefined
    }

    public static participantProfilesExcludingPerson(call: CallModel, personToExclueId: number) {
        return call.participants
            .filter((p) => p.person_id != personToExclueId)
            .map((p) => p.profile)
    }

    public static participantPersonKeysExcludingPerson(call: CallModel, personToExclueId: number) {
        return call.participants
            .filter((p) => p.person_id != personToExclueId)
            .map((p) => p.person_key)
    }
}