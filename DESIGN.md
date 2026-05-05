---
name: Cigars & Networking
version: 1.0.0
description: A premium, minimalist design system evoking the exclusivity of a high-end cigar lounge.
colors:
  primary: "#111111"
  secondary: "#1A1A1A"
  tertiary: "#D4AF37"
  tertiary-hover: "#B8962E"
  neutral: "#F5F5F5"
  neutral-muted: "#888888"
typography:
  h1:
    fontFamily: "Playfair Display, serif"
    fontSize: "3.5rem"
    fontWeight: "700"
    lineHeight: "1.2"
  h2:
    fontFamily: "Playfair Display, serif"
    fontSize: "2rem"
    fontWeight: "600"
  body-md:
    fontFamily: "Lora, serif"
    fontSize: "1.1rem"
    lineHeight: "1.7"
  label-caps:
    fontFamily: "Lora, serif"
    fontSize: "0.85rem"
    letterSpacing: "0.08em"
    fontWeight: "500"
    textTransform: "uppercase"
rounded:
  sm: "4px"
  md: "8px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.tertiary-hover}"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    border: "1px solid {colors.neutral-muted}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    typography: "{typography.body-md}"
---

## Overview
The UI evokes a premium, exclusive cigar lounge. It relies on deep blacks and charcoals to create depth and contrast, punctuated by sophisticated gold/amber highlights that draw the eye to essential actions like the RSVP button.

## Colors
- **Primary (#111111):** Deep ink background for the entire application.
- **Secondary (#1A1A1A):** Slightly lighter charcoal for form backgrounds or cards.
- **Tertiary (#D4AF37):** "Gold" accent for buttons, active states, and emphasis.
- **Neutral (#F5F5F5):** Off-white for high readability on dark backgrounds.
- **Neutral Muted (#888888):** For secondary text, placeholders, and subtle borders.

## Typography
- **Headings (Playfair Display):** Conveys elegance, tradition, and high-end quality.
- **Body & Forms (Lora):** Highly legible serif that perfectly complements the display font and adds to the overall elegance of the event.
