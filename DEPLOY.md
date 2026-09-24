# Website and PWA deployment

The website is a Vite PWA in `frontend/`. Vercel hosts that static frontend. Video upload, transcription, and MP4 rendering run in the separate FastAPI service in `backend/`; they are **not** Vercel Functions. A public Vercel URL alone will show “Engine offline” until the API is hosted and connected.

## 1. Deploy the processing API

The repository contains `Dockerfile.api` and `railway.json` for a single Railway service. Railway is one possible persistent container host; another Docker host with a persistent disk also works.

1. Connect this GitHub repository to a Railway service with the **repository root** as its root directory. Railway should use `Dockerfile.api` from `railway.json`.
2. Attach a persistent volume mounted at `/data`. Use **one replica**: project files and job status currently live on that volume.
3. Give the service enough disk, RAM, CPU, and time for your maximum video length. The API handles large media and on-CPU Whisper/Remotion renders, so low-resource/free tiers may not work reliably. Set `CAPTION_STUDIO_MAX_UPLOAD_BYTES` to a limit your storage can sustain (for example `262144000` for 250 MiB).
4. Generate an HTTPS public domain for the service. Set these Railway variables, substituting your real URLs:

   - `CAPTION_STUDIO_PUBLIC_API_URL=https://your-api-domain`
   - `CAPTION_STUDIO_ALLOWED_ORIGINS=["https://your-vercel-domain"]`

5. Check `https://your-api-domain/api/health` returns `{"status":"ok","service":"caption-studio-api"}`.

The initial public API has **no user accounts, authorization, quota, or automatic data-retention policy**. Do not invite untrusted public traffic or store sensitive videos on it as a production service until those controls are added. An opaque project ID is not a substitute for authorization.

## 2. Deploy the PWA to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`, framework **Vite**, build command `pnpm build`, and output directory `dist`. `frontend/vercel.json` handles `/editor/...` refreshes.
3. Set `VITE_API_URL` to the **HTTPS API origin** from step 1, without `/api` or a trailing slash, in Vercel Production and Preview environments. Redeploy after setting it: Vite injects this value at build time.
4. Add the Vercel Production and Preview origins to `CAPTION_STUDIO_ALLOWED_ORIGINS` on the API. This value is a JSON array. A wildcard preview-domain pattern is not currently supported by the backend CORS configuration; add each preview origin you intend to use.
5. Visit the Vercel URL on desktop and mobile, check **Engine online**, upload a short video, edit a word, export, and download the MP4.

On Android Chrome, use **Install app** from the browser menu. On iPhone Safari, use **Share → Add to Home Screen**. The PWA shell is cached for installation, but video processing, projects, and exports require the online API.

## Deployment limitations

- The API's filesystem jobs assume one long-running process and one persistent volume. Horizontal scaling requires a database, object storage, and a job queue.
- The website is responsive, but actual upload/export behavior must be checked on real devices against the deployed API; local browser checks cannot prove mobile-network reliability.
- A true public production launch needs authentication, per-user project ownership, quotas/abuse protection, monitoring, and a deletion/retention policy before opening the API to everyone.
