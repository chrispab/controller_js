import { useState, useEffect } from 'react';

function StatusBootstrapPage({ initialStatus }) {
  const [data, setData] = useState(initialStatus);
  const [lastPageUpdate, setLastPageUpdate] = useState(null); // Initialize as null
  const [mounted, setMounted] = useState(false); // State to track if component is mounted
  const [ventOnDeltaSecs, setVentOnDeltaSecs] = useState(initialStatus.ventOnDeltaSecs || 0);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setMounted(true); // Set mounted to true after initial render on client

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // WebSocket for real-time updates
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:5678'); 

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
          setLastPageUpdate(new Date()); // Update timestamp only on client
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
      clearInterval(timer);
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
      await fetch('http://localhost:5678/api/ventOnDeltaSecs', {
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
        <h1 className="text-center my-4">{data.zoneName} Greenhouse Control Dashboard</h1>
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
                      <span>{typeof data.soilMoisturePercent === 'number' ? `${data.soilMoisturePercent.toFixed(1)} %` : 'N/A'}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Irrigation Pump:
                      <span>{renderIndicator(data.irrigationPump)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="col-md-6 mx-auto">
              <div className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                <div className="card-header">System Information</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Version:
                      <span>{data.version}</span>
                    </li>
                    <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Description:
                      <span className="text-end">{data.description}</span>
                    </li>
                    <li className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                      Release Notes:
                      <span className="text-end">{data.releaseNotes}</span>
                    </li>
                    {mounted && (
                      <>
                        <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                          Last Changed:
                          <span>{data && data.timeStamp ? new Date(data.timeStamp).toLocaleTimeString() : ''}</span>
                        </li>
                        <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                          Last Change:
                          <span>{data ? data.lastChange : ''}</span>
                        </li>
                        <li className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}>
                          Current Time:
                          <span>{new Date().toLocaleTimeString()}</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

//get initial data from controller api
export async function getServerSideProps() {
  let initialStatus = {};
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678'; // Fallback for development
  try {
    console.log(`Fetching status from: ${API_URL}/api/status`);
    const statusRes = await fetch(`${API_URL}/api/status`);
    console.log(`Status response status: ${statusRes.status}`);
    const statusData = await statusRes.json();
    initialStatus = statusData.message; 

    //sensor soil moisture raw - 'dryness' reading - not a percentage. e.g something like 1960 to 2020 values 
    console.log(`Fetching sensor Raw soil moisture reading from: ${API_URL}/api/mqtt/soil1/sensor_method5_batch_moving_average_float`);
    const sensorSoilMoistureRaw = await fetch(`${API_URL}/api/mqtt/soil1/sensor_method5_batch_moving_average_float`);
    console.log(`Soil moisture response status: ${sensorSoilMoistureRaw.status}`);
    const sensorSoilMoistureRawData = await sensorSoilMoistureRaw.json();
    initialStatus.sensorSoilMoistureRaw = sensorSoilMoistureRawData.message;

    //get soil moisture percentage from api
    console.log(`Fetching soil moisture percentage from: ${API_URL}/api/soilMoisturePercent`);
    const soilMoisturePercent = await fetch(`${API_URL}/api/soilMoisturePercent`);
    console.log(`Soil moisture response status: ${soilMoisturePercent.status}`);
    const soilMoisturePercentData = await soilMoisturePercent.json();
    initialStatus.soilMoisturePercent = soilMoisturePercentData.message;     

    console.log(`Fetching irrigation pump from: ${API_URL}/api/mqtt/irrigationPump/status`);
    const irrigationPumpRes = await fetch(`${API_URL}/api/mqtt/irrigationPump/status`);
    console.log(`Irrigation pump response status: ${irrigationPumpRes.status}`);
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