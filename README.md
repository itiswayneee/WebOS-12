# 🖥️ WebOS 12

A refined web environment built with **Vanilla JavaScript** and **modern CSS3**. It mimics a native desktop experience entirely within the browser.

**This took alot of time...❤️❤️**

## 📥 Installation

Because this project uses Service Workers, it **must** be served over a local or remote server.
    
#### **Method A: The Release (Recommended)**
1. Go to the [Releases](https://github.com/samwelwayne266-coder/wayne-vault/releases) section on the right side of this page.
2. Download the latest `.exe file`.
3. ENJOY!!!!

#### **Method B: Manual Download**
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/itiswayneee/webos-12.git
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
## Developed with 💙 by Wayne
