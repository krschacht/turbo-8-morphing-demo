import React from 'react'
import {Platform, KeyboardAvoidingView} from 'react-native'

type Props = React.PropsWithChildren<{
    children?: React.ReactNode
}>

export const RootKeyboardAvoidingView = (props: Props) => {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            enabled={false}
            style={{flex:1}}
        >
            {props.children}
        </KeyboardAvoidingView>
    )
}

export default RootKeyboardAvoidingView