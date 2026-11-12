import { createRoot } from 'react-dom/client';
import { SiteView } from '../components/SiteView';
import { applyInitialTheme } from './boot';
import '../styles.css';

applyInitialTheme();
createRoot(document.getElementById('root')!).render(<SiteView variant="popup" />);
