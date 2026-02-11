import '../styles/globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function MyApp({ Component, pageProps }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link href="/" className="navbar-brand">
            Greenhouse Controller
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav w-100 justify-content-evenly align-items-center">
              <li className="nav-item">
                <Link href="/" className="nav-link">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/status" className="nav-link">
                  Status
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/status-responsive" className="nav-link">
                  Responsive Status
                </Link>
              </li>
              <li className="nav-item">
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="themeSwitch"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label text-light ms-2" htmlFor="themeSwitch">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </label>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
