import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import RadioPage from './pages/RadioPage';
import StatsPage from './pages/StatsPage';
import AgentConsolePage from './pages/AgentConsolePage';
import './index.css';
import { config } from './config'; // Import to trigger validation
import DocsPage from './pages/DocsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/radio" element={<RadioPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/console" element={<AgentConsolePage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
