# HermesX - Intelligent Work Time Tracking Assistant

![HermesX Logo](assets/icon.png)

> **Disclaimer:** HermesX is an independent, unofficial companion application for ZeusX users. It is not affiliated with, endorsed by, or connected to ISGUS or ZeusX in any way.

HermesX is a modern, intelligent desktop assistant that helps you maintain a healthy work-life balance by reminding you to track your work hours in ZeusX. It provides smart notifications and monitoring to ensure you never forget to log your time entries.

## 📥 Download

> ⚠️ **Testing Phase**: HermesX is currently under development. Testing builds are available from our CI pipeline.

Latest test builds are available as artifacts from our [GitHub Actions](https://github.com/florianbeisel/hermesx/actions/workflows/build.yml) pipeline:

1. Click on the latest successful workflow run
2. Scroll down to the "Artifacts" section
3. Download the appropriate package for your system:
   - 🍎 macOS: `hermesx-mac.dmg`
   - 🪟 Windows: `hermesx-win.exe`
   - 🐧 Linux: `hermesx-linux.deb` or `hermesx-linux.rpm`

Note: You need to be logged into GitHub to download artifacts.

## 🎯 Purpose

HermesX serves as a helpful companion for ZeusX users by:

- Reminding you to start and stop your time tracking
- Suggesting breaks based on your work patterns
- Monitoring system activity to detect work states
- Providing a seamless interface for quick time entries

## 🌟 Key Features

- **Smart Time Tracking**
  - Automatic work state detection
  - Intelligent break suggestions
  - Flexible schedule management
  - Continuous work monitoring

- **Intelligent Notifications**
  - Context-aware notifications
  - Smart suppression during meetings and gaming
  - Customizable notification thresholds
  - Break reminders based on work patterns

- **System Integration & Security**
  - Native system tray integration
  - Secure credential management
  - Encrypted storage
  - Automatic updates

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- Yarn package manager
- macOS, Windows, or Linux operating system

### Building from Source

1. Clone the repository:

    ```bash
    git clone https://github.com/florianbeisel/hermesx.git
    cd hermesx
    ```

2. Install dependencies:

    ```bash
    yarn install
    ```

3. Start the development server:

    ```bash
    yarn start
    ```

4. Build for production:

    ```bash
    yarn make
    ```

## 🔧 Configuration

Access settings through the system tray icon to customize:

- Work schedule and days
- Break duration and frequency
- Notification preferences
- Activity thresholds

## 🛣️ Roadmap

### Coming Soon

- [ ] Advanced activity detection
- [ ] Calendar integration (i.e. for holidays, working days, etc.)
- [ ] Advanced notification suppression (i.e. for phone calls, meetings, etc. and gaming)

### Features Status

- [ ] Configurable amount of flexibility (i.e. less strict work hours)
- [ ] Configurable amount of breaks
- [ ] Configurable work weeks
- [x] Configurable break duration
- [x] Configurable break frequency
- [x] Configurable work hours
- [x] Configurable work days

## 🤝 Contributing

We welcome contributions! If you'd like to help improve HermesX, please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [TypeScript](https://www.typescriptlang.org/)
- Uses [Vite](https://vitejs.dev/) for blazing fast development
- Icon design by [Midjourney](https://www.midjourney.com/)

## 🐛 Issues and Feature Requests

For bug reports, please include:

- Operating system and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

For feature requests, please describe:

- The feature and its purpose
- The problem it solves
- Any additional context

---

Made with ❤️ by [Florian Beisel](https://github.com/florianbeisel)
