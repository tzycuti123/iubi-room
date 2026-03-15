import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import YouTube from 'react-youtube';
import { Play, Pause, SkipForward, Copy, Link as LinkIcon } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  const [roomState, setRoomState] = useState({ queue: [], currentVideo: null });
  const [inputValue, setInputValue] = useState('');
  const [showCopied, setShowCopied] = useState(false);

  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ignoreNextEvent, setIgnoreNextEvent] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('joinRoom', roomId, (initialState) => {
      setRoomState(initialState);
    });

    newSocket.on('syncState', (state) => {
      setRoomState(state);
    });

    newSocket.on('actionSync', ({ action, time, by }) => {
      if (!playerRef.current) return;
      const player = playerRef.current.getInternalPlayer();
      if (!player) return;

      setIgnoreNextEvent(true); // Don't bounce back

      try {
        if (action === 'play') {
          player.seekTo(time);
          player.playVideo();
          setIsPlaying(true);
        } else if (action === 'pause') {
          player.seekTo(time);
          player.pauseVideo();
          setIsPlaying(false);
        }
      } catch (err) {
        console.error(err);
      }
    });

    return () => newSocket.close();
  }, [roomId]);

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!inputValue) return;

    let videoId = extractVideoId(inputValue) || (inputValue.length === 11 ? inputValue : null);

    if (videoId) {
      const video = {
        id: videoId,
        title: "Track Title Loading...",
        artist: "Channel Name"
      };

      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
        const data = await res.json();
        video.title = data.title || video.title;
        video.artist = data.author_name || video.artist;
      } catch (e) {
        console.log("Meta fetch failed, using placeholders");
      }

      socket.emit('addVideo', { roomId, video });
      setInputValue('');
    } else {
      alert("Please enter a valid YouTube link");
    }
  };

  const handlePlayNext = () => {
    socket.emit('playNext', roomId);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 3000);
  };

  // YouTube Player setup
  const onReady = (event) => {
    playerRef.current = event.target;
    // Auto-play might be blocked by browser without user interaction, but we try.
    if (roomState.currentVideo) {
      event.target.playVideo();
    }
  };

  const onStateChange = async (event) => {
    if (ignoreNextEvent) {
      setIgnoreNextEvent(false);
      return;
    }

    const player = event.target;
    const time = await player.getCurrentTime();

    // YouTube Player State: 1 = playing, 2 = paused, 0 = ended
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      socket.emit('syncAction', { roomId, action: 'play', time });
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
      socket.emit('syncAction', { roomId, action: 'pause', time });
    } else if (event.data === 0) { // Ended
      handlePlayNext();
    }
  };

  // Only render player if there is a video
  const playerOpts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
    },
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <div className="top-bar">
        <div 
          onClick={() => navigate('/')} 
          style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-accent)' }}
        >
          QUIT ROOM
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={copyRoomLink} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Copy size={14} /> ROOM: {roomId}
          </button>
          {showCopied && <div className="copied-tooltip">Copied!</div>}
        </div>
      </div>

      <div className="room-layout">
        <div className={`vinyl-section ${isPlaying ? 'playing' : ''}`}>
          <div className={`vinyl-record ${isPlaying ? 'playing' : ''}`}>
            <div className="grooves"></div>
            <div className="grooves"></div>
            <div className="grooves"></div>

            {roomState.currentVideo && (
              <>
                <div className="visualizer-icon">
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="content-section">
          <h1 className="title-primary">
            {roomState.currentVideo ? 'ENJOY!' : 'READY TO PLAY?'}
          </h1>

          {!roomState.currentVideo && (
            <p className="title-secondary" style={{ marginTop: '1rem', marginBottom: '3rem' }}>JOIN ROOM & ADD SOME TRACKS</p>
          )}

          <form className="input-bar" onSubmit={handleAddVideo} style={{ marginBottom: '3rem' }}>
            <input
              type="text"
              placeholder="PASTE YOUTUBE LINK..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ padding: '0.8rem 0', fontSize: '0.8rem', letterSpacing: '0.1em' }}
            />
            <button type="submit" style={{ fontWeight: '900' }}>ADD TO QUEUE</button>
          </form>

          {/* Scrollable Container for PLAYING and UP NEXT */}
          <div className="scrollable-list-area">
            {/* PLAYING Section */}
            {roomState.currentVideo && (
              <div style={{ marginBottom: '2rem' }}>
                <p className="title-secondary" style={{ marginBottom: '1rem', color: 'var(--color-accent)', fontWeight: '900', fontSize: '0.8rem' }}>PLAYING</p>
                <div className="track-item" style={{ borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
                  <span className="track-number">00</span>
                  <img
                    className="track-thumbnail"
                    src={`https://img.youtube.com/vi/${roomState.currentVideo.id}/mqdefault.jpg`}
                    alt="thumbnail"
                  />
                  <div className="track-info">
                    <span className="track-title">{roomState.currentVideo.title}</span>
                    <span className="track-artist">CURRENTLY PLAYING</span>
                  </div>
                  <span className="track-duration" style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>LIVE</span>
                </div>
              </div>
            )}

            <p className="title-secondary" style={{ marginBottom: '1rem', color: 'var(--color-text-main)', opacity: 0.5, fontWeight: '900', fontSize: '0.8rem' }}>UP NEXT</p>

            <div className="track-list">
              {roomState.queue.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#999' }}>Queue is empty...</p>
              ) : null}

              {roomState.queue.map((video, idx) => (
                <div className="track-item" key={`${video.id}-${idx}`} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span className="track-number">{String(idx + 1).padStart(2, '0')}</span>
                  <img
                    className="track-thumbnail"
                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                    alt="thumbnail"
                  />
                  <div className="track-info">
                    <span className="track-title">{video.title}</span>
                    <span className="track-artist">{video.artist}</span>
                  </div>
                  <span className="track-duration" style={{ marginRight: '1rem' }}>3:45</span>

                  <button
                    onClick={() => socket.emit('removeVideo', { roomId, index: idx })}
                    style={{
                      color: 'var(--color-gray)',
                      fontSize: '0.8rem',
                      padding: '0.5rem',
                      opacity: 0.5,
                      transition: 'opacity 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.5}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {roomState.currentVideo && (
        <div style={{ position: 'fixed', bottom: '3rem', right: '3rem', display: 'flex', gap: '0.5rem', zIndex: 100 }}>
          <button
            onClick={() => {
              if (playerRef.current) {
                if (isPlaying) {
                  playerRef.current.pauseVideo();
                } else {
                  playerRef.current.playVideo();
                }
              }
            }}
            style={{ background: 'var(--color-text-main)', color: '#fff', padding: '1rem', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
          </button>
          <button
            onClick={handlePlayNext}
            style={{ background: '#fff', border: '1px solid #000', padding: '1rem', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SkipForward size={20} />
          </button>
        </div>
      )}

      {/* Hidden Youtube Player */}
      {roomState.currentVideo && (
        <div style={{ display: 'none' }}>
          <YouTube
            videoId={roomState.currentVideo.id}
            opts={playerOpts}
            onReady={onReady}
            onStateChange={onStateChange}
          />
        </div>
      )}
    </div>
  );
}
