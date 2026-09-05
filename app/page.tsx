import { Chrome } from "./components/Chrome";
import { LandingExperience } from "./components/landing/LandingExperience";

export default function HomePage() {
  return (
    <div className="home home--stage">
      <Chrome current="home" floating />
      <main id="content">
        <LandingExperience />
      </main>
    </div>
  );
}
