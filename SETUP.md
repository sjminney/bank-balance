# Setup Guide

## Initial Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate PWA Icons**
   
   You need to create PWA icons for iOS and Windows installation. Place them in `public/icons/`:
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png

   **Recommended Tools:**
   - [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [Favicon Generator](https://www.favicon-generator.org/)

   **Icon Design Guidelines:**
   - Use a simple, recognizable icon that represents "Bank Balance"
   - Ensure good contrast for dark mode (#09090b background)
   - Icons should be maskable (work well on various backgrounds)

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Adding shadcn/ui Components

To add more shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
```

All components will automatically use `rounded-2xl` corners as configured in `tailwind.config.ts`.

## PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will install as a standalone PWA

### Windows (Edge/Chrome)
1. Open the app in Edge or Chrome
2. Look for the install prompt in the address bar
3. Click "Install" or use the menu → "Install Bank Balance"
4. The app will install and appear in your Start menu

## Project Structure

```
Bank Balance/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with PWA metadata
│   ├── page.tsx           # Main dashboard page
│   ├── globals.css        # Global styles + Quiet Luxury theme
│   ├── manifest.ts        # PWA manifest (Next.js route)
│   └── sw-register.tsx    # Service worker registration
├── components/
│   └── ui/                # shadcn/ui components
│       └── button.tsx     # Button component with rounded-2xl
├── lib/
│   └── utils.ts           # Utility functions (cn helper)
├── public/
│   ├── icons/             # PWA icons (you need to add these)
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker
├── .cursorrules           # AI coding rules
├── components.json        # shadcn/ui configuration
├── tailwind.config.ts     # Tailwind + Quiet Luxury theme
└── package.json           # Dependencies
```

## Design System Quick Reference

### Colors
- Background: `bg-[#09090b]` or `bg-background`
- Glass Card: `glass-card` utility class or `bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl`
- Text: `text-white` or `text-foreground`
- Muted Text: `text-muted-foreground`

### Border Radius
- **Always use**: `rounded-2xl` for cards, buttons, containers
- Small elements: `rounded-xl`

### Icons
- Library: `lucide-react`
- Always include: `strokeWidth={1.5}`
- Example: `<Wallet className="w-6 h-6" strokeWidth={1.5} />`

### Animations
- Library: `framer-motion`
- Duration: 200-300ms
- Pattern:
  ```tsx
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
  ```

## Next Steps

1. Generate and add PWA icons
2. Customize the dashboard with your bank account data
3. Add authentication (if needed)
4. Connect to your bank API or data source
5. Add more features (transactions, analytics, etc.)
