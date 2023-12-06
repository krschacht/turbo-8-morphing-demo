import {ManifestUtils} from "../utils/ManifestUtils"
import SentryService from "./SentryService"
import {AsyncUtils} from "../utils/AsyncUtils"

export class HttpError extends Error {
    public code: number
    public response: any
    public internal_message: string
    public action?: 'skip_because_call_not_found'

    constructor(name: string, code: number, msg: string, response: any) {
        let message
        if (typeof response === 'string' && response.length > 0)
            message = response
        else if (typeof response === 'object' && response !== null) {
            if (response.hasOwnProperty('error'))
                message = response.error
            else if (response.hasOwnProperty('message'))
                message = response.message
        } else
            message = msg

        super(message) // .message is always the most useful string possible
        this.name = `HttpError: ${name.replace(/\/\d+\//g, '/#/').replace(/\/\d+$/, '/#').replace(/\?.*$/, '?...')}`
        this.code = code
        this.response = response
        this.internal_message = msg
    }

    get status() {
       return RailsAPIService.statusMsg(this.code)
    }
}

interface HttpRequestHeaders {
    'Accept'?: string
    'Content-Type'?: string
    'Authorization'?: string
    'X-Client-Update-Number'?: string
    'User-Agent'?: string
}

interface FetchConfig {
    method: string
    headers: HttpRequestHeaders
    cache: string
    body?: string | FormData
    signal?: AbortSignal
}

interface RoutePieces {
    gem: string
    method: string
    name: string
    key: string
    secondaryKey: string
}

export default class RailsAPIService {
    private debug: boolean = false  // don't set this to true in production

    public httpToken?: () => string
    public serverCheckForAutoUpdate: boolean
    public serverUpdateNumber: number | null
    public serverVersion: string | null
    public app: string | null
    public disabledFeatures: string[]

    private apiRequestsTrackingSecond: number = 0
    private apiRequestsCountForCurrentSecond: number = 0
    private warnMaxRequestsPerSec = 25
    private lastSecondApiRequests: string[] = []

    private static defaultTimeoutMS = 30000
    private timeoutAbortController?: AbortController

    constructor() {
        this.serverCheckForAutoUpdate = true
        this.serverUpdateNumber = null
        this.serverVersion = null
        this.app = null
        this.disabledFeatures = []
    }


    // Public instance methods

    public async ping(url: string): Promise<boolean> {
        this.consoleDebug(`ping(${url})`)
        if (!this.urlIsValid(url)) { return Promise.reject(new Error(`InvalidUrl: This url does not pass url regex: ${url}`)) }

        const config = await this.prepApiRequest(url, 'get', {})
        let ok = false

        await fetch(url, config)
            .then(async response => {
                ok = response.ok
            }).catch(e => {
                return Promise.reject(new Error(`Could not fetch ${url} - ${e.errorMessage}`))
            })

        return Promise.resolve(ok)
    }

    public async get(route: string, queryStringParams: object = {}, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) {
        this.consoleDebug(`get(${route}, {})`, queryStringParams)
        let url = this.urlForRoute(route, 'get')
        url = this.urlWithQueryString(url, queryStringParams)
        if (url == '' || url[0] == '?') { return Promise.reject(new Error(this.routeError(route))) }
        return await this.apiRequest(url, 'get', undefined, retry, signal, showNetworkErrors)
    }

    public async post(route: string, payload: any, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) {
        this.consoleDebug(`post(${route}, {})`, payload)
        const url = this.urlForRoute(route, 'post')
        if (url == '' || url[0] == '?') { return Promise.reject(new Error(this.routeError(route))) }
        return await this.apiRequest(url, 'post', payload, retry, signal, showNetworkErrors)
    }

    public async patch(route: string, payload: any, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) {
        this.consoleDebug(`patch(${route}, {})`, payload)
        const url = this.urlForRoute(route, 'patch')
        if (url == '' || url[0] == '?') { return Promise.reject(new Error(this.routeError(route))) }
        return await this.apiRequest(url, 'patch', payload, retry, signal, showNetworkErrors)
    }

    public async delete(route: string, queryStringParams: object = {}, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) {
        this.consoleDebug(`delete(${route}, {})`, queryStringParams)
        let url = this.urlForRoute(route, 'delete')
        url = this.urlWithQueryString(url, queryStringParams)
        if (url == '' || url[0] == '?') { return Promise.reject(new Error(this.routeError(route))) }
        return await this.apiRequest(url, 'delete', undefined, retry, signal, showNetworkErrors)
    }


    // Private instance methods

    private paths(gem: string, method: string, name: string): string {
        if (!ManifestUtils.railsApiRoutes[gem] || !ManifestUtils.railsApiRoutes[gem][method])
            return ''
        return ManifestUtils.railsApiRoutes[gem][method][name] ?? ''
    }

    private namespace(gem: string): string {
        if (!ManifestUtils.railsApiRoutes[gem]) return ''
        const namespace = ManifestUtils.railsApiRoutes[gem]['namespace'] ?? gem
        return (namespace == '') ? '' : '/'+namespace
    }

