import { useLocation, useNavigate } from "react-router-dom";
import { useTelegram } from "@/hooks/useTelegram";

export function BottomMainMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  // Home page မှာ Main Menu ကို header ထဲကနေပြပါမယ် (Home buttons တွေကို 그대로ထား)
  if (location.pathname === "/") return null;

  return (
    <nav className="bottom-main-menu" aria-label="Main navigation">
      <button
        type="button"
        className="bottom-main-menu__btn"
        onClick={() => {
          haptic("selection");
          navigate("/");
        }}
      >
        <span className="bottom-main-menu__icon" aria-hidden>
          🏠
        </span>
        <span>Main Menu</span>
      </button>
    </nav>
  );
}