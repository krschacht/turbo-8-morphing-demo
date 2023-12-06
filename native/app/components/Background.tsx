import React from 'react'
import {View, Text, ViewStyle, StyleSheet} from 'react-native'


type Props = {
    style?: ViewStyle
    textStyle?: ViewStyle
    text: string
}

export const Background = (props: Props) => {

    return (
        <View style={{backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', ...StyleSheet.absoluteFillObject}}>
            <Text style={{color: 'white', ...props.textStyle}}>
                {props.text}
            </Text>
        </View>

    )
}