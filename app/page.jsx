"use client";
import dynamic from 'next/dynamic';

function WeatherFallback() {
  return (
    <div style={{
      backgroundColor: '#f4ead4',
      color: '#3f2a18',
      fontFamily: '"Quicksand", sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <header style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '32px 0 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <img 
            src="/cloudly-assessts/cloudly-mark.png" 
            alt="Cloudly Logo" 
            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
          />
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#3f2a18', margin: 0 }}>Cloudly</h1>
        </div>
        
        <div style={{
          backgroundColor: 'rgba(255, 248, 235, 0.94)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid rgba(185, 151, 91, 0.42)',
          boxShadow: '0 8px 32px rgba(107, 69, 40, 0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#6b4528' }}>
            Interactive Weather Map & AI Assistant
          </h2>
          <p style={{ fontSize: '16px', color: '#6f5536', lineHeight: '1.6', marginBottom: '32px' }}>
            Monitor real-time weather overlays, precipitation radar, and tropical storm trajectories with Cloudly. Take advantage of friendly AI weather advice tailored to your active day.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(185, 151, 91, 0.2)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#6b4528' }}>🌧️ Rain Radar</h3>
              <p style={{ fontSize: '14px', color: '#8a6c47', margin: 0 }}>
                High-definition live radar layers and precipitation trends.
              </p>
            </div>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(185, 151, 91, 0.2)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#6b4528' }}>🌀 Typhoon Tracker</h3>
              <p style={{ fontSize: '14px', color: '#8a6c47', margin: 0 }}>
                Up-to-date tropical cyclone tracking maps and official weather bulletins.
              </p>
            </div>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(185, 151, 91, 0.2)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#6b4528' }}>💬 Cloudly AI Chat</h3>
              <p style={{ fontSize: '14px', color: '#8a6c47', margin: 0 }}>
                Safe, warm, and personalized recommendations for your weather conditions.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#8a6c47', fontWeight: '500' }}>Loading interactive map and dashboard...</p>
        </div>
      </main>

      <footer style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 0',
        borderTop: '1px solid rgba(185, 151, 91, 0.2)',
        textAlign: 'center',
        fontSize: '12px',
        color: '#8a6c47'
      }}>
        <p>© {new Date().getFullYear()} Cloudly Weather. Powered by OpenWeatherMap and PAGASA data feeds.</p>
      </footer>
    </div>
  );
}

const App = dynamic(() => import('../src/App'), { 
  ssr: false,
  loading: () => <WeatherFallback />
});

export default function Page() {
  return <App />;
}
