'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css'

function App() {
  const [status, setStatus] = useState(null);
  const [ventOnDeltaSecs, setVentOnDeltaSecs] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const fullResponse = await fetch('/api/status');
        const responseJson = await fullResponse.json();
        setStatus(responseJson.message);
        setVentOnDeltaSecs(responseJson.message.ventOnDeltaSecs || 0);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch status:", error);
      }
    }

    const intervalId = setInterval(fetchStatus, 2000); // Fetch every 2 seconds
    fetchStatus(); // Initial fetch

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleVentOnDeltaSecsChange = async (event) => {
    const value = event.target.value;
    setVentOnDeltaSecs(value);
    try {
      await fetch('/api/ventOnDeltaSecs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error("Failed to set ventOnDeltaSecs:", error);
    }
  };

  const renderIndicator = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-muted">Loading...</span>;
    }
    return value ? <span className="badge bg-success">On</span> : <span className="badge bg-danger">Off</span>;
  };

  const renderVentTotal = (ventPower, ventSpeed) => {
    if (ventPower === null || ventPower === undefined || ventSpeed === null || ventSpeed === undefined) {
      return <span className="text-muted">Loading...</span>;
    }
    if (ventPower === 0) {
      return '0%';
    } else if (ventPower === 1 && ventSpeed === 0) {
      return '50%';
    } else if (ventPower === 1 && ventSpeed === 1) {
      return '100%';
    }
    return 'N/A'; // Fallback for unexpected values
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Greenhouse Control Dashboard</h1>
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="darkModeSwitch"
          checked={darkMode}
          onChange={() => setDarkMode(!darkMode)}
        />
        <label className="form-check-label" htmlFor="darkModeSwitch">
          Dark Mode
        </label>
      </div>
      {!status ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          {/* Environmental Readings */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">Environmental Readings</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Temperature:
                    <span>{typeof status.temperature === 'number' ? `${status.temperature.toFixed(1)} °C` : 'N/A'}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Humidity:
                    <span>{typeof status.humidity === 'number' ? `${status.humidity.toFixed(1)} %` : 'N/A'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Device Status */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">Device Status</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Light:
                    <span>{renderIndicator(status.light)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Heater:
                    <span>{renderIndicator(status.heater)}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Vent Control */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">Vent Control</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Fan:
                    <span>{renderIndicator(status.fan)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Vent Power:
                    <span>{renderIndicator(status.ventPower)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Vent Speed:
                    <span>{status.ventSpeed ? 'High' : 'Low'}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Vent Total:
                    <span>{renderVentTotal(status.ventPower, status.ventSpeed)}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Ventilation Timing */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">Ventilation Timing</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <label htmlFor="ventOnDeltaSecs" className="form-label">On Delta (secs)</label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="30"
                      step="1"
                      id="ventOnDeltaSecs"
                      value={ventOnDeltaSecs}
                      onChange={handleVentOnDeltaSecsChange}
                    />
                    <span>{ventOnDeltaSecs}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="text-center text-muted mt-3">
        {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
      </div>
    </div>
  );
}

export default App;
