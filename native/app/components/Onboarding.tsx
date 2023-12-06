import {observer} from 'mobx-react-lite'
import React, {useContext, useEffect, useState} from 'react'
import {SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle} from "react-native"
import CurrentAccountContext from '../../Root/CurrentAccount'
import {ManifestUtils} from '../utils/ManifestUtils'
import HomeController from './Home/HomeController'
import {OnboardingController, OnboardingState} from './Onboarding/OnboardingController'
import {OnboardingAudio} from './OnboardingAudio'
import {OnboardingProfile} from './OnboardingProfile'
import {OnboardingAge} from './OnboardingAge'

type Props = {
    style?: ViewStyle
    homeController: HomeController
}

export const Onboarding = observer((props: Props) => {
    const currentAccount = useContext(CurrentAccountContext)
    const [controller] = useState<OnboardingController>(() => new OnboardingController(currentAccount, props.homeController))

    useEffect(() => {
        controller.initialize()

        return () => {
            controller.uninitialize()
        }
    }, [])

    return (
        <>
            {controller.state != OnboardingState.BLANK &&
            <SafeAreaView style={{flex: 1, zIndex: 100, ...StyleSheet.absoluteFillObject}}>
                <View style={[styles.container, props.style]}>
                    {currentAccount.personData.audioOnboardingNeeded && <OnboardingAudio onboardingController={controller} />}
                    {currentAccount.personData.profileOnboardingNeeded && <OnboardingProfile onboardingController={controller} />}
                    {currentAccount.personData.ageOnboardingNeeded && <OnboardingAge onboardingController={controller} />}

                    {ManifestUtils.env == 'development' && controller.state != OnboardingState.LOADING &&
                    <View style={{flexDirection: 'row', backgroundColor: 'red'}}>
                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                            <View style={{flexDirection: 'row'}}>
                                <TouchableOpacity onPress={() =>  OnboardingController.setStep('audio', currentAccount, controller)}>
                                    <Text>Audio: {currentAccount.personData.audioOnboardingNeeded ? 'O' : 'X'}, </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() =>  OnboardingController.setStep('profile', currentAccount, controller)}>
                                    <Text>Profile: {currentAccount.personData.profileOnboardingNeeded ? 'O' : 'X'}, </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() =>  OnboardingController.setStep('age', currentAccount, controller)}>
                                    <Text>Age: {currentAccount.personData.ageOnboardingNeeded ? 'O' : 'X'}, </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>}
                </View>
            </SafeAreaView>}
        </>
    )
})

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
})
