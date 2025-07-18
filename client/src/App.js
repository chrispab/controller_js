
// client/src/App.js

import React from 'react';
import './App.css';

function App() {
  const [data, setData] = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  React.useEffect(() => {
    async function fetchStatus() {
      try {
        const fullResponse = await fetch('/api/status');
        const responseJson = await fullResponse.json();
        setData(responseJson.message);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch status:", error);
      }
    }

    const intervalId = setInterval(fetchStatus, 2000); // Fetch every 2 seconds
    fetchStatus(); // Initial fetch

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

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
      {!data ? (
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
                    <span>{typeof data.temperature === 'number' ? `${data.temperature.toFixed(1)} °C` : 'N/A'}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Humidity:
                    <span>{typeof data.humidity === 'number' ? `${data.humidity.toFixed(1)} %` : 'N/A'}</span>
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
                    <span>{renderIndicator(data.light)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Heater:
                    <span>{renderIndicator(data.heater)}</span>
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
                    <span>{renderIndicator(data.fan)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Vent Power:
                    <span>{renderIndicator(data.ventPower)}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Vent Speed:
                    <span>{data.ventSpeed ? 'High' : 'Low'}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Vent Total:
                    <span>{renderVentTotal(data.ventPower, data.ventSpeed)}</span>
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
