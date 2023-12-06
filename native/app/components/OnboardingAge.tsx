import React, {useContext, useEffect, useState} from 'react'
import {View, ViewStyle, Text} from "react-native"
import {reaction} from "mobx"
import {OnboardingController, OnboardingState} from './Onboarding/OnboardingController'
import {observer} from 'mobx-react-lite'
import CurrentAccountContext from '../../Root/CurrentAccount'
import {AgeBandItem, OnboardingAgeController, OnboardingAgeState} from './OnboardingAge/OnboardingAgeController'
import {PrimaryButton} from './PrimaryButton'

type Props = {
    style?: ViewStyle
    onboardingController: OnboardingController
}

export const OnboardingAge = observer((props: Props) => {
    const currentAccount = useContext(CurrentAccountContext)
    const [controller] = useState<OnboardingAgeController>(() => new OnboardingAgeController(currentAccount, props.onboardingController))


    useEffect(() => {
        const neededReaction = reaction(() => props.onboardingController.state, async(state) => {

            if (currentAccount.personData.ageOnboardingNeeded) {
                if (state == OnboardingState.AGE) await controller.initialize()
                if (state == OnboardingState.AGE) await controller.startStep()
            }
        }, { fireImmediately: true })

        return () => {
            neededReaction()
            controller.uninitialize()
        }
    }, [])

    const renderAgeBand = (band: AgeBandItem) => {
        return (
            <View style={{marginVertical: 5, marginHorizontal: 3, padding: 0}} key={band.id}>
                <PrimaryButton
                    title={band.title}
                    onPress={() => controller.onAgeBandSelected(band)}
                    resetWhen={!!controller.errorMessage} />
            </View>
        )
    }

    const renderMonth = (monthName: string, monthId: number) => {
        return (
            <View style={{margin: 5}} key={monthId}>
                <PrimaryButton
                    textStyle={{marginHorizontal: 20}}
                    title={monthName}
                    onPress={() => controller.onMonthSelected(monthId)}/>
            </View>
        )
    }

    return (
        <React.Fragment>
            {props.onboardingController.state == OnboardingState.AGE && controller.state == OnboardingAgeState.AGE &&
            <View style={[{flex: 1, alignItems: 'center', justifyContent: 'center'}, props.style]}>
                <View style={{marginTop: 90}}>
                    <Text style={{color: 'orangered', marginBottom: 10, textAlign: 'center'}}>{controller.errorMessage} </Text>
                    <Text style={[props.onboardingController.styles.messageText]}>How old are you?</Text>
                </View>

                <View style={{flexDirection: "row"}}>
                    {renderAgeBand(controller.AgeBands()[1])}
                    {renderAgeBand(controller.AgeBands()[2])}
                    {renderAgeBand(controller.AgeBands()[3])}
                    {renderAgeBand(controller.AgeBands()[4])}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderAgeBand(controller.AgeBands()[5])}
                    {renderAgeBand(controller.AgeBands()[6])}
                    {renderAgeBand(controller.AgeBands()[7])}
                    {renderAgeBand(controller.AgeBands()[8])}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderAgeBand(controller.AgeBands()[9])}
                    {renderAgeBand(controller.AgeBands()[10])}
                    {renderAgeBand(controller.AgeBands()[11])}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderAgeBand(controller.AgeBands()[12])}
                    {renderAgeBand(controller.AgeBands()[13])}
                </View>
            </View>}

            {props.onboardingController.state == OnboardingState.AGE && controller.state == OnboardingAgeState.MONTH &&
            <View style={[{flex: 1, alignItems: 'center', justifyContent: 'center'}, props.style]}>
                <View style={{marginTop: 50}}>
                    <Text style={[props.onboardingController.styles.messageText]}>What month is your birthday?</Text>
                </View>

                <View style={{flexDirection: "row"}}>
                    {renderMonth("January", 1)}
                    {renderMonth("February", 2)}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderMonth("March", 3)}
                    {renderMonth("April", 4)}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderMonth("May", 5)}
                    {renderMonth("June", 6)}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderMonth("July", 7)}
                    {renderMonth("August", 8)}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderMonth("September", 9)}
                    {renderMonth("October", 10)}
                </View>
                <View style={{flexDirection: "row"}}>
                    {renderMonth("November", 11)}
                    {renderMonth("December", 12)}
                </View>
            </View>}

            {props.onboardingController.state == OnboardingState.AGE && controller.state == OnboardingAgeState.YEAR && controller.possibleBirthYear &&
            <View style={[{flex: 1, alignItems: 'center', justifyContent: 'center'}, props.style]}>
                <View style={{marginTop: 100}}>
                    <Text style={[props.onboardingController.styles.messageText]}>What year were you born?</Text>
                </View>

                <View style={{flexDirection: "row"}}>
                    <PrimaryButton
                        title={(controller.possibleBirthYear - 1).toString()}
                        onPress={() => controller.possibleBirthYear && controller.onYearSelected(controller.possibleBirthYear - 1)}/>
                    <PrimaryButton
                        title={(controller.possibleBirthYear).toString()}
                        style={{marginLeft: 10}}
                        onPress={() => controller.possibleBirthYear && controller.onYearSelected(controller.possibleBirthYear)}/>
                </View>
            </View>}
        </React.Fragment>
    )
})
