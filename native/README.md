# Lava

## Setup

This repository contains a small portion of the real code from the Lava app. Contained within these snippets of code are three bugs that we had to fix at one point in time. The bugs have been kept in this portion of real code so that you can take a look at them.

To get this app running locally. First, **install Expo Go from the iOS or Android app store. You can use a phone or tablet device, it works on both.** Then:

```
npm install
npx tsc
npx expo start --tunnel
```

This will output a QR code on screen with a URL beneath it that begins with `exp://`. On your device with Expo Go, scan the QR code and it should open Expo Go. If it does not, open Expo Go manually, tap to "Enter URL manually" and copy & paste the exp URL.

[Quick demonstration of Expo Go](https://share.zight.com/p9uYQb6j)

Note: There are no automated tests in this repo but you can run `npx tsc` to confirm there are no type errors.


## Interview Instructions

1. This repository has already been forked and you've been given access to a private copy for yourself. Clone this repository to pull it locally onto your deveopment machine.
2. Get the app successfully running in Expo Go by following the steps above
3. Then start a screen recording of your development session and just start poking around the code base.

We want you to please fix 2 of these 3 bugs. Fix the bugs by teeing up a commit or pull request in your forked repository. None of the actual fixes are very many lines of code so we are not evaluating your fix. And actually, we are not even primarily concerned with whether you figure out the bugs or not. Instead, we are most interested in your thinking process as you investigate and try to fix these bugs.

Don’t prepare solutions in advance of the recording. We are looking for messiness and we're looking for the opportunity to follow your train of thought as you investigate these bugs. You’re welcome to think out loud if you want to narrate any of your thought process for the recording, but you’re also welcome to just be silent as you work away. Do whatever feels more natural. Here is a brief sample screen recording so you can see what it is we're looking for:
[Example screen recording](https://share.getcloudapp.com/2NuW7wLN)

We're expecting you to spend between 30-60 minutes total on this. Don't stop and restart the recording. We're not looking for a polished presentation of anything. We just want to "sit beside you" as you debug.

Please don't spend more than an hour on this total. If you spend 20 minutes on one of these issues and it's not clear how to fix it, move on to the next one. Again, it's not critical that you solve the issue, we're just want to see how you approach it.

After you push a couple commits to your repository, email us a link to the screen recording.


### Bug 1: Glitchy audio when you skip a step

Onboarding is three steps long. When you go through the steps in order, you hear the narration properly. But when you skip step two there is a bug in the narration.

First, go through the steps in order:

#1 — It does a sound check. Tap the thumbs up.
#2 - It asks for your first name & nickname, these together are the second step.
#3 - It asks for your age and possibly birth year.

Notice that step #3 begins with the narration, "How old are you?". When you proceed through all three steps in order you hear this narration properly. After you experience this and get to the home screen then tap "Repeat Onboarding" to go through it again.

This second time, when you are on the first step, instead of tapping thumbs up, tap "SKIP SIGN UP." This skips Step #2 and takes you to Step #3, but it plays a brief moment of Step #2's audio.

When tapping SKIP SIGN UP you hear, "Ready? Let... How old are you?" but you are supposed to just hear "How old are you?" It does not do this every time so you if you don't hear it, repeat again. The bug appears fairly consistently.


### Bug 2: Re-rendering every row of friends list when no data changes

When you complete onboarding and get to the home screen of Lava, you'll see a list of all your friends. In this sample codebase, we've hard-coded it so that the API always returned the same results. The API simply polls the backend, making a request every 3 seconds to get your latest friends list.

While the app is polling the backend, even if no one on your friends list changes, every item in the friends list re-renders. As our friends list has gotten more complex (lots of visual elements within each friend row) and the friends list gets longer, this is starting to have noticeable performance implications and occasional flickering.

You may not be able to tell in your dev environment, but add some simple logging within the friend row and you'll see it fire for every friend row every three seconds.


### Bug 3: Incoming calls are not showing the username

When Lava receives a call from a friend, iOS shows the native call screen with an answer and reject button. On this calling screen, it's supposed to show the name of the caller. For some reason, this isn't working.

We know it's possible to do this; it's not an inherent limitation of iOS. We confirmed that other calling apps like Messenger are able to do this. We also got approved by Apple as a VOIP app so this enabled us to successfully send the special call push notifications which offer the answer and reject buttons. All of that is working. Our app is successfully receives the push notification, it has the answer and reject buttons, and those buttons work to answer the call or reject it. But it's missing the name on that screen.

**This is what the screen is supposed to look like, notice "Amos":**

![Screenshot](https://p425.p0.n0.cdn.getcloudapp.com/items/bLuy5OY1/d5c01823-5faa-411c-9850-f08f405d8251.jpg?v=52cdbbcd8ae8fc7be08e3ffab2871796)

Unfortunately, this bug is not reproducible in Expo Go. This is an inherent challenge with building a calling app. There are a category of issues that are hard to test in development.

The bug is to figure out why our app is not showing the incoming name of the caller. In case it's helpful, this is the full structure of the POST we are making to APN (Apple Push Notification service). This is successfully triggering an incoming call which can be successfully answered and it has all the information it needs in order to render the name of the caller.

```
{"alert"=>{"body"=>"", "title"=>"Keith Schacht is calling you on Lava."},
 "sound"=>"incoming.m4a",
 "apns_id"=>"08b14a73-4d0d-4d32-9de6-bb391d22897b",
 "priority"=>10,
 "expiration"=>1698774592,
 "custom_payload"=>
  {"call"=>
    {"key"=>"38c37d00-37d6-4788-8cc9-ecb64348b3f2",
     "started_by_person_id"=>1285968,
     "started_by_person_key"=>"d88e1262-f7df-4bd0-bd11-6df58262b4c0",
     "started_by_person_username"=>"Keith Schacht"},
   "deepLink"=>"/calls/38c37d00-37d6-4788-8cc9-ecb64348b3f2"}}
```
