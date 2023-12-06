import React, {useContext, useEffect, useState} from 'react'
import {View, ViewStyle, Text, Linking} from "react-native"
import {Button} from 'react-native-paper'
import {reaction} from "mobx"
import {observer} from 'mobx-react-lite'
import CurrentAccountContext from '../../Root/CurrentAccount'
import {isTablet} from '../utils/AppearanceUtils'
import {ManifestUtils} from '../utils/ManifestUtils'
import {OnboardingController, OnboardingState} from './Onboarding/OnboardingController'
import {PrimaryButton} from './PrimaryButton'
import {OnboardingAudioState, OnboardingAudioController} from './OnboardingAudio/OnboardingAudioController'

type Props = {
    style?: ViewStyle
    onboardingController: OnboardingController
}

export const OnboardingAudio = observer((props: Props) => {
    const currentAccount = useContext(CurrentAccountContext)
    const [controller] = useState<OnboardingAudioController>(() => new OnboardingAudioController(currentAccount, props.onboardingController))

    useEffect(() => {
        const neededReaction = reaction(() => props.onboardingController.state, async(state) => {

            if (currentAccount.personData.audioOnboardingNeeded) {
                await controller.initialize()
                if (state == OnboardingState.AUDIO) await controller.startStep()
            }

        }, { fireImmediately: true })

        return () => {
            neededReaction()
            controller.uninitialize()
        }
    }, [])

    return (
        props.onboardingController.state == OnboardingState.AUDIO && controller.state == OnboardingAudioState.LOADED ?
        <View style={[{flex: 1, alignItems: 'center', justifyContent: 'center'}, props.style]}>

            <View>
                <Text style={props.onboardingController.styles.messageText}>Sound check,{"\n"}can you hear this?</Text>
                <View style={{marginTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'}}>
                    <PrimaryButton
                        style={{margin: 8}}
                        onPress={() => controller.replayAudio()}
                        iconType={'Foundation'}
                        icon={'refresh'}
                        iconSide={'right'}
                        fixedState={'enabled'}
                        title={'Play Again'}/>

                    <PrimaryButton
                        style={{margin: 8}}
                        onPress={() => controller.nextStep()}
                        iconType={'FontAwesome'}
                        icon={'thumbs-up'}
                        iconSide={'right'} />
                </View>

                <View style={{marginTop: 30, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'}}>
                    <Button
                        style={{marginVertical: 10}}
                        disabled={false}
                        textColor={'#FFFFFF'}
                        onPress={() => {currentAccount.personData.useLoggedOut = true; controller.nextStep()}}>
                            {"SKIP SIGN UP"}
                    </Button>
                </View>
            </View>

            <View style={{position: 'absolute', bottom: 0, marginBottom: 10, flexDirection: isTablet() ? 'row' : 'row'}}>
                <Text
                    style={{color: "gray", marginHorizontal: 30}}
                    onPress={() => {
                        Linking.openURL('https://www.explanation.com/app-privacy');
                    }}>
                    Privacy Policy
                </Text>
                <Text style={{color: 'rgba(30,30,30,1)', marginHorizontal: 10}}>
                    v{ManifestUtils.clientUpdateNumber}
                </Text>
                <Text
                    style={{color: "gray", marginHorizontal: 30}}
                    onPress={() => {
                        Linking.openURL('https://www.explanation.com/app-terms');
                    }}>
                    Terms of Service
                </Text>
            </View>
        </View> : null
    )
})
