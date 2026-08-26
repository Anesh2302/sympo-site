import "./App.scss";
import Experience from "./Experience/Experience";
import Modal from "./components/Modal/Modal";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import HeroOverlay from "./components/HeroOverlay/HeroOverlay";
import { useExperienceStore } from "./stores/experienceStore";

function App() {
  const { isExperienceReady } = useExperienceStore();

  return (
    <>
      <LoadingScreen />
      <HeroOverlay visible={isExperienceReady} />
      <Modal />
      <Experience />
    </>
  );
}

export default App;
