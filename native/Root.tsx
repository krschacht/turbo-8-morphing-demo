import {observer} from 'mobx-react-lite'
import React, {useContext, useEffect} from 'react'
import CurrentAccountContext from './Root/CurrentAccount'
import AppControllerContext, {RootState} from './Root/RootController'
import {SafeAreaProvider} from 'react-native-safe-area-context'
import RootKeyboardAvoidingView from './Root/RootKeyboardAvoidingView'
import {Home} from './app/components/Home'
import {Background} from './app/components/Background'

const Root = observer(() => {
    const currentAccount = useContext(CurrentAccountContext) // this executes new CurrentAccount()
    const rootController = useContext(AppControllerContext)   // this executes new AppController()

    useEffect(() => {
        void startup()

        return () => {
            void rootController.uninitialize()
        }
    }, [])

    const startup = async() => {
        await currentAccount.initialize('App.tsx')
        await rootController.initialize(currentAccount)
        await rootController.onColdStart()
    }

    const renderContent = () => {
        switch (rootController.state) {

            case RootState.INITIALIZING:
                return <Background text={'Loading...'} />

            case RootState.INIT_ERROR:
                return <Background text={'Error'} />

            case RootState.APP_UPDATING:
                return <Background text={'Updating...'} />

            case RootState.EXTENDED_DELAY:
                return <Background text={'Still updating...'} />

            case RootState.LOADED: // Match both so app will not re-load when suspended
            case RootState.SUSPENDED:
                return <Home />

            case RootState.UPDATE_FAILED:
                return <Background text={'Error: Update failed, please retry.'} />

            case RootState.LOW_DISK_SPACE:
                return <Background text={'Free up disk space.'} />
        }
    }

    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            <AppControllerContext.Provider value={rootController}>
                <CurrentAccountContext.Provider value={currentAccount}>
                    <RootKeyboardAvoidingView>
                        {renderContent()}
                    </RootKeyboardAvoidingView>
                </CurrentAccountContext.Provider>
            </AppControllerContext.Provider>
        </SafeAreaProvider>
    )
})

export default Root