# polarArena

Asymmetric coop arena game (MVP). One display + two phones.

## Setup

```
npm install
```

## Run

```
npm run dev
```

Then:
- On the laptop, open `http://localhost:5173/display`.
- On phones (same Wi-Fi), visit `http://<your-lan-ip>:5173/play`.

> **Note:** HTTP works fine for desktop and most Android browsers. iOS Safari
> requires HTTPS for camera-based QR scanning. If you need that, install
> [mkcert](https://github.com/FiloSottile/mkcert) and generate a local cert:
>
> ```
> brew install mkcert
> mkcert -install
> mkdir -p .cert
> mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem localhost 127.0.0.1 ::1 $(ipconfig getifaddr en0)
> ```
>
> Then update `vite.config.ts` to point at the cert files and use `https://` URLs.

## Architecture

See [docs/superpowers/specs/2026-05-01-polararena-mvp-design.md](docs/superpowers/specs/2026-05-01-polararena-mvp-design.md).

## Tests

```
npm test
```
