import { useEffect } from "react";
import "./App.scss";
import Experience from "./Experience/Experience";
import Modal from "./components/Modal/Modal";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import HeroOverlay from "./components/HeroOverlay/HeroOverlay";
import RegisterOverlay from "./components/Register/RegisterOverlay";
import { useExperienceStore } from "./stores/experienceStore";
import { useRegisterStore } from "./stores/useRegisterStore";

function App() {
  const { isExperienceReady } = useExperienceStore();
  const openRegister = useRegisterStore((state) => state.openRegister);

  // Opening the site on /register (e.g. by scanning the QR code)
  // automatically opens the registration form.
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, "") === "/register") {
      openRegister();
    }
  }, [openRegister]);

  return (
    <>
      <LoadingScreen />
      <HeroOverlay visible={isExperienceReady} />
      <Modal />
      <RegisterOverlay />
      <Experience />
    </>
  );
}

export default App;
