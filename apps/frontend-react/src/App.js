
// client/src/App.js

import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial data once on load
    async function fetchInitialStatus() {
      try {
        const fullResponse = await fetch('/api/status');
        const responseJson = await fullResponse.json();
        setData(responseJson.message);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch initial status:", error);
      }
    }
    fetchInitialStatus();

    // Then, establish WebSocket for real-time updates
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:5678';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        if (typeof receivedData === 'object' && receivedData !== null) {
          // Update data state with the new info from the server
          setData(prevData => ({
            ...prevData,
            ...receivedData
          }));
          setLastUpdated(new Date());
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', event.data, e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsWsConnected(false);
    };

    // Cleanup on component unmount
    return () => {
      ws.close();
    };
  }, []); // Empty dependency array ensures this runs only once

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

  const handleVentTimingChange = async (event) => {
    const { id, value } = event.target;
    // Optimistically update the UI
    setData(prevData => ({ ...prevData, [id]: value }));

    try {
      await fetch(`/api/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error(`Failed to set ${id}:`, error);
      // Optionally, you could revert the UI change here on failure
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">{data?.zoneName || 'Greenhouse'} Control Dashboard</h1>
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

          {/* Ventilation Timing */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">Ventilation Timing</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item">
                    <label htmlFor="ventOnDeltaSecs" className="form-label">On Delta (secs)</label>
                    <input
                      type="range"
                      className="form-range"
                      min="5"
                      max="420"
                      step="5"
                      id="ventOnDeltaSecs"
                      value={data.ventOnDeltaSecs || 0}
                      onChange={handleVentTimingChange}
                    />
                    <span>{data.ventOnDeltaSecs || 0}</span>
                  </li>
                  <li className="list-group-item">
                    <label htmlFor="ventOffDeltaSecs" className="form-label">Off Delta (secs)</label>
                    <input
                      type="range"
                      className="form-range"
                      min="5"
                      max="420"
                      step="5"
                      id="ventOffDeltaSecs"
                      value={data.ventOffDeltaSecs || 0}
                      onChange={handleVentTimingChange}
                    />
                    <span>{data.ventOffDeltaSecs || 0}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="col-md-6 mx-auto">
            <div className="card mb-4">
              <div className="card-header">System Information</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Version:
                    <span>{data.version}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Last Change:
                    <span>{data.lastChange || 'N/A'}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    WebSocket:
                    <span>{renderIndicator(isWsConnected)}</span>
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
