# SimpleSoft Mobile

React Native mobile app for SimpleSoft ERP. Manage your business from your phone — projects, CRM, invoicing, HR, chat, notifications, and more.

## Web Dashboard

![Web Dashboard](screenshots/02_web_dashboard.png)

## Mobile Screenshots

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-width: 600px;">

<img src="screenshots/mobile/login.jpeg" width="250" alt="Mobile Login">
<img src="screenshots/mobile/dashboard_light.jpeg" width="250" alt="Mobile Dashboard Light">
<img src="screenshots/mobile/dashboard-dark.jpeg" width="250" alt="Mobile Dashboard Dark">
<img src="screenshots/mobile/projects.jpeg" width="250" alt="Mobile Projects">
<img src="screenshots/mobile/task.jpeg" width="250" alt="Mobile Tasks">
<img src="screenshots/mobile/contacts.jpeg" width="250" alt="Mobile Contacts">
<img src="screenshots/mobile/notifications.jpeg" width="250" alt="Mobile Notifications">
<img src="screenshots/mobile/settings_light.jpeg" width="250" alt="Mobile Settings Light">

</div>

## Features

- Real-time dashboard with key metrics
- CRM and contact management
- Project and task management
- Invoice creation and tracking
- Team chat and notifications
- Dark and light theme support
- Push notifications via Firebase
- AI-powered features
- Responsive design for all phone sizes

## Stack

- React Native
- React Native CLI
- Redux for state management
- Firebase for push notifications
- Integrated with SimpleSoft backend API

## Setup

Clone the repository and install dependencies:

\\\ash
git clone https://github.com/simple-softwares/simplesoft-mobile.git
cd simplesoft-mobile
npm install
\\\

### Development

Run on iOS or Android:

\\\ash
npx react-native run-android
npx react-native run-ios
\\\

### Build APK

\\\ash
cd android
./gradlew assembleRelease
\\\

## Backend Connection

Update the API endpoint in your configuration:

\\\javascript
const API_URL = "http://your-backend:8000/api";
\\\

## Contributing

We welcome contributions. Please read the main SimpleSoft docs for contribution guidelines.

## License

MIT

## Get Started

- SimpleSoft Docs: https://github.com/simple-softwares/simplesoft-docs
- Backend: https://github.com/simple-softwares/simplesoft-backend
- Web Frontend: https://github.com/simple-softwares/simplesoft-frontend
