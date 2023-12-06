
export default class DateUtils {

    public static daysBetween(d1: Date|number|string, d2: Date|number|string) {
        let date1
        let date2
        if ((typeof d1) == 'object') date1 = d1 as Date
        if ((typeof d1) == 'number') date1 = new Date(d1 as number)
        if ((typeof d1) == 'string') date1 = DateUtils.parse(d1 as string)
        if ((typeof d2) == 'object') date2 = d2 as Date
        if ((typeof d2) == 'number') date2 = new Date(d2 as number)
        if ((typeof d2) == 'string') date2 = DateUtils.parse(d2 as string)

        const msBetweenDates = Math.abs((date1 as Date).getTime() - (date2 as Date).getTime())

        return Math.floor(msBetweenDates / (1000 * 3600 * 24))
    }

    public static parse(d: string) {
        return new Date(Date.parse(d as string))
    }

    public static today_string() {
        return DateUtils.now().toDateString()
    }

    public static tomorrow(hour: number) {
        let tomorrow = DateUtils.now()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(hour)
        tomorrow.setMinutes(0)
        tomorrow.setSeconds(0)

        return tomorrow
    }

    private static nowDate?: Date

    public static setNowDate(date?: Date) {
        console.warn(`WARNING: Overrideing nowDate to ${date}. This code should never be running in production.`)
        DateUtils.nowDate = date
    }

    public static now(): Date {
        return DateUtils.nowDate ?? new Date()
    }

    public static timeAgoInWords(dateString?: string): string {
        if (dateString == undefined) return ''
        const date = new Date(dateString)
        const now = new Date()
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        const intervals: [number, string][] = [
            [31536000, 'year'],
            [2592000, 'month'],
            [604800, 'week'],
            [86400, 'day'],
            [3600, 'hour'],
            [60, 'minute'],
            [1, 'second']
        ]

        for (const [interval, word] of intervals) {
            const count = Math.floor(seconds / interval)
            if (count > 0) {
                return `${count} ${word}${count === 1 ? '' : 's'} ago`
            }
        }

        return 'just now'
    }
}