// client/src/App.js

import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    // fetch("/api")
    //   .then((res) => res.json())
    //   .then((data) => setData(data.message));

    async function fetchUsers() {
      const fullResponse = await fetch('/api');
      const responseJson = await fullResponse.json();
      setData(responseJson.message);
    }
    setInterval(() => {
      fetchUsers();
    }, 10000);
    fetchUsers();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>{!data ? 'Loading...' : data}</p>
      </header>
    </div>
  );
}

export default App;