    private routeError(route: string): string {
        let genericExplanation = 'Check for a typo and check the railsApiRoutes key in to app.config.js'
        let details = ''
        if (route.includes('(') && !route.includes(')'))
            details = 'You open a parenthesis but forgot to close it. '

        return `InvalidRoute: The route "${route}" did not map to a URL. ${details}${genericExplanation}`
    }

    private urlForRoute(route: string, method: string): string {
        const parts = this.piecesOfRoute(route, method)
        const path = this.pathForParts(parts)
        const namespace = this.namespace(parts.gem)

        if (path == '') { return path }
        let url = ManifestUtils.railsApiDomain + namespace + path
        return url
    }

    private rewriteUrlWithOverride(url: string, newUrl: string) {
        return url.replace(ManifestUtils.railsApiDomain, newUrl)
    }

    private piecesOfRoute(route: string, method: string): RoutePieces {
        let pieces: RoutePieces = {
            gem: 'root',
            method: method,
            name: route,
            key: '',
            secondaryKey: '',
        }

        // e.g.
        // route = vizz_account.person_path('abc-123')
        //   gem = vizz_account
        //   name = person_path
        //   key = abc-123
        //
        // route = user_path
        //   gem =
        //   name = user_path
        //   key = ''

        if (route.includes('.')) {
            const two_parts = route.split('.')
            pieces.gem = two_parts[0]
            pieces.name = two_parts[1]
        }

        let match_parameter_on_name = pieces.name.match(/\((.*)\)/)
        if (match_parameter_on_name) {
            if (match_parameter_on_name[1].includes(',')) {
                const keys = match_parameter_on_name[1].split(',')
                pieces.key = keys[0].trim()
                pieces.secondaryKey = keys[1].trim()
            } else {
                pieces.key = match_parameter_on_name[1]
            }
            pieces.name = pieces.name.replace(match_parameter_on_name[0], "")
        }

        return pieces
    }

