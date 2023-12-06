enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production'
}

const appEnv = () => {
  const param = process.env.REACT_ENV as Environment

  if (param && param.length > 0) {
      return param
  } else {
      return 'staging'
  }
}

export default function () {
  return {
    "expo": {
      "name": "lava",
      "slug": "lava",
      "version": "1.0.0",
      "orientation": "portrait",
      "icon": "./app/assets/icon.png",
      "userInterfaceStyle": "dark",
      "splash": {
        "image": "./app/assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#000000"
      },
      "assetBundlePatterns": [
        "**/*"
      ],
      "ios": {
        "supportsTablet": true
      },
      "android": {
        "adaptiveIcon": {
          "foregroundImage": "./app/assets/adaptive-subject.png",
          "backgroundImage": "./app/assets/adaptive-background.png"
        }
      },
      "web": {
        "favicon": "./app/assets/favicon.png"
      },
      "plugins": [
        './plugins/push-kit/index.js',
      ],
      "extra": {
        "reactEnv": appEnv(),
        "updateNumber": "1000",
        "railsApiDomain": "localhost",

        "railsApiRoutes": {
          // Changes here do not hot re-load, restart dev server
          'root': {
              'namespace': '',
              'get': {
                  'account_authenticated_path': '/account/show_for_authenticated',
                  'account_unauthenticated_path': '/account/show_for_unauthenticated',
                  'channel_path': '/channels/:id',
                  'channel_chat_path': '/channels/:channel_id/chats/:id',
                  'friend_requests_path': '/friend_requests',
                  'people_path': '/people',
                  'school_path': '/school',
                  'server_update_number': '/server-update-number',
                  'v1_admin_users': "/v1/admin/users",
                  'vizzes_path': '/vizzes',
                  'roblox_profile_path': '/roblox_profiles/:id',
              },
              'post': {
                  'channel_person_index': '/channels/:id/person',
                  'channels_path': '/channels',
                  'email_authentications_path': '/email_authentications',
                  'email_credentials_path': '/email_credentials',
                  'feed': '/feed',
                  'friend_requests_path': '/friend_requests',
                  'roblox_authentications_path': '/roblox_authentications',
                  'roblox_credentials_path': '/roblox_credentials',
                  'roblox_profiles_path': '/roblox_profiles',
              },
              'patch': {
                  'email_credential_path': '/email_credentials/:id',
                  'friend_request_path': '/friend_requests/:id',
                  'roblox_credential_path': '/roblox_credentials/:id',
                  "school_path": "/school",
                  'roblox_profile_path': '/roblox_profiles/:id',
                  'bulk_update_friend_requests': '/friend_requests/bulk_update',
              },
              'delete': {
                  'email_authentications_path': '/email_authentications',
                  "friendships_path": "/friendships/:key",
                  'friend_requests_path': '/friend_requests/:id',
                  'roblox_authentications_path': '/roblox_authentications',
                  'bulk_destroy_friend_requests': '/friend_requests/bulk_destroy',
              },
          },
          'vizz_maker': {
              'namespace': 'maker',
              'delete': {
                  'vizz_path': '/vizzes/:key',
                  'image_identification_results_path': '/image-identification-results',
                  'pronunciations_path': '/pronunciations/:id'
              },
              'get': {
                  'vizzes_path': '/vizzes',
                  'vizz_path': '/vizzes/:key',
                  'all_vizzes_path': '/all',
                  'all_published_path': '/all-published',
                  'all_drafts_path': '/all-drafts',
                  'my_all_path': '/my-all',
                  'my_published_path': '/my-published',
                  'my_drafts_path': '/my-drafts',
                  'image_identification_results_path': '/image-identification-results',
                  'pronunciations_path': '/pronunciations',
              },
              'patch': {
                  'vizz_path': '/vizzes/:key',
              },
              'post': {
                  'vizzes_path': '/vizzes',
                  'text_to_speech_path': '/text-to-speech',
                  'search': '/search-or-create',
                  'pronunciations_path': '/pronunciations',
                  'clear_all_flagged': '/clear_all_flagged',
                  'speech_to_text_path': '/speech-to-text',
                  'identify_photo_path': '/identify-photo',
                  'add_vision_phrase_path': '/add-vision-phrase'
              }
          },
          'browse': {
              'post': {
                  'viewing_path': '/viewing',
                  'search_library_path': '/library/search',
                  'codes_path': '/codes',
                  'code_flag_index': '/codes/:code_id/flag',
                  'code_usage_index': '/codes/:code_id/usage',
                  'code_confirmation_index': '/codes/:code_id/confirmation',
              },
              'get': {
                  'concept_books_path': '/concept_books',
                  'concept_book_path': '/concept_books/:id',
                  'roblox_concept_books_path': '/concept_books/roblox_index',
                  'game_book_path': '/game_books/:id',
                  'game_books_path': '/game_books',
                  'videos_path': '/videos',
                  'onboarding_concept_books_path': '/concept_books/onboarding',
              },
              'patch': {
                  'video_path': '/videos/:id',
              },
              'delete': {
                  'reset_book_path': '/books/:id/reset',
              },
          },
          'vizz_admin': {
              'namespace': 'admin',
              'get': {}
          },
          'vizz_account': {
              'namespace': 'account',
              'post': {
                  'person_path': '/person',
                  'device_path': '/device',
                  'authentication_path': '/authentication',
              },
              'patch': {
                  'device_path': '/device',
                  'update_phone_number': '/person/update_phone_number',
                  'verify_phone_number': '/person/verify_phone_number',
                  'update_parent_email': '/person/update_parent_email',
                  'update_person_properties': '/person/update_properties',
                  'person_path': '/person',
              },
              'delete': {
                  'authentication_path': '/authentication',
              },
              'get': {
                  'person_path': '/person/:key',
              },
          },
          'vizz_graph': {
              'namespace': 'graph',
              'get': {
                  'concepts_all': '/concepts',
                  'tagged_with_concepts': '/concepts/tagged_with',
                  'concepts': '/concepts/:key/children',
                  'concept_image_search': '/concepts/:key/image_search',
                  'concept_detail': '/concepts/:key',
                  'next_concept': '/concepts/:key/next_concept',
                  'related_concepts': '/concepts/:key/related_concepts',
                  'concept_descendent_questions': '/concepts/:key/all_descendent_questions',
                  'concept_questions': '/concepts/:key/questions'
              },
              'post': {
                  'concepts': '/concepts',
                  'change_concept_parent': '/concepts/:key/change_parent',
                  'create_concept_name': '/concept_names',
                  'promote_concept_name_to_primary': '/concept_names/:key/promote_to_primary',
                  'add_concept_media': '/concepts/:key/add_media',
                  'promote_media_to_primary': '/concepts/:key/promote_media_to_primary',
                  'merge_concepts': '/concepts/merge',
                  'add_tag_to_concept': '/concepts/:key/add_tag',
                  'concept_leaf_descendants': '/concepts/:key/leaf_descendants',
                  'flag_all_descendent_vizzes': '/concepts/:key/flag_all_descendent_vizzes'
              },
              'patch': {
                  'concepts': '/concepts/:key',
                  'change_concept_name': '/concept_names/:key'
              },
              'delete': {
                  'delete_concept_name': '/concept_names/:key',
                  'remove_tag_from_concept': '/concepts/:key/remove_tag'
              }
          },
          'analytics': {
              'post': {
                  'track_event': '/track-event',
              }
          },
          "social": {
              "namespace": 'social',
              "get": {
                  "profile_show_path": "/profile/:person_key",
                  "profile_search_path": "/search_profiles",
                  "friends_path": "/friends",
                  "nickname_available_path": "/nickname_available",
                  "call_path": "/calls/:call_key",
                  "not_read_message_stories_path": "/stories/not_read_message",
                  "read_message_stories_path": "/stories/read_message",
                  "feed_stories_path": "/stories/feed",
                  "referrals_path": "/referrals",
                  "are_cookies_valid_path": "/are-cookies-valid",
              },
              "patch": {
                  "profile_update_path": "/profile",
                  "join_participants_path": "/participants/join",
                  "call_path": "/calls/:call_key",
                  "message_roblox_referrals_path": "/referrals/message_roblox",
                  "ignore_missed_calls_path": "/stories/ignore_missed_calls",
              },
              "post": {
                  "calls_path": "/calls",
                  "participants_path": "/participants",
                  "create_video_stories_path": "/stories/create_video",
                  "create_school_reminder_stories_path": "/stories/create_school_reminder",
                  "profile_create_path": "/profile",
              },
              "delete": {
                  "participants_path": "/participants",
              }
          }
        }

      }
    }
  }
}
