import React, { useEffect, useState } from 'react';
import './App.css';
import Map from './components/Map';
import Dashboard from './components/Dashboard';

import About from './components/About';
import ImageAnalysis from './components/ImageAnalysis';
import QueryInterface from './components/QueryInterface';

function SplashScreen({ onFinish }) {
  const [showTransition, setShowTransition] = useState(false);
  const [transitionClass, setTransitionClass] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.classList.add('fade-splash');
      setShowTransition(true);
      setTransitionClass('open');
      setTimeout(() => {
        setTransitionClass('close');
        setTimeout(() => {
          setShowTransition(false);
          onFinish();
        }, 900); // match close duration to open (CSS: 0.9s)
      }, 900); // match open duration
    }, 4000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen premium-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL + '/main-building.jpg'})` }}>
      <div className="splash-overlay" />
      <div className="splash-content nitk-splash-content">
        <div className="splash-main-title-group">
          <div className="splash-title-main">
            <div className="splash-title-bg"></div>
            <span className="splash-title-text">MANGALORE SMART CITY INITIATIVE</span>
          </div>
          <p className="splash-sub animated-sub">
            <span className="splash-sub-bg"></span>
            <span className="splash-sub-text">Empowering Urban Living with Data &amp; Technology</span>
          </p>
        </div>
        <div className="splash-footer">
          <div className="footer-college">
            <img src={process.env.PUBLIC_URL + '/NITK_logo.png'} alt="NITK Logo" className="nitk-logo-footer" />
            <div>
              <div className="footer-nitk-title">National Institute of Technology Karnataka</div>
              <div className="footer-nitk-course">Smart System Design Project</div>
              <div className="footer-nitk-guide">Under the guidance of Dr Geetha V.</div>
            </div>
          </div>
          <div className="footer-divider" />
          <div className="footer-group-details" style={{ textAlign: 'right' }}>
            <div className="footer-group-title">Project by Group 4:</div>
            <ul className="footer-group-list" style={{ textAlign: 'left' }}>
              <li>Ashitosh Phadatare</li>
              <li>Darshan RK</li>
              <li>Mauli Mehulkumar Patel</li>
              <li>Varun Arya</li>
            </ul>
          </div>
        </div>
      </div>
      {showTransition && (
        <div className={`page-transition ${transitionClass}`}>
          <div className="page-transition-panel page-transition-left"></div>
          <div className="page-transition-panel page-transition-right"></div>
        </div>
      )}
    </div>
  );
}

function Navbar({ currentTab, setCurrentTab }) {
  const tabs = [
    { key: 'map', label: 'Map' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'query', label: 'Natural Language Query' },
    { key: 'image-analysis', label: 'Image Analysis' },
    { key: 'about', label: 'About' }
  ];
  return (
    <nav className="navbar">
      <div className="navbar-logo">Mangalore Smart City</div>
      <div className="navbar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`navbar-tab${currentTab === tab.key ? ' active' : ''}`}
            onClick={() => setCurrentTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState('map');

  useEffect(() => {
    if (!showSplash) {
      document.body.classList.remove('fade-splash');
      document.body.classList.add('app-background');
    }
  }, [showSplash]);

  function handleSplashFinish() {
    setShowSplash(false);
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <div className="App">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="main-content">
        {currentTab === 'map' && <Map />}
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'query' && <QueryInterface />}
        {currentTab === 'image-analysis' && <ImageAnalysis />}
        {currentTab === 'about' && <About />}
      </main>
    </div>
  );
}

export default App;
