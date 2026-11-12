import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Square, Play, RotateCcw, Mail } from 'lucide-react';

// Starting anchor: 30 October 2026 at midnight local time
const SINCE_TIMESTAMP = new Date(2026, 9, 30, 0, 0, 0).getTime();
const STORAGE_KEY = 'letter_timer_state_v1';

interface StoredTimerState {
  isStopped: boolean;
  stoppedSeconds: number;
  stoppedAtDate?: string;
}

export default function App() {
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [stageGone, setStageGone] = useState(false);
  const [stageHidden, setStageHidden] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

  // Timer state
  const [isStopped, setIsStopped] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredTimerState = JSON.parse(saved);
        return Boolean(parsed.isStopped);
      }
    } catch {
      // fallback
    }
    return false;
  });

  const [stoppedSeconds, setStoppedSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredTimerState = JSON.parse(saved);
        if (parsed.isStopped && typeof parsed.stoppedSeconds === 'number') {
          return parsed.stoppedSeconds;
        }
      }
    } catch {
      // fallback
    }
    return 0;
  });

  const [stoppedAtString, setStoppedAtString] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredTimerState = JSON.parse(saved);
        return parsed.stoppedAtDate || '';
      }
    } catch {
      // fallback
    }
    return '';
  });

  // Current live elapsed seconds
  const [liveSeconds, setLiveSeconds] = useState(() => {
    return Math.max(0, Math.floor((Date.now() - SINCE_TIMESTAMP) / 1000));
  });

  const [flipSec, setFlipSec] = useState(false);

  // Refs
  const textRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Calculate active seconds to display
  const activeSeconds = isStopped ? stoppedSeconds : liveSeconds;

  const days = Math.floor(activeSeconds / 86400);
  const hours = String(Math.floor((activeSeconds % 86400) / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((activeSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(activeSeconds % 60).padStart(2, '0');

  // Live timer interval
  useEffect(() => {
    if (isStopped) return;

    const interval = setInterval(() => {
      const currentElapsed = Math.max(0, Math.floor((Date.now() - SINCE_TIMESTAMP) / 1000));
      setLiveSeconds((prev) => {
        if (prev !== currentElapsed) {
          setFlipSec(true);
          setTimeout(() => setFlipSec(false), 450);
        }
        return currentElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStopped]);

  // Envelope opening flow
  const handleOpenEnvelope = useCallback(() => {
    if (envelopeOpen) return;
    setEnvelopeOpen(true);

    const t1 = setTimeout(() => {
      setStageGone(true);
      setShowLetter(true);
    }, 2000);

    const t2 = setTimeout(() => {
      setStageHidden(true);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [envelopeOpen]);

  // Option to close/re-envelope
  const handleReEnvelope = useCallback(() => {
    setShowLetter(false);
    setStageHidden(false);
    setStageGone(false);
    setEnvelopeOpen(false);
  }, []);

  // Text fitting logic
  const fitText = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    let fs = 19;
    el.style.fontSize = `${fs}px`;
    while (el.scrollHeight > el.clientHeight + 1 && fs > 7) {
      fs -= 0.25;
      el.style.fontSize = `${fs}px`;
    }
  }, []);

  useEffect(() => {
    if (showLetter) {
      fitText();
      const timer = setTimeout(fitText, 150);
      return () => clearTimeout(timer);
    }
  }, [showLetter, fitText]);

  useEffect(() => {
    window.addEventListener('resize', fitText);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitText);
    }
    return () => window.removeEventListener('resize', fitText);
  }, [fitText]);

  // 3D paper tilt handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!showLetter || !sheetRef.current) return;
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    const m = Math.sqrt(nx * nx + ny * ny);
    sheetRef.current.style.rotate = `${-ny} ${nx} 0 ${m * 10}deg`;
  };

  const handlePointerLeave = () => {
    if (sheetRef.current) {
      sheetRef.current.style.rotate = '';
    }
  };

  // Stop / Resume Timer handler
  const toggleStopTimer = () => {
    if (!isStopped) {
      // Stopping the timer
      const currentNow = Math.max(0, Math.floor((Date.now() - SINCE_TIMESTAMP) / 1000));
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setIsStopped(true);
      setStoppedSeconds(currentNow);
      setStoppedAtString(nowStr);

      try {
        const data: StoredTimerState = {
          isStopped: true,
          stoppedSeconds: currentNow,
          stoppedAtDate: nowStr,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    } else {
      // Resuming the timer to live
      setIsStopped(false);
      setStoppedAtString('');

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  // Reset to live time
  const handleResetToLive = () => {
    setIsStopped(false);
    setStoppedAtString('');
    const live = Math.max(0, Math.floor((Date.now() - SINCE_TIMESTAMP) / 1000));
    setLiveSeconds(live);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Floating dust particles
  const dustParticles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const sz = 3 + Math.random() * 7;
      const left = Math.random() * 100;
      const animDuration = 12 + Math.random() * 14;
      const animDelay = -Math.random() * 20;
      const dx = Math.random() * 60 - 30;

      return (
        <i
          key={i}
          style={{
            left: `${left}%`,
            width: `${sz}px`,
            height: `${sz}px`,
            animationDuration: `${animDuration}s`,
            animationDelay: `${animDelay}s`,
            ['--dx' as string]: `${dx}px`,
          }}
        />
      );
    });
  }, []);

  return (
    <div className={showLetter ? 'show' : ''}>
      {/* ---------- ENVELOPE STAGE ---------- */}
      <div
        className={`stage ${stageGone ? 'gone' : ''} ${stageHidden ? 'hidden' : ''}`}
        id="stage"
        role="button"
        tabIndex={0}
        aria-label="Open the letter"
        onClick={handleOpenEnvelope}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenEnvelope();
          }
        }}
      >
        <div className="persp">
          <div className={`env ${envelopeOpen ? 'open' : ''}`} id="env">
            <div className="back" />
            <div className="peek" />
            <div className="pocket" />
            <div className="lines" aria-hidden="true">
              <svg viewBox="0 0 300 200" preserveAspectRatio="none">
                <path
                  d="M0 200 L150 114 L300 200"
                  fill="none"
                  stroke="rgba(110,95,80,.22)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M0 0 L150 114 L300 0"
                  fill="none"
                  stroke="rgba(255,255,255,.7)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="flapwrap">
              <div className="flap" />
            </div>
            <div className="sheen" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ---------- LETTER SCREEN: WINE BACKGROUND, TEXTURED PAPER ---------- */}
      <div
        ref={paperRef}
        className={`paper ${showLetter ? 'is-open' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
      >
        {/* Subtle control to fold letter back */}
        {showLetter && (
          <button
            type="button"
            className="reopen-trigger"
            onClick={handleReEnvelope}
            title="Fold back into envelope"
            aria-label="Fold back into envelope"
          >
            <Mail className="w-3 h-3" />
            <span>Envelope</span>
          </button>
        )}

        <div className="dust" id="dust" aria-hidden="true">
          {dustParticles}
        </div>

        {/* Paper Sheet */}
        <article className="sheet" id="sheet" ref={sheetRef}>
          {/* Metal paperclip SVG */}
          <svg className="clip" viewBox="0 0 22 62" aria-hidden="true">
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#d9dce0" />
                <stop offset="0.5" stopColor="#9aa0a8" />
                <stop offset="1" stopColor="#cfd3d8" />
              </linearGradient>
            </defs>
            <path
              d="M6 58V12a5 5 0 0 1 10 0V50a3.4 3.4 0 0 1-6.8 0V18"
              fill="none"
              stroke="url(#cg)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Letter Text Content */}
          <div className="text" id="text" ref={textRef}>
            {/* Postage stamp */}
            <div className="stamp" id="stamp" aria-hidden="true">
              <svg viewBox="0 0 56 68">
                <rect width="56" height="68" fill="#6b2824" />
                {/* Perforations top/bottom */}
                <circle cx="4" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="10" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="16" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="22" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="28" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="34" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="40" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="46" cy="0" r="2.3" fill="#f9f6f1" />
                <circle cx="52" cy="0" r="2.3" fill="#f9f6f1" />

                <circle cx="4" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="10" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="16" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="22" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="28" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="34" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="40" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="46" cy="68" r="2.3" fill="#f9f6f1" />
                <circle cx="52" cy="68" r="2.3" fill="#f9f6f1" />

                {/* Perforations left/right */}
                <circle cx="0" cy="5" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="11" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="17" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="23" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="29" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="35" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="41" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="47" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="53" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="59" r="2.3" fill="#f9f6f1" />
                <circle cx="0" cy="65" r="2.3" fill="#f9f6f1" />

                <circle cx="56" cy="5" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="11" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="17" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="23" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="29" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="35" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="41" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="47" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="53" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="59" r="2.3" fill="#f9f6f1" />
                <circle cx="56" cy="65" r="2.3" fill="#f9f6f1" />

                <rect x="5" y="5" width="46" height="58" fill="#f6eddd" />
                <text
                  x="28"
                  y="18"
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize="8"
                  letterSpacing="0.8"
                  fill="#6b2824"
                  fontWeight="600"
                >
                  SORRY
                </text>
                <g fill="none" stroke="#6b2824" strokeWidth="1.2" strokeLinejoin="round">
                  <rect x="14" y="28" width="28" height="19" />
                  <path d="M14 28L28 40L42 28" />
                  <path d="M20 54h16" strokeWidth="0.8" />
                </g>
              </svg>
            </div>

            <p style={{ ['--i' as string]: 0 }}>
              Njn orikalum anne hurt akkanm vicharichitlyaa njn ento ariyathe frustationil iy mundathe irnapoo ihsante account keri nokkiyatha like sorry njn chythth nalla thettan njn aa msg okke aynte sensil ee edthitt ollu pinne ink ntho iy njn karnam karnj parnjinte sheshm oru samadhanamvum ith vere ndyitlyaaa like iplm illaaa😩.
            </p>
            <p style={{ ['--i' as string]: 1 }}>
              pinne siba ann immane vilichath ink arilernuu ol inte per paryumn olod njn kore vattam msg parnjatha paryaryh paryath nn ink areela njn orikalum anood illa trust kalnjitlyaaa like sorry parnjit karym illa ariyaa but shemikanam plssss😭 ini orikalum inte sidn agne onnum ndvula
            </p>
            <p style={{ ['--i' as string]: 2 }}>
              njn tution vere drop akkiyath ernuu but ink iy ingane inne avoid akka like nthoko problem illa pole thoni agne etra effort idth njn
            </p>
            <p style={{ ['--i' as string]: 3 }}>
              Saturday vanni but iy vanilaa pinne sunday njn kore choychu but iy ank athonnum paryan intrst illa parnj agne ariyathe ahn njn ihsantel kand parnjth iy karnjapo thanne aa verkknathonnum iplm inte mindin poytlyaa njn karnam iy hurt ayiii sorry sorry sorry sorry
            </p>
            <p style={{ ['--i' as string]: 4 }}>
              njn annene kore karnj matte classil irn but ink ariya ankum hurt aykknnnn but ntha cheyyaaa ending ahnelum ink nammal thammil eplm happy aya oru ending ndvnm oru agrham ndyinu ith ipoo inod kore dheshym vech illa ending ayii le njn karnam iy bakkiollore onnum judge akkrth tta ihsankk onnum arilaa athe pole orkkke follow akkikondi bond vidarth iy ann parnjile tution kerandil irnunnu like ank itrm regret avan karnam njn ayiii sorrryy😭 njn ini pinnale veree sangadapedthee onnulyaaa
            </p>
            <p style={{ ['--i' as string]: 5 }}>
              inne eplm nalla memories ayit kann ink eplm agnen always aa good times ahn inshallah eplm adipoli ayii povv tta always miss youu💎💌  tripin vernm nn plan ndernu pinne ntho vanda thonnii epllem evdelm vech kanaaa inshallah see youu
            </p>
          </div>
        </article>

        {/* ---------- LIVE TIMER & REQUESTED STOP BUTTON ---------- */}
        <div className="timer-container" role="timer" aria-label="Time since we last spoke">
          <div className="tlabel">Days we haven’t spoken</div>
          <div className="tgrid">
            <div>
              <b id="td">{days}</b>
              <span>days</span>
            </div>
            <div>
              <b id="th">{hours}</b>
              <span>hours</span>
            </div>
            <div>
              <b id="tm">{minutes}</b>
              <span>min</span>
            </div>
            <div>
              <b id="ts" className={flipSec ? 'flip' : ''}>
                {seconds}
              </b>
              <span>sec</span>
            </div>
          </div>

          {/* STOP BUTTON & CONTROLS NEAR THE TIMER */}
          <div className="timer-actions">
            <button
              type="button"
              className={`btn-timer-stop ${isStopped ? 'is-stopped' : ''}`}
              onClick={toggleStopTimer}
              aria-label={isStopped ? 'Resume live timer' : 'Stop timer'}
              title={isStopped ? 'Resume live count' : 'Freeze timer counter'}
            >
              {isStopped ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Timer</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Timer</span>
                </>
              )}
            </button>

            {isStopped && (
              <button
                type="button"
                className="btn-timer-reset"
                onClick={handleResetToLive}
                title="Synchronize back to current live time"
                aria-label="Reset back to live time"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Live</span>
              </button>
            )}
          </div>

          {/* Stopped Status Feedback */}
          {isStopped && (
            <div className="timer-status-note">
              <span>●</span>
              <span>
                Timer paused {stoppedAtString ? `at ${stoppedAtString}` : ''} ({days}d {hours}h {minutes}m {seconds}s frozen)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
