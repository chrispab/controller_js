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
    // This will now correctly interpret true/false or 1/0
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
      <div className="card">
        <div className="card-header">
          <h1 className="mb-0">Greenhouse Control Status</h1>
        </div>
        <div className="card-body">
          {!data ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <table className="table table-striped table-bordered mb-0">
              <thead className="thead-dark">
                <tr>
                  <th style={{ width: '50%' }}>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Temperature</td>
                  <td>{typeof data.temperature === 'number' ? `${data.temperature.toFixed(2)} °C` : 'N/A'}</td>
                </tr>
                <tr>
                  <td>Humidity</td>
                  <td>{typeof data.humidity === 'number' ? `${data.humidity.toFixed(2)} %` : 'N/A'}</td>
                </tr>
                <tr>
                  <td>Light</td>
                  <td>{renderIndicator(data.light)}</td>
                </tr>
                <tr>
                  <td>Heater</td>
                  <td>{renderIndicator(data.heater)}</td>
                </tr>
                <tr>
                  <td>Fan</td>
                  <td>{renderIndicator(data.fan)}</td>
                </tr>
                <tr>
                  <td>Vent Power</td>
                  <td>{renderIndicator(data.ventPower)}</td>
                </tr>
                <tr>
                  <td>Vent Speed</td>
                  <td>{data.ventSpeed ? 'High' : 'Low'}</td>
                </tr>
                <tr>
                  <td>Vent Total</td>
                  <td>{renderVentTotal(data.ventPower, data.ventSpeed)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="card-footer text-muted">
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
        </div>
      </div>
    </div>
  );
}

export default App;