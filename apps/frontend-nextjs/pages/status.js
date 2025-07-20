import { useState, useEffect } from 'react';

function StatusBootstrapPage({ initialStatus }) {
  const [data, setData] = useState(initialStatus);
  const [lastUpdated, setLastUpdated] = useState(null); // Initialize as null
  const [mounted, setMounted] = useState(false); // State to track if component is mounted
  const [ventOnDeltaSecs, setVentOnDeltaSecs] = useState(initialStatus.ventOnDeltaSecs || 0);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    setMounted(true); // Set mounted to true after initial render on client

    // WebSocket for real-time updates
    const ws = new WebSocket('ws://192.168.0.151:5678'); 

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        if (typeof receivedData === 'object' && receivedData !== null) {
          setData(prevData => ({
            ...prevData,
            ...receivedData
          }));
          setLastUpdated(new Date()); // Update timestamp only on client
        } else {
          console.log('Received non-JSON WebSocket message:', event.data);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', event.data, e);
        console.log('Plain text WebSocket message:', event.data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
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

  const handleVentOnDeltaSecsChange = async (event) => {
    const value = event.target.value;
    setVentOnDeltaSecs(value);
    try {
      await fetch('http://192.168.0.151:5678/api/ventOnDeltaSecs', {
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

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={isDarkMode ? 'bg-dark text-light min-vh-100 py-3' : 'bg-light text-dark min-vh-100 py-3'}>
      <div className="container">
        <h1 className="text-center my-4">Greenhouse Control Dashboard</h1>
        <button onClick={toggleDarkMode} className="btn btn-info d-block mx-auto mb-4">
          Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
        </button>
        {!data ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="row">
            {/* Environmental Readings */}
            <div className="col-md-6">
              <div className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                <div className="card-header">Environmental Readings</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Temperature:
                      <span>{typeof data.temperature === 'number' ? `${data.temperature.toFixed(1)} °C` : 'N/A'}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Humidity:
                      <span>{typeof data.humidity === 'number' ? `${data.humidity.toFixed(1)} %` : 'N/A'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Device Status */}
            <div className="col-md-6">
              <div className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                <div className="card-header">Device Status</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Light:
                      <span>{renderIndicator(data.light)}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Heater:
                      <span>{renderIndicator(data.heater)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Vent Control */}
            <div className="col-md-6">
              <div className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                <div className="card-header">Vent Control</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Fan:
                      <span>{renderIndicator(data.fan)}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Vent Power:
                      <span>{renderIndicator(data.ventPower)}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Vent Speed:
                      <span>{data.ventSpeed ? 'High' : 'Low'}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Vent Total:
                      <span>{renderVentTotal(data.ventPower, data.ventSpeed)}</span>
                    </li>
                    <li className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
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
            {/* Water Control */}
            <div className="col-md-6">
              <div className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                <div className="card-header">Water Control</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Soil Moisture:
                      <span>{typeof data.soilMoisture === 'number' ? `${data.soilMoisture.toFixed(1)} %` : 'N/A'}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Irrigation Pump:
                      <span>{renderIndicator(data.irrigationPump)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {mounted && (
          <div className="text-center text-muted mt-4">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  let initialStatus = {};
  try {
    const statusRes = await fetch('http://192.168.0.151:5678/api/status');
    const statusData = await statusRes.json();
    initialStatus = statusData.message; 

    const soilMoistureRes = await fetch('http://192.168.0.151:5678/api/mqtt/soil1/sensor_method5_batch_moving_average_float');
    const soilMoistureData = await soilMoistureRes.json();
    initialStatus.soilMoisture = soilMoistureData.message; 

    const irrigationPumpRes = await fetch('http://192.168.0.151:5678/api/mqtt/irrigationPump/status');
    const irrigationPumpData = await irrigationPumpRes.json();
    initialStatus.irrigationPump = irrigationPumpData.message;

  } catch (error) {
    console.error('Failed to fetch initial status:', error);
  }

  return {
    props: {
      initialStatus,
    },
  };
}

export default StatusBootstrapPage;