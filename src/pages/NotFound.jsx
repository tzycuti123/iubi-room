import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--color-bg)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 className="title-primary" style={{ fontSize: '15vw', marginBottom: '1rem' }}>404</h1>
      <h2 className="title-secondary" style={{ marginBottom: '3rem' }}>ROOM NOT FOUND OR HOST QUIT</h2>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', opacity: 0.6, maxWidth: '400px', marginBottom: '4rem' }}>
        The space you are looking for has been dissolved into the digital void.
      </p>
      <button className="btn-primary" onClick={() => navigate('/')}>
        RETURN HOME
      </button>
    </div>
  );
}
