import {ColorValue, Dimensions, StyleSheet} from "react-native"

// import * as ScreenOrientation from 'expo-screen-orientation'

export class Color {
    static primary: string = '#416d8a'
    static secondary: string = '#e6be6e'
    static tertiary: string = '#BED5ED'
    static darkText: string = '#383838'
    static black: string = '#000000'
    static white: string = '#FFFFFF'
    static secondaryBackground: string = 'rgba(220, 220, 220, 1)'
    static hairline: string = 'rgba(0, 0, 0, 0.2)'
}

export class Style {
    static Canvas = class Canvas {
        static marginHorizontal: number = 10
        static marginTop: number = 10
    }

    static Widget = class Widget {
        static titleSizePerct: number = 0.023
        static marginVerticalPerct: number = 0.01
        static fontFamily: string = 'Agrandir-Bold'
    }

    static SearchBar = class SearchBar {
        static heightPerct: number = 0.06
    }

    static Series = class Series {
        static nameHeightPerct: number = 0.05
        static previewRowHeightPerct: number = 0.12
    }

    static Book = class Book {
        static indexWidthPerct: number = 0.20
        static titleHeightPerct: number = 0.03
        static tableOfContentsHeightPerct: number = 0.16
        static footerHeightPerct: number = 0.05
        static minimumNextPageVisibleMobilePerct: number = 0.1
        static minimumNextPageVisibleTabletPerct: number = 0.28
    }

    static Page = class Page {
        static suggestedVideosHighTabletPerct: number = 0.19
        static suggestedVideosHighMobilePerct: number = 0.14
    }
}

export const defaultCornerRadius = 6

export const PORTRAIT_LANDSCAPE_THRESHOLD = 744

export const sizeClass = () => {
    const dim = Dimensions.get('screen')
    const minDimen = Math.min(dim.width, dim.height)
    return minDimen < PORTRAIT_LANDSCAPE_THRESHOLD ? SizeClass.PORTRAIT : SizeClass.LANDSCAPE
}

export const isPortrait = () => {
    return sizeClass() == SizeClass.PORTRAIT
}

export const isLandscape = () => {
    return sizeClass() == SizeClass.LANDSCAPE
}

export const isTablet = () => {
    return sizeClass() == SizeClass.LANDSCAPE
}

export enum SizeClass {
    PORTRAIT,
    LANDSCAPE
}

export class Margin {
    static horizontal: number = (Dimensions.get('window').width >= 960) ? 50 : 10
    static vertical: number = 10
}

export class FontSize {
    static xlarge: number = (Dimensions.get('window').width >= 960) ? 44 : 26
    static large: number = (Dimensions.get('window').width >= 960) ? 36 : 20
    static xmedium: number = (Dimensions.get('window').width >= 960) ? 22 : 17
    static medium: number = (Dimensions.get('window').width >= 960) ? 18 : 12
    static small: number = (Dimensions.get('window').width >= 960) ? 14 : 10
    static xsmall: number = (Dimensions.get('window').width >= 960) ? 10 : 8
}

export const Styles = StyleSheet.create({
    heading: {
        fontFamily: "Agrandir-Regular",
        fontSize: FontSize.xlarge,
        marginHorizontal: Margin.horizontal,
        marginVertical: Margin.vertical,
    },

    footerText: {
        color: Color.white,
        marginHorizontal: Margin.horizontal,
        marginVertical: Margin.vertical,
        flex: 1
    },

    textAlignLeft: {
        textAlign: "left"
    },

    textAlignRight: {
        textAlign: "right"
    },

    textAlignCenter: {
        textAlign: "center"
    }

})

/*!
 * Get the contrasting color for any hex color
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * Derived from work by Brian Suda, https://24ways.org/2010/calculating-color-contrast/
 * @param  {String} A hexcolor value
 * @return {String} The contrasting color (black or white)
 */
export const textColorForColor = (hexcolor: string) => {
    if (hexcolor.slice(0, 1) === '#') {
        hexcolor = hexcolor.slice(1)
    }

    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(function (hex) {
            return hex + hex
        }).join('')
    }

    let r = parseInt(hexcolor.substr(0,2),16)
    let g = parseInt(hexcolor.substr(2,2),16)
    let b = parseInt(hexcolor.substr(4,2),16)

    let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000

    return (yiq >= 128) ? 'black' : 'white'
}
