---
name: deploy
description: Deploy the Simba chat widget to a client website. Use when embedding the widget, connecting to Simba cloud or local, and configuring appearance.
---

# Deploy Simba Chat Widget

**npm:** https://www.npmjs.com/package/simba-chat

## Before You Start

**Required:** You need an Organization ID to use the widget. Fetch available organizations:

```bash
curl -s http://localhost:8000/api/v1/organizations | jq
```

If organizations are found, ask the user which one to use for the widget. If no organizations exist or the API is not running, instruct them to:
1. Start the Simba API server (`make server`)
2. Create an organization in the Simba dashboard

## 1-Minute Setup

```bash
npm install simba-chat
```

```tsx
import { SimbaChatBubble } from 'simba-chat';
import 'simba-chat/styles.css';

// Add anywhere in your app
<SimbaChatBubble
  apiUrl="http://localhost:8000"      // Your Simba API
  organizationId="your-org-id"        // Required: Your organization ID
/>
```

Done! The chat widget appears in the bottom-right corner (default).

## Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | **Required** | Simba API URL |
| `organizationId` | `string` | **Required** | Your organization ID |
| `position` | `"bottom-left" \| "bottom-right"` | `"bottom-right"` | Widget position |
| `collection` | `string` | `"default"` | Knowledge base collection |
| `defaultOpen` | `boolean` | `false` | Start with chat open |
| `placeholder` | `string` | `"Type a message..."` | Input placeholder |
| `apiKey` | `string` | - | For authenticated requests |

## Framework Examples

### Next.js

```tsx
// app/layout.tsx
import { SimbaChatBubble } from 'simba-chat';
import 'simba-chat/styles.css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SimbaChatBubble
          apiUrl="http://localhost:8000"
          organizationId="your-org-id"
        />
      </body>
    </html>
  );
}
```

### React (Vite/CRA)

```tsx
// main.tsx or App.tsx
import { SimbaChatBubble } from 'simba-chat';
import 'simba-chat/styles.css';

function App() {
  return (
    <>
      <YourApp />
      <SimbaChatBubble
        apiUrl="http://localhost:8000"
        organizationId="your-org-id"
      />
    </>
  );
}
```

### Plain HTML (No Build Step)

```html
<script type="module">
  import { SimbaChatBubble } from 'https://esm.sh/simba-chat@0.1.0';
  import { createRoot } from 'https://esm.sh/react-dom@19/client';
  import { createElement } from 'https://esm.sh/react@19';

  const root = document.createElement('div');
  document.body.appendChild(root);

  createRoot(root).render(
    createElement(SimbaChatBubble, {
      apiUrl: 'http://localhost:8000',
      organizationId: 'your-org-id'
    })
  );
</script>
<link rel="stylesheet" href="https://esm.sh/simba-chat@0.1.0/styles.css">
```

## Theming

Match your brand with CSS variables:

```css
:root {
  --simba-primary: #2563eb;           /* Button/accent color */
  --simba-primary-foreground: #fff;   /* Text on buttons */
  --simba-background: #ffffff;        /* Chat background */
  --simba-foreground: #0f172a;        /* Text color */
  --simba-muted: #f1f5f9;             /* Secondary background */
  --simba-border: #e2e8f0;            /* Border color */
  --simba-radius: 0.5rem;             /* Corner radius */
}
```

### Dark Mode

```css
.dark {
  --simba-primary: #3b82f6;
  --simba-background: #1e293b;
  --simba-foreground: #f8fafc;
  --simba-muted: #334155;
  --simba-border: #475569;
}
```

## Inline Chat (Embedded)

For embedding in a page section instead of floating:

```tsx
import { SimbaChat } from 'simba-chat';
import 'simba-chat/styles.css';

<div style={{ height: '500px' }}>
  <SimbaChat
    apiUrl="http://localhost:8000"
    organizationId="your-org-id"
    placeholder="Ask a question..."
  />
</div>
```

## Custom UI with Hook

Build your own chat interface:

```tsx
import { useSimbaChat } from 'simba-chat';

function CustomChat() {
  const { messages, status, sendMessage, stop } = useSimbaChat({
    apiUrl: 'http://localhost:8000',
    organizationId: 'your-org-id',
  });

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.role}: {msg.content}</div>
      ))}
      <input onKeyDown={(e) => {
        if (e.key === 'Enter') sendMessage(e.target.value);
      }} />
      {status === 'streaming' && <button onClick={stop}>Stop</button>}
    </div>
  );
}
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SIMBA_API_URL=http://localhost:8000

# .env.production
NEXT_PUBLIC_SIMBA_API_URL=https://api.simba.example.com
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget not showing | Check `simba-chat/styles.css` is imported |
| CORS errors | Add client domain to Simba API CORS config |
| No responses | Verify `apiUrl` and `collection` are correct |

## Quick Checklist

- [ ] `npm install simba-chat`
- [ ] Import component and styles
- [ ] Set `apiUrl` to your Simba API
- [ ] Set `organizationId` (required - get from `curl http://localhost:8000/api/v1/organizations`)
- [ ] Optionally set `position="bottom-left"` (default is bottom-right)
- [ ] Customize colors with CSS variables
- [ ] Test on mobile
