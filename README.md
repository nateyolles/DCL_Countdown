# DCL Countdown

A single-page countdown timer to a Disney Cruise Line sail date, styled after the
official DCL app's flip-card countdown. No build step — plain HTML, CSS, and
JavaScript.

## Features

- Flip-card digit tiles with a 3D flip animation on every change, days/hours/mins/secs.
- Days tile grows to fit large counts (e.g. 351) but always shows at least two digits.
- Any digit that's `0` is replaced by a random Disney character emoji instead of the
  numeral, never repeating an emoji among the digits shown at the same time.
- Once the target date passes, the countdown holds at all zeros (all emoji) instead
  of switching to a "time's up" message.
- Pick a target date (date-only, no time) and it's saved to the URL (`?date=...`) so
  the countdown survives a refresh or can be shared as a link.
- Animated ocean/ship background (Lottie).

## Running locally

```
npm start
```

This serves the project at http://localhost:8080. Any static file server works too
(e.g. `npx serve .`) since there's no build step.

## Project structure

```
index.html   markup
style.css    flip-card and layout styles
script.js    countdown logic, digit-tile flip animation, emoji selection
assets/
  fonts/     Inspire TWDC + Peptasia
  emoji/     Disney character face emoji (countdownEmoji_01..64.png)
  animations/landing_background_lottie.json
demo/        reference screenshot/video used while building the flip-card UI
```

## Cruise data

The ship and departure date dropdowns are powered by a small data feed hosted in
[DCL_CruiseFeedIO](https://github.com/nateyolles/DCL_CruiseFeedIO) (AWS Lambda,
DynamoDB, and API Gateway) which serves the list of upcoming Disney Cruise Line
sailings as JSON. If that feed can't be reached, the app falls back to letting you
pick a departure date manually.

## Disclaimer

This project is for educational purposes only. It is not monetized in any way —
there is no advertising, products for sale, user sign-in, tracking or affiliate links.

Disney is the sole owner of all Disney branded assets.