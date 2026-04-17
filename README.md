# 🖥️ WebOS 12

A refined web environment built with **Vanilla JavaScript** and **modern CSS3**. It mimics a native desktop experience entirely within the browser.

## Key Features
### Productivity & Tools

* **Notepad:** Full text editor with line/word counting and local file saving.

* **Calculator:** Standard arithmetic functions with a modern UI.

* **Terminal:** Command-line interface with support for ls, cd, mkdir, touch, cat, rm, mv, and sysinfo.

* **Calendar:** View dates and manage schedules with a global world clock integration.

* **Weather:** Real-time weather reporting and forecasts.

### Media & Creativity

* **Music Player & Radio:** Integrated radio station search and a mini-player "pill" mode.

* **Video Player:** Support for playing local video files with progress seeking and full-screen capability.

* **Paint:** Canvas-based drawing tool with color selection and brush controls.

* **Browser:** Sandboxed web browsing environment.

### Communication & System

* **Global Chat:** Real-time messaging system using socket.io to connect with other online users.

* **Mail:** Email client interface with inbox management.

* **Task Manager:** Monitor system performance and manage running processes.

* **Recycle Bin:** Restore or permanently delete removed files.

### Personalization & Customization

* **Themes:** Seamless switching between Light and Dark modes.

* **Dynamic Wallpapers:** Multiple backgrounds and a "Random Wallpaper" shuffle feature.

* **Accent Colors:** Customizable system UI colors for buttons and indicators.

* **Grid System:** Flexible desktop icon placement with automatic grid alignment.

* **Pinning:** Ability to pin or unpin any application to the taskbar.

* **Multi-Language:** Support for over 10 languages including English, Spanish, French, Japanese, and Ukrainian.

### Other UI Features

* **Snap Overlay:** Visual guide for snapping windows to 50% split-screen views.

* **Focus Windows:** Windows Focus handling that brings active windows to the front.

* **Start Menu Search:** Real-time search for apps, files, and system settings.

* **Quick Settings:** Panel for Wi-Fi, Bluetooth, volume, and brightness sliders.

* **Notification Center:** Logs all system alerts and sound toggles.

* **System Tray:** Dynamic clock, date, battery level indicator, and status icons.

### Technical Infrastructure

* **File System:** Virtualized directory structure containing Desktop, Documents, Pictures, Music, Downloads, and Videos.

* **Backend Support:** Node.js/Express server handling file I/O, localStorage persistence, and real-time socket communication.

* **UX Enhancements:** Motion One animations for smooth window transitions and Lucide icons for a consistent visual language.

* **Icons:** `Lucide Icons`

* **Typography:** `Plus Jakarta Sans`

* **Service Worker:** `Cache API` for offline reliability.

---

## 📥 Installation & Local Development

Because this project uses Service Workers, it **must** be served over a local or remote server.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/itiswayneee/webos-12.git](https://github.com/itiswayneee/webos-12.git)
    cd webos-12
    ```

2.  **Run Locally:**
    ```bash
    npm install
    ```

    ```bash
    npm start / node server.js
    ```

---

## 🛠️ Adding Custom Apps

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
## Developed with 💙 by the Wayne
