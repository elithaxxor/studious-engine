# Studious Engine

A cross-platform web browser, built with Electron, that enables users to download videos from web pages by simply hovering over the video and pressing a keyboard shortcut.

## Features

- Standalone browser application (Windows/macOS/Linux)
- Detects video elements on web pages
- Download videos with a customizable keyboard shortcut (default: `Ctrl+L`)
- Handles dynamic video content (e.g., videos loaded via JavaScript)
- User-friendly save dialogs for choosing download locations
- Modular architecture for easy maintenance and extension

## Technologies

- [Electron](https://www.electronjs.org/) (Chromium + Node.js)
- JavaScript (main, renderer, preload logic)
- HTML & CSS (UI)
- [React](https://reactjs.org/) (optional, for advanced UI management)

## Project Structure (Recommended)

```
studious-engine/
├── main.js          # Electron main process
├── preload.js       # Preload script for video detection
├── renderer.js      # Renderer process or UI entry
├── package.json     # Project manifest
├── /src             # Source code and components
├── /assets          # Icons and static files
├── overview.txt     # Project architecture and rationale
└── README.md        # This file
```

## Installation

> **Note:** Ensure you have [Node.js](https://nodejs.org/) (v16+) and [npm](https://npmjs.com/) installed.

```bash
git clone https://github.com/elithaxxor/studious-engine.git
cd studious-engine
npm install
npm start
```

## Usage

- Launch the app (`npm start`).
- Browse any website containing video elements.
- Hover your mouse over a video.
- Press `Ctrl+L` (or your configured shortcut).
- Choose a download location in the save dialog.
- The video will be saved to your chosen directory.

## Customization

- **Keyboard Shortcut:**  
  (Planned) Users will be able to set a custom shortcut via settings.
- **Download Location:**  
  The app prompts for a location every time; (Planned) default directory support.

## Contributing

1. Fork the repo and create your feature branch: `git checkout -b feature/YourFeature`
2. Commit your changes: `git commit -am 'Add new feature'`
3. Push to the branch: `git push origin feature/YourFeature`
4. Open a pull request

Please see [CONTRIBUTING.md](CONTRIBUTING.md) (to be added) for more details.

## Roadmap & Improvements

- [ ] Implement main/renderer/preload scripts as outlined in `overview.txt`
- [ ] Add tests with Jest or Mocha
- [ ] Add user settings for shortcut and download directory
- [ ] Better error handling and user feedback
- [ ] Accessibility improvements
- [ ] Add CI (e.g., GitHub Actions)
- [ ] Write `CONTRIBUTING.md` and add a `LICENSE` file

## License
@copyleft. dont do dumb shit with  my work. 

---

## Contact

Maintainer: [elithaxxor](https://github.com/elithaxxor)

For questions, open an issue or discussion on GitHub.
