# HermesX - Intelligent Work Time Tracking Assistant

<!-- markdownlint-disable MD013 -->
<p align="center">
   <img src="https://raw.githubusercontent.com/florianbeisel/hermesx/refs/heads/main/assets/icon.png" width="300" alt="HermesX Logo" />
</p>
<!-- markdownlint-enable MD013 -->

> **Disclaimer:** HermesX is an independent, unofficial companion application
> for ZeusX users. It is not affiliated with, endorsed by, or connected to ISGUS
> or ZeusX in any way.

---

> **Another Disclaimer:** This project is not and will never be integrated with
> ZeusX. This means that HermesX will not be able to react to changes made
> directly in ZeusX.
>
> That means that **manual bookings outside of HermesX are possible** but will
> not be reflected in the HermesX state.

HermesX is a modern, intelligent desktop assistant that helps you maintain a
healthy work-life balance by reminding you to track your work hours in ZeusX. It
provides smart notifications and monitoring to ensure you never forget to log
your time entries.

## 📥 Download

> ⚠️ **Testing Phase**: HermesX is currently under development. Testing builds
> are available from our CI pipeline.

Latest test builds are available as
[releases](https://github.com/florianbeisel/hermesx/releases):

1. Click on the latest release
2. Scroll down to the "Assets" section
3. Download the appropriate package for your system:
   - 🍎 macOS: `HermesX-<version>-arm64.dmg`
   - 🪟 Windows: `HermesX-<version>-Setup.exe`

## 🎯 Purpose

HermesX serves as a helpful companion for ZeusX users by:

- Reminding you to start and stop your time tracking
- Suggesting breaks based on your work patterns
- Monitoring system activity to detect work states
- Providing a seamless interface for quick time entries

## 🌟 Key Features

- **Smart Time Tracking**

  - Automatic work state detection:
    - Work mode detection based on system activity
  - Intelligent break suggestions:
    - Configurable short and long break reminders
    - Auto break suggestions after periods of inactivity
    - Customizable break durations
  - Flexible schedule management:
    - Configurable work days and hours
    - Customizable start times and work durations

- **Intelligent Notifications**

  - Context-aware notifications:
    - Quiet mode for focused work periods
    - Context aware notifications based on system activity
  - Intelligent notification suppression:
    - Automatic detection of meetings and calls
    - Gaming mode detection and suppression
  - Customizable notification settings:
    - Short and long break reminders
    - Inactivity thresholds
  - Break management:
    - Configurable break durations
    - Smart break suggestions based on activity

- **System Integration & Security**
  - Native system tray integration
  - Secure credential management

## 🚀 Getting Started

see [Usage](./docs/usage.md)

### 🔧 Configuration

Access settings through the system tray icon to customize:

- Work schedule and days
- Break duration and frequency
- Notification preferences
- Activity thresholds

## 📦 Development

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

## 🛣️ Roadmap

### Coming Soon

- [ ] Advanced activity detection
- [ ] Calendar integration (i.e. for holidays, working days, etc.)
- [ ] Advanced notification suppression (i.e. for phone calls, meetings, etc.
      and gaming)

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

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
