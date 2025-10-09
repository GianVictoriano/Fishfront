// app/screens/home/index.js
// This is the platform-agnostic entry point
import { Platform } from 'react-native';

// This will automatically load the correct platform file
const Home = Platform.select({
  web: () => require('./manage-folio.web').default,
  default: () => require('./manage-folio.native').default,
})();

export default Home;