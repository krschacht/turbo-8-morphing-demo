import React, {useContext, useEffect, useState} from 'react'
import {observer} from 'mobx-react-lite'
import CurrentAccountContext from '../../Root/CurrentAccount'
import {View, Text, FlatList, ListRenderItemInfo} from 'react-native'
import {StatusBar} from 'expo-status-bar'
import HomeController, {HomeState} from './Home/HomeController'
import {Onboarding} from './Onboarding'
import AppControllerContext from '../../Root/RootController'
import {Button} from 'react-native-paper'
import {isTablet} from '../utils/AppearanceUtils'
import {SafeAreaView} from 'react-native-safe-area-context'


export const Home = observer(() => {
    const currentAccount = useContext(CurrentAccountContext)
    const appController = useContext(AppControllerContext)
    const [controller] = useState<HomeController>(() => new HomeController(currentAccount, appController))

    useEffect(() => {
        controller.initialize()

        return () => {
            controller.uninitialize()
        }
    }, [])

    const renderRow = (info: ListRenderItemInfo<string>) => {
        return (
            <View key={info.index} style={{height: 40, backgroundColor: '#CCCCCC', marginVertical: 10}}>
                <Text>{info.item}</Text>
            </View>
        )
    }

    if (controller.state == HomeState.ONBOARDING)
        return (
            <View style={{flex: 1, backgroundColor: 'black'}}>
                <Onboarding homeController={controller}/>
            </View>
        )
    else
        return (
            <SafeAreaView style={{
                flex: 1,
                backgroundColor: '#000000',
                flexDirection: isTablet() ? 'row' : 'column-reverse',
            }}>
                <View
                    style={{
                        width: isTablet() ? 150 : '100%',
                        flex: 1,
                        borderWidth: 1,
                        borderColor: '#CCCCCC',
                        padding: 5,
                        paddingHorizontal: 10,
                        borderRadius: 5,
                        marginVertical: 20,
                }}>
                    <View style={{height: 20, marginBottom: 10}}>
                        <Text style={{color: 'white'}}>Friends</Text>
                    </View>

                    <FlatList
                        style={{flex: 1}}
                        data={controller.friends}
                        renderItem={renderRow}
                    />
                </View>


                <View style={{flexGrow: 1, alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{color: 'white'}}>
                        This is the Lava home screen. It's been removed from this sample codebase.
                    </Text>

                    <Button
                        style={{marginVertical: 10}}
                        disabled={false}
                        textColor={'#FFFFFF'}
                        onPress={() => controller.backToOnboarding()}>
                            {"REPEAT ONBOARDING"}
                    </Button>
                </View>

                <StatusBar style="auto" />
            </SafeAreaView>
        )
})