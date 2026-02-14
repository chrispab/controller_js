import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

function StatusResponsivePage({ initialStatus }) {
  const router = useRouter();
  const [data, setData] = useState(initialStatus);
  const [lastPageUpdate, setLastPageUpdate] = useState(null); // Initialize as null
  const [mounted, setMounted] = useState(false); // State to track if component is mounted
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [showDaySettings, setShowDaySettings] = useState(false);
  const [showNightSettings, setShowNightSettings] = useState(false);
  const [showFanSettings, setShowFanSettings] = useState(false);
  const [showSetpointSettings, setshowSetpointSettings] = useState(false);
  const [flashTokens, setFlashTokens] = useState({});
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  useEffect(() => {
    const debugFlag = router?.query?.debug;
    setShowDebugOverlay(debugFlag === '1');
  }, [router?.query?.debug]);
  const previousDataRef = useRef(initialStatus);
  const previousWsRef = useRef(isWsConnected);

  useEffect(() => {
    if (!data) return;

    const previousData = previousDataRef.current;
    if (!previousData) {
      previousDataRef.current = data;
      return;
    }

    const changedKeys = Object.keys(data).filter(
      (key) => previousData[key] !== data[key],
    );

    if (changedKeys.length) {
      setFlashTokens((prev) => {
        const next = { ...prev };
        changedKeys.forEach((key) => {
          next[key] = (next[key] || 0) + 1;
        });
        return next;
      });
    }

    previousDataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (previousWsRef.current === isWsConnected) return;

    setFlashTokens((prev) => ({
      ...prev,
      isWsConnected: (prev.isWsConnected || 0) + 1,
    }));

    previousWsRef.current = isWsConnected;
  }, [isWsConnected]);

  useEffect(() => {
    setMounted(true); // Set mounted to true after initial render on client

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // WebSocket for real-time updates
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:5678',
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        if (typeof receivedData === 'object' && receivedData !== null) {
          setData((prevData) => ({
            ...prevData,
            ...receivedData,
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
      setIsWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      clearInterval(timer);
      ws.close();
    };
  }, []);

  const formatUptime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  };

  const renderIndicator = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-muted">Loading...</span>;
    }
    return value ? (
      <span className="badge bg-success">On</span>
    ) : (
      <span className="badge bg-danger">Off</span>
    );
  };

  const renderVentTotal = (ventPower, ventSpeed) => {
    if (
      ventPower === null ||
      ventPower === undefined ||
      ventSpeed === null ||
      ventSpeed === undefined
    ) {
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

  const renderSoilMoisture = (value) => {
    if (value === null || value === undefined) {
      return <span >Waiting for sensor data...</span>;
    }
    const badgeColor = value >= 30 ? 'bg-success' : 'bg-danger';
    return <span className={`badge ${badgeColor}`}>{value.toFixed(1)} %</span>;
  };

  const formatWifiSignal = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return `${value}%`;
    }
    return `${numeric.toFixed(0)}%`;
  };

  const renderValue = (keys, content, className) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const flashToken = Math.max(
      0,
      ...keyList.map((key) => flashTokens[key] || 0),
    );
    return (
      <span
        key={`${keyList.join('|')}-${flashToken}`}
        className={`value-flash-target ${className || ''}`.trim()}
        style={
          flashToken > 0
            ? { animation: 'valueFlashFade 4s ease-out' }
            : undefined
        }
      >
        {content}
      </span>
    );
  };
  const handleVentOnDurationChange = async (event, period) => {
    const value = event.target.value;
    setData((prevData) => ({
      ...prevData,
      [`ventOnDuration${period === 'day' ? 'Day' : 'Night'}Secs`]: value,
    }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/vent/onDurationSecs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value, period }),
        },
      );
    } catch (error) {
      console.error(`Failed to set ventOnDuration for ${period}:`, error);
    }
  };

  const handleVentOffDurationChange = async (event, period) => {
    const value = event.target.value;
    setData((prevData) => ({
      ...prevData,
      [`ventOffDuration${period === 'day' ? 'Day' : 'Night'}Secs`]: value,
    }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/vent/offDurationSecs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value, period }),
        },
      );
    } catch (error) {
      console.error(`Failed to set ventOffDuration for ${period}:`, error);
    }
  };

  const handleFanOnDurationChange = async (event) => {
    const value = event.target.value;
    setData((prevData) => ({ ...prevData, fanOnDurationSecs: value }));
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + `/api/fan/onDurationSecs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error(`Failed to set fanOnDurationSecs:`, error);
    }
  };

  const handleFanOffDurationChange = async (event) => {

    const value = event.target.value;
    setData((prevData) => ({ ...prevData, fanOffDurationSecs: value }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/fan/offDurationSecs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        },
      );
    } catch (error) {
      console.error(`Failed to set fanOffDurationSecs:`, error);
    }
  };

  const handleUpperSetpointChange = async (event) => {
    console.log('handleUpperSetpointChange called');
    const value = parseFloat(event.target.value);
    console.log(`handleUpperSetpointChange  Setting highSetpoint to ${value}`);
    setData((prevData) => ({ ...prevData, highSetpoint: value }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/setpoint/highSetpoint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        },
      );
    } catch (error) {
      console.error(`Failed to set highSetpoint:`, error);
    }
  };

  const handleLowerSetpointChange = async (event) => {
    const value = parseFloat(event.target.value);
    console.log(`handleLowerSetpointChange  Setting lowSetpoint to ${value}`);
    setData((prevData) => ({ ...prevData, lowSetpoint: value }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/setpoint/lowSetpoint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        },
      );
    } catch (error) {
      console.error(`Failed to set lowSetpoint:`, error);
    }
  };

  const toggleDaySettings = () => setShowDaySettings(!showDaySettings);
  const toggleNightSettings = () => setShowNightSettings(!showNightSettings);
  const toggleFanSettings = () => setShowFanSettings(!showFanSettings);
  const toggleSetpointSettings = () => setshowSetpointSettings(!showSetpointSettings);

  return (
    <div style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }} className="min-vh-100 py-3">
      <style jsx>{`
        @media (min-width: 1025px) {
          .custom-col-responsive {
            flex: 0 0 auto;
            width: 33.333333% !important;
          }
        }
        @media (min-width: 1820px) {
          .custom-col-responsive {
            width: 25% !important;
          }
          .status-page-container {
            max-width: 100% !important;
          }
        }
        .value-flash-target {
          display: inline-block;
          border-radius: 0.25rem;
          padding: 0 0.25rem;
          background-color: var(--card-background-color);
        }
        .debug-overlay {
          position: fixed;
          right: 12px;
          bottom: 12px;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          font-size: 12px;
          padding: 8px 10px;
          border-radius: 8px;
          max-width: 240px;
          line-height: 1.3;
        }
        .debug-title {
          font-weight: 700;
          margin-bottom: 6px;
        }
        .debug-btn {
          margin-top: 6px;
          margin-right: 6px;
          background: #ffd214;
          border: none;
          color: #111;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
      <style jsx global>{`
        @keyframes valueFlashFade {
          0% {
            background-color: rgba(255, 179, 0, 0.9);
            box-shadow: 0 0 0 3px rgba(255, 179, 0, 0.95);
            color: #000;
            font-weight: 700;
            transform: scale(1.03);
          }
          100% {
            background-color: var(--card-background-color);
            box-shadow: 0 0 0 0 rgba(255, 179, 0, 0);
            color: inherit;
            font-weight: inherit;
            transform: scale(1);
          }
        }
      `}</style>
      {showDebugOverlay && (
        <div className="debug-overlay">
          <div className="debug-title">Debug</div>
          <div>Temp: {String(data?.temperature)}</div>
          <div>Humidity: {String(data?.humidity)}</div>
          <div>Last change: {data?.lastChange || 'n/a'}</div>
          <button
            type="button"
            className="debug-btn"
            onClick={() =>
              setFlashTokens((prev) => ({
                ...prev,
                temperature: (prev.temperature || 0) + 1,
                humidity: (prev.humidity || 0) + 1,
              }))
            }
          >
            Test
          </button>
        </div>
      )}
      <div className="container status-page-container">
        <h1 className="text-center my-2" style={{ fontSize: '1.6rem' }}>
          {renderValue('zoneName', `${data.zoneName} Greenhouse Dashboard`)}
        </h1>
        <div className="d-flex justify-content-center align-items-center mb-4">
          <div className="d-flex align-items-center">
            {renderValue(
              'light',
              <>
                <span className="me-2" style={{ fontSize: '1.5rem' }}>
                  {data?.light ? '☀️' : '🌙'}
                </span>
                <span className="fw-bold">{data?.light ? 'Day' : 'Night'}</span>
              </>,
            )}
          </div>
        </div>
        {!data ? (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100px' }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="row">
            {/* Temperature Control Card */}
            <div className="col-12 custom-col-responsive">
              <div
                className="card mb-4" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
              >
                <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>Temperature Control</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Temperature:
                      {renderValue(
                        'temperature',
                        typeof data.temperature === 'number'
                          ? `${data.temperature.toFixed(1)} °C`
                          : 'N/A',
                      )}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Humidity:
                      {renderValue(
                        'humidity',
                        typeof data.humidity === 'number'
                          ? `${data.humidity.toFixed(1)} %`
                          : 'N/A',
                      )}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Outside Temperature:
                      {renderValue(
                        'outsideTemperature',
                        typeof data.outsideTemperature === 'number'
                          ? `${data.outsideTemperature.toFixed(1)} °C`
                          : 'Waiting for sensor data...',
                      )}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Heater:
                      {renderValue(
                        'heater',
                        <>
                          {data.heater ? <span className="me-2">🔥</span> : null}
                          {renderIndicator(data.heater)}
                        </>,
                      )}
                    </li>
                  </ul>
                  <div
                    className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                  >
                    <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>
                      Current Setpoint:{' '}
                      {renderValue(
                        'setpoint',
                        `${data.setpoint.toFixed(1)} °C`,
                      )}
                    </div>
                    <div className="card-body">
                      <div
                        className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                      >
                        <div
                          className="card-header"
                          onClick={toggleSetpointSettings}
                          style={{ cursor: 'pointer', backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}
                        >
                          Setpoint Settings {showSetpointSettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showSetpointSettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="highSetpoint"
                                  className="form-label"
                                >
                                  Upper Setpoint °C
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="10"
                                  max="30"
                                  step="0.1"
                                  value={data.highSetpoint || 0}
                                  id="highSetpoint"
                                  onChange={handleUpperSetpointChange}
                                />
                                {renderValue(
                                  'highSetpoint',
                                  typeof data.highSetpoint === 'number'
                                    ? `${data.highSetpoint.toFixed(1)} °C`
                                    : 'N/A',
                                )}
                              </li>
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="lowSetpoint"
                                  className="form-label"
                                >
                                  Lower Setpoint °C
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="30"
                                  step="0.1"
                                  id="lowerSetpoint"
                                  value={data.lowSetpoint || 0}
                                  onChange={handleLowerSetpointChange}
                                />
                                {renderValue(
                                  'lowSetpoint',
                                  typeof data.lowSetpoint === 'number'
                                    ? `${data.lowSetpoint.toFixed(1)} °C`
                                    : 'N/A',
                                )}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Air Control Card */}
            <div className="col-12 custom-col-responsive">
              <div
                className="card mb-4" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
              >
                <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>Air Control</div>
                <div className="card-body">
                  {/* <p>This is a new card for Air Control.</p> */}
                  <div
                    className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                  >
                    <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>
                      Vent:{' '}
                      {renderValue(
                        'ventPower',
                        <>
                          {data.ventPower ? (
                            <span className="me-2">🌬️</span>
                          ) : null}
                          {renderIndicator(data.ventPower)}
                        </>,
                      )}
                    </div>
                    <div className="card-body">
                      <ul className="list-group list-group-flush">
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          Vent Speed:
                          {renderValue(
                            'ventSpeed',
                            data.ventSpeed ? 'High' : 'Low',
                          )}
                        </li>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          Vent Power %:
                          {renderValue(
                            ['ventPower', 'ventSpeed'],
                            renderVentTotal(data.ventPower, data.ventSpeed),
                          )}
                        </li>
                      </ul>
                      <div
                        className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                      >
                        <div
                          className="card-header"
                          onClick={toggleDaySettings}
                          style={{ cursor: 'pointer', backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}
                        >
                          Day Settings {showDaySettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showDaySettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="ventOnDurationDaySecs"
                                  className="form-label"
                                >
                                  On Duration (Day, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOnDurationDaySecs"
                                  value={data.ventOnDurationDaySecs || 0}
                                  onChange={(e) =>
                                    handleVentOnDurationChange(e, 'day')
                                  }
                                />
                                {renderValue(
                                  'ventOnDurationDaySecs',
                                  data.ventOnDurationDaySecs || 0,
                                )}
                              </li>
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="ventOffDurationDaySecs"
                                  className="form-label"
                                >
                                  Off Duration (Day, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOffDurationDaySecs"
                                  value={data.ventOffDurationDaySecs || 0}
                                  onChange={(e) =>
                                    handleVentOffDurationChange(e, 'day')
                                  }
                                />
                                {renderValue(
                                  'ventOffDurationDaySecs',
                                  data.ventOffDurationDaySecs || 0,
                                )}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div
                        className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                      >
                        <div
                          className="card-header"
                          onClick={toggleNightSettings}
                          style={{ cursor: 'pointer', backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}
                        >
                          Night Settings {showNightSettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showNightSettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="ventOnDurationNightSecs"
                                  className="form-label"
                                >
                                  On Duration (Night, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOnDurationNightSecs"
                                  value={data.ventOnDurationNightSecs || 0}
                                  onChange={(e) =>
                                    handleVentOnDurationChange(e, 'night')
                                  }
                                />
                                {renderValue(
                                  'ventOnDurationNightSecs',
                                  data.ventOnDurationNightSecs || 0,
                                )}
                              </li>
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="ventOffDurationNightSecs"
                                  className="form-label"
                                >
                                  Off Duration (Night, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOffDurationNightSecs"
                                  value={data.ventOffDurationNightSecs || 0}
                                  onChange={(e) =>
                                    handleVentOffDurationChange(e, 'night')
                                  }
                                />
                                {renderValue(
                                  'ventOffDurationNightSecs',
                                  data.ventOffDurationNightSecs || 0,
                                )}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                  >
                    <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>
                      Fan:{' '}
                      {renderValue(
                        'fan',
                        <>
                          {data.fan ? <span className="me-2">💨</span> : null}
                          {renderIndicator(data.fan)}
                        </>,
                      )}
                    </div>
                    <div className="card-body">
                      <div
                        className="card mt-3" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
                      >
                        <div
                          className="card-header"
                          onClick={toggleFanSettings}
                          style={{ cursor: 'pointer', backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}
                        >
                          Fan Settings {showFanSettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showFanSettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="fanOnDurationSecs"
                                  className="form-label"
                                >
                                  On Duration (secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="fanOnDurationSecs"
                                  value={data.fanOnDurationSecs || 0}
                                  onChange={handleFanOnDurationChange}
                                />
                                {renderValue(
                                  'fanOnDurationSecs',
                                  data.fanOnDurationSecs || 0,
                                )}
                              </li>
                              <li
                                className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                              >
                                <label
                                  htmlFor="fanOffDurationSecs"
                                  className="form-label"
                                >
                                  Off Duration (secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="fanOffDurationSecs"
                                  value={data.fanOffDurationSecs || 0}
                                  onChange={handleFanOffDurationChange}
                                />
                                {renderValue(
                                  'fanOffDurationSecs',
                                  data.fanOffDurationSecs || 0,
                                )}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Water Control */}
            <div className="col-12 custom-col-responsive">
              <div
                className="card mb-4" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
              >
                <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>Water Control</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Soil Moisture:
                      {renderValue(
                        'soilMoisturePercent',
                        renderSoilMoisture(data.soilMoisturePercent),
                      )}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Irrigation Pump:
                      {renderValue(
                        'irrigationPump',
                        renderIndicator(data.irrigationPump),
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="col-12 custom-col-responsive">
              <div
                className="card mb-4" style={{ backgroundColor: 'var(--card-background-color)', borderColor: 'var(--card-border-color)' }}
              >
                <div className="card-header" style={{ backgroundColor: 'var(--card-header-background-color)', color: 'var(--text-color)' }}>System Information</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    {mounted && (
                      <>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          WebSocket:
                          {renderValue(
                            'isWsConnected',
                            renderIndicator(isWsConnected),
                          )}
                        </li>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          Uptime:
                          {renderValue('uptime', formatUptime(data.uptime))}
                        </li>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          WiFi Signal:
                          {renderValue(
                            [
                              'wifiSignalPercent',
                              'wifiSignalStrength',
                              'wifiSignalStrengthDbm',
                              'wifiRssi',
                              'wifiSignal',
                            ],
                            formatWifiSignal(
                              data.wifiSignalPercent ??
                                data.wifiSignalStrength ??
                                data.wifiSignalStrengthDbm ??
                                data.wifiRssi ??
                                data.wifiSignal,
                            ),
                          )}
                        </li>
                      </>
                    )}
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Version:
                      {renderValue('version', data.version)}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Description:
                      {renderValue(
                        'description',
                        data.description,
                        'text-end',
                      )}
                    </li>
                    <li
                      className="list-group-item" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Release Notes:
                      {renderValue(
                        'releaseNotes',
                        data.releaseNotes,
                        'text-end',
                      )}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Git Branch:
                      {renderValue('gitBranch', data.gitBranch)}
                    </li>
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                    >
                      Last Commit:
                      {renderValue('gitCommit', data.gitCommit, 'text-end')}
                    </li>
                    {mounted && (
                      <>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          Last Changed:
                          {renderValue(
                            'timeStamp',
                            data && data.timeStamp
                              ? new Date(data.timeStamp).toLocaleTimeString()
                              : '',
                          )}
                        </li>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
                          Last Change:
                          {renderValue('lastChange', data ? data.lastChange : '')}
                        </li>
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--card-background-color)', color: 'var(--text-color)' }}
                        >
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
  const { execSync } = require('child_process');
  let initialStatus = {};
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678'; // Fallback for development
  try {
    console.log(`Fetching current states status from: ${API_URL}/api/status`);
    const statusRes = await fetch(`${API_URL}/api/status`);
    console.log(`Status response status: ${statusRes.status}`);
    const statusData = await statusRes.json();
    initialStatus = statusData.message || {};

    // package info
    console.log(`Fetching package information from: ${API_URL}/api/packageInfo`);
    const packageInfoRes = await fetch(`${API_URL}/api/packageInfo`);
    console.log(`package information response: ${packageInfoRes.status}`);
    const packageInfoData = await packageInfoRes.json();
    Object.assign(initialStatus, packageInfoData.message);

    // zone name
    console.log(`Fetching zone name from: ${API_URL}/api/zoneName`);
    const zoneNameRes = await fetch(`${API_URL}/api/zoneName`);
    console.log(`zone name response status: ${zoneNameRes.status}`);
    const zoneNameData = await zoneNameRes.json();
    initialStatus.zoneName = zoneNameData.message || null;

    // Fetch vent durations
    console.log(`Fetching vent on durations from: ${API_URL}/api/vent/onDurationSecs`);
    const ventOnRes = await fetch(`${API_URL}/api/vent/onDurationSecs`);
    const ventOnData = await ventOnRes.json();
    initialStatus.ventOnDurationDaySecs = ventOnData.day;
    initialStatus.ventOnDurationNightSecs = ventOnData.night;

    console.log(`Fetching vent off durations from: ${API_URL}/api/vent/offDurationSecs`);
    const ventOffRes = await fetch(`${API_URL}/api/vent/offDurationSecs`);
    const ventOffData = await ventOffRes.json();
    initialStatus.ventOffDurationDaySecs = ventOffData.day;
    initialStatus.ventOffDurationNightSecs = ventOffData.night;

    //sensor soil moisture raw - 'dryness' reading - not a percentage. e.g something like 1960 to 2020 values
    console.log(`Fetching sensor Raw soil moisture reading from: ${API_URL}/api/mqtt/soil1/sensor_method5_batch_moving_average_float`, );
    const sensorSoilMoistureRaw = await fetch( `${API_URL}/api/mqtt/soil1/sensor_method5_batch_moving_average_float`, );
    console.log( `Soil moisture response status: ${sensorSoilMoistureRaw.status}`, );
    const sensorSoilMoistureRawData = await sensorSoilMoistureRaw.json();
    initialStatus.sensorSoilMoistureRaw = sensorSoilMoistureRawData.message;

    //get soil moisture percentage from api
    console.log(
      `Fetching soil moisture percentage from: ${API_URL}/api/soilMoisturePercent`,
    );
    const soilMoisturePercent = await fetch(
      `${API_URL}/api/soilMoisturePercent`,
    );
    console.log(`Soil moisture response status: ${soilMoisturePercent.status}`);
    const soilMoisturePercentData = await soilMoisturePercent.json();
    initialStatus.soilMoisturePercent = soilMoisturePercentData.message;

    console.log(
      `Fetching irrigation pump from: ${API_URL}/api/mqtt/irrigationPump/status`,
    );
    const irrigationPumpRes = await fetch(
      `${API_URL}/api/mqtt/irrigationPump/status`,
    );
    console.log(`Irrigation pump response status: ${irrigationPumpRes.status}`);
    const irrigationPumpData = await irrigationPumpRes.json();
    initialStatus.irrigationPump = irrigationPumpData.message;

    console.log(
      `Fetching outside temperature from: ${API_URL}/api/outside-temperature`,
    );
    const outsideTemperatureRes = await fetch(
      `${API_URL}/api/outside-temperature`,
    );
    console.log(
      `Outside temperature response status: ${outsideTemperatureRes.status}`,
    );
    const outsideTemperatureData = await outsideTemperatureRes.json();
    initialStatus.outsideTemperature = outsideTemperatureData.message;

    console.log(`Fetching high setpoint from: ${API_URL}/api/setpoint/highSetpoint`);
    const highSetpointRes = await fetch(`${API_URL}/api/setpoint/highSetpoint`);
    console.log(`High setpoint response status: ${highSetpointRes.status}`);
    const highSetpointData = await highSetpointRes.json();
    initialStatus.highSetpoint = highSetpointData.message;

    console.log(`Fetching low setpoint from: ${API_URL}/api/setpoint/lowSetpoint`);
    const lowSetpointRes = await fetch(`${API_URL}/api/setpoint/lowSetpoint`);
    console.log(`Low setpoint response status: ${lowSetpointRes.status}`);
    const lowSetpointData = await lowSetpointRes.json();
    initialStatus.lowSetpoint = lowSetpointData.message;

    console.log(`Fetching setpoint from: ${API_URL}/api/setpoint`);
    const setpointRes = await fetch(`${API_URL}/api/setpoint`);
    console.log(`Setpoint response status: ${setpointRes.status}`);
    const setpointData = await setpointRes.json();
    initialStatus.setpoint = setpointData.message;

    console.log(`Fetching fan on duration from: ${API_URL}/api/fan/onDurationSecs`);
    const fanOnDurationRes = await fetch(`${API_URL}/api/fan/onDurationSecs`);
    console.log(`Fan on duration response status: ${fanOnDurationRes.status}`);
    const fanOnDurationData = await fanOnDurationRes.json();
    initialStatus.fanOnDurationSecs = fanOnDurationData.message ?? 0;

    console.log(`Fetching fan off duration from: ${API_URL}/api/fan/offDurationSecs`);
    const fanOffDurationRes = await fetch(`${API_URL}/api/fan/offDurationSecs`);
    console.log(`Fan off duration response status: ${fanOffDurationRes.status}`);
    const fanOffDurationData = await fanOffDurationRes.json();
  initialStatus.fanOffDurationSecs = fanOffDurationData.message ?? 0;

  } catch (error) {
    console.error('ZZZZZZZZZZZZZZZZZ  Failed to fetch initial status:', error);
  }

    console.log('Final initialStatus object:', initialStatus);


  try {
    initialStatus.uptime = require('os').uptime();
  } catch (e) {
    console.error('Failed to fetch uptime:', e);
  }

  try {
    initialStatus.gitBranch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();
    initialStatus.gitCommit = execSync('git log -1 --pretty=%B')
      .toString()
      .trim();
  } catch (error) {
    console.error('Failed to fetch git info:', error);
    initialStatus.gitBranch = 'N/A';
    initialStatus.gitCommit = 'N/A';
  }

  return {
    props: {
      initialStatus,
    },
  };
}

export default StatusResponsivePage;
