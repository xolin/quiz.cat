import { useState } from "react";
import { api, getToken } from "./api.js";
import { Auth } from "./screens/Auth.js";
import { Home, type Difficulty } from "./screens/Home.js";
import { Game } from "./screens/Game.js";
import { Summary } from "./screens/Summary.js";
import { Leaderboard } from "./screens/Leaderboard.js";
import { Memory } from "./screens/Memory.js";
import { Premium } from "./screens/Premium.js";
import { Submit } from "./screens/Submit.js";
import { Review } from "./screens/Review.js";
import { Admin } from "./screens/Admin.js";

export type MatchMode = "solo" | "daily" | "survival";

// Màquina d'estats simple: auth → home → game → summary (+ leaderboard).
type Screen =
  | { name: "auth" }
  | { name: "home" }
  | { name: "game"; matchId: string; mode: MatchMode; difficulty: Difficulty }
  | { name: "summary"; matchId: string; progression: any; mode: MatchMode; difficulty: Difficulty }
  | { name: "leaderboard" }
  | { name: "minigame" }
  | { name: "premium" }
  | { name: "submit" }
  | { name: "review" }
  | { name: "admin" };

export function App() {
  const [screen, setScreen] = useState<Screen>(getToken() ? { name: "home" } : { name: "auth" });
  const [error, setError] = useState<string | null>(null);

  async function startMatch(mode: MatchMode, difficulty: Difficulty) {
    setError(null);
    try {
      const m = await api<{ matchId: string; alreadyFinished: boolean }>("/matches", {
        method: "POST",
        body: { mode, difficulty },
      });
      if (m.alreadyFinished) {
        setScreen({ name: "summary", matchId: m.matchId, progression: null, mode, difficulty });
      } else {
        setScreen({ name: "game", matchId: m.matchId, mode, difficulty });
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main>
      {error && <p className="qc-panel" style={{ margin: "var(--qc-4)", color: "var(--qc-live)", borderColor: "var(--qc-live)" }}>{error}</p>}

      {screen.name === "auth" && <Auth onLogged={() => setScreen({ name: "home" })} />}

      {screen.name === "home" && (
        <Home
          onPlay={startMatch}
          onLeaderboard={() => setScreen({ name: "leaderboard" })}
          onMinigame={() => setScreen({ name: "minigame" })}
          onPremium={() => setScreen({ name: "premium" })}
          onSubmit={() => setScreen({ name: "submit" })}
          onReview={() => setScreen({ name: "review" })}
          onAdmin={() => setScreen({ name: "admin" })}
          onLogout={() => setScreen({ name: "auth" })}
        />
      )}

      {screen.name === "submit" && <Submit onBack={() => setScreen({ name: "home" })} />}
      {screen.name === "review" && <Review onBack={() => setScreen({ name: "home" })} />}
      {screen.name === "admin" && <Admin onBack={() => setScreen({ name: "home" })} />}

      {screen.name === "minigame" && <Memory onDone={() => setScreen({ name: "home" })} />}

      {screen.name === "premium" && <Premium onBack={() => setScreen({ name: "home" })} />}

      {screen.name === "game" && (
        <Game
          matchId={screen.matchId}
          onFinished={(progression) =>
            setScreen({ name: "summary", matchId: screen.matchId, progression, mode: screen.mode, difficulty: screen.difficulty })
          }
          onAbandon={() => setScreen({ name: "home" })}
        />
      )}

      {screen.name === "summary" && (
        <Summary
          matchId={screen.matchId}
          progression={screen.progression}
          onHome={() => setScreen({ name: "home" })}
          onPlayAgain={() => startMatch(screen.mode, screen.difficulty)}
        />
      )}

      {screen.name === "leaderboard" && <Leaderboard onBack={() => setScreen({ name: "home" })} />}
    </main>
  );
}
