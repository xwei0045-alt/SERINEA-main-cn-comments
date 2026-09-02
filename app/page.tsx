import { Chrome } from "./components/Chrome";
import { LandingExperience } from "./components/landing/LandingExperience";

export default function HomePage() {
  return (
    <div className="home">
      <Chrome current="home" />
      <main id="content">
        <LandingExperience />
      </main>
    </div>
  );
}
