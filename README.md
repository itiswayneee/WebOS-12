# 🖥️ WebOS 12

A high-performance, browser-based desktop environment featuring a **glassmorphism** aesthetic, virtualized file system, and native **PWA** integration.

---

## 🚀 Overview

WebOS 12 is a refined web environment built with **Vanilla JavaScript** and **modern CSS3**. It mimics a native desktop experience entirely within the browser.

### Key Features
* **Window Management:** Drag, minimize, maximize, and stack windows.
* **PWA Ready:** Includes `manifest.json` and `sw.js` for offline support and standalone installation.
* **Integrated Apps:** Notepad, Explorer, Settings, Terminal, Calculator, Browser, and Developer Profile.
* **Live Notifications:** Integrated Notification Center with persistent logging.
* **Battery API:** Real-time battery status monitoring (Fixed for modern browsers).

---

## 💻 Technical Stack

**Logic:** `JavaScript (ES6+)`

**Styling:** `CSS3 (Flexbox/Grid/Glassmorphism)`

**Icons:** `Lucide Icons`

**Typography:** `Plus Jakarta Sans`

**Service Worker:** `Cache API` for offline reliability.

---

## 📥 Installation & Local Development

Because this project uses Service Workers, it **must** be served over a local or remote server.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/itiswayneee/webos-12.git](https://github.com/itiswayneee/webos-12.git)
    cd webos-12
    ```

2.  **Serve Locally:**
    ```bash
    npm install
    ```

    ```bash
    npm start / node server.js
    ```

---

## 📜 Usage & Pro-Tips

* **Start Menu:** Click the WebOS logo to access pinned applications.
* **Notifications:** Click the clock in the bottom right to toggle the notification center.
* **Developer App:** Use the `Developer` icon to view system kernel details and stack information.
* **PWA:** On Chrome/Edge, click the "Install" icon in the address bar to run WebOS as a standalone desktop app.

---

## ## 🛠️ Adding Custom Apps

To add a new app, register it in the `APPS` array and update the `renderApp` function:

```javascript
// Step 1: Update APPS for the OS to recognise the app

const APPS = {
    my-app: { name:'App-Name',icon:'lucide-icon-name, w:--, h:--, pinned:false/true },
}
```

```javascript
//Step 2: Now the renderApp section for the app to render the windows.

function renderApp(appId, container, winId, extra) {
  switch(appId) {
    case 'App-Name':    renderApp-Name(container, winId, extra); break;
  }
}
```

```javascript
//Step 3: Now the renderApp section for the app to render the windows.

function renderApp-Name() {YOUR FUNCTIONS}
```
---
## Developed with 💙 by the WebOS Team-Just me