    private pathForParts(pieces: RoutePieces): string {
        let path = this.paths(pieces.gem, pieces.method, pieces.name)
        if (path === undefined) {
            return ''
        }

        let match = path.match(/\:[A-Za-z_]+/g)
        if (match) {
            const keyWithoutQuotes = pieces.key.replace(/['"]/g,"")
            path = path.replace(match[0], keyWithoutQuotes)

            if (match.length > 1) {
                const secondaryKeyWithoutQuotes = pieces.secondaryKey.replace(/['"]/g,"")
                path = path.replace(match[1], secondaryKeyWithoutQuotes)
            }
        }

        return path
    }

    private urlWithQueryString(url: string, params: object): string {
        params = this.cleanData(params)

        const keys = Object.keys(params)
        if (keys.length == 0) {
            return url
        }

        const queryString = keys.map(key => {
            // @ts-ignore: TS is concerned key won't exist in params, but it will
            let val = this.fixedEncodeURIComponent(params[key])
            return `${key}=${val}`
        }).join("&")

        return url + '?' + queryString
    }

    private urlIsValid(url: string) {
        const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
            'localhost|'+ // OR localhost
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.,:~+]*)*'+ // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i') // fragment locator
        return urlPattern.test(url)
    }

    private async apiRequest(incomingUrl: string, method: string = 'get', data: any = {}, retry: boolean = false, signal: AbortSignal|undefined = undefined, showNetworkErrors: boolean = true) {
        try {
            return await this.unsafeApiRequest(incomingUrl, method, data, retry, signal)
        } catch (error) {
            throw error
        }
    }

    private async unsafeApiRequest(incomingUrl: string, method: string = 'get', data: any = {}, retry: boolean = false, signal: AbortSignal|undefined = undefined) {
        this.consoleDebug(`apiRequest(${incomingUrl}, ${method}, {}) - ${this.httpToken ? this.httpToken() : ''}`, data)
        await AsyncUtils.sleep(500)
        if (method == 'patch' && incomingUrl == 'localhost/social/profile')
            return ['Keith', 'Doug', 'David', 'Friend 4', 'Friend 5', 'Friend 6', 'Friend 7', 'Friend 8', 'Friend 9', 'Friend 10', 'Friend 11', 'Friend 12']
        else
            return {}

        // this method is short circuited for testing purposes so the backend APIs don't have to actually exist
    }

    private stripResponsePayload(rawResponse: any) {
        if (rawResponse['check_for_auto_update']) {
            this.serverCheckForAutoUpdate = ! (rawResponse['check_for_auto_update'].toString() == 'false') // this makes it default to true for any other value
        }
        if (rawResponse['update_number']) {
            const update_number = parseInt(rawResponse['update_number'])
            if (isFinite(update_number))
                this.serverUpdateNumber = update_number
        }
        if (rawResponse['version']) {
            const version = rawResponse['version'] as string
            if (version != '' && version != null)
                this.serverVersion = version
        }
        if (rawResponse['app']) {
            const app = rawResponse['app'] as string
            if (app != '' && app != null)
                this.app = app
        }
        if (rawResponse['disabled_features']) {
            let disabled_features = null
            if (typeof rawResponse['disabled_features'] === 'string' || rawResponse['disabled_features'] instanceof String)
                disabled_features = rawResponse['disabled_features'].split(",")
            if (disabled_features) {
                disabled_features = disabled_features.map(s => s.trim())
                this.disabledFeatures = disabled_features
            }
        }

        return rawResponse["data"]
    }

    private async prepApiRequest(url: string, method: string = 'get', data: object = {}, signal: AbortSignal|undefined = undefined): Promise<object> {
        let headers: HttpRequestHeaders = {
            "User-Agent": navigator.userAgent
        }

        if (this.httpToken) {
            headers.Authorization = `Bearer ${this.httpToken()}`
        }

        let config: FetchConfig = {
            method: method.toUpperCase(),
            headers: headers,
            cache: 'no-store'
        }

        if (Object.keys(data).length > 0) {
            data = this.cleanData(data)

            if (data.hasOwnProperty('file')) {
                let formData = new FormData()
                // @ts-ignore: we know data has keys
                Object.keys(data).forEach(key =>  {
                    // @ts-ignore: we know it has this key
                    formData.append(key, data[key])
                })
                config.body = formData
            } else {
                config.body = JSON.stringify(data)
                config.headers['Content-Type'] = 'application/json;charset=UTF-8'
            }
        }
        config.headers['Accept'] = 'application/json'
        config.headers['X-Client-Update-Number'] = ManifestUtils.clientUpdateNumber.toString()

        if (signal) {
            config.signal = signal
        }

        return new Promise((resolve) => resolve(config))
    }

    private cleanData(data: object) {
        if (Object.keys(data).length > 0) {
            Object.keys(data).forEach(key => {
                // @ts-ignore: we know data has keys
                if (data[key] == undefined || data[key] == null) {
                    // @ts-ignore: we know data has keys
                    delete data[key]
                }
            })
        }

        return data
    }

    private fixedEncodeURIComponent(str: string) { // explained here: https://bit.ly/3TxJAOD
        return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
            return '%' + c.charCodeAt(0).toString(16);
        })
    }

    private trackApiRequest(request: string) {
        const sec = Math.trunc(new Date().getTime() / 1000.0)

        if (sec > this.apiRequestsTrackingSecond) {
            this.apiRequestsCountForCurrentSecond = 1
            this.apiRequestsTrackingSecond = sec
            this.lastSecondApiRequests = []
        } else {
            this.apiRequestsCountForCurrentSecond += 1
        }

        this.lastSecondApiRequests.push(request)

        if (this.apiRequestsCountForCurrentSecond > this.warnMaxRequestsPerSec) {
            const error = new Error(`Req/sec of ${this.apiRequestsCountForCurrentSecond} exceeded max of ${this.warnMaxRequestsPerSec}`)
            console.error(error)
            SentryService.captureError(error, {apiRequests: this.lastSecondApiRequests})

            this.apiRequestsCountForCurrentSecond = 0
            this.apiRequestsTrackingSecond = 0
            this.lastSecondApiRequests = []
        }
    }

    private consoleDebug(method: string, details: any = '', force?: boolean) {
        if (this.debug || force) console.log(`${force ? '' : 'RailsAPI: '}${method}`, Object.keys(details).length === 0 ? '' : details)
    }

    public static statusMsg(code: number) {
        const httpCodes: { [key: number]: string } = {
            100: "continue",
            101: "switching_protocols",
            102: "processing",
            103: "early_hints",
            200: "ok",
            201: "created",
            202: "accepted",
            203: "non_authoritative_information",
            204: "no_content",
            205: "reset_content",
            206: "partial_content",
            207: "multi_status",
            208: "already_reported",
            226: "im_used",
            300: "multiple_choices",
            301: "moved_permanently",
            302: "found",
            303: "see_other",
            304: "not_modified",
            305: "use_proxy",
            306: "reserved",
            307: "temporary_redirect",
            308: "permanent_redirect",
            400: "bad_request",
            401: "unauthorized",
            402: "payment_required",
            403: "forbidden",
            404: "not_found",
            405: "method_not_allowed",
            406: "not_acceptable",
            407: "proxy_authentication_required",
            408: "request_timeout",
            409: "conflict",
            410: "gone",
            411: "length_required",
            412: "precondition_failed",
            413: "request_entity_too_large",
            414: "request_uri_too_long",
            415: "unsupported_media_type",
            416: "requested_range_not_satisfiable",
            417: "expectation_failed",
            421: "misdirected_request",
            422: "unprocessable_entity",
            423: "locked",
            424: "failed_dependency",
            425: "too_early",
            426: "upgrade_required",
            428: "precondition_required",
            429: "too_many_requests",
            431: "request_header_fields_too_large",
            451: "unavailable_for_legal_reasons",
            500: "internal_server_error",
            501: "not_implemented",
            502: "bad_gateway",
            503: "service_unavailable",
            504: "gateway_timeout",
            505: "http_version_not_supported",
            506: "variant_also_negotiates",
            507: "insufficient_storage",
            508: "loop_detected",
            509: "bandwidth_limit_exceeded",
            510: "not_extended",
            511: "network_authentication_required",
        }
        return httpCodes[code]
    }
}