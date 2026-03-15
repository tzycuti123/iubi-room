import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 9);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      position: 'relative',
      backgroundColor: 'var(--color-bg)'
    }}>
      {/* Content Area */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <h1 className="title-primary" style={{ fontSize: 'clamp(5rem, 15vw, 12rem)' }}>IU BI</h1>
        <p className="title-secondary" style={{ marginTop: '0.5rem', textTransform: 'none', opacity: 0.8 }}>bi iu em hong. moi bi vo nghe nhac</p>
        <button className="btn-primary" onClick={createRoom} style={{ marginTop: '4rem', padding: '1.2rem 3rem', fontSize: '1rem' }}>
          CREATE ROOM
        </button>
      </div>

    </div>
  );
}
