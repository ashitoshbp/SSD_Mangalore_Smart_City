import React from 'react';
import logo from '../logo.svg';

const Home = () => (
  <div className="home-page">
    <h2>Welcome to the Mangalore Smart City Dashboard</h2>
    <p className="home-desc">
      Explore real-time insights, incident analytics, and smart solutions designed for a safer, smarter, and more connected Mangalore.
    </p>
    <img src={logo} alt="Smart City" className="home-logo" />
  </div>
);

export default Home;
