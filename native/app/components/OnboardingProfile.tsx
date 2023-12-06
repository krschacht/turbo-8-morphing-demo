import React, {useContext, useEffect, useRef, useState} from 'react'
import {KeyboardAvoidingView, Text, View, ViewStyle} from "react-native"
import {reaction} from "mobx"
import {ActivityIndicator, Button, TextInput} from 'react-native-paper'
import {OnboardingController, OnboardingState} from './Onboarding/OnboardingController'
import CurrentAccountContext from '../../Root/CurrentAccount'
import {observer} from 'mobx-react-lite'
import AppControllerContext from '../../Root/RootController'
import {Color} from '../utils/AppearanceUtils'
import {OnboardingProfileController, OnboardingProfileState} from './OnboardingProfile/OnboardingProfileController'
import {PrimaryButton} from './PrimaryButton'

type Props = {
    style?: ViewStyle
    onboardingController: OnboardingController
}

export const OnboardingProfile = observer((props: Props) => {
    const currentAccount = useContext(CurrentAccountContext)
    const appController = useContext(AppControllerContext)
    const [controller] = useState<OnboardingProfileController>(() => new OnboardingProfileController(currentAccount, appController, props.onboardingController))
    const profileViewRef = useRef<View>(null)

    useEffect(() => {
        const neededReaction = reaction(() => props.onboardingController.state, async(state) => {

            if (currentAccount.personData.profileOnboardingNeeded) {
                if (state == OnboardingState.PROFILE) await controller.initialize()
                if (state == OnboardingState.PROFILE) await controller.startStep()
            }

        }, { fireImmediately: true })

        return () => {
            neededReaction()
            controller.uninitialize()
        }
    }, [])


    return (
        <React.Fragment>
            {props.onboardingController.state == OnboardingState.PROFILE && controller.state == OnboardingProfileState.LOADING &&
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator color={Color.primary} size={40} />
            </View>}

            {props.onboardingController.state == OnboardingState.PROFILE && controller.state == OnboardingProfileState.FIRST_NAME &&
                <KeyboardAvoidingView
                    behavior={'padding'}
                    keyboardVerticalOffset={40}
                    style={{
                        flex:1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <View style={{alignItems: 'center', justifyContent: 'center'}}>
                        <Text style={[props.onboardingController.styles.messageText]}>What is your first name?</Text>

                        <TextInput
                            style={{width: 320}}
                            maxLength={11}
                            mode={'flat'}
                            autoCapitalize={'words'}
                            textContentType={'givenName'}
                            keyboardType={'default'}
                            label="First name"
                            value={controller.firstName}
                            autoFocus={true}
                            autoCorrect={false}
                            onSubmitEditing={() => controller.onFirstNameSubmitted()}
                            onChangeText={text => { controller.onChangeFirstName(text); controller.setErrorMessage(undefined) }}
                        />
                        <Text style={{color: 'orangered', marginTop: 10}}>{controller.errorMessage} </Text>

                        <PrimaryButton
                            style={{marginTop: 10, marginBottom: 20}}
                            disabled={!controller.firstName || controller.firstName.length < 2}
                            resetWhen={controller.errorMessage == undefined}
                            onPress={() => controller.onFirstNameSubmitted()}
                            iconType={'FontAwesome'}
                            icon={'thumbs-up'}
                            iconSide={'right'}
                        />
                    </View>
                </KeyboardAvoidingView>
            }

            {props.onboardingController.state == OnboardingState.PROFILE && controller.state == OnboardingProfileState.LAVA_NAME &&
            <View style={[{flex: 1, alignItems: 'center', justifyContent: 'center'}, props.style]}>
                <KeyboardAvoidingView behavior={'position'} keyboardVerticalOffset={80}>
                    <View style={{alignItems: 'center', justifyContent: 'center'}}>

                        <Text style={[props.onboardingController.styles.messageText]}>What is your Lava nickname?</Text>

                        <TextInput
                            style={{width: 320}}
                            maxLength={20}
                            mode={'flat'}
                            autoCapitalize={'words'}
                            textContentType={'nickname'}
                            keyboardType={'default'}
                            autoCorrect={false}
                            autoFocus={true}
                            label="Lava Nickname"
                            left={<TextInput.Affix text={controller.firstName + ' '} textStyle={{color: "black", fontWeight: "bold"}}/>}
                            value={controller.nickname}
                            onChangeText={text => { controller.onChangeNickname(text); controller.setErrorMessage(undefined) }}
                            onSubmitEditing={() => controller.nextStep()}
                        />
                        <Text style={{color: 'orangered', marginTop: 10}}>{controller.errorMessage} </Text>

                        <PrimaryButton
                            disabled={controller.nickname == undefined || controller.nickname.length < 2}
                            resetWhen={controller.errorMessage == undefined}
                            style={{marginTop: 10, marginBottom: 20}}
                            onPress={() => controller.nextStep()}
                            iconType={'FontAwesome'}
                            icon={'thumbs-up'}
                            iconSide={'right'}
                        />

                        <Button
                            style={{marginVertical: 10}}
                            disabled={false}
                            textColor={'#FFFFFF'}
                            onPress={() => controller.setState(OnboardingProfileState.FIRST_NAME) }>
                                {"< BACK"}
                        </Button>
                    </View>
                </KeyboardAvoidingView>
            </View>}

            {props.onboardingController.state == OnboardingState.PROFILE && controller.state == OnboardingProfileState.SUBMITTING &&
            <View style={[{flex: 1, alignItems: 'center', justifyContent: 'center'}, props.style]}></View>}
        </React.Fragment>
    )
})
