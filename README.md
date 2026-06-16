# DrawPad — iPad Drawing App

A full-featured drawing application built for iPad (and any modern browser), powered by a Node.js + Express backend with a React + Vite frontend.

![DrawPad Screenshot](https://i.imgur.com/placeholder.png)

## Features

- **7 drawing tools**: Pen, Brush, Marker, Pencil, Watercolor, Eraser, Fill
- **Pressure sensitivity**: Works with Apple Pencil and pointer pressure events
- **Color picker**: Full RGB sliders, hex input, and 48 preset swatches
- **Brush controls**: Size (1–80px) and opacity per stroke
- **Undo / Redo**: Full stroke history
- **Zoom & Pan**: Pinch-to-zoom and multi-touch pan
- **Gallery**: Save drawings with thumbnails, rename, delete, and reopen
- **Export**: Download any drawing as PNG directly to device
- **Keyboard shortcuts**: P/B/M/C/W/E/F for tools, ⌘Z undo, ⌘S save

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS v3, shadcn/ui |
| Backend  | Node.js, Express                    |
| Database | SQLite (via Drizzle ORM)            |
| Canvas   | HTML5 Canvas API                    |

## Self-Hosting

### Requirements

- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/drawing-app.git
cd drawing-app

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# Open http://localhost:5000
```

### Production Build

```bash
# Build frontend + backend
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

The app runs on **port 5000** by default. Set the `PORT` environment variable to change it.

### Nginx Reverse Proxy (recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Use [Certbot](https://certbot.eff.org/) to add HTTPS:

```bash
sudo certbot --nginx -d yourdomain.com
```

### Environment Variables

| Variable | Default | Description              |
|----------|---------|--------------------------|
| `PORT`   | `5000`  | Port the server listens on |
| `NODE_ENV` | `development` | Set to `production` for prod |

### Data Storage

Drawings are stored in `data.db` (SQLite) in the project root. Back this file up regularly if you want to preserve saved drawings.

```bash
# Simple backup
cp data.db data.db.backup
```

### Docker (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
```

```bash
docker build -t drawpad .
docker run -d -p 5000:5000 -v $(pwd)/data.db:/app/data.db drawpad
```

## iPad Home Screen Shortcut

1. Open Safari and navigate to your hosted URL
2. Tap the **Share** button
3. Select **Add to Home Screen**
4. Name it "DrawPad" and tap **Add**

The app will launch full-screen like a native app.

## License

MIT
