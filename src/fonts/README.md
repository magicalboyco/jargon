# Offline Jargon display font

The selected display typeface is **Fraunces**, © 2018 Fraunces Project Authors, used under the SIL Open Font License v1.1 (full license in `OFL.txt`). It is **not** the proprietary Cooper Black font.

The pinned upstream Google Fonts Git blob is `8210f9488d3c732359a9292dd09aca3f2bae830e`: `ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf`, https://github.com/google/fonts/tree/main/ofl/fraunces .

`tools/prepare_font.py` retrieves **only during build**, verifies Git blob SHA, instantiates a heavy soft rounded display face, subsets the characters used by Jargon, converts to WOFF2, and writes `src/fonts/fraunces-subset.css` containing a base64 data URL. `tools/build.py` embeds the CSS into a standalone HTML file. The game makes **zero runtime font requests**.

Generated font CSS is checked into GitHub by the dedicated, branch-restricted font build workflow. The main build can run without the font CSS but will use the device-local serif fallback in that case. Always check final CI and deployed asset before claiming the font is consistently displayed.

Do not separate this font from its license/attribution. Never substitute unlicensed proprietary font software. Performance and appearance require verification on physical iPhone Safari.
