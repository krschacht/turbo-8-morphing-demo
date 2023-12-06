import React, {useEffect, useState} from 'react'
import {TouchableRipple} from "react-native-paper"
import {LinearGradient} from "expo-linear-gradient"
import {StyleSheet, Text, View, ViewStyle} from "react-native"
import {MaterialCommunityIcons, Foundation, Feather, FontAwesome, Fontisto, Ionicons} from '@expo/vector-icons'

type Props = {
    style?: ViewStyle
    textStyle?: ViewStyle

    icon?: string
    iconType?: string
    iconSide?: string

    title?: string
    onPress: () => void
    onLongPress?: () => void

    fixedState?: 'disabled' | 'enabled' // button is always in this state, changes to this value have no effect, and the next two props do nothing
    disabled?: boolean                  // when this is false, the button can be used but as soon as it's tapped it will disabled itself
    resetWhen?: boolean                 // if the button is disabled because it was tapped, it will re-enable itself when this flips to true
}

export const PrimaryButton = (props: Props) => {
    const [disabled, setDisabled] = useState<boolean>(!!props.disabled)
    const forceDisabledValue = props.fixedState == undefined ? undefined : ( props.fixedState == 'disabled' ? true : false)

    const iconSide = () => {
        return props.iconSide ?? 'left'
    }

    useEffect(() => {
        if (props.resetWhen) refreshState()
    }, [props.resetWhen])

    useEffect(() => {
        refreshState()
    }, [props.disabled])

    const refreshState = () => {
        if (!props.disabled) setDisabled(forceDisabledValue ?? false)
        if (props.disabled) setDisabled(forceDisabledValue ?? true)
    }

    const onPress = () => {
        setDisabled(forceDisabledValue ?? true)
        if (props.onPress) props.onPress()
    }

    const onLongPress = () => {
        setDisabled(forceDisabledValue ?? true)
        if (props.onLongPress) props.onLongPress()
        else if (props.onPress) props.onPress()
    }

    const renderIcon = () => (
        <React.Fragment>
            {props.iconType == 'MaterialCommunityIcons' && <MaterialCommunityIcons name={props.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={25} color={'#380064'} />}
            {props.iconType == 'Foundation' && <Foundation name={props.icon as React.ComponentProps<typeof Foundation>['name']} size={25} color={'#380064'} />}
            {props.iconType == 'Feather' && <Feather name={props.icon as React.ComponentProps<typeof Feather>['name']} size={25} color={'#380064'} />}
            {props.iconType == 'FontAwesome' && <FontAwesome name={props.icon as React.ComponentProps<typeof FontAwesome>['name']} size={25} color={'#380064'} />}
            {props.iconType == 'Fontisto' && <Fontisto name={props.icon as React.ComponentProps<typeof Fontisto>['name']} size={25} color={'#380064'} />}
            {props.iconType == 'Ionicons' && <Ionicons name={props.icon as React.ComponentProps<typeof Ionicons>['name']} size={25} color={'#380064'} />}
        </React.Fragment>
    )

    return (
        <TouchableRipple
            style={props.style}
            onPress={() => !disabled && onPress()}
            onLongPress={() => !disabled && onLongPress()}
            disabled={disabled}
        >
            <LinearGradient
                style={styles.container}
                colors={['#F1B1DD', '#BED5ED', '#B1FFC1']}
                locations={[0, 0.62, 1]}
                start={{x: 0, y: 0.5}}
                end={{x: 1, y: 0.5}}
            >
                <Text style={[styles.text, props.textStyle]}>
                    {props.icon && iconSide() == 'left' && renderIcon()}
                    {props.title && iconSide() == 'left' && props.icon && '  '}
                    {props.title}
                    {props.title && iconSide() == 'right' && props.icon && '  '}
                    {props.icon && iconSide() == 'right' && renderIcon()}
                </Text>
                {disabled && <View style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', ...StyleSheet.absoluteFillObject}}/>}
            </LinearGradient>
        </TouchableRipple>
    )
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        height: 76,
        borderRadius: 38,
        overflow: 'hidden',
    },
    text: {
        marginHorizontal: 30,
        textAlign: 'center',
        fontSize: 25,
        fontWeight: '600',
        color: '#380064'
    }
})