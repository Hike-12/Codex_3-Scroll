# Scroll Forge

Scroll Forge turns a video or the built-in Precision Core demo into a scroll-driven landing page. Video decoding, editing, and exports happen in the browser.

## Run locally

```sh
npm install
npm run dev
```

Import an MP4, WebM, or MOV with a codec your browser supports. Choose the frame count, maximum resolution, and compression quality. Scrub the timeline to place story beats, use Motion to adjust the scroll response, and open Live Preview to experience the full page. Export a single HTML file or a React + TypeScript component with frames embedded.

Decoded memory grows with resolution and frame count. The import dialog reports an estimate in MB. Lower the width or frame count for devices with less memory.

```sh
npm test
npm run build
```
