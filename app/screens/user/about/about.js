// app/screens/home/index.js
// This is the platform-agnostic entry point
import { Platform } from 'react-native';

// This will automatically load the correct platform file
const Home = Platform.select({
  web: () => require('./about.web').default,
  default: () => require('./about.native').default,
})();

export default Home;