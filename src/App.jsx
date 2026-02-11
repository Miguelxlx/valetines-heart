import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import "./styles.css";
import memeArrow from "./assets/meme-arrow.png";
import capybara from "./assets/capybara.png";

const W = 900;
const H = 520;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function makeHeart(id, messages) {
  const size = rand(40, 58);
  return {
    id,
    x: rand(60, W - 60),
    y: rand(60, H - 60),
    vx: rand(-1.2, 1.2) || 0.8,
    vy: rand(-1.0, 1.0) || -0.6,
    size,
    collected: false,
    message: messages[id % messages.length],
  };
}

export default function App() {
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  const messages = useMemo(
    () => [
      "Reason #1: your smile is illegal 🥲",
      "Reason #2: you make everything feel lighter",
      "Reason #3: I love your laugh",
      "Reason #4: you’re my favorite person",
      "Reason #5: your hugs are home",
      "Reason #6: you’re beautiful (duh)",
      "Reason #7: you’re my peace ❤️",
    ],
    []
  );

  const TOTAL_TO_COLLECT = 7;

  const [hearts, setHearts] = useState(() =>
    Array.from({ length: TOTAL_TO_COLLECT }, (_, i) => makeHeart(i, messages))
  );
  const [collectedCount, setCollectedCount] = useState(0);

  const [stage, setStage] = useState("intro"); // intro | introMsg | playing | unlocked | accepted
  const [note, setNote] = useState(null); // { text: string } | null
  const [introLine, setIntroLine] = useState("");

  const [mouse, setMouse] = useState({ x: W / 2, y: H / 2 });

  const [helpReady, setHelpReady] = useState(false);
  const [capyActive, setCapyActive] = useState(false);

  const show67 = stage === "playing" && collectedCount === 6;
  const runnerId = show67 ? hearts.find((h) => !h.collected)?.id : null;

  // After 5 seconds at 6/7, show the help button
  useEffect(() => {
    if (!show67) {
      setHelpReady(false);
      setCapyActive(false);
      return;
    }

    setHelpReady(false);
    const t = setTimeout(() => setHelpReady(true), 5000);
    return () => clearTimeout(t);
  }, [show67]);

  // Clicking help: spawn capybara and freeze the runner at the center
  const onHelp = () => {
    setCapyActive(true);
    setHelpReady(false);

    setHearts((prev) =>
      prev.map((h) =>
        runnerId != null && h.id === runnerId
          ? { ...h, x: W / 2, y: H / 2, vx: 0, vy: 0 }
          : h
      )
    );
  };

  useEffect(() => {
    const tick = () => {
      setHearts((prev) =>
        prev.map((h) => {
          if (h.collected) return h;

          // If capybara is active, lock the runner to the center forever
          if (capyActive && runnerId != null && h.id === runnerId) {
            return { ...h, x: W / 2, y: H / 2, vx: 0, vy: 0 };
          }

          let vx = h.vx;
          let vy = h.vy;

          // Runner logic at 6/7: repel from cursor
          if (show67 && runnerId != null && h.id === runnerId) {
            const dx = h.x - mouse.x;
            const dy = h.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const repel = clamp((220 - dist) / 220, 0, 1);
            const ax = (dx / dist) * (1.35 * repel);
            const ay = (dy / dist) * (1.35 * repel);

            vx += ax;
            vy += ay;

            // small random jitter so it feels "alive"
            vx += (Math.random() - 0.5) * 0.12;
            vy += (Math.random() - 0.5) * 0.12;

            const maxSpeed = 4.8;
            vx = clamp(vx, -maxSpeed, maxSpeed);
            vy = clamp(vy, -maxSpeed, maxSpeed);
          }

          let x = h.x + vx;
          let y = h.y + vy;

          if (x < 24 || x > W - 24) vx *= -1;
          if (y < 24 || y > H - 24) vy *= -1;

          x = clamp(x, 24, W - 24);
          y = clamp(y, 24, H - 24);

          return { ...h, x, y, vx, vy };
        })
      );

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mouse.x, mouse.y, show67, runnerId, capyActive]);

  const onIntroYes = () => {
    setIntroLine("Cool but only if you beat my game");
    setStage("introMsg");
  };

  const onIntroNo = () => {
    setIntroLine("That's rough, play my game and you might change your mind");
    setStage("introMsg");
  };

  const onIntroContinue = () => {
    setStage("playing");
  };

  const onMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;

    setMouse({
      x: clamp(x, 0, W),
      y: clamp(y, 0, H),
    });
  };

const onHeartClick = (id) => {
  if (stage !== "playing") return;
  if (note) return;

  const clicked = hearts.find((h) => h.id === id);
  if (!clicked || clicked.collected) return;

  const willBeFinal = collectedCount + 1 >= TOTAL_TO_COLLECT;

  setHearts((prev) =>
    prev.map((h) => (h.id === id ? { ...h, collected: true } : h))
  );

  setCollectedCount((c) => c + 1);

  if (willBeFinal) {
    setStage("unlocked");   // go straight to the Valentine modal
    setNote(null);          // just in case
    return;
  }

  setNote({ text: clicked.message });
};


  const onYes = () => {
    setStage("accepted");

    confetti({
      particleCount: 160,
      spread: 70,
      origin: { y: 0.65 },
    });

    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }, 250);
  };

  const onNo = () => {
    const el = document.querySelector(".modalCard");
    el?.classList.remove("shake");
    void el?.offsetWidth;
    el?.classList.add("shake");
  };

  return (
    <div className="page">
      <div className="container">
        <header className="topbar">
          <div className="title">Catch the Hearts 💘</div>
        </header>

 <div className="gameWrap">
  <div className="playfield">
    <div
      className="gameArea"
      ref={containerRef}
      style={{ width: W, height: H }}
      onMouseMove={onMouseMove}
    >
{stage === "playing" && (
  <div className={`progressBadge ${show67 ? "meme67" : ""}`}>
    Collected:{" "}
    <span className="fraction">
      <b>{Math.min(collectedCount, TOTAL_TO_COLLECT)}</b>/{TOTAL_TO_COLLECT}
    </span>
  </div>
)}



      {show67 && (
        <img className="memeArrowImg" src={memeArrow} alt="" aria-hidden="true" />
      )}

      {show67 && helpReady && !capyActive && (
        <button className="helpBtn" onClick={onHelp}>
          help?
        </button>
      )}

      {show67 && capyActive && (
        <img className="capybara" src={capybara} alt="" aria-hidden="true" />
      )}

      {/* ✅ Everything inside this div gets CLIPPED by the rounded corners */}
      <div className="gameClip">
        {/* Intro fake-out */}
        {stage === "intro" && (
          <div className="introBackdrop">
            <div className="introCard">
              <div className="introTitle">Do you wanna be my Valentines bbg</div>
              <div className="introActions">
                <button className="btn yes" onClick={onIntroYes}>
                  Yes 💖
                </button>
                <button className="btn no" onClick={onIntroNo}>
                  No 😶
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === "introMsg" && (
          <div className="introBackdrop">
            <div className="introCard">
              <div className="introTitle">{introLine}</div>
              <button className="introContinue" onClick={onIntroContinue}>
                Start the game 🎮
              </button>
            </div>
          </div>
        )}

        {/* Hearts */}
        {(stage === "playing" || stage === "unlocked" || stage === "accepted") &&
          hearts.map((h) => (
            <button
              key={h.id}
              className={`heart ${h.collected ? "collected" : ""} ${
                show67 && runnerId != null && h.id === runnerId ? "runner" : ""
              }`}
              style={{
                left: h.x - h.size / 2,
                top: h.y - h.size / 2,
                width: h.size,
                height: h.size,
              }}
              onClick={() => onHeartClick(h.id)}
              aria-label="heart"
            >
              ❤
            </button>
          ))}

        {/* Note popup */}
        {note && (
          <div
            className="noteBackdrop"
            onClick={() => setNote(null)}
            role="button"
            tabIndex={0}
          >
            <div className="noteCard" onClick={(e) => e.stopPropagation()}>
              <div className="noteTitle">💌 New message</div>
              <div className="noteText">{note.text}</div>
              <button className="noteClose" onClick={() => setNote(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Unlock modal */}
        {stage === "unlocked" && (
          <div className="modalBackdrop">
            <div className="modalCard">
              <div className="modalTitle">Okay… one last thing 🥺</div>
              <div className="modalText">Will you be my Valentine?</div>

              <div className="modalActions">
                <button className="btn yes" onClick={onYes}>
                  Yes 💖
                </button>
                <button className="btn no" onClick={onNo}>
                  No 😶
                </button>
              </div>

              <div className="modalHint">
                (You can’t break my heart, only click the hearts.)
              </div>
            </div>
          </div>
        )}

        {/* Final screen */}
        {stage === "accepted" && (
          <div className="finalScreen">
            <div className="finalTitle">Yay!! 💘</div>
            <div className="finalText">
              Here’s the plan:
              <br />
              <b>Friday, 7:30 PM</b> — I’m taking you out.
              <br />
              Dress code: <b>pretty</b> (your default)
            </div>
            <div className="finalSub">(Replace this with the real details.)</div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

      </div>

      <footer className="footer">
        Made for my gorjuice, smart, and amazing girlfriend -Miguel
      </footer>
    </div>
  );
}
